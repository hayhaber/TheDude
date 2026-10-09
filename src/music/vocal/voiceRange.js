// The singer's measured range, the voice type it suggests, and how an
// exercise pattern is moved through that range key by key (the way a
// voice teacher walks a pattern up by semitones on the piano, then back).

const STORAGE_KEY = 'dudestar-vocal-range';

// Typical comfortable ranges (MIDI). Used to suggest a voice type and as the
// starting range before the singer has taken the range test.
export const VOICE_TYPES = [
  { key: 'bass', low: 40, high: 64 }, // E2–E4
  { key: 'baritone', low: 45, high: 67 }, // A2–G4
  { key: 'tenor', low: 48, high: 72 }, // C3–C5
  { key: 'alto', low: 53, high: 77 }, // F3–F5
  { key: 'mezzo', low: 57, high: 81 }, // A3–A5
  { key: 'soprano', low: 60, high: 84 }, // C4–C6
];

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function midiName(midi) {
  const m = Math.round(midi);
  return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
}

export function hzToMidi(hz) {
  return 69 + 12 * Math.log2(hz / 440);
}

export function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** The voice type whose typical range overlaps the measured one best. */
export function classifyVoice(low, high) {
  let best = null;
  for (const v of VOICE_TYPES) {
    const overlap = Math.max(0, Math.min(high, v.high) - Math.max(low, v.low));
    const miss = Math.abs(low - v.low) + Math.abs(high - v.high);
    const score = overlap * 2 - miss;
    if (!best || score > best.score) best = { key: v.key, score };
  }
  return best?.key ?? null;
}

export function loadRange() {
  try {
    const r = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (r && Number.isFinite(r.low) && Number.isFinite(r.high) && r.high > r.low) return r;
  } catch {
    /* no saved range */
  }
  return null;
}

/**
 * `extra`: { lowMargin, highMargin } — semitones from each extreme to the
 * comfortable edge (from the guided test), and `speaking` (MIDI).
 */
export function saveRange(low, high, extra = {}) {
  const prev = loadRange();
  const history = [...(prev?.history ?? []), { low, high, at: Date.now() }].slice(-30);
  const r = { low, high, ...extra, measuredAt: Date.now(), history };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  } catch {
    /* storage unavailable: kept for this session only */
  }
  return r;
}

/** A default range when no test has been taken yet (a middle voice). */
export const DEFAULT_RANGE = { low: 48, high: 67, isDefault: true }; // C3–G4: comfortable for most adult voices

/**
 * The comfortable part of the range used for exercises: the extreme notes a
 * range test finds are reachable but strained, so leave a margin.
 */
export function workingRange(range, { edge = false } = {}) {
  if (edge) return { low: range.low, high: range.high };
  return comfortRange(range);
}

/** The comfortable range: measured margins when the guided test set them, else 2 semitones in. */
export function comfortRange(range) {
  const lm = Number.isFinite(range.lowMargin) ? range.lowMargin : 2;
  const hm = Number.isFinite(range.highMargin) ? range.highMargin : 2;
  return { low: range.low + lm, high: range.high - hm };
}

/** Voice type from the comfortable range (tessitura counts more than the extremes). */
export function voiceOf(range) {
  if (!range) return null;
  const c = comfortRange(range);
  return classifyVoice(c.low - 2, c.high + 2);
}

/** Days since the range was measured (null when never). */
export function rangeAgeDays(range) {
  return range?.measuredAt ? Math.floor((Date.now() - range.measuredAt) / 86400000) : null;
}

/**
 * Keys (root MIDI notes) for a pattern spanning offsets [minOff..maxOff]
 * semitones from its root: up by semitone from the lowest key that fits,
 * then back down, like a teacher at the piano. `maxKeys` caps the walk.
 */
export function keysForPattern(offsets, range, { maxKeys = 8, startAt = null } = {}) {
  const minOff = Math.min(...offsets);
  const maxOff = Math.max(...offsets);
  const lowestRoot = range.low - minOff;
  const highestRoot = range.high - maxOff;
  if (highestRoot < lowestRoot) {
    // The pattern is wider than the range: one key, centred.
    return [Math.round((range.low + range.high) / 2 - (minOff + maxOff) / 2)];
  }
  const first = startAt != null ? Math.max(lowestRoot, Math.min(highestRoot, startAt)) : lowestRoot;
  const up = [];
  for (let k = first; k <= highestRoot && up.length < Math.ceil(maxKeys / 2) + 1; k += 1) up.push(k);
  const down = up.slice(0, -1).reverse();
  return [...up, ...down].slice(0, maxKeys);
}

/** A random note inside the working range (for pitch matching). */
export function randomNoteIn(range, rand = Math.random) {
  return range.low + Math.floor(rand() * (range.high - range.low + 1));
}
