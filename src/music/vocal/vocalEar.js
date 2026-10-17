// Ear training for singers (Singing card -> Ear Training, the Vocal section's
// own "ear" screen). The same listen-and-answer skills as the instrument
// quiz (music/earTraining.js), but every note is a MIDI pitch inside the
// singer's COMFORTABLE range (from the range test, or a typical range) and
// is played on the piano — nothing is tied to guitar strings/frets, so
// anything you hear here you can also sing.
//
// Modes (the ones that matter for a singer; fret location, triad
// extensions, scale/mode ID and fretboard call & response are left out):
//   direction   – higher / lower (/ same): the base of singing in tune
//   scaledegree – a cadence sets the key, name the degree (movable do)
//   interval    – the distance between two notes, sung melodies are leaps
//   chord       – major / minor (/ dim / aug): hearing the harmony you sing over
//   rhythm      – which one-bar pattern (shared with the instrument quiz)
// The sing-back exercise ("echo", music/vocal/exercises.js) is the
// voice-answer companion and runs in the normal exercise runner.
//
// A question: { kind, notes: [{midi, start, dur}] (seconds, piano),
// choices: [{key, label?, labelKey?}], correct, reveal: {...} }.

import { generateRhythmQuestion } from '../earTraining';
import { comfortRange } from './voiceRange';

export const VOCAL_EAR_MODES = ['direction', 'scaledegree', 'interval', 'chord', 'rhythm'];
export const VOCAL_EAR_LEVELS = ['beginner', 'intermediate', 'advanced'];

const PC = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export function pcName(midi) {
  return PC[((Math.round(midi) % 12) + 12) % 12];
}

const randInt = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = (rand, list) => list[Math.floor(rand() * list.length)];

/** The range questions are drawn from (comfortable part of the voice). */
export function earRange(range) {
  const c = comfortRange(range);
  // Never narrower than an octave + a 4th (a cramped measured range still
  // has to hold an octave interval and a cadence).
  if (c.high - c.low < 17) {
    const mid = Math.round((c.low + c.high) / 2);
    return { low: mid - 8, high: mid + 9 };
  }
  return c;
}

// ---- direction ---------------------------------------------------------------
const DIRECTION_GAP = { beginner: [5, 12], intermediate: [2, 7], advanced: [1, 3] };

function direction(level, r, rand) {
  const allowSame = level === 'advanced';
  const choices = allowSame
    ? [{ key: 'higher', label: 'Higher' }, { key: 'same', label: 'Same' }, { key: 'lower', label: 'Lower' }]
    : [{ key: 'higher', label: 'Higher' }, { key: 'lower', label: 'Lower' }];
  let first = randInt(rand, r.low, r.high);
  let correct;
  let second;
  if (allowSame && rand() < 0.25) {
    second = first;
    correct = 'same';
  } else {
    const [lo, hi] = DIRECTION_GAP[level];
    const gap = Math.min(randInt(rand, lo, hi), r.high - r.low);
    const up = rand() < 0.5;
    // The first note leaves room for the gap in the chosen direction.
    first = up ? randInt(rand, r.low, r.high - gap) : randInt(rand, r.low + gap, r.high);
    second = up ? first + gap : first - gap;
    correct = up ? 'higher' : 'lower';
  }
  return {
    kind: 'direction',
    promptKey: allowSame ? 'earTraining.prompt.directionSame' : 'earTraining.prompt.direction',
    notes: [
      { midi: first, start: 0, dur: 0.7 },
      { midi: second, start: 0.85, dur: 0.9 },
    ],
    choices,
    correct,
    reveal: { notes: [first, second] },
  };
}

// ---- scale degree --------------------------------------------------------------
const DEGREE_POOL = { beginner: [1, 3, 5], intermediate: [1, 2, 3, 4, 5, 6, 7], advanced: [1, 2, 3, 4, 5, 6, 7] };
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

function scaleDegree(level, r, rand) {
  const minor = level === 'advanced' && rand() < 0.5;
  const scale = minor ? MINOR : MAJOR;
  // The tonic inside the lower half, so the whole scale above it fits.
  const tonic = randInt(rand, r.low, Math.max(r.low, r.high - 12));
  const degree = pick(rand, DEGREE_POOL[level]);
  const target = tonic + scale[degree - 1];
  const tri = (root, maj) => [root, root + (maj ? 4 : 3), root + 7];
  // I-IV-V-I around the tonic, voiced close (IV and V under it so the
  // cadence stays in the same register as the voice).
  const chords = [tri(tonic, !minor), tri(tonic - 7, !minor), tri(tonic - 5, true), tri(tonic, !minor)];
  const notes = [];
  chords.forEach((c, i) => c.forEach((m, j) => notes.push({ midi: m, start: i * 0.6 + j * 0.02, dur: 0.55 })));
  notes.push({ midi: target, start: chords.length * 0.6 + 0.45, dur: 1.1 });
  return {
    kind: 'scaledegree',
    promptKey: 'earTraining.prompt.scaledegree',
    notes,
    choices: DEGREE_POOL[level].map((d) => ({ key: String(d), label: String(d) })),
    correct: String(degree),
    reveal: { target, tonic, minor },
  };
}

// ---- interval --------------------------------------------------------------------
const INTERVALS = {
  1: 'Minor 2nd', 2: 'Major 2nd', 3: 'Minor 3rd', 4: 'Major 3rd', 5: 'Perfect 4th', 6: 'Tritone',
  7: 'Perfect 5th', 8: 'Minor 6th', 9: 'Major 6th', 10: 'Minor 7th', 11: 'Major 7th', 12: 'Octave',
};
const INTERVAL_POOL = {
  beginner: [3, 4, 7, 12],
  intermediate: [2, 3, 4, 5, 7, 9, 12],
  advanced: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

function interval(level, r, rand) {
  const pool = INTERVAL_POOL[level];
  const iv = pick(rand, pool);
  const down = level === 'advanced' && rand() < 0.35;
  const root = down ? randInt(rand, r.low + iv, r.high) : randInt(rand, r.low, r.high - iv);
  const second = down ? root - iv : root + iv;
  return {
    kind: 'interval',
    promptKey: 'earTraining.prompt.interval',
    notes: [
      { midi: root, start: 0, dur: 0.75 },
      { midi: second, start: 0.85, dur: 1 },
    ],
    choices: pool.map((s) => ({ key: String(s), label: INTERVALS[s] })),
    correct: String(iv),
    reveal: { notes: [root, second], down },
  };
}

// ---- chord ------------------------------------------------------------------------
const CHORD_POOL = {
  beginner: ['major', 'minor'],
  intermediate: ['major', 'minor', 'dim'],
  advanced: ['major', 'minor', 'dim', 'aug'],
};
const CHORD_TONES = { major: [0, 4, 7], minor: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8] };
const CHORD_LABEL = { major: 'Major', minor: 'Minor', dim: 'Diminished', aug: 'Augmented' };

function chord(level, r, rand) {
  const pool = CHORD_POOL[level];
  const q = pick(rand, pool);
  const root = randInt(rand, r.low, r.high - 8);
  const tones = CHORD_TONES[q].map((d) => root + d);
  // Block chord, then broken (low to high) — a singer hears the tones
  // they could pick out and sing.
  const notes = [
    ...tones.map((m, i) => ({ midi: m, start: i * 0.02, dur: 1.1 })),
    ...tones.map((m, i) => ({ midi: m, start: 1.35 + i * 0.42, dur: 0.45 })),
  ];
  return {
    kind: 'chord',
    promptKey: 'earTraining.prompt.chord',
    notes,
    choices: pool.map((k) => ({ key: k, label: CHORD_LABEL[k] })),
    correct: q,
    reveal: { root, quality: CHORD_LABEL[q] },
  };
}

// ---- rhythm -----------------------------------------------------------------------
function rhythm(level, r) {
  const q = generateRhythmQuestion({ key: level });
  // One steady pitch in the middle of the voice (sing it on "ta").
  const midi = Math.round((r.low + r.high) / 2);
  return {
    kind: 'rhythm',
    promptKey: 'earTraining.prompt.rhythm',
    notes: q.rhythmOnsets.map((ms) => ({ midi, start: ms / 1000, dur: 0.22 })),
    choices: q.choices,
    correct: q.correctChoiceKey,
    reveal: {},
  };
}

/** A new question; `range` = the saved voice range (or the typical one). */
export function vocalEarQuestion(mode, level, range, rand = Math.random) {
  const r = earRange(range);
  const lv = VOCAL_EAR_LEVELS.includes(level) ? level : 'beginner';
  if (mode === 'scaledegree') return scaleDegree(lv, r, rand);
  if (mode === 'interval') return interval(lv, r, rand);
  if (mode === 'chord') return chord(lv, r, rand);
  if (mode === 'rhythm') return rhythm(lv, r);
  return direction(lv, r, rand);
}

/** Total length of a question's audio, seconds. */
export function questionLength(q) {
  return q.notes.reduce((m, n) => Math.max(m, n.start + n.dur), 0);
}
