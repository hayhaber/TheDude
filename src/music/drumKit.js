// The drum machine's full kit and the user's own patterns (step sequencer,
// 2026-10-17). Pure — no audio, no React.
//
// A pattern has the same shape as a built-in style (drumPatterns.js):
// { stepsPerBeat, cell: [beat][step]{ instrument: velocity 0..1 } } — the
// engine plays beat `b` of a bar from cell[b % cell.length]. User patterns
// add { id, name, user: true } and have as many beats as the time signature
// they were made in.

import { DRUM_STYLES } from './drumPatterns';

// Rows of the sequencer, top to bottom (cymbals over drums, like a kit seen
// from the drummer's seat), with the mixer group each one rides.
export const DRUM_INSTRUMENTS = [
  { key: 'crash', group: 'cymbals' },
  { key: 'ride', group: 'cymbals' },
  { key: 'rideBell', group: 'cymbals' },
  { key: 'hihatOpen', group: 'cymbals' },
  { key: 'hihatClosed', group: 'cymbals' },
  { key: 'hihatPedal', group: 'cymbals' },
  { key: 'tomHigh', group: 'drums' },
  { key: 'tomMid', group: 'drums' },
  { key: 'tomLow', group: 'drums' },
  { key: 'snare', group: 'drums' },
  { key: 'rim', group: 'drums' },
  { key: 'clap', group: 'drums' },
  { key: 'kick', group: 'kick' },
  { key: 'cowbell', group: 'perc' },
  { key: 'tambourine', group: 'perc' },
  { key: 'shaker', group: 'perc' },
];

// Mixer channels (existing keys kept: kick / snare / hihat + the new perc).
export const MIX_CHANNEL_OF_GROUP = { kick: 'kick', drums: 'snare', cymbals: 'hihat', perc: 'perc' };
export const MIX_BUCKET = Object.fromEntries(DRUM_INSTRUMENTS.map((i) => [i.key, MIX_CHANNEL_OF_GROUP[i.group]]));

// A tap cycles a cell: empty -> full -> soft (ghost note) -> empty.
export const FULL = 1;
export const SOFT = 0.5;
export function nextVelocity(v) {
  if (!v) return FULL;
  if (v > 0.7) return SOFT;
  return 0;
}

export const RESOLUTIONS = [
  { key: 2, labelKey: 'drums.grid.8' },
  { key: 3, labelKey: 'drums.grid.triplet' },
  { key: 4, labelKey: 'drums.grid.16' },
];

const STORAGE_KEY = 'dudestar-p-drum-patterns'; // per profile

export function loadUserPatterns() {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(list) ? list.filter((p) => p && p.id && Array.isArray(p.cell) && p.stepsPerBeat) : [];
  } catch {
    return [];
  }
}

export function saveUserPatterns(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: kept for this session */
  }
}

export const USER_PREFIX = 'user:';
export const isUserKey = (key) => typeof key === 'string' && key.startsWith(USER_PREFIX);

/** The pattern behind a style key (built-in or 'user:<id>'), or null. */
export function resolvePattern(key, userPatterns) {
  if (isUserKey(key)) return userPatterns.find((p) => USER_PREFIX + p.id === key) ?? null;
  return DRUM_STYLES[key] ?? null;
}

function emptyCell(beats, stepsPerBeat) {
  return Array.from({ length: beats }, () => Array.from({ length: stepsPerBeat }, () => ({})));
}

/** A blank pattern: `beats` beats of 16ths. */
export function blankPattern(beats = 4, stepsPerBeat = 4) {
  return { name: '', stepsPerBeat, cell: emptyCell(beats, stepsPerBeat), user: true };
}

/** An editable copy of any pattern, `beats` long (a 4-beat style is cycled). */
export function draftFrom(pattern, beats) {
  const spb = pattern.stepsPerBeat;
  const cell = Array.from({ length: beats }, (_, b) =>
    Array.from({ length: spb }, (_, s) => ({ ...(pattern.cell[b % pattern.cell.length]?.[s] ?? {}) }))
  );
  return { id: pattern.user ? pattern.id : undefined, name: pattern.user ? pattern.name : '', stepsPerBeat: spb, cell, user: true };
}

/** Set one cell (immutable). */
export function setHit(pattern, beat, step, instrument, velocity) {
  const cell = pattern.cell.map((b, bi) =>
    bi !== beat
      ? b
      : b.map((st, si) => {
          if (si !== step) return st;
          const next = { ...st };
          if (velocity > 0) next[instrument] = velocity;
          else delete next[instrument];
          return next;
        })
  );
  return { ...pattern, cell };
}

/**
 * Change the grid (8ths / triplets / 16ths): every hit moves to the nearest
 * step of the new grid, by its time inside the beat.
 */
export function changeResolution(pattern, stepsPerBeat) {
  if (pattern.stepsPerBeat === stepsPerBeat) return pattern;
  const old = pattern.stepsPerBeat;
  const cell = emptyCell(pattern.cell.length, stepsPerBeat);
  pattern.cell.forEach((beat, b) =>
    beat.forEach((hits, s) => {
      const ns = Math.min(stepsPerBeat - 1, Math.round((s / old) * stepsPerBeat));
      for (const [inst, v] of Object.entries(hits)) {
        if (!v) continue;
        cell[b][ns][inst] = Math.max(cell[b][ns][inst] ?? 0, v);
      }
    })
  );
  return { ...pattern, stepsPerBeat, cell };
}

/** Change the length in beats (more beats repeat from the start). */
export function changeBeats(pattern, beats) {
  if (pattern.cell.length === beats) return pattern;
  const cell = Array.from({ length: beats }, (_, b) =>
    b < pattern.cell.length ? pattern.cell[b] : Array.from({ length: pattern.stepsPerBeat }, () => ({}))
  );
  return { ...pattern, cell };
}

export function clearPattern(pattern) {
  return { ...pattern, cell: emptyCell(pattern.cell.length, pattern.stepsPerBeat) };
}

/** Instruments the pattern actually uses, in row order. */
export function usedInstruments(pattern) {
  const used = new Set();
  pattern?.cell.forEach((beat) => beat.forEach((st) => Object.entries(st).forEach(([k, v]) => v && used.add(k))));
  return DRUM_INSTRUMENTS.filter((i) => used.has(i.key)).map((i) => i.key);
}

export function hasHits(pattern) {
  return usedInstruments(pattern).length > 0;
}

/** Store a draft: a new id when it has none; returns { list, saved }. */
export function upsertPattern(list, draft, name) {
  const id = draft.id ?? `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const saved = { id, name: name.trim() || draft.name || 'Beat', stepsPerBeat: draft.stepsPerBeat, cell: draft.cell, user: true, savedAt: Date.now() };
  const i = list.findIndex((p) => p.id === id);
  const next = i >= 0 ? list.map((p) => (p.id === id ? saved : p)) : [...list, saved];
  return { list: next, saved };
}

export function removePattern(list, id) {
  return list.filter((p) => p.id !== id);
}

/** A free default name: "My beat 1", "My beat 2", … */
export function nextName(list, base) {
  let n = 1;
  const names = new Set(list.map((p) => p.name));
  while (names.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}
