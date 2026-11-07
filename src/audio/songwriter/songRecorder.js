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
    let c2 = ensureContext();
    rig = await openLiveInput(c2);
    const settle = (p) => Promise.race([p.catch(() => {}), new Promise((r) => setTimeout(r, 400))]);
    if (c2.state !== 'running') await settle(c2.resume());
    // iOS: a context made outside a tap (e.g. the Idea shortcut recording at
    // once) can stay suspended = a silent take. WebKit lets a page that is
    // capturing start a NEW context without a gesture — the tuner's fix.
    if (c2.state !== 'running') {
      rig.close();
      rig = null;
      c2.close().catch(() => {});
      ctx = createLiveContext();
      c2 = ctx;
      await settle(c2.resume());
      rig = await openLiveInput(c2);
      if (c2.state !== 'running') await settle(c2.resume());
    }
    analyser = c2.createAnalyser();
    analyser.fftSize = 1024;
    levelBuf = new Float32Array(analyser.fftSize);
    rig.input.connect(analyser);
    cap = await createCapture(c2, rig.input);
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

  /** The samples for the meter: the capture's own (works on iOS), else the analyser's. */
  function frame() {
    const r = cap?.recent(1024);
    if (r) return r;
    if (!analyser) return null;
    analyser.getFloatTimeDomainData(levelBuf);
    return levelBuf;
  }

  /** Input level 0..1 (peak) for the meter. */
  function level() {
    const f = frame();
    if (!f) return 0;
    let p = 0;
    for (const v of f) p = Math.max(p, Math.abs(v));
    return p;
  }

  /**
   * Equalizer-style bands for the live meter: n values 0..1, the energy in
   * log-spaced bands across the voice / guitar range (110 Hz – 4 kHz),
   * Goertzel per band centre, shown on a -60..0 dB scale.
   */
  function bands(n = 12) {
    const f = frame();
    const out = new Array(n).fill(0);
    if (!f || !ctx) return out;
    const sr = ctx.sampleRate;
    const N = f.length;
    for (let b = 0; b < n; b += 1) {
      const hz = 110 * Math.pow(4000 / 110, b / (n - 1));
      const w = (2 * Math.PI * hz) / sr;
      const coeff = 2 * Math.cos(w);
      let s1 = 0;
      let s2 = 0;
      for (let i = 0; i < N; i += 1) {
        const win = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
        const s0 = f[i] * win + coeff * s1 - s2;
        s2 = s1;
        s1 = s0;
      }
      const mag = Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2)) / (N / 4);
      const db = 20 * Math.log10(mag + 1e-9);
      out[b] = Math.max(0, Math.min(1, (db + 60) / 60));
    }
    return out;
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

  return { start, stop, cancel, level, bands, now, closeInput, dispose, isRecording: () => !!take };
}
