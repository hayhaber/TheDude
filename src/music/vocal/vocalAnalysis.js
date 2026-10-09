// Turns the pitch track of one sung rep into feedback a singer can act on:
// not just "right/wrong", but HOW a note went — sharp or flat, scooped into,
// drifting, wobbly, late, in the wrong octave — plus siren continuity,
// breath length on held notes and vibrato rate/depth.
//
// frames: [{ t (s from the start of singing), midi (float) | null }]

import { targetAt } from './exercises';

const LATE_GRACE = 0.18; // a singer answers a little after the beat
const ATTACK = 0.14; // seconds counted as the note's attack

function median(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function std(a) {
  if (a.length < 2) return 0;
  const mean = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((x, y) => x + (y - mean) ** 2, 0) / (a.length - 1));
}

function slope(xs, ys) {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den ? num / den : 0;
}

/** Cents from target, folded to the nearest octave; and the octave offset. */
export function centsOff(midi, target) {
  const c = (midi - target) * 100;
  const oct = Math.round(c / 1200);
  return { cents: c - oct * 1200, octave: oct };
}

/** Score 0..100 from the typical deviation: ≤10 cents = 100, ≥100 = 0. */
function pitchScore(absCents) {
  return Math.max(0, Math.min(100, 100 - ((absCents - 10) * 100) / 90));
}

/** Tolerances by level (cents): in tune / acceptable. */
export function tolerance(level) {
  return level >= 2 ? { good: 15, ok: 35 } : { good: 25, ok: 50 };
}

/**
 * One fixed-pitch note. `frames` are already shifted by the singer's lag
 * (see estimateLag). `onset`: the note starts from silence (or a different
 * attack) — only then is a slide up into it a "scoop"; inside a legato line
 * the move from the previous note is a normal transition.
 */
export function analyzeNote(frames, note, level = 1, { onset = true } = {}) {
  const tol = tolerance(level);
  const trimStart = onset ? 0 : Math.min(0.07, note.dur * 0.2);
  const from = note.start + trimStart;
  const to = note.start + note.dur - Math.min(0.04, note.dur * 0.1);
  const inWin = frames.filter((f) => f.t >= from && f.t <= to);
  const voiced = inWin.filter((f) => f.midi != null);
  const coverage = voiced.length / Math.max(1, inWin.length);
  if (voiced.length < 3) {
    return { midi: note.midi, start: note.start, dur: note.dur, sung: false, coverage, score: 0, hit: false };
  }
  const firstT = voiced[0].t;
  const offs = voiced.map((f) => ({ t: f.t, ...centsOff(f.midi, note.midi) }));
  const octaves = median(offs.map((o) => o.octave));
  const attackLen = onset ? Math.min(ATTACK, note.dur * 0.35) : 0;
  const attack = offs.filter((o) => o.t - firstT <= attackLen).map((o) => o.cents);
  const bodyFrames = offs.filter((o) => o.t - firstT > attackLen);
  const use = bodyFrames.length >= 3 ? bodyFrames : offs;
  const body = use.map((o) => o.cents);
  const bodyT = use.map((o) => o.t);
  const cents = median(body);
  const absCents = median(body.map(Math.abs));
  const wobble = std(body);
  const drift = slope(bodyT, body) * Math.max(0, bodyT[bodyT.length - 1] - bodyT[0]);
  const attackCents = attack.length ? median(attack) : cents;
  const scoop = onset && attack.length >= 3 && attackCents - cents < -45 && Math.abs(cents) <= tol.ok;
  const late = firstT - note.start > Math.max(0.3, note.dur * 0.4);
  const score = Math.round(pitchScore(absCents) * Math.min(1, 0.35 + coverage));
  return {
    midi: note.midi,
    start: note.start,
    dur: note.dur,
    sung: true,
    coverage,
    cents: Math.round(cents),
    absCents: Math.round(absCents),
    wobble: Math.round(wobble),
    drift: Math.round(drift),
    attackCents: Math.round(attackCents),
    scoop,
    late,
    octave: octaves,
    hit: Math.abs(cents) <= tol.ok && coverage >= 0.35,
    good: Math.abs(cents) <= tol.good,
    score,
  };
}

/**
 * How late the singer is, overall (seconds): the shift that best lines the
 * pitch track up with the targets. Everyone answers a little after the
 * beat, and the audio path adds its own delay — notes are judged after
 * removing this, and a large value becomes the "late" tip.
 */
export function estimateLag(frames, rep) {
  const voiced = frames.filter((f) => f.midi != null);
  if (voiced.length < 5) return 0;
  let best = { lag: 0, cost: Infinity };
  for (let lag = 0; lag <= 0.6001; lag += 0.02) {
    let cost = 0;
    let n = 0;
    for (const f of voiced) {
      const tgt = targetAt(rep, f.t - lag);
      if (tgt == null) continue;
      cost += Math.min(300, Math.abs(centsOff(f.midi, tgt).cents));
      n += 1;
    }
    if (n < voiced.length * 0.3) continue;
    // Prefer the smaller lag when two fit about equally.
    const c = cost / n + lag * 20;
    if (c < best.cost) best = { lag, cost: c };
  }
  return Math.round(best.lag * 100) / 100;
}

/** A held note: how long it stayed in tune, steadiness, drift, vibrato. */
export function analyzeSustain(frames, note, level = 1, { vibrato = false } = {}) {
  const base = analyzeNote(frames, note, level);
  if (!base.sung) return { ...base, held: 0 };
  const tol = tolerance(level);
  // Longest run in tune (gaps under 0.15 s don't break it — a breathy frame).
  let held = 0;
  let runStart = null;
  let lastGood = null;
  for (const f of frames) {
    if (f.t < note.start || f.t > note.start + note.dur + LATE_GRACE) continue;
    const ok = f.midi != null && Math.abs(centsOff(f.midi, note.midi).cents) <= tol.ok * (vibrato ? 2.5 : 1);
    if (ok) {
      if (runStart == null || f.t - lastGood > 0.15) runStart = f.t;
      lastGood = f.t;
      held = Math.max(held, f.t - runStart);
    }
  }
  const out = { ...base, held: Math.round(held * 10) / 10, heldShare: Math.min(1, held / note.dur) };
  if (vibrato) Object.assign(out, measureVibrato(frames, note));
  // A sustain is scored on both tuning and how long it held. With vibrato
  // the pitch swings on purpose: judge its centre, not every frame.
  const tuning = vibrato ? pitchScore(Math.abs(base.cents)) * Math.min(1, 0.35 + base.coverage) : base.score;
  out.score = Math.round(tuning * (0.4 + 0.6 * out.heldShare));
  return out;
}

/** Vibrato rate (Hz) and width (cents, peak to peak) of a held note. */
export function measureVibrato(frames, note) {
  const pts = frames
    .filter((f) => f.midi != null && f.t >= note.start + 0.5 && f.t <= note.start + note.dur)
    .map((f) => ({ t: f.t, c: centsOff(f.midi, note.midi).cents }));
  if (pts.length < 20) return { rate: null, width: null };
  // Remove the slow trend (a moving average over ~0.4 s), keep the wobble.
  const detr = pts.map((p, i) => {
    const win = pts.filter((q) => Math.abs(q.t - p.t) <= 0.2);
    return { t: p.t, c: p.c - win.reduce((a, q) => a + q.c, 0) / win.length };
  });
  let crossings = 0;
  for (let i = 1; i < detr.length; i += 1) if (detr[i - 1].c < 0 !== detr[i].c < 0) crossings += 1;
  const span = detr[detr.length - 1].t - detr[0].t;
  const rate = span > 0 ? crossings / 2 / span : null;
  const width = std(detr.map((p) => p.c)) * 2 * Math.SQRT2;
  return { rate: rate && Math.round(rate * 10) / 10, width: Math.round(width) };
}

/** A siren / slide: how much of the slide was covered, and any breaks. */
export function analyzeGlide(frames, note, level = 1) {
  const tol = tolerance(level);
  const win = frames.filter((f) => f.t >= note.start && f.t <= note.start + note.dur + LATE_GRACE * 2);
  const voiced = win.filter((f) => f.midi != null);
  if (voiced.length < 5) return { glide: true, sung: false, score: 0, hit: false, coverage: 0, breaks: [] };
  // Compare with the target line, allowing the singer to lag a little.
  const errs = voiced.map((f) => {
    let best = Infinity;
    for (const lag of [0, 0.1, 0.2, 0.3]) {
      const tgt = targetAt({ targets: [note] }, Math.min(note.start + note.dur, Math.max(note.start, f.t - lag)));
      if (tgt != null) best = Math.min(best, Math.abs(centsOff(f.midi, tgt).cents));
    }
    return best;
  });
  const follow = errs.filter((e) => e <= Math.max(80, tol.ok * 2)).length / voiced.length;
  const reachedTop = Math.max(...voiced.map((f) => f.midi));
  const reachedLow = Math.min(...voiced.map((f) => f.midi));
  const top = Math.max(...note.glide.map((p) => p[1]));
  // Breaks: a sudden jump (register flip / crack) or a gap in the sound.
  const breaks = [];
  for (let i = 1; i < voiced.length; i += 1) {
    const a = voiced[i - 1];
    const b = voiced[i];
    const dt = b.t - a.t;
    if (dt < 0.09 && Math.abs(b.midi - a.midi) > 2.5) breaks.push({ t: b.t, midi: (a.midi + b.midi) / 2, kind: 'jump' });
    else if (dt > 0.3 && b.t < note.start + note.dur) breaks.push({ t: a.t, midi: a.midi, kind: 'gap' });
  }
  const coverage = voiced.length / Math.max(1, win.length);
  const missedTop = reachedTop < top - 1;
  const score = Math.round(100 * follow * (missedTop ? 0.75 : 1) * Math.max(0.4, 1 - breaks.length * 0.2));
  return {
    glide: true,
    sung: true,
    coverage,
    follow: Math.round(follow * 100),
    reachedTop,
    reachedLow,
    missedTop,
    breaks,
    hit: score >= 60,
    good: score >= 85,
    score,
  };
}

/** Analyse a whole rep. */
export function analyzeRep(frames, rep, ex, level = 1) {
  const lag = estimateLag(frames, rep);
  const shifted = lag ? frames.map((f) => ({ t: f.t - lag, midi: f.midi })) : frames;
  const notes = rep.targets.map((n, i) => {
    if (n.glide) return analyzeGlide(frames, n, level);
    if (ex.kind === 'sustain') return analyzeSustain(shifted, n, level, { vibrato: !!ex.vibrato });
    const prev = rep.targets[i - 1];
    const onset = !prev || prev.start + prev.dur < n.start - 0.1 || ex.kind === 'interval';
    return analyzeNote(shifted, n, level, { onset });
  });
  const score = Math.round(notes.reduce((a, n) => a + n.score, 0) / Math.max(1, notes.length));
  return { key: rep.key, notes, score, lag };
}

/**
 * Feedback for a finished exercise: the 1–3 things most worth working on,
 * as tip keys (texts live in i18n) with values to fill in.
 */
export function diagnose(results, ex, level = 1) {
  const notes = results.flatMap((r) => r.notes);
  const sung = notes.filter((n) => n.sung);
  const tips = [];
  if (!notes.length) return [{ key: 'skipped' }];
  if (notes.length && sung.length / notes.length < 0.6) {
    tips.push({ key: 'notHeard' });
    return tips;
  }
  const fixed = sung.filter((n) => !n.glide);
  const tol = tolerance(level);
  if (fixed.length) {
    const octaveOff = fixed.filter((n) => n.octave !== 0).length / fixed.length;
    if (octaveOff > 0.5) tips.push({ key: 'octave' });
    const meanCents = fixed.reduce((a, n) => a + n.cents, 0) / fixed.length;
    if (meanCents < -tol.good * 0.7) tips.push({ key: 'flat', cents: Math.round(-meanCents) });
    else if (meanCents > tol.good * 0.7) tips.push({ key: 'sharp', cents: Math.round(meanCents) });
    const scoops = fixed.filter((n) => n.scoop).length / fixed.length;
    if (scoops > 0.3) tips.push({ key: 'scoop' });
    if (!ex.vibrato) {
      const wob = median(fixed.filter((n) => n.dur >= 0.6).map((n) => n.wobble));
      if (wob != null && wob > (level >= 2 ? 18 : 28)) tips.push({ key: 'unsteady' });
    }
    const drifting = fixed.filter((n) => n.dur >= 1.2 && n.drift < -30).length;
    if (drifting && drifting / fixed.filter((n) => n.dur >= 1.2).length > 0.4) tips.push({ key: 'sag' });
    const lags = results.map((r) => r.lag ?? 0);
    if (ex.kind === 'pattern' && median(lags) > 0.32) tips.push({ key: 'late' });
    // High notes worse than low ones?
    if (fixed.length >= 6) {
      const sorted = [...fixed].sort((a, b) => a.midi - b.midi);
      const half = Math.floor(sorted.length / 2);
      const lowAvg = sorted.slice(0, half).reduce((a, n) => a + n.score, 0) / half;
      const highAvg = sorted.slice(-half).reduce((a, n) => a + n.score, 0) / half;
      if (lowAvg - highAvg > 18) tips.push({ key: 'highNotes' });
    }
    if (ex.kind === 'sustain' && !ex.vibrato) {
      const held = median(fixed.map((n) => n.heldShare ?? 1));
      if (held != null && held < 0.6) tips.push({ key: 'breath' });
    }
    if (ex.vibrato) {
      const rates = fixed.map((n) => n.rate).filter(Boolean);
      const widths = fixed.map((n) => n.width).filter(Boolean);
      const rate = median(rates);
      const width = median(widths);
      if (rate == null || width == null || width < 25) tips.push({ key: 'vibratoNone' });
      else if (rate > 7.5) tips.push({ key: 'vibratoFast', rate });
      else if (rate < 4) tips.push({ key: 'vibratoSlow', rate });
      else if (width > 220) tips.push({ key: 'vibratoWide', width });
      else tips.push({ key: 'vibratoGood', rate, width });
    }
  }
  const glides = sung.filter((n) => n.glide);
  if (glides.length) {
    if (glides.some((g) => g.breaks.some((b) => b.kind === 'jump'))) tips.push({ key: 'break' });
    if (glides.filter((g) => g.missedTop).length / glides.length > 0.4) tips.push({ key: 'notTop' });
  }
  if (!tips.length) tips.push({ key: 'great' });
  return tips.slice(0, 3);
}
