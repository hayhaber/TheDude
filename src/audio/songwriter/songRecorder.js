// Records a sung / played line for the Songwriter: its own live
// AudioContext (made in the tap — iOS), the Settings input, a count-in
// click on the same clock as the capture, so the take knows exactly where
// its beat 0 is. The click is pitched above the melody detector's range
// (> 1.4 kHz), so a click leaking into the mic never becomes a note.
//
// iPhone: while the mic is open iOS plays everything from the earpiece, so
// the input is closed after every take (`closeInput`) — same as the Recorder.

import { createLiveContext, openLiveInput, estimateLatency } from '../amp/liveInput';
import { createCapture, encodeWav, computePeaks } from '../recorder';
import { savedLatency, latencyFromCountIn } from '../studio/studioEngine';

export const IS_IOS =
  typeof navigator !== 'undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

function setAudioSession(type) {
  try {
    if (navigator.audioSession) navigator.audioSession.type = type;
  } catch {
    /* not supported */
  }
}

export function createSongRecorder() {
  let ctx = null;
  let rig = null;
  let cap = null;
  let analyser = null;
  let levelBuf = null;
  let take = null; // { t0, clicks, clickNodes, startedAt }

  function ensureContext() {
    if (ctx && ctx.state !== 'closed') {
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      return ctx;
    }
    ctx = createLiveContext();
    ctx.resume().catch(() => {});
    return ctx;
  }

  async function openInput() {
    if (rig) return;
    setAudioSession('auto');
    const c = ensureContext();
    rig = await openLiveInput(c);
    if (c.state !== 'running') {
      try {
        await Promise.race([c.resume(), new Promise((r) => setTimeout(r, 400))]);
      } catch {
        /* keep going */
      }
    }
    analyser = c.createAnalyser();
    analyser.fftSize = 1024;
    levelBuf = new Float32Array(analyser.fftSize);
    rig.input.connect(analyser);
    cap = await createCapture(c, rig.input);
  }

  function closeInput() {
    cap?.dispose();
    cap = null;
    try {
      analyser?.disconnect();
    } catch {
      /* gone */
    }
    analyser = null;
    rig?.close();
    rig = null;
  }

  function click(time, accent) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = accent ? 2400 : 1800;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.32, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    o.connect(g).connect(ctx.destination);
    o.start(time);
    o.stop(time + 0.06);
    return o;
  }

  /**
   * Starts a take. Call from the tap (it opens the mic the first time).
   * click: 'count' (one bar before), 'all' (all the way), 'off'.
   * Returns { downbeatAt } — context time of beat 0 (null with no click).
   */
  async function start({ bpm = 90, beatsPerBar = 4, click: mode = 'count', maxSeconds = 120 } = {}) {
    ensureContext();
    await openInput();
    const spb = 60 / bpm;
    const begin = ctx.currentTime + 0.15;
    const clicks = [];
    const nodes = [];
    if (mode !== 'off') {
      const total = mode === 'all' ? beatsPerBar + Math.ceil(maxSeconds / spb) : beatsPerBar;
      for (let k = 0; k < Math.min(total, beatsPerBar + 400); k += 1) {
        const t = begin + k * spb;
        clicks.push(t);
        nodes.push(click(t, k % beatsPerBar === 0));
      }
    }
    cap.start();
    take = { downbeatAt: mode === 'off' ? null : begin + beatsPerBar * spb, clicks, nodes, startedAt: ctx.currentTime, beatsPerBar, spb };
    return { downbeatAt: take.downbeatAt, begin };
  }

  /** Context time (for the count-in / beat display). */
  const now = () => (ctx ? ctx.currentTime : 0);

  /** Input level 0..1 (peak) for the meter. */
  function level() {
    if (!analyser) return 0;
    analyser.getFloatTimeDomainData(levelBuf);
    let p = 0;
    for (const v of levelBuf) p = Math.max(p, Math.abs(v));
    return p;
  }

  /**
   * Ends the take: { blob (WAV), samples, sampleRate, duration, peaks,
   * downbeat (s into the take, latency removed) | null, clicks (s into the
   * take, where the mic hears them) }.
   */
  async function stop() {
    const t = take;
    take = null;
    if (!t || !cap) return null;
    for (const n of t.nodes) {
      try {
        n.stop();
      } catch {
        /* done */
      }
    }
    const res = await cap.stop();
    if (IS_IOS) {
      closeInput();
      setAudioSession('playback');
    }
    const startTime = res.startTime ?? t.startedAt;
    const expected = savedLatency() ?? estimateLatency(ctx, rig?.inputLatency ?? 0).total;
    const counted = t.clicks.slice(0, t.beatsPerBar).filter((c) => c > startTime);
    const own = counted.length >= 3 ? latencyFromCountIn(res.samples, res.sampleRate, startTime, counted, expected) : null;
    const latency = own ?? expected;
    const downbeat = t.downbeatAt == null ? null : t.downbeatAt - startTime + latency;
    return {
      blob: encodeWav(res.samples, res.sampleRate),
      samples: res.samples,
      sampleRate: res.sampleRate,
      duration: res.samples.length / res.sampleRate,
      peaks: computePeaks(res.samples, 60).map((v) => Math.round(v * 100) / 100),
      downbeat,
      clicks: t.clicks.map((c) => c - startTime + latency).filter((c) => c >= 0),
      latency,
    };
  }

  function cancel() {
    if (!take) return;
    for (const n of take.nodes) {
      try {
        n.stop();
      } catch {
        /* done */
      }
    }
    take = null;
    cap?.stop().catch(() => {});
    if (IS_IOS) closeInput();
  }

  function dispose() {
    cancel();
    closeInput();
    if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
    ctx = null;
    if (IS_IOS) setAudioSession('auto');
  }

  return { start, stop, cancel, level, now, closeInput, dispose, isRecording: () => !!take };
}
