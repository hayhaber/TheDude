// Lick Trainer — offline analysis of one recorded take.
//
// Pure functions, no React / no Web Audio: the recorder (audio/
// lickTrainerAudio.js) hands over the raw captured samples plus the
// AudioContext time of the first sample, and this module works out what was
// actually played and how it compares to the lick.
//
// Pipeline:
//   1. Onsets   — a fine RMS envelope (5ms blocks); a pick attack is a fast
//                 rise of several dB above the recent minimum.
//   2. Pitch    — McLeod pitch (pitchy) every ~5ms over a 2048-sample window,
//                 gated by clarity and level, median-smoothed.
//   3. Events   — the take split into played notes: a new event at every
//                 onset (picked note) and at every stable pitch change with
//                 no onset (hammer-on, pull-off, slide, release).
//   4. Align    — dynamic programming (edit-distance style) between the
//                 lick's expected notes and the detected events, scoring
//                 pitch agreement and timing, allowing missed and extra
//                 notes. Robust to a player who drifts or skips a note.
//   5. Judge    — per-note status + timing offset, bend height, vibrato
//                 width, then an overall score and plain-language advice.
//
// Offline (after the take) rather than live: every frame gets analyzed with
// no dropped animation frames, and a whole-take view is what makes
// alignment possible at all.
import { PitchDetector } from 'pitchy';

const PITCH_WINDOW = 2048;
const HOP = 256;
const RMS_BLOCK = 1024; // ≥ one period of the low E (12ms) so the level doesn't ripple with the waveform
const RMS_HOP = 128;
const MIN_HZ = 70;
const MAX_HZ = 1400;
const MIN_CLARITY = 0.85;

// Onset detector
const ONSET_ABOVE_FLOOR_DB = 12;
const ONSET_MIN_RISE_DB = 1;
const ONSET_REFRACTORY_S = 0.06;

// Segmentation
const PITCH_CHANGE_HOLD_S = 0.03; // a new pitch must hold this long to count
const PITCH_TOLERANCE = 0.35; // semitones around a rounded note that still count as that note
const STABLE_RANGE = 0.2; // max pitch wobble (semitones) across a hold for it to count as "arrived" — a bend sweeping through a semitone moves more than this
const SILENCE_GAP_S = 0.05;
const MIN_EVENT_FRAMES = 3;

// Alignment costs
const COST_MISSED = 2.2;
const COST_EXTRA_PICKED = 1.2;
const COST_EXTRA_LEGATO = 0.25; // pitch-change artifacts inside bends/vibrato/slides are cheap to ignore
const COST_WRONG_PITCH = 2.0;
const COST_OCTAVE = 0.6;
const TIMING_COST_SCALE_S = 0.12;
const MAX_MATCH_DT_S = 0.35;

// Judging
export const TIMING = { perfect: 30, good: 60, loose: 100 }; // ms
const LEGATO_TIMING_LEEWAY_MS = 30;
const BEND_TOLERANCE = 0.25; // semitones (±25 cents)
const VIBRATO_MIN_DEPTH = 0.15; // semitones, half peak-to-peak

const LEGATO = new Set(['hammer', 'pull', 'slide', 'release']);

export function hzToMidi(hz) {
  return 69 + 12 * Math.log2(hz / 440);
}

function median(values) {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function toDb(rms) {
  return 20 * Math.log10(Math.max(rms, 1e-7));
}

// ---- 1. Onsets ------------------------------------------------------------

export function rmsEnvelope(samples, sampleRate) {
  const out = [];
  for (let start = 0; start + RMS_BLOCK <= samples.length; start += RMS_HOP) {
    let sum = 0;
    for (let i = start; i < start + RMS_BLOCK; i += 1) sum += samples[i] * samples[i];
    out.push({ time: (start + RMS_BLOCK / 2) / sampleRate, db: toDb(Math.sqrt(sum / RMS_BLOCK)) });
  }
  return out;
}

function percentile(values, p) {
  if (values.length === 0) return -120;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

// 5ms-block level, for attack transients.
export function shortEnvelope(samples, sampleRate) {
  const out = [];
  for (let start = 0; start + 256 <= samples.length; start += 64) {
    let sum = 0;
    for (let i = start; i < start + 256; i += 1) sum += samples[i] * samples[i];
    out.push({ time: (start + 128) / sampleRate, db: toDb(Math.sqrt(sum / 256)) });
  }
  return out;
}

export function noiseFloorDb(envelope) {
  return Math.max(-70, percentile(envelope.map((e) => e.db), 0.1));
}

// ---- Spectral-flux onset detection ----------------------------------------
//
// A pick attack is a burst of new energy across the spectrum. Spectral flux
// (the summed increase of each frequency bin's log magnitude from one frame
// to the next) catches it even when the string before is still ringing at
// the same level, and — unlike a plain level envelope — it doesn't ripple
// with the waveform of low notes. Peaks above an adaptive (local mean +
// global offset) threshold are onsets. This is the standard approach in
// music-information-retrieval onset detection (Dixon 2006; Böck et al. 2012).
const FLUX_WINDOW = 1024;
const FLUX_HOP = 128;

function fftMag(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const ar = re[i + k];
        const ai = im[i + k];
        const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ar + br;
        im[i + k] = ai + bi;
        re[i + k + len / 2] = ar - br;
        im[i + k + len / 2] = ai - bi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

export function spectralFlux(samples, sampleRate) {
  const hann = new Float32Array(FLUX_WINDOW);
  for (let i = 0; i < FLUX_WINDOW; i += 1) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FLUX_WINDOW);
  const kLo = Math.max(1, Math.floor((60 * FLUX_WINDOW) / sampleRate));
  const kHi = Math.min(FLUX_WINDOW / 2, Math.ceil((8000 * FLUX_WINDOW) / sampleRate));
  const re = new Float64Array(FLUX_WINDOW);
  const im = new Float64Array(FLUX_WINDOW);
  let prev = null;
  const out = [];
  for (let start = 0; start + FLUX_WINDOW <= samples.length; start += FLUX_HOP) {
    for (let i = 0; i < FLUX_WINDOW; i += 1) {
      re[i] = samples[start + i] * hann[i];
      im[i] = 0;
    }
    fftMag(re, im);
    const mag = new Float32Array(kHi - kLo);
    let flux = 0;
    for (let k = kLo; k < kHi; k += 1) {
      const m = Math.log1p(100 * Math.hypot(re[k], im[k]));
      mag[k - kLo] = m;
      if (prev) flux += Math.max(0, m - prev[k - kLo]);
    }
    prev = mag;
    out.push({ time: (start + FLUX_WINDOW / 2) / sampleRate, flux });
  }
  return out;
}

// Times (seconds from the first sample) of pick attacks. `envelope`/
// `floorDb` gate out attacks in near-silence (noise, pick scrapes).
export function detectOnsets(envelope, floorDb, fluxFrames, shortEnv = null) {
  if (!fluxFrames || fluxFrames.length < 3) return [];
  const values = fluxFrames.map((f) => f.flux);
  const sorted = [...values].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const delta = med + 0.12 * (p95 - med);
  const hopS = fluxFrames[1].time - fluxFrames[0].time;
  const pre = Math.round(0.03 / hopS);
  const post = Math.round(0.01 / hopS);
  const localW = Math.round(0.1 / hopS);
  const envHop = envelope.length > 1 ? envelope[1].time - envelope[0].time : 1;
  const envAt = (t) => {
    const k = Math.round((t - envelope[0]?.time) / envHop);
    return envelope[Math.max(0, Math.min(envelope.length - 1, k))]?.db ?? -120;
  };
  const onsets = [];
  let last = -Infinity;
  for (let i = 1; i < values.length - 1; i += 1) {
    const v = values[i];
    let isMax = true;
    for (let j = Math.max(0, i - pre); j <= Math.min(values.length - 1, i + post); j += 1) {
      if (values[j] > v) {
        isMax = false;
        break;
      }
    }
    if (!isMax) continue;
    let sum = 0;
    let cnt = 0;
    for (let j = Math.max(0, i - localW); j <= Math.min(values.length - 1, i + post); j += 1) {
      sum += values[j];
      cnt += 1;
    }
    if (v < sum / cnt + delta) continue;
    const t = fluxFrames[i].time;
    if (t - last < ONSET_REFRACTORY_S) continue;
    const after = envAt(t + 0.015);
    if (after < floorDb + ONSET_ABOVE_FLOOR_DB) continue;
    // A real attack also adds level — a short transient peak above what
    // was sounding just before; a bend or vibrato moving through the
    // spectrum makes flux but no such peak. Peak-vs-peak so a low note's
    // waveform ripple counts equally on both sides.
    if (shortEnv) {
      const peakIn = (a, b) => {
        let m = -120;
        for (const e of shortEnv) if (e.time >= a && e.time <= b) m = Math.max(m, e.db);
        return m;
      };
      if (peakIn(t - 0.012, t + 0.02) - peakIn(t - 0.045, t - 0.015) < ONSET_MIN_RISE_DB) continue;
    } else if (after - envAt(t - 0.025) < ONSET_MIN_RISE_DB) continue;
    onsets.push(t);
    last = t;
  }
  return onsets;
}

// ---- 2. Pitch track -------------------------------------------------------

export function pitchTrack(samples, sampleRate, floorDb) {
  const detector = PitchDetector.forFloat32Array(PITCH_WINDOW);
  const frames = [];
  const gateDb = floorDb + 8;
  for (let c = PITCH_WINDOW / 2; c + PITCH_WINDOW / 2 <= samples.length; c += HOP) {
    const win = samples.subarray(c - PITCH_WINDOW / 2, c + PITCH_WINDOW / 2);
    let sum = 0;
    for (let i = PITCH_WINDOW / 2 - 256; i < PITCH_WINDOW / 2 + 256; i += 1) sum += win[i] * win[i];
    const db = toDb(Math.sqrt(sum / 512));
    let midi = null;
    if (db >= gateDb) {
      const [hz, clarity] = detector.findPitch(win, sampleRate);
      if (clarity >= MIN_CLARITY && hz >= MIN_HZ && hz <= MAX_HZ) midi = hzToMidi(hz);
    }
    frames.push({ time: c / sampleRate, midi, db });
  }
  // Median-of-3 over pitched neighbors knocks out single-frame octave
  // glitches without smearing real pitch changes.
  return frames.map((f, i) => {
    if (f.midi == null) return f;
    const vals = [frames[i - 1]?.midi, f.midi, frames[i + 1]?.midi].filter((v) => v != null);
    return { ...f, midi: median(vals) };
  });
}

// ---- 3. Events ------------------------------------------------------------

// The note an event "is": its first stable run of pitch (≥4 frames within
// tolerance of one semitone). Skips a slide's glide-in; for a bend it's the
// fretted note before the string rises. Null when the pitch never settles.
function stablePitch(pitched) {
  for (let i = 0; i + 4 <= pitched.length; i += 1) {
    const r = Math.round(pitched[i].midi);
    let run = 0;
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = i; k < pitched.length && run < 4; k += 1) {
      if (Math.round(pitched[k].midi) !== r || Math.abs(pitched[k].midi - r) > PITCH_TOLERANCE) break;
      lo = Math.min(lo, pitched[k].midi);
      hi = Math.max(hi, pitched[k].midi);
      if (hi - lo > STABLE_RANGE) break;
      run += 1;
    }
    if (run >= 4) return r;
    if (pitched[i].time - pitched[0].time > 0.2) break;
  }
  return null;
}

function closeEvent(ev, events) {
  if (!ev) return;
  const pitched = ev.frames.filter((f) => f.midi != null);
  if (pitched.length < MIN_EVENT_FRAMES) return;
  const stable = stablePitch(pitched);
  events.push({
    time: ev.time,
    hasOnset: ev.hasOnset,
    midi: stable ?? Math.round(median(pitched.slice(0, 8).map((f) => f.midi))),
    settled: stable != null,
    endTime: pitched[pitched.length - 1].time,
  });
}

// An attack whose pitch never settled, immediately followed by a legato
// event (the pitch it glided to) is one note: a picked slide-in, or a pick
// straight into a fast bend. Keep the attack's time, take the settled pitch.
function mergeGlides(events) {
  const out = [];
  for (const ev of events) {
    const prev = out[out.length - 1];
    if (prev && !prev.settled && !ev.hasOnset && ev.time - prev.endTime <= 0.03) {
      out[out.length - 1] = { ...prev, midi: ev.midi, settled: ev.settled, endTime: ev.endTime };
      continue;
    }
    out.push(ev);
  }
  return out;
}

export function segmentEvents(frames, onsets) {
  const events = [];
  const hopS = frames.length > 1 ? frames[1].time - frames[0].time : HOP / 48000;
  const holdFrames = Math.max(2, Math.round(PITCH_CHANGE_HOLD_S / hopS));
  const silenceFrames = Math.max(2, Math.round(SILENCE_GAP_S / hopS));
  let onsetIdx = 0;
  let current = null;
  let silent = 0;
  let lastOnNoteTime = null; // last frame still sitting on the current note
  let awayFrames = 0; // consecutive frames bent/slid well away from the current note
  let wasAway = false; // the pitch left the note (a bend) — coming back is a new note (the release)
  const awayNeeded = Math.max(2, Math.round(0.04 / hopS));

  for (let i = 0; i < frames.length; i += 1) {
    const f = frames[i];
    // A pick attack starts a new event.
    while (onsetIdx < onsets.length && onsets[onsetIdx] <= f.time) {
      closeEvent(current, events);
      current = { time: onsets[onsetIdx], hasOnset: true, frames: [], note: null };
      onsetIdx += 1;
      awayFrames = 0;
      wasAway = false;
    }

    if (f.midi == null) {
      silent += 1;
      if (current && silent >= silenceFrames) {
        closeEvent(current, events);
        current = null;
      }
      continue;
    }
    silent = 0;

    if (!current) {
      // Pitched sound with no detected attack (e.g. a hammer-on from
      // nothing, or a very soft pick) — still an event.
      current = { time: f.time, hasOnset: false, frames: [], note: null };
    }

    if (current.note == null) {
      current.frames.push(f);
      const pitched = current.frames.filter((x) => x.midi != null);
      if (pitched.length >= 3) current.note = Math.round(median(pitched.slice(0, 5).map((x) => x.midi)));
      lastOnNoteTime = f.time;
      continue;
    }
    const onNote = Math.round(f.midi) === current.note && Math.abs(f.midi - current.note) <= PITCH_TOLERANCE;
    if (Math.abs(f.midi - current.note) >= 0.8) {
      awayFrames += 1;
      if (awayFrames >= awayNeeded) wasAway = true;
    } else awayFrames = 0;
    if (onNote && !wasAway) lastOnNoteTime = f.time;

    // Stable pitch change without an attack: legato note. Needs to hold for
    // PITCH_CHANGE_HOLD_S so bends/vibrato sweeping through don't split.
    const rounded = Math.round(f.midi);
    if ((rounded !== current.note || wasAway) && Math.abs(f.midi - rounded) <= PITCH_TOLERANCE) {
      let hold = 1;
      let lo = f.midi;
      let hi = f.midi;
      for (let j = i + 1; j < frames.length && hold < holdFrames; j += 1) {
        const g = frames[j];
        if (g.midi == null || Math.round(g.midi) !== rounded || Math.abs(g.midi - rounded) > PITCH_TOLERANCE) break;
        if (onsetIdx < onsets.length && onsets[onsetIdx] <= g.time) break;
        lo = Math.min(lo, g.midi);
        hi = Math.max(hi, g.midi);
        if (hi - lo > STABLE_RANGE) break;
        hold += 1;
      }
      if (hold >= holdFrames) {
        closeEvent(current, events);
        // A slide/release glides before it settles — the note began where
        // the pitch left the previous one, not where it arrived.
        // (After a bend, the release starts where the pitch began to fall.)
        let glideStart = lastOnNoteTime != null && f.time - lastOnNoteTime < 0.2 ? lastOnNoteTime + hopS : f.time;
        if (wasAway && rounded === current.note) {
          let k = i - 1;
          while (k > 0 && frames[k].midi != null && frames[k - 1].midi != null && frames[k - 1].midi > frames[k].midi + 0.02) k -= 1;
          glideStart = frames[Math.max(0, k)].time;
        }
        current = { time: glideStart, hasOnset: false, frames: [f], note: rounded };
        lastOnNoteTime = f.time;
        awayFrames = 0;
        wasAway = false;
        continue;
      }
    }
    current.frames.push(f);
  }
  closeEvent(current, events);
  return mergeGlides(events);
}

// ---- 4. Alignment ---------------------------------------------------------

function pitchCost(exp, ev) {
  const ok = [exp.midi];
  if (exp.technique === 'bend' || exp.technique === 'release') ok.push(exp.midi + (exp.bend ?? 2));
  if (ok.includes(ev.midi)) return { cost: 0, kind: 'ok' };
  if (ok.some((m) => Math.abs(ev.midi - m) === 12)) return { cost: COST_OCTAVE, kind: 'octave' };
  return { cost: COST_WRONG_PITCH, kind: 'wrong' };
}

// expected: [{ time (s, performance timeline), midi, technique, bend }]
// events:   [{ time (s, same timeline), midi, hasOnset }]
// Returns, per expected note, the matched event index or -1, plus the
// indexes of events left unmatched.
export function alignNotes(expected, events) {
  const n = expected.length;
  const m = events.length;
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const B = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1)); // 1=match 2=missed 3=extra
  const extraCost = (ev) => (ev.hasOnset ? COST_EXTRA_PICKED : COST_EXTRA_LEGATO);
  for (let i = 1; i <= n; i += 1) {
    D[i][0] = D[i - 1][0] + COST_MISSED;
    B[i][0] = 2;
  }
  for (let j = 1; j <= m; j += 1) {
    D[0][j] = D[0][j - 1] + extraCost(events[j - 1]);
    B[0][j] = 3;
  }
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const e = expected[i - 1];
      const ev = events[j - 1];
      const dt = Math.abs(ev.time - e.time);
      let best = D[i - 1][j] + COST_MISSED;
      let move = 2;
      const extra = D[i][j - 1] + extraCost(ev);
      if (extra < best) {
        best = extra;
        move = 3;
      }
      if (dt <= MAX_MATCH_DT_S) {
        const match = D[i - 1][j - 1] + pitchCost(e, ev).cost + Math.min(dt / TIMING_COST_SCALE_S, 2.5);
        if (match <= best) {
          best = match;
          move = 1;
        }
      }
      D[i][j] = best;
      B[i][j] = move;
    }
  }
  const matchOf = new Array(n).fill(-1);
  const extras = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const move = B[i][j];
    if (move === 1) {
      matchOf[i - 1] = j - 1;
      i -= 1;
      j -= 1;
    } else if (move === 2) {
      i -= 1;
    } else {
      extras.push(j - 1);
      j -= 1;
    }
  }
  return { matchOf, extras: extras.reverse() };
}

// ---- 5. Judging -----------------------------------------------------------

function framesBetween(frames, t0, t1) {
  return frames.filter((f) => f.time >= t0 && f.time <= t1 && f.midi != null);
}

// How high a bend actually went (semitones above the fretted note).
function measureBend(frames, t0, t1, baseMidi, withVibrato = false) {
  const fr = framesBetween(frames, t0, t1);
  if (fr.length < 3) return null;
  // A bend held with vibrato oscillates around its target — its center
  // (median of the settled second half), not its peak, is the bend height.
  if (withVibrato && fr.length >= 12) return median(fr.slice(Math.floor(fr.length / 2)).map((f) => f.midi)) - baseMidi;
  // 3-frame running median, then the top — a sustained peak, not a spike.
  const sm = fr.map((f, i) => median([fr[i - 1]?.midi, f.midi, fr[i + 1]?.midi].filter((v) => v != null)));
  return Math.max(...sm) - baseMidi;
}

function measureRelease(frames, t0, t1, baseMidi) {
  const fr = framesBetween(frames, t0, t1);
  if (fr.length < 4) return null;
  const startHeight = median(fr.slice(0, 3).map((f) => f.midi)) - baseMidi;
  const endHeight = median(fr.slice(-3).map((f) => f.midi)) - baseMidi;
  return { startHeight, endHeight };
}

// Vibrato width: half peak-to-peak of the pitch after removing its slow
// trend, over the second half of the note (after any bend has settled).
function measureVibrato(frames, t0, t1) {
  const fr = framesBetween(frames, t0 + (t1 - t0) * 0.35, t1);
  if (fr.length < 12) return null;
  const hopS = fr[1].time - fr[0].time;
  const half = Math.max(2, Math.round(0.12 / hopS));
  const detrended = fr.map((f, i) => {
    const w = fr.slice(Math.max(0, i - half), i + half + 1).map((x) => x.midi);
    return f.midi - w.reduce((a, b) => a + b, 0) / w.length;
  });
  const sorted = [...detrended].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.1)];
  const hi = sorted[Math.floor(sorted.length * 0.9)];
  return (hi - lo) / 2;
}

function timingClass(absMs, legato) {
  const leeway = legato ? LEGATO_TIMING_LEEWAY_MS : 0;
  if (absMs <= TIMING.perfect + leeway) return 'perfect';
  if (absMs <= TIMING.good + leeway) return 'good';
  if (absMs <= TIMING.loose + leeway) return 'loose';
  return 'off';
}

/**
 * Analyze one take.
 * @param {object} p
 * @param {Float32Array} p.samples      recorded mono samples
 * @param {number} p.sampleRate
 * @param {number} p.t0                 AudioContext time of samples[0]
 * @param {number} p.latency            seconds between an event in the room and its capture (calibrated)
 * @param {Array} p.expected            [{ time (ctx s), duration (s), midi, technique, bend, vibrato }]
 */
export function analyzeTake({ samples, sampleRate, t0, latency = 0, expected, clickTimes = [] }) {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) peak = Math.max(peak, Math.abs(samples[i]));
  const envelope = rmsEnvelope(samples, sampleRate);
  const floorDb = noiseFloorDb(envelope);
  const onsetsRel = detectOnsets(envelope, floorDb, spectralFlux(samples, sampleRate), shortEnvelope(samples, sampleRate));
  const framesRel = pitchTrack(samples, sampleRate, floorDb);

  // Everything onto the performance timeline (ctx time, minus latency).
  const shift = t0 - latency;
  const onsets = onsetsRel.map((t) => t + shift);
  const frames = framesRel.map((f) => ({ ...f, time: f.time + shift }));
  // Metronome clicks leaking from speakers into a room mic show up as short
  // attacks right on the click — drop short events that sit on a click, and
  // anything well before the first note (the count-in).
  const firstTime = expected.length ? expected[0].time : 0;
  // A leaked click is captured `latency` after it was scheduled — the same
  // delay the performance timeline removes — so it lands on its own time.
  const clicks = clickTimes;
  const segmented = segmentEvents(frames, onsets);
  const events = segmented.filter((ev, k) => {
    if (ev.time < firstTime - 0.3) return false;
    const onClick = clicks.some((c) => ev.time >= c - 0.015 && ev.time <= c + 0.05);
    if (!onClick || ev.endTime - ev.time >= 0.08) return true;
    // Short, but the string keeps sounding into the next (legato) event —
    // a real note that happens to fall on the beat, not a click.
    const next = segmented[k + 1];
    return !!(next && !next.hasOnset && next.time - ev.endTime <= 0.03);
  });

  const signal = {
    peak,
    clipped: peak >= 0.99,
    tooQuiet: events.length === 0 || peak < 0.02,
  };

  const { matchOf, extras } = alignNotes(expected, events);

  const notes = expected.map((e, i) => {
    const j = matchOf[i];
    const nextTime = expected[i + 1]?.time ?? e.time + e.duration;
    // Up to (not into) the next note.
    const windowEnd = Math.min(e.time + e.duration, nextTime) - 0.015;
    if (j < 0) return { index: i, status: 'missed' };
    const ev = events[j];
    const pc = pitchCost(e, ev);
    const offsetMs = Math.round((ev.time - e.time) * 1000);
    const legato = LEGATO.has(e.technique);
    const result = {
      index: i,
      playedMidi: ev.midi,
      offsetMs,
      timing: timingClass(Math.abs(offsetMs), legato),
      pitch: pc.kind, // ok | octave | wrong
      status: 'ok',
    };
    const start = ev.time;
    // Shifted by how early/late the note was actually played.
    // Never past the start of whatever was actually played next.
    const nextEv = matchOf[i + 1] != null && matchOf[i + 1] >= 0 ? events[matchOf[i + 1]] : null;
    const hardEnd = nextEv ? nextEv.time - 0.01 : Infinity;
    const end = Math.min(hardEnd, Math.max(windowEnd + (ev.time - e.time), start + 0.1));
    if (e.technique === 'bend') {
      const height = measureBend(frames, start, end, e.midi, e.vibrato);
      if (height != null) {
        result.bend = { target: e.bend ?? 2, reached: Math.round(height * 100) / 100 };
        result.bend.ok = Math.abs(height - result.bend.target) <= BEND_TOLERANCE;
      }
    }
    if (e.technique === 'release') {
      const rel = measureRelease(frames, start - 0.06, end, e.midi);
      if (rel) result.release = { ...rel, ok: Math.abs(rel.endHeight) <= BEND_TOLERANCE };
    }
    // Vibrato needs time to be heard (≈2 cycles); on a short note it's not judged.
    if (e.vibrato && e.duration >= 0.35) {
      const depth = measureVibrato(frames, start, end);
      if (depth != null) result.vibrato = { depth: Math.round(depth * 100) / 100, ok: depth >= VIBRATO_MIN_DEPTH };
    }
    if (pc.kind === 'wrong') result.status = 'wrong';
    else if (result.timing === 'off' || result.timing === 'loose') result.status = 'timing';
    else if ((result.bend && !result.bend.ok) || (result.vibrato && !result.vibrato.ok) || (result.release && !result.release.ok))
      result.status = 'technique';
    return result;
  });

  // Unmatched events: picked ones are extra notes. Unpicked ones are usually
  // artifacts of a bend/vibrato/slide on the note before — but a settled,
  // clearly different pitch that no technique explains is an extra note too
  // (e.g. an unintended hammer-on).
  const matchedAt = expected.map((e, i) => (matchOf[i] >= 0 ? events[matchOf[i]].time : null));
  const extraNotes = extras
    .map((j) => events[j])
    .filter((ev) => {
      if (ev.hasOnset) return true;
      if (!ev.settled || ev.endTime - ev.time < 0.06) return false;
      let k = -1;
      for (let i = 0; i < expected.length; i += 1) if (matchedAt[i] != null && matchedAt[i] <= ev.time) k = i;
      if (k < 0) return true;
      const e = expected[k];
      const top = e.midi + (e.technique === 'bend' || e.technique === 'release' ? e.bend ?? 2 : 0);
      const explained = (e.technique || e.vibrato) && ev.midi >= e.midi - 1 && ev.midi <= top + 1;
      const sameAsNext = expected[k + 1] && Math.abs(ev.midi - expected[k + 1].midi) === 0;
      return !explained && !sameAsNext && ev.midi !== e.midi;
    });
  return { notes, extras: extraNotes, signal, summary: summarize(notes, extraNotes, expected) };
}

// ---- Score & advice -------------------------------------------------------

export function summarize(notes, extras, expected) {
  const total = notes.length;
  const played = notes.filter((n) => n.status !== 'missed');
  const correct = played.filter((n) => n.pitch !== 'wrong');
  const pitchScore = total ? correct.length / total : 0;

  const timingPoints = correct.map((n) => {
    const legato = LEGATO.has(expected[n.index].technique);
    const a = Math.max(0, Math.abs(n.offsetMs) - (legato ? 55 : 25));
    return Math.max(0, 1 - a / 125);
  });
  const timingScore = timingPoints.length ? timingPoints.reduce((a, b) => a + b, 0) / timingPoints.length : 0;

  const techChecks = [];
  for (const n of correct) {
    if (n.bend) techChecks.push(n.bend.ok ? 1 : Math.abs(n.bend.reached - n.bend.target) <= 0.5 ? 0.5 : 0);
    if (n.release) techChecks.push(n.release.ok ? 1 : 0.5);
    if (n.vibrato) techChecks.push(n.vibrato.ok ? 1 : 0);
  }
  const techniqueScore = techChecks.length ? techChecks.reduce((a, b) => a + b, 0) / techChecks.length : null;

  const weights = techniqueScore == null ? { p: 0.62, t: 0.38, k: 0 } : { p: 0.55, t: 0.3, k: 0.15 };
  const extraPenalty = Math.min(0.15, extras.length * 0.03);
  const score = Math.max(
    0,
    Math.round(100 * (weights.p * pitchScore + weights.t * timingScore + weights.k * (techniqueScore ?? 0) - extraPenalty))
  );

  // Tendencies — only when there's enough data to be meaningful.
  const pickedOffsets = correct.filter((n) => !LEGATO.has(expected[n.index].technique)).map((n) => n.offsetMs);
  const meanOffset = pickedOffsets.length >= 3 ? pickedOffsets.reduce((a, b) => a + b, 0) / pickedOffsets.length : 0;
  const spread =
    pickedOffsets.length >= 3
      ? Math.sqrt(pickedOffsets.reduce((a, b) => a + (b - meanOffset) ** 2, 0) / pickedOffsets.length)
      : 0;
  const bends = correct.filter((n) => n.bend).map((n) => n.bend.reached - n.bend.target);
  const meanBendError = bends.length ? bends.reduce((a, b) => a + b, 0) / bends.length : 0;

  const tips = [];
  const missed = notes.filter((n) => n.status === 'missed').length;
  const wrong = notes.filter((n) => n.status === 'wrong').length;
  if (missed) tips.push({ key: 'missed', count: missed });
  if (wrong) tips.push({ key: 'wrong', count: wrong });
  if (meanOffset > 25) tips.push({ key: 'dragging', ms: Math.round(meanOffset) });
  if (meanOffset < -25) tips.push({ key: 'rushing', ms: Math.round(-meanOffset) });
  if (spread > 40) tips.push({ key: 'unsteady', ms: Math.round(spread) });
  if (bends.length && meanBendError < -BEND_TOLERANCE) tips.push({ key: 'bendsFlat', cents: Math.round(-meanBendError * 100) });
  if (bends.length && meanBendError > BEND_TOLERANCE) tips.push({ key: 'bendsSharp', cents: Math.round(meanBendError * 100) });
  if (correct.some((n) => n.vibrato && !n.vibrato.ok)) tips.push({ key: 'vibratoNarrow' });
  if (extras.length) tips.push({ key: 'extra', count: extras.length });

  // The hardest stretch: the window of 4 consecutive notes with the most
  // problems — what to loop next.
  let focus = null;
  if (total >= 5) {
    let bestBad = 0;
    for (let s = 0; s + 4 <= total; s += 1) {
      const bad = notes.slice(s, s + 4).filter((n) => n.status !== 'ok').length;
      if (bad > bestBad) {
        bestBad = bad;
        focus = { from: s, to: s + 3 };
      }
    }
    if (bestBad < 2) focus = null;
  }

  let verdict;
  // "Clean" means clean on every axis — right notes AND in time AND no
  // stray notes — not just a high average.
  const flagged = notes.filter((n) => n.status === 'timing' || n.status === 'technique').length;
  if (score >= 90 && missed === 0 && wrong === 0 && flagged === 0 && extras.length === 0 && timingScore >= 0.85 && Math.abs(meanOffset) <= 35)
    verdict = 'tempoUp';
  else if (score >= 75) verdict = 'almost';
  else if (score >= 50) verdict = 'keepGoing';
  else verdict = 'slowDown';

  return {
    score,
    pitchScore,
    timingScore,
    techniqueScore,
    meanOffsetMs: Math.round(meanOffset),
    spreadMs: Math.round(spread),
    correct: correct.length,
    total,
    tips,
    focus,
    verdict,
  };
}

// ---- Latency calibration ----------------------------------------------------

// The player picks a note on each of N clicks. Returns the median delay
// between click time and captured attack (seconds), or null if too few
// clicks were answered.
export function estimateLatency({ samples, sampleRate, t0, clickTimes }) {
  const envelope = rmsEnvelope(samples, sampleRate);
  const floorDb = noiseFloorDb(envelope);
  // Only attacks followed by a sustained pitch count — a click leaking into
  // a room mic is short and unpitched, a picked string is neither.
  const frames = pitchTrack(samples, sampleRate, floorDb);
  const onsets = detectOnsets(envelope, floorDb, spectralFlux(samples, sampleRate), shortEnvelope(samples, sampleRate))
    .filter((o) => frames.filter((f) => f.midi != null && f.time >= o - 0.01 && f.time <= o + 0.05).length >= 4)
    .map((t) => t + t0);
  const deltas = [];
  for (const c of clickTimes) {
    const cand = onsets.filter((o) => o >= c - 0.05 && o <= c + 0.45);
    if (cand.length) deltas.push(cand[0] - c);
  }
  if (deltas.length < Math.ceil(clickTimes.length * 0.6)) return null;
  return median(deltas);
}
