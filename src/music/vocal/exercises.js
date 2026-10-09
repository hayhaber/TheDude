// The vocal exercise library, the daily workout, and how an exercise turns
// into concrete repetitions ("reps") in the singer's own range.
//
// Every rep is call-and-response, the way a voice teacher works: the piano
// sets the key (a short chord) and plays the pattern (the CUE), then the
// singer sings it back (the SING phase) while the pitch is tracked. The
// piano is silent while the singer sings, so the microphone hears only the
// voice (an optional soft guide can play along — headphones recommended).

import { keysForPattern, randomNoteIn, workingRange } from './voiceRange';

// Categories, in the order the library shows them.
export const CATEGORIES = ['warmup', 'pitch', 'scales', 'agility', 'range'];

// kind:
//   pattern  – notes in order (degrees = semitones above the key's root)
//   glide    – a continuous slide through `degrees` (a siren)
//   sustain  – one long note
//   match    – random single notes: hear, then match and hold
//   interval – random intervals: hear two notes, sing both
// beats: one value for every note, or one per note. level: 1 = beginner
// (both levels see it), 2 = advanced only.
export const EXERCISES = [
  // ---- Warm-up ----
  { id: 'hum', category: 'warmup', level: 1, kind: 'sustain', syllable: 'hum', seconds: 6, keys: 3, keyStep: 2, place: 0.3 },
  { id: 'lipTrill', category: 'warmup', level: 1, kind: 'pattern', syllable: 'lipTrill', degrees: [0, 2, 4, 5, 7, 5, 4, 2, 0], beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5], bpm: 92, maxKeys: 6 },
  { id: 'siren', category: 'warmup', level: 1, kind: 'glide', syllable: 'oo', degrees: [0, 12, 0], seconds: 4, maxKeys: 4 },
  { id: 'ngSlide', category: 'warmup', level: 1, kind: 'glide', syllable: 'ng', degrees: [0, 7, 0], seconds: 3, maxKeys: 5 },
  // ---- Pitch ----
  { id: 'match', category: 'pitch', level: 1, kind: 'match', syllable: 'ah', reps: 8, seconds: 2.5 },
  { id: 'steady', category: 'pitch', level: 1, kind: 'sustain', syllable: 'ah', seconds: 8, keys: 3, keyStep: 3, place: 0.45 },
  { id: 'intervals', category: 'pitch', level: 1, kind: 'interval', syllable: 'ah', reps: 8, seconds: 1.6 },
  { id: 'vibrato', category: 'pitch', level: 2, kind: 'sustain', syllable: 'ah', seconds: 6, keys: 3, keyStep: 2, place: 0.5, vibrato: true },
  // ---- Scales & arpeggios ----
  { id: 'fiveNote', category: 'scales', level: 1, kind: 'pattern', syllable: 'ah', degrees: [0, 2, 4, 5, 7, 5, 4, 2, 0], beats: [1, 1, 1, 1, 1, 1, 1, 1, 2], bpm: 96, maxKeys: 6 },
  { id: 'arpeggio', category: 'scales', level: 1, kind: 'pattern', syllable: 'ah', degrees: [0, 4, 7, 12, 7, 4, 0], beats: [1, 1, 1, 1.5, 1, 1, 2], bpm: 88, maxKeys: 6 },
  { id: 'octaveScale', category: 'scales', level: 2, kind: 'pattern', syllable: 'ah', degrees: [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0], beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5], bpm: 84, maxKeys: 6 },
  { id: 'minorArpeggio', category: 'scales', level: 2, kind: 'pattern', syllable: 'oo', degrees: [0, 3, 7, 12, 7, 3, 0], beats: [1, 1, 1, 1.5, 1, 1, 2], bpm: 88, maxKeys: 6 },
  // ---- Agility ----
  { id: 'run', category: 'agility', level: 2, kind: 'pattern', syllable: 'ah', degrees: [0, 2, 4, 5, 7, 9, 11, 12, 14, 12, 11, 9, 7, 5, 4, 2, 0], beats: [...Array(16).fill(0.5), 1.5], bpm: 100, maxKeys: 5 },
  { id: 'leaps', category: 'agility', level: 2, kind: 'pattern', syllable: 'nay', degrees: [0, 12, 0, 7, 0, 12, 0], beats: [1, 1, 1, 1, 1, 1, 2], bpm: 84, maxKeys: 5 },
  // ---- Range ----
  { id: 'extend', category: 'range', level: 2, kind: 'pattern', syllable: 'nay', degrees: [0, 4, 7, 4, 0], beats: [1, 1, 1.5, 1, 2], bpm: 96, maxKeys: 10, edge: true },
];

export function exerciseById(id) {
  return EXERCISES.find((e) => e.id === id) ?? null;
}

export function exercisesForLevel(level) {
  return EXERCISES.filter((e) => e.level <= level);
}

/**
 * Today's workout: warm-up first (never pitch work on a cold voice), then a
 * daily-rotating selection of the rest, ending on something calm.
 */
export function dailyWorkout(level, date = new Date()) {
  const day = Math.floor(date.getTime() / 86400000);
  const warm = level >= 2 ? ['lipTrill', 'siren'] : ['hum', 'lipTrill', 'siren'];
  const pool = exercisesForLevel(level)
    .filter((e) => e.category !== 'warmup' && e.id !== 'steady')
    .map((e) => e.id);
  const count = level >= 2 ? 4 : 3;
  const picks = [];
  for (let i = 0; picks.length < Math.min(count, pool.length); i += 1) {
    const id = pool[(day * 3 + i * 5) % pool.length];
    if (!picks.includes(id)) picks.push(id);
    if (i > 50) break;
  }
  // Keep a sensible order: pitch → scales → agility → range.
  picks.sort((a, b) => CATEGORIES.indexOf(exerciseById(a).category) - CATEGORIES.indexOf(exerciseById(b).category));
  return [...warm, ...picks, 'steady'];
}

const ASCENDING_INTERVALS_EASY = [2, 4, 5, 7, 12];
const ALL_INTERVALS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * The concrete reps of an exercise in the singer's range.
 * Times are seconds. Each rep: { key, label, cue: [{midi, start, dur}],
 * targets: [{midi, start, dur, glide?: [[t, midi], ...]}], length }.
 * `cue` times start at 0 (the chord); `targets` start at 0 = singing begins.
 */
export function buildReps(ex, range, { level = 1, tempo = 1, rand = Math.random } = {}) {
  const work = workingRange(range, { edge: !!ex.edge });
  const beat = 60 / ((ex.bpm ?? 90) * tempo);
  const chord = (root) => [0, 4, 7].map((d, i) => ({ midi: root + d - (root + d > work.high + 2 ? 12 : 0), start: i * 0.01, dur: beat * 1.2 }));

  if (ex.kind === 'pattern') {
    const beats = ex.degrees.map((_, i) => (Array.isArray(ex.beats) ? ex.beats[i] : ex.beats ?? 1));
    const keys = keysForPattern(ex.degrees, work, { maxKeys: ex.maxKeys ?? 6 });
    return keys.map((key) => {
      const targets = [];
      let t = 0;
      ex.degrees.forEach((d, i) => {
        const dur = beats[i] * beat;
        targets.push({ midi: key + d, start: t, dur });
        t += dur;
      });
      const lead = beat * 1.5; // chord, then the pattern
      return {
        key,
        cue: [...chord(key), ...targets.map((n) => ({ midi: n.midi, start: lead + n.start, dur: n.dur * 0.95 }))],
        cueLength: lead + t + beat * 0.5,
        targets,
        length: t,
      };
    });
  }

  if (ex.kind === 'glide') {
    const keys = keysForPattern(ex.degrees, work, { maxKeys: ex.maxKeys ?? 4 });
    const seconds = (ex.seconds ?? 4) / tempo;
    const seg = seconds / (ex.degrees.length - 1);
    return keys.map((key) => {
      const points = ex.degrees.map((d, i) => [i * seg, key + d]);
      const cueNote = 0.45;
      return {
        key,
        cue: ex.degrees.map((d, i) => ({ midi: key + d, start: i * cueNote, dur: cueNote * 0.95 })),
        cueLength: ex.degrees.length * cueNote + 0.4,
        targets: [{ midi: key, start: 0, dur: seconds, glide: points }],
        length: seconds,
      };
    });
  }

  if (ex.kind === 'sustain') {
    const span = work.high - work.low;
    const keys = [];
    for (let i = 0; i < (ex.keys ?? 3); i += 1) {
      const k = Math.round(work.low + span * (ex.place ?? 0.4)) + i * (ex.keyStep ?? 2);
      keys.push(Math.min(work.high, k));
    }
    const seconds = ex.seconds ?? 6;
    return keys.map((key) => ({
      key,
      cue: [{ midi: key, start: 0, dur: 1.4 }],
      cueLength: 1.6,
      targets: [{ midi: key, start: 0, dur: seconds }],
      length: seconds,
    }));
  }

  if (ex.kind === 'match') {
    const reps = [];
    let last = null;
    for (let i = 0; i < (ex.reps ?? 8); i += 1) {
      let n = randomNoteIn(work, rand);
      if (n === last) n = n + 2 <= work.high ? n + 2 : n - 2;
      last = n;
      reps.push({
        key: n,
        cue: [{ midi: n, start: 0, dur: 1.2 }],
        cueLength: 1.4,
        targets: [{ midi: n, start: 0, dur: ex.seconds ?? 2.5 }],
        length: ex.seconds ?? 2.5,
      });
    }
    return reps;
  }

  if (ex.kind === 'interval') {
    const pool = level >= 2 ? ALL_INTERVALS : ASCENDING_INTERVALS_EASY;
    const seconds = ex.seconds ?? 1.6;
    const reps = [];
    for (let i = 0; i < (ex.reps ?? 8); i += 1) {
      const iv = pool[Math.floor(rand() * pool.length)];
      const down = level >= 2 && rand() < 0.35;
      const lowEnd = down ? work.low + iv : work.low;
      const highEnd = down ? work.high : work.high - iv;
      const root = highEnd >= lowEnd ? lowEnd + Math.floor(rand() * (highEnd - lowEnd + 1)) : work.low;
      const second = down ? root - iv : root + iv;
      reps.push({
        key: root,
        interval: down ? -iv : iv,
        cue: [
          { midi: root, start: 0, dur: 0.75 },
          { midi: second, start: 0.85, dur: 0.75 },
        ],
        cueLength: 1.9,
        targets: [
          { midi: root, start: 0, dur: seconds },
          { midi: second, start: seconds, dur: seconds },
        ],
        length: seconds * 2,
      });
    }
    return reps;
  }
  return [];
}

/** The lowest/highest pitch an exercise's reps touch (for drawing). */
export function repSpan(rep) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const t of rep.targets) {
    const pts = t.glide ? t.glide.map((p) => p[1]) : [t.midi];
    for (const m of pts) {
      lo = Math.min(lo, m);
      hi = Math.max(hi, m);
    }
  }
  return { lo, hi };
}

/** Target pitch at time `t` of a rep (null between/after notes). */
export function targetAt(rep, t) {
  for (const n of rep.targets) {
    if (t < n.start || t > n.start + n.dur) continue;
    if (!n.glide) return n.midi;
    const g = n.glide;
    const local = t - n.start;
    for (let i = 1; i < g.length; i += 1) {
      if (local <= g[i][0]) {
        const [t0, m0] = g[i - 1];
        const [t1, m1] = g[i];
        return m0 + ((m1 - m0) * (local - t0)) / (t1 - t0 || 1);
      }
    }
    return g[g.length - 1][1];
  }
  return null;
}
