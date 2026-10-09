// Guided range test logic (pure, no audio). Modelled on how voice teachers
// and voice clinics (the "voice range profile" / phonetogram) measure a
// range: start from the singer's comfortable SPEAKING pitch, then the piano
// gives one note at a time and the singer sustains it on a vowel, stepping
// down until the voice can no longer hold a note, then up from the middle
// the same way. Only a note that is matched AND held counts. The extreme
// notes are "reachable"; the comfortable range (tessitura side) is a little
// inside them — strained edge notes (needed a retry, or wobbled) push it in.

export const MIN_TEST_MIDI = 33; // A1
export const MAX_TEST_MIDI = 96; // C7
export const MATCH_CENTS = 60; // within ±60¢ of the piano note
export const HOLD_SECONDS = 0.7; // held that long without a break
const STRAIN_SD = 30; // cents of wobble that count as strained

/** Median pitch of the voiced frames (speaking pitch), or null. */
export function speakingPitch(frames) {
  const v = frames.map((f) => f.midi).filter((m) => m != null).sort((a, b) => a - b);
  if (v.length < 20) return null;
  const mid = v[v.length >> 1];
  return Math.max(40, Math.min(76, Math.round(mid)));
}

/**
 * Did the singer hold `target` in frames after `from` (AudioContext time)?
 * Longest unbroken run within ±MATCH_CENTS (a single missing frame is
 * tolerated). Returns { ok, held, sd, cents }.
 */
export function heldMatch(frames, target, from) {
  let best = { held: 0, vals: [] };
  let run = [];
  let startCt = null;
  let lastCt = null;
  let gap = 0;
  const close = () => {
    if (run.length && lastCt - startCt > best.held) best = { held: lastCt - startCt, vals: run };
    run = [];
    startCt = null;
    gap = 0;
  };
  for (const f of frames) {
    if (f.ct < from) continue;
    const c = f.midi == null ? null : (f.midi - target) * 100;
    if (c != null && Math.abs(c) <= MATCH_CENTS) {
      if (startCt == null) startCt = f.ct;
      lastCt = f.ct;
      run.push(c);
      gap = 0;
    } else if (run.length && gap === 0 && f.midi == null) {
      gap = 1; // one dropped frame
    } else close();
  }
  close();
  const vals = best.vals;
  const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const sd = vals.length ? Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) : 0;
  return { ok: best.held >= HOLD_SECONDS, held: best.held, sd, cents: mean };
}

/**
 * One direction of the test (dir -1 = down, +1 = up). Whole tones while it is
 * easy, then semitones once a note fails; a note gets a second try; two
 * misses on the same note end the direction.
 */
export function createProbe(start, dir) {
  return { dir, step: 2, target: start, fails: 0, passed: [], done: false };
}

export function probeResult(p, ok, sd = 0) {
  const q = { ...p, passed: p.passed };
  if (ok) {
    q.passed = [...p.passed, { midi: p.target, retry: p.fails > 0, sd }];
    q.target = p.target + p.dir * p.step;
    // Back at the whole tone that already failed once: that miss counts.
    q.fails = q.target === p.missedAt ? 1 : 0;
  } else if (p.step === 2 && p.passed.length) {
    // Missed a whole tone: try the semitone in between, then go on by semitones.
    q.step = 1;
    q.missedAt = p.target;
    q.target = p.target - p.dir;
    q.fails = 0;
  } else if (p.fails >= 1 && !p.passed.length && (p.shifts ?? 0) < 4) {
    // Not even the starting note: it lies outside this voice — move toward
    // the other side (3 semitones) and start again.
    q.target = p.target - p.dir * 3;
    q.fails = 0;
    q.shifts = (p.shifts ?? 0) + 1;
  } else if (p.fails >= 1) {
    q.done = true;
  } else {
    q.fails = p.fails + 1;
  }
  if (q.target < MIN_TEST_MIDI || q.target > MAX_TEST_MIDI) q.done = true;
  return q;
}

/** The extreme note a finished probe reached (null if none was held). */
export function probeExtreme(p) {
  if (!p.passed.length) return null;
  const ms = p.passed.map((x) => x.midi);
  return p.dir < 0 ? Math.min(...ms) : Math.max(...ms);
}

/**
 * How many semitones to step in from the extreme for the comfortable edge:
 * 1, plus one for each strained note at that edge (retried or wobbly), up
 * to 4.
 */
export function edgeMargin(p) {
  const sorted = [...p.passed].sort((a, b) => (p.dir < 0 ? a.midi - b.midi : b.midi - a.midi));
  let strained = 0;
  for (const n of sorted) {
    if (n.retry || n.sd > STRAIN_SD) strained += 1;
    else break;
  }
  return Math.min(4, 1 + strained);
}

/** Full + comfortable range from the two probes. */
export function summarize(down, up) {
  const low = probeExtreme(down);
  const high = probeExtreme(up);
  if (low == null || high == null || high <= low) return null;
  let lowMargin = edgeMargin(down);
  let highMargin = edgeMargin(up);
  // Keep at least a fifth of comfortable range.
  while (high - highMargin - (low + lowMargin) < 7 && (lowMargin > 0 || highMargin > 0)) {
    if (highMargin >= lowMargin && highMargin > 0) highMargin -= 1;
    else lowMargin -= 1;
  }
  return { low, high, lowMargin, highMargin };
}
