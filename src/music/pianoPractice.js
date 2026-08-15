// Piano Practice — leveled exercises, gated `['piano']`-only in
// featureCapabilities.js (the same gating mechanism guitar-only Drills
// already uses, just inverted). Structured the same way earTraining.js is:
// a flat exercise catalog + one `generatePianoQuestion(exerciseKey)`
// dispatcher, so adding exercise #3 onward later is adding one more
// generator function and one more catalog entry, not new architecture.
import { CHORD_QUALITIES } from './chordQualities';
import { computePianoChordTones } from './pianoChordTones';
import { CHORD_INVERSIONS, applyInversion } from './pianoInversions';

const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Only the two difficulty tiers with a working exercise are reachable via
// the dropdown value today; Advanced is still listed (per the requested
// full curriculum) but every Advanced exercise is `available: false` below,
// so selecting it only ever shows "coming soon" options, never a broken one.
export const PIANO_DIFFICULTIES = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

// `available: false` entries are real, named, correctly-placed-in-the-
// curriculum menu items — not hidden — so the full 6-exercise scope this
// was scoped against is visible today, but selecting one just shows a
// "coming soon" state instead of a half-built or fake exercise.
export const PIANO_EXERCISES = [
  { key: 'pentascale', difficultyKey: 'beginner', labelKey: 'pianoPractice.exercise.pentascale', available: true },
  { key: 'noteId', difficultyKey: 'beginner', labelKey: 'pianoPractice.exercise.noteId', available: false },
  { key: 'inversionDrill', difficultyKey: 'intermediate', labelKey: 'pianoPractice.exercise.inversionDrill', available: true },
  { key: 'twoHand', difficultyKey: 'intermediate', labelKey: 'pianoPractice.exercise.twoHand', available: false },
  { key: 'extendedVoicings', difficultyKey: 'advanced', labelKey: 'pianoPractice.exercise.extendedVoicings', available: false },
  { key: 'arpeggioSync', difficultyKey: 'advanced', labelKey: 'pianoPractice.exercise.arpeggioSync', available: false },
];

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Comfortable one-octave root range for both exercises below — C4..B4,
// keeping every question's notes near Middle C regardless of root, the
// same anchor computePianoChordTones already uses.
function randomRootMidi() {
  return 60 + randomInt(0, 11);
}

// Major 5-finger pattern (root, M2, M3, P4, P5) — "Five-Finger Scales" is
// specifically about recognizing/placing this hand position, so only the
// major form is in scope here (a minor-pentascale variant is a natural
// follow-up, not this exercise).
const PENTASCALE_INTERVALS = [0, 2, 4, 5, 7];

function generatePentascaleQuestion() {
  const rootMidi = randomRootMidi();
  const rootPitchClass = rootMidi % 12;
  const notesToPlay = PENTASCALE_INTERVALS.map((iv) => ({ midi: rootMidi + iv }));

  const distractorPitchClasses = shuffle(PITCH_CLASS_NAMES.map((_, pc) => pc).filter((pc) => pc !== rootPitchClass)).slice(0, 3);
  const choices = shuffle([rootPitchClass, ...distractorPitchClasses]).map((pc) => ({ key: String(pc), label: PITCH_CLASS_NAMES[pc] }));

  return {
    kind: 'pentascale',
    playSequential: true,
    notesToPlay,
    choices,
    correctChoiceKey: String(rootPitchClass),
  };
}

const DRILL_QUALITY_KEYS = ['major', 'minor'];

function generateInversionDrillQuestion() {
  const rootMidi = randomRootMidi();
  const rootPitchClass = rootMidi % 12;
  const qualityKey = pick(DRILL_QUALITY_KEYS);
  const inversionKey = pick(CHORD_INVERSIONS.map((inv) => inv.key));

  const rootPositionTones = computePianoChordTones({ root: { pitchClass: rootPitchClass }, qualityKey });
  const notesToPlay = applyInversion(rootPositionTones, inversionKey).map((t) => ({ midi: t.midi }));

  return {
    kind: 'inversionDrill',
    playSequential: false,
    notesToPlay,
    rootLabel: PITCH_CLASS_NAMES[rootPitchClass],
    qualityLabel: CHORD_QUALITIES[qualityKey].label,
    choices: CHORD_INVERSIONS.map((inv) => ({ key: inv.key, labelKey: inv.labelKey })),
    correctChoiceKey: inversionKey,
  };
}

export function generatePianoQuestion(exerciseKey) {
  if (exerciseKey === 'inversionDrill') return generateInversionDrillQuestion();
  return generatePentascaleQuestion();
}

const BEST_STREAK_STORAGE_PREFIX = 'pianoPracticeBestStreak:';

export function loadPianoBestStreak(exerciseKey) {
  const raw = localStorage.getItem(BEST_STREAK_STORAGE_PREFIX + exerciseKey);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function savePianoBestStreak(exerciseKey, value) {
  localStorage.setItem(BEST_STREAK_STORAGE_PREFIX + exerciseKey, String(value));
}
