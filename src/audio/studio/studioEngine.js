// The recorder's multitrack engine: ONE AudioContext that plays the project
// (regions, drums, click) and records the input, so a new take can be placed
// on the timeline to the sample.
//
// Timeline vs. clock: the transport is a list of SEGMENTS, each a stretch of
// timeline [from, to) that sounds from context time `when`. A plain play is
// one open segment; a loop adds a segment per pass. Regions are scheduled
// per segment (AudioBufferSourceNodes), drums and the click by a look-ahead
// scheduler from the same segments — so loops, pre-roll and drums all line
// up without a second clock. The capture is time-stamped (recorder.js), and
// `capturePasses()` maps it back onto the timeline through the same
// segments, minus the round-trip latency.

import { createLiveContext, openLiveInput, readLevel, estimateLatency } from '../amp/liveInput';
import { createAmpEngine } from '../amp/ampEngine';
import { headphonesConfirmed, loadCurrentSettings } from '../amp/ampSettings';
import { createCapture } from '../recorder';
import { getTakeAudio } from '../recorderStore';
import { playDrumHit } from '../drumSounds';
import { drumHits, clickTimes, playClick } from './drumTrack';
import { audibleTracks, regionEnd, projectLength, MIN_REGION } from './project';

const AHEAD = 0.3; // s scheduled ahead
const TICK = 25; // ms
const LEAD = 0.12; // s from the tap to the first sound
const CLIP_FADE = 0.004; // fade where a segment cuts into a region
export const LATENCY_KEY = 'dudestar-rec-latency'; // device-level (not per profile)

export function savedLatency() {
  try {
    const v = JSON.parse(localStorage.getItem(LATENCY_KEY));
    return Number.isFinite(v?.seconds) ? v.seconds : null;
  } catch {
    return null;
  }
}

export function saveLatency(seconds) {
  try {
    if (seconds == null) localStorage.removeItem(LATENCY_KEY);
    else localStorage.setItem(LATENCY_KEY, JSON.stringify({ seconds, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

// ---- pure helpers (tested in node) ---------------------------------------------

/** Timeline position at context time `t` through the segments (null before/after). */
export function timelineAt(segments, t) {
  for (const s of segments) {
    const end = s.when + (s.to - s.from);
    if (t >= s.when && t < end) return s.from + (t - s.when);
  }
  return null;
}

/**
 * Where a capture lands on the timeline.
 *  segments: the transport's segments (to = where it really stopped);
 *  startTime: context time of the take's first sample; latency: round trip;
 *  duration: take length (s); keep: { from, to } — the part that counts
 *  (the punch / loop range, or [record start, ∞)).
 * One pass per segment the take overlaps: { base, from, to, full }.
 */
export function capturePasses({ segments, startTime, latency, duration, keep }) {
  const out = [];
  for (const s of segments) {
    const base = s.from + (startTime - latency - s.when);
    const a = Math.max(s.from, base, keep.from);
    const b = Math.min(s.to, base + duration, keep.to);
    if (b - a < MIN_REGION) continue;
    const full = Number.isFinite(keep.to) ? a <= keep.from + 0.01 && b >= keep.to - 0.01 : true;
    out.push({ base, from: a, to: b, full });
  }
  return out;
}

/** Delay (s) from each click to its onset in the capture (missing ones dropped). */
export function measureClickDelays(samples, sampleRate, startTime, clicks, skip = 0) {
  let floor = 0;
  const pre = Math.min(samples.length, Math.max(1, Math.floor((clicks[0] - startTime) * sampleRate)));
  for (let i = 0; i < pre; i++) floor = Math.max(floor, Math.abs(samples[i]));
  // Loudest point while the clicks sound (not the whole take).
  let peak = 0;
  const pEnd = Math.min(samples.length, Math.floor((clicks[clicks.length - 1] - startTime + 0.4) * sampleRate));
  for (let i = pre; i < pEnd; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const thr = Math.max(floor * 4, peak * 0.25, 0.01);
  const out = [];
  for (const c of clicks.slice(skip)) {
    const a = Math.max(0, Math.floor((c - startTime - 0.005) * sampleRate));
    const b = Math.min(samples.length, Math.floor((c - startTime + 0.4) * sampleRate));
    for (let i = a; i < b; i++) {
      if (Math.abs(samples[i]) >= thr) {
        out.push(startTime + i / sampleRate - c);
        break;
      }
    }
  }
  return out;
}

/**
 * The take's own round trip, from the count-in clicks the mic heard (no
 * headphones). null unless at least 3 clicks agree within 3 ms and the value
 * is plausible (within 80 ms of the expected one).
 */
export function latencyFromCountIn(samples, sampleRate, startTime, clicks, expected) {
  if (!clicks || clicks.length < 3 || startTime == null) return null;
  const d = measureClickDelays(samples, sampleRate, startTime, clicks, 1).sort((a, b) => a - b);
  if (d.length < 3) return null;
  const med = d[d.length >> 1];
  if (d[d.length - 1] - d[0] > 0.003) return null;
  if (med < 0 || med > 0.5 || Math.abs(med - expected) > 0.08) return null;
  return med;
}

// ---- graph building shared by live play and offline export -------------------------

function scheduleRegions(ctx, trackOuts, project, buffers, seg, opts = {}) {
  const sources = [];
  const muted = opts.mutedRanges || {};
  for (const track of project.tracks) {
    const out = trackOuts.get(track.id);
    if (!out) continue;
    for (const r of track.regions) {
      const buf = buffers.get(r.takeId);
      if (!buf) continue;
      let pieces = [[Math.max(r.start, seg.from), Math.min(regionEnd(r), seg.to)]];
      for (const [x, y] of muted[track.id] || []) {
        pieces = pieces.flatMap(([a, b]) => {
          if (y <= a || x >= b) return [[a, b]];
          const keep = [];
          if (x > a) keep.push([a, x]);
          if (y < b) keep.push([y, b]);
          return keep;
        });
      }
      for (const [a, b] of pieces) {
        if (b - a < 0.002) continue;
        const t0 = seg.when + (a - seg.from);
        const t1 = t0 + (b - a);
        if (t1 <= (opts.notBefore ?? -Infinity)) continue;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        const level = r.gain ?? 1;
        const fi = Math.min(a <= r.start + 1e-6 ? r.fadeIn || 0 : CLIP_FADE, (b - a) / 2);
        const fo = Math.min(b >= regionEnd(r) - 1e-6 ? r.fadeOut || 0 : CLIP_FADE, (b - a) / 2);
        g.gain.setValueAtTime(fi > 0 ? 0 : level, t0);
        if (fi > 0) g.gain.linearRampToValueAtTime(level, t0 + fi);
        if (fo > 0) {
          g.gain.setValueAtTime(level, t1 - fo);
          g.gain.linearRampToValueAtTime(0, t1);
        }
        src.connect(g).connect(out);
        const offset = r.offset + (a - r.start);
        if (offset >= buf.duration) continue;
        src.start(t0, offset, Math.min(b - a, buf.duration - offset));
        sources.push(src);
      }
    }
  }
  return sources;
}

function trackLevel(project, track) {
  const heard = audibleTracks(project).some((t) => t.id === track.id);
  return heard ? track.volume ?? 0.9 : 0;
}

/**
 * Mixdown of [from, to) to a stereo AudioBuffer (export, bounce).
 * trackIds: only these tracks (null = everything you hear); drums: include
 * the drum track.
 */
export async function renderMix(project, buffers, { from = 0, to = null, trackIds = null, drums = project.drums?.on, sampleRate = 48000 } = {}) {
  const end = to ?? Math.max(projectLength(project), from + 0.5);
  const len = Math.max(1, Math.ceil((end - from) * sampleRate));
  const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new OC(2, len, sampleRate);
  const master = ctx.createGain();
  master.connect(ctx.destination);
  const outs = new Map();
  for (const t of project.tracks) {
    if (trackIds && !trackIds.includes(t.id)) continue;
    const g = ctx.createGain();
    g.gain.value = trackIds ? t.volume ?? 0.9 : trackLevel(project, t);
    g.connect(master);
    outs.set(t.id, g);
  }
  scheduleRegions(ctx, outs, project, buffers, { from, to: end, when: 0 });
  if (drums && project.drums) {
    const bus = ctx.createGain();
    bus.gain.value = project.drums.volume ?? 0.7;
    bus.connect(master);
    for (const h of drumHits(project.drums, project.bpm, project.beats, from, end)) playDrumHit(ctx, h.instrument, h.time - from, h.velocity, bus);
  }
  return ctx.startRendering();
}

// ---- the live engine ---------------------------------------------------------------

export function createStudioEngine() {
  let ctx = null;
  let master = null;
  let outAnalyser = null;
  const buffers = new Map();
  const loading = new Map();
  let tp = null; // transport
  let rig = null; // input
  const listeners = new Set();
  const emit = (e) => listeners.forEach((fn) => fn(e));

  function ensureContext() {
    if (ctx && ctx.state !== 'closed') {
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      return ctx;
    }
    ctx = createLiveContext();
    ctx.resume().catch(() => {});
    master = ctx.createGain();
    outAnalyser = ctx.createAnalyser();
    outAnalyser.fftSize = 1024;
    master.connect(outAnalyser);
    master.connect(ctx.destination);
    return ctx;
  }

  async function decodeBlob(blob) {
    const c = ctx || new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 48000);
    const ab = await blob.arrayBuffer();
    return new Promise((res, rej) => {
      const p = c.decodeAudioData(ab, res, rej);
      if (p && p.then) p.then(res, rej);
    });
  }

  /** Decode (once) the takes with these ids. */
  async function loadTakes(ids) {
    await Promise.all(
      [...ids].map((id) => {
        if (buffers.has(id)) return null;
        if (!loading.has(id)) {
          loading.set(
            id,
            getTakeAudio(id)
              .then((blob) => (blob ? decodeBlob(blob) : null))
              .then((buf) => {
                if (buf) buffers.set(id, buf);
                loading.delete(id);
              })
              .catch(() => loading.delete(id))
          );
        }
        return loading.get(id);
      })
    );
  }

  function putBuffer(id, buf) {
    buffers.set(id, buf);
  }

  function dropBuffer(id) {
    buffers.delete(id);
  }

  // ---- transport ----
  function stopTransport() {
    const t = tp;
    tp = null;
    if (!t) return null;
    clearInterval(t.timer);
    const now = ctx.currentTime;
    for (const s of t.sources) {
      try {
        s.stop();
      } catch {
        /* not started */
      }
    }
    for (const g of t.trackOuts.values()) {
      try {
        g.disconnect();
      } catch {
        /* gone */
      }
    }
    try {
      t.drumBus.disconnect();
      t.clickBus.disconnect();
    } catch {
      /* gone */
    }
    // Close the open segment where it really stopped.
    const segs = t.segments.map((s) => ({ ...s }));
    const pos = timelineAt(segs, now);
    const last = segs.findLast((s) => s.when <= now);
    if (last) last.to = Math.min(last.to, pos ?? last.from + (now - last.when));
    const kept = segs.filter((s) => s.when <= now);
    return { segments: kept, position: pos ?? (last ? last.to : t.from) };
  }

  /**
   * Start playing.
   *  from: timeline position; loop: { in, out } | null; stopAt: timeline
   *  position to stop at (post-roll end) | null; untilEnd: stop at the end of
   *  the song (plain playback); countIn: beats of click before `from`;
   *  click: click all the way; mutedRanges: { trackId: [[a, b]] } not heard.
   */
  function play(project, { from = 0, loop = null, stopAt = null, untilEnd = true, countIn = 0, click = false, mutedRanges = null } = {}) {
    ensureContext();
    stopTransport();
    const beat = 60 / project.bpm;
    const t0 = ctx.currentTime + LEAD;
    const T = t0 + countIn * beat;
    const first = { from, to: loop ? loop.out : stopAt ?? Infinity, when: T };
    if (loop && from >= loop.out) first.from = loop.in;
    const t = {
      project,
      from,
      loop,
      segments: [first],
      scheduledSeg: 0,
      perc: T, // context time up to which drums/click are scheduled
      sources: [],
      trackOuts: new Map(),
      drumBus: ctx.createGain(),
      clickBus: ctx.createGain(),
      click,
      mutedRanges,
      start: T,
      endAt: !loop && untilEnd && stopAt == null ? Math.max(projectLength(project), from) : stopAt,
      timer: 0,
    };
    for (const tr of project.tracks) {
      const g = ctx.createGain();
      g.gain.value = trackLevel(project, tr);
      g.connect(master);
      t.trackOuts.set(tr.id, g);
    }
    t.drumBus.gain.value = project.drums?.on ? project.drums.volume ?? 0.7 : 0;
    t.drumBus.connect(master);
    t.clickBus.gain.value = 0.9;
    t.clickBus.connect(ctx.destination); // the click is never in the mix
    const countInClicks = [];
    for (let i = 0; i < countIn; i++) {
      playClick(ctx, t0 + i * beat, i % project.beats === 0, t.clickBus);
      countInClicks.push(t0 + i * beat);
    }
    tp = t;
    const tick = () => {
      if (tp !== t) return;
      const now = ctx.currentTime;
      const horizon = now + AHEAD;
      // More loop passes as they come up.
      if (loop) {
        let last = t.segments[t.segments.length - 1];
        while (last.when + (last.to - last.from) < horizon + AHEAD) {
          last = { from: loop.in, to: loop.out, when: last.when + (last.to - last.from) };
          t.segments.push(last);
        }
      }
      // Regions, one segment at a time, a little ahead.
      while (t.scheduledSeg < t.segments.length && t.segments[t.scheduledSeg].when < horizon + AHEAD) {
        const seg = t.segments[t.scheduledSeg];
        t.sources.push(...scheduleRegions(ctx, t.trackOuts, project, buffers, { ...seg, to: Math.min(seg.to, 1e7) }, { mutedRanges, notBefore: now }));
        t.scheduledSeg += 1;
      }
      // Drums + click in the window [t.perc, horizon).
      if (horizon > t.perc) {
        for (const seg of t.segments) {
          const segEnd = seg.when + (Math.min(seg.to, 1e7) - seg.from);
          const a = Math.max(t.perc, seg.when);
          const b = Math.min(horizon, segEnd);
          if (b <= a) continue;
          const ta = seg.from + (a - seg.when);
          const tb = seg.from + (b - seg.when);
          if (project.drums?.on) {
            for (const h of drumHits(project.drums, project.bpm, project.beats, ta, tb)) playDrumHit(ctx, h.instrument, seg.when + (h.time - seg.from), h.velocity, t.drumBus);
          }
          if (t.click) for (const c of clickTimes(project.bpm, project.beats, ta, tb)) playClick(ctx, seg.when + (c.time - seg.from), c.accent, t.clickBus);
        }
        t.perc = horizon;
      }
      // Stop at the end / the post-roll.
      if (t.endAt != null) {
        const pos = timelineAt(t.segments, now);
        if (!t.ended && now >= T && (pos == null || pos >= t.endAt)) {
          t.ended = true;
          emit({ type: 'end', position: t.endAt });
        }
      }
    };
    tick();
    t.timer = setInterval(tick, TICK);
    emit({ type: 'play' });
    return { startAt: T, countInAt: t0, countInClicks };
  }

  function stop() {
    const r = stopTransport();
    emit({ type: 'stop' });
    return r;
  }

  /** { position, counting } of the running transport, or null. */
  function position() {
    if (!tp || !ctx) return null;
    const now = ctx.currentTime;
    if (now < tp.start) return { position: tp.segments[0].from, counting: true, countLeft: tp.start - now };
    const pos = timelineAt(tp.segments, now);
    const last = tp.segments[tp.segments.length - 1];
    return { position: pos ?? Math.min(last.to, last.from + (now - last.when)), counting: false };
  }

  /** Live mix changes (volume / mute / solo / drum level) while playing. */
  function setMix(project) {
    if (!tp) return;
    tp.project = project;
    for (const tr of project.tracks) {
      const g = tp.trackOuts.get(tr.id);
      if (g) g.gain.setTargetAtTime(trackLevel(project, tr), ctx.currentTime, 0.02);
    }
    tp.drumBus.gain.setTargetAtTime(project.drums?.on ? project.drums.volume ?? 0.7 : 0, ctx.currentTime, 0.02);
  }

  // ---- input ----
  /**
   * Open the input (once) and set it up for `sound` ('dry' | 'amp'). The
   * stream itself stays the same when only the sound changes — one input
   * path = one latency for the whole session.
   */
  async function openInput(sound) {
    ensureContext();
    if (rig && rig.sound === sound && rig.capture) return rig;
    let r = rig;
    if (!r) {
      r = { sound: null, live: null, amp: null, capture: null, analyser: null };
      rig = r;
      try {
        r.live = await openLiveInput(ctx);
      } catch (e) {
        if (rig === r) rig = null;
        throw e;
      }
    }
    try {
      r.capture?.dispose();
      r.amp?.dispose();
      try {
        r.analyser?.disconnect();
      } catch {
        /* gone */
      }
      r.capture = null;
      r.amp = null;
      let node = r.live.input;
      if (sound === 'amp') {
        r.amp = await createAmpEngine(ctx, r.live.input, loadCurrentSettings(), { monitor: headphonesConfirmed() });
        node = r.amp.recordOut;
      }
      r.analyser = ctx.createAnalyser();
      r.analyser.fftSize = 1024;
      node.connect(r.analyser);
      r.capture = await createCapture(ctx, node);
      r.sound = sound;
      if (ctx.state !== 'running') await ctx.resume();
      return r;
    } catch (e) {
      if (rig === r) closeInput();
      throw e;
    }
  }

  function closeInput() {
    const r = rig;
    rig = null;
    if (!r) return;
    r.capture?.dispose();
    r.amp?.dispose();
    r.live?.close();
  }

  function latency() {
    const s = savedLatency();
    if (s != null) return s;
    if (!ctx) return 0;
    return estimateLatency(ctx, rig?.live?.inputLatency ?? 0).total;
  }

  /**
   * Round-trip latency, measured: 6 clicks from the speaker, heard by the
   * mic (no headphones). Returns seconds, or throws if the clicks weren't
   * heard clearly / consistently.
   */
  async function measureLatency() {
    ensureContext();
    stopTransport();
    const r = await openInput('dry');
    const bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(ctx.destination);
    r.capture.start();
    // The input path settles during its first moments: wait, then listen to
    // 8 clicks and keep the later ones.
    await new Promise((res) => setTimeout(res, 1000));
    const first = ctx.currentTime + 0.25;
    const clicks = Array.from({ length: 8 }, (_, i) => first + i * 0.4);
    for (const c of clicks) playClick(ctx, c, true, bus, 1);
    await new Promise((res) => setTimeout(res, (clicks[7] - ctx.currentTime + 0.6) * 1000));
    const { samples, sampleRate, startTime } = await r.capture.stop();
    bus.disconnect();
    const deltas = measureClickDelays(samples, sampleRate, startTime, clicks, 2);
    if (deltas.length < 4) throw new Error('clicks not heard');
    deltas.sort((a, b) => a - b);
    const med = deltas[deltas.length >> 1];
    if (deltas[deltas.length - 2] - deltas[1] > 0.006) throw new Error('inconsistent');
    return med;
  }

  const levelBuf = new Float32Array(1024);
  function inputLevel() {
    return rig?.analyser ? readLevel(rig.analyser, levelBuf) : null;
  }
  function outputLevel() {
    return outAnalyser && tp ? readLevel(outAnalyser, levelBuf) : null;
  }

  async function dispose() {
    stopTransport();
    closeInput();
    listeners.clear();
    if (ctx) await ctx.close().catch(() => {});
    ctx = null;
  }

  return {
    ensureContext,
    get ctx() {
      return ctx;
    },
    get playing() {
      return !!tp;
    },
    get inputOpen() {
      return !!rig;
    },
    buffers,
    loadTakes,
    putBuffer,
    dropBuffer,
    decodeBlob,
    play,
    stop,
    position,
    setMix,
    openInput,
    closeInput,
    get capture() {
      return rig?.capture ?? null;
    },
    latency,
    measureLatency,
    inputLevel,
    outputLevel,
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    dispose,
  };
}
