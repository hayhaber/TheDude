// Ear Training & Fretboard Quiz — pure question-generation/scoring logic.
// Reuses the same music-theory data the rest of the app already has
// (STANDARD_TUNING, CHORD_QUALITIES, enumerateTriadPositions) rather than
// duplicating it, so quiz content always matches what's shown elsewhere.
import { STANDARD_TUNING, MAX_FRET, mod } from './notes';
import { CHORD_QUALITIES } from './chordQualities';
import { enumerateTriadPositions } from './triads';
import { SCALE_FAMILIES } from './scalesCurriculum';
import { computeScaleNotes } from './scaleShapes';
import { computeChordPositions } from './computeChordPositions';

const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteNameForMidi(midi) {
  return PITCH_CLASS_NAMES[mod(midi, 12)];
}

export function midiForCell(stringIndex, fret) {
  return STANDARD_TUNING[stringIndex].baseMidi + fret;
}

// Piano mode's click-target pool for the fret-question quiz kinds ('pitch',
// 'callresponse') — every question generator (below) is written in terms of
// guitar string/fret cells (randomCell/midiForCell), so rather than guessing
// a separate MIDI range that might not cover every note a question could
// produce, this derives the exact set of MIDI notes the current difficulty's
// string/fret ranges can reach, guaranteeing the correct answer is always
// among the piano keys offered — same source of truth, no separate range table.
export function pianoQuizKeys(difficulty) {
  const midiSet = new Set();
  difficulty.stringIndices.forEach((stringIndex) => {
    for (let fret = difficulty.fretMin; fret <= difficulty.fretMax; fret += 1) {
      midiSet.add(midiForCell(stringIndex, fret));
    }
  });
  return Array.from(midiSet)
    .sort((a, b) => a - b)
    .map((midi) => ({ midi }));
}

// labelKey looks up display text in i18n/strings.js (earTraining.mode.*,
// difficulty.*) — kept as a key rather than a bilingual object here since
// EarTrainingModal already needs a `t()` call for other quiz text anyway.
export const EAR_TRAINING_MODES = [
  { key: 'pitch', labelKey: 'earTraining.mode.pitch' },
  { key: 'chord', labelKey: 'earTraining.mode.chord' },
  { key: 'interval', labelKey: 'earTraining.mode.interval' },
  { key: 'callresponse', labelKey: 'earTraining.mode.callresponse' },
  { key: 'scaleid', labelKey: 'earTraining.mode.scaleid' },
];

// Pace, independent of quiz content (modeKey) — Standard holds each question
// on screen until the player explicitly moves on; Timed runs a 60-second
// countdown and auto-advances instantly on every answer. Only 2 options, so
// this stays a toggle (not a dropdown) per the app's own >2-options rule.
export const EAR_TRAINING_PRACTICE_MODES = [
  { key: 'standard', labelKey: 'earTraining.practiceMode.standard' },
  { key: 'timed', labelKey: 'earTraining.practiceMode.timed' },
];

export const TIMED_CHALLENGE_DURATION_S = 60;

// Beginner: a single string, near the nut. Advanced: the full neck,
// chromatic (any fret, so any pitch class is reachable). `label` stays the
// plain English difficulty name (shared difficulty.* translation keys with
// drills.js/licks.js), matched via `difficulty.${label}` at display time.
export const EAR_TRAINING_DIFFICULTIES = [
  { key: 'beginner', label: 'Beginner', stringIndices: [5], fretMin: 0, fretMax: 3 },
  { key: 'intermediate', label: 'Intermediate', stringIndices: [3, 4, 5], fretMin: 0, fretMax: 7 },
  { key: 'advanced', label: 'Advanced', stringIndices: [0, 1, 2, 3, 4, 5], fretMin: 0, fretMax: MAX_FRET },
];

const INTERVALS_BY_DIFFICULTY = {
  beginner: [
    { semitones: 3, label: 'Minor 3rd' },
    { semitones: 4, label: 'Major 3rd' },
    { semitones: 7, label: 'Perfect 5th' },
    { semitones: 12, label: 'Octave' },
  ],
  intermediate: [
    { semitones: 2, label: 'Major 2nd' },
    { semitones: 3, label: 'Minor 3rd' },
    { semitones: 4, label: 'Major 3rd' },
    { semitones: 5, label: 'Perfect 4th' },
    { semitones: 7, label: 'Perfect 5th' },
    { semitones: 9, label: 'Major 6th' },
    { semitones: 12, label: 'Octave' },
  ],
  advanced: [
    { semitones: 1, label: 'Minor 2nd' },
    { semitones: 2, label: 'Major 2nd' },
    { semitones: 3, label: 'Minor 3rd' },
    { semitones: 4, label: 'Major 3rd' },
    { semitones: 5, label: 'Perfect 4th' },
    { semitones: 6, label: 'Tritone' },
    { semitones: 7, label: 'Perfect 5th' },
    { semitones: 8, label: 'Minor 6th' },
    { semitones: 9, label: 'Major 6th' },
    { semitones: 10, label: 'Minor 7th' },
    { semitones: 11, label: 'Major 7th' },
    { semitones: 12, label: 'Octave' },
  ],
};

const TRIAD_QUALITY_KEYS = ['major', 'minor', 'dim', 'aug'];

// Chord ID's three tiers ask genuinely different questions, not just a wider
// choice pool at the same task (see generateChordQuestion below):
//   beginner     — quality only (Major vs Minor), root is irrelevant/random.
//   intermediate — quality still just Major/Minor, but now the root also has
//                  to be named — restricted to the 7 natural letters (no
//                  sharps/flats) so the note-naming part stays approachable.
//   advanced     — full CHORD_QUALITIES vocabulary, any of the 12 roots
//                  (sharps included), quality-only answer — unchanged from
//                  the original single-tier version of this quiz.
const CHORD_QUALITY_KEYS_ADVANCED = Object.keys(CHORD_QUALITIES);
const NATURAL_ROOTS = [
  { letter: 'A', pitchClass: 9 },
  { letter: 'B', pitchClass: 11 },
  { letter: 'C', pitchClass: 0 },
  { letter: 'D', pitchClass: 2 },
  { letter: 'E', pitchClass: 4 },
  { letter: 'F', pitchClass: 5 },
  { letter: 'G', pitchClass: 7 },
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

function randomCell(difficulty) {
  const stringIndex = pick(difficulty.stringIndices);
  const fret = randomInt(difficulty.fretMin, difficulty.fretMax);
  return { stringIndex, fret };
}

// Lowest-fret fretboard location that sounds a given MIDI note — used to
// find a place to *play*/reveal a computed interval note; not restricted to
// the current difficulty range since it's reference audio, not a click target.
function findCellForMidi(midi) {
  for (let fret = 0; fret <= MAX_FRET; fret += 1) {
    for (let s = 0; s < STANDARD_TUNING.length; s += 1) {
      if (STANDARD_TUNING[s].baseMidi + fret === midi) return { stringIndex: s, fret };
    }
  }
  return null;
}

function generatePitchQuestion(difficulty) {
  const { stringIndex, fret } = randomCell(difficulty);
  const midi = midiForCell(stringIndex, fret);
  return {
    kind: 'pitch',
    prompt: `Click the fret that matches the pitch you hear.`,
    notesToPlay: [{ stringIndex, fret, midi }],
    targetMidiSet: [midi],
    ordered: false,
    choices: null,
    correctChoiceKey: null,
  };
}

function generateIntervalQuestion(difficulty) {
  const rootCell = randomCell(difficulty);
  const rootMidi = midiForCell(rootCell.stringIndex, rootCell.fret);
  const pool = INTERVALS_BY_DIFFICULTY[difficulty.key] ?? INTERVALS_BY_DIFFICULTY.advanced;
  const correct = pick(pool);
  const secondMidi = rootMidi + correct.semitones;
  const secondCell = findCellForMidi(secondMidi) ?? { stringIndex: rootCell.stringIndex, fret: rootCell.fret + correct.semitones };

  const distractors = shuffle(pool.filter((c) => c.semitones !== correct.semitones)).slice(0, 3);
  const choices = shuffle([correct, ...distractors]).map((c) => ({ key: String(c.semitones), label: c.label }));

  return {
    kind: 'interval',
    prompt: 'Listen to the interval — which one is it?',
    notesToPlay: [
      { stringIndex: rootCell.stringIndex, fret: rootCell.fret, midi: rootMidi },
      { stringIndex: secondCell.stringIndex, fret: secondCell.fret, midi: secondMidi },
    ],
    choices,
    correctChoiceKey: String(correct.semitones),
  };
}

function generateTriadQuestion(difficulty) {
  const rootPitchClass = randomInt(0, 11);
  const qualityKey = pick(TRIAD_QUALITY_KEYS);
  const quality = CHORD_QUALITIES[qualityKey];
  const positions = enumerateTriadPositions(rootPitchClass, quality.tones);
  const inRange = positions.filter((p) => p.strings.every((s) => s.fret === null || s.fret <= difficulty.fretMax + 5));
  const chosen = pick(inRange.length > 0 ? inRange : positions);

  const notesToPlay = chosen.strings
    .map((s, i) => (s.fret === null ? null : { stringIndex: i, fret: s.fret, midi: midiForCell(i, s.fret), role: s.role }))
    .filter(Boolean);

  const inversionLabel = (chosen.shapeName.split(' — ')[1] ?? 'Root position').toLowerCase();
  const qualityChoices = TRIAD_QUALITY_KEYS.map((k) => ({ key: k, label: CHORD_QUALITIES[k].label }));

  return {
    kind: 'triad',
    prompt: `Listen to the triad — what quality is it? (shape shown is the ${inversionLabel})`,
    // Exposed separately (not just baked into `prompt`) so the UI can
    // translate the sentence around it without parsing the English string.
    inversionLabel,
    notesToPlay,
    choices: qualityChoices,
    correctChoiceKey: qualityKey,
  };
}

// Builds and plays one chosen root+quality combo, returning both the actual
// playable position (for notesToPlay) and everything a question needs to
// describe it — shared by all three tiers below rather than duplicated per
// tier. Reuses computeChordPositions, the exact same engine Compose uses to
// show a chord's playable shapes, so the quiz always hears/shows a real,
// familiar voicing rather than a separately-invented one.
function buildChordVoicing(rootPitchClass, qualityKey, difficulty) {
  const quality = CHORD_QUALITIES[qualityKey];
  const symbolText = PITCH_CLASS_NAMES[rootPitchClass] + (quality.aliases[0] || '');
  const { isValid, positions } = computeChordPositions(symbolText, 'chord');

  const inRange = isValid ? positions.filter((p) => p.strings.every((s) => s.fret === null || s.fret <= difficulty.fretMax + 5)) : [];
  const chosen = pick(inRange.length > 0 ? inRange : positions.length > 0 ? positions : null);
  if (!chosen) return null;

  const notesToPlay = chosen.strings
    .map((s, i) => (s.fret === null ? null : { stringIndex: i, fret: s.fret, midi: midiForCell(i, s.fret), role: s.role }))
    .filter(Boolean);
  return { notesToPlay };
}

// Chord Recognition — three genuinely different tasks per tier (see
// CHORD_QUALITY_KEYS_ADVANCED/NATURAL_ROOTS' comment above), not just a
// wider choice pool at the same task.
function generateChordQuestion(difficulty) {
  if (difficulty.key === 'intermediate') return generateChordRootQualityQuestion(difficulty);

  // beginner: Major vs Minor only, any of the 12 roots (root isn't asked).
  // advanced: full quality vocabulary, any of the 12 roots — the original
  // single-tier version of this quiz, unchanged.
  const pool = difficulty.key === 'advanced' ? CHORD_QUALITY_KEYS_ADVANCED : ['major', 'minor'];
  const qualityKey = pick(pool);
  const rootPitchClass = randomInt(0, 11);
  const voicing = buildChordVoicing(rootPitchClass, qualityKey, difficulty);
  // Defensive only — every root/quality combination CHORD_QUALITIES defines
  // is already used elsewhere in the app (Compose can display any of them),
  // so computeChordPositions should never actually come back empty here.
  if (!voicing) return generateTriadQuestion(difficulty);

  const distractors = shuffle(pool.filter((k) => k !== qualityKey)).slice(0, 4);
  const choices = shuffle([qualityKey, ...distractors]).map((k) => ({ key: k, label: CHORD_QUALITIES[k].label }));

  return {
    kind: 'chord',
    needsRoot: false,
    prompt: 'Listen to the chord — what quality is it?',
    notesToPlay: voicing.notesToPlay,
    choices,
    correctChoiceKey: qualityKey,
  };
}

// Intermediate tier: the answer is a root+quality *combination* (e.g. "C
// Major"), not quality alone — so the choice pool is built from combo keys
// (`${pitchClass}-${qualityKey}`) over the 7 natural-letter roots × Major/
// Minor (14 possible combos), 1 correct + 4 distractors, exactly as agreed.
function generateChordRootQualityQuestion(difficulty) {
  const root = pick(NATURAL_ROOTS);
  const qualityKey = pick(['major', 'minor']);
  const voicing = buildChordVoicing(root.pitchClass, qualityKey, difficulty);
  if (!voicing) return generateTriadQuestion(difficulty);

  const correctKey = `${root.pitchClass}-${qualityKey}`;
  const allCombos = NATURAL_ROOTS.flatMap((r) => ['major', 'minor'].map((q) => ({ key: `${r.pitchClass}-${q}`, letter: r.letter, qualityKey: q })));
  const distractors = shuffle(allCombos.filter((c) => c.key !== correctKey)).slice(0, 4);
  const choices = shuffle([{ key: correctKey, letter: root.letter, qualityKey }, ...distractors]).map((c) => ({
    key: c.key,
    // `label` stays the plain quality label (e.g. "Major") so choiceLabel()
    // can translate it through the existing quality.* keys exactly like
    // every other quality choice — rootLetter is prefixed on top, untranslated
    // (note letters are shown as plain letters everywhere else in the app too).
    label: CHORD_QUALITIES[c.qualityKey].label,
    rootLetter: c.letter,
  }));

  return {
    kind: 'chord',
    needsRoot: true,
    prompt: 'Listen to the chord — what is its root note and quality?',
    notesToPlay: voicing.notesToPlay,
    choices,
    correctChoiceKey: correctKey,
  };
}

function generateCallResponseQuestion(difficulty) {
  const length = difficulty.key === 'beginner' ? 3 : difficulty.key === 'intermediate' ? 4 : 5;
  const notes = [];
  for (let i = 0; i < length; i += 1) {
    let cell = randomCell(difficulty);
    if (notes.length > 0) {
      const prev = notes[notes.length - 1];
      for (let attempt = 0; attempt < 6 && Math.abs(cell.fret - prev.fret) > 5; attempt += 1) {
        cell = randomCell(difficulty);
      }
    }
    notes.push({ ...cell, midi: midiForCell(cell.stringIndex, cell.fret) });
  }

  return {
    kind: 'callresponse',
    prompt: `Listen, then reproduce the ${length}-note phrase in order.`,
    notesToPlay: notes,
    targetMidiSequence: notes.map((n) => n.midi),
    ordered: true,
    choices: null,
    correctChoiceKey: null,
  };
}

// Curated so a beginner isn't asked to tell 12 near-identical modes apart —
// the 7 modes (a genuinely hard listening task, "recognize modal sounds")
// only join the choice pool at 'advanced' difficulty.
const SCALE_ID_BASE_POOL = ['major', 'naturalMinor', 'majorPentatonic', 'minorPentatonic', 'blues'];
const SCALE_ID_MODES = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];

// Reuses scalesCurriculum.js's SCALE_FAMILIES (the exact same interval data
// every Scales lesson displays) and scaleShapes.js's computeScaleNotes, so
// the quiz always matches what the Scales course itself teaches.
function generateScaleIdQuestion(difficulty) {
  const pool = difficulty.key === 'advanced' ? [...SCALE_ID_BASE_POOL, ...SCALE_ID_MODES] : SCALE_ID_BASE_POOL;
  const correctKey = pick(pool);
  const rootPitchClass = randomInt(0, 11);
  const family = SCALE_FAMILIES[correctKey];

  const fretMin = Math.max(0, difficulty.fretMin);
  const fretMax = Math.max(fretMin + 4, difficulty.fretMax);
  const stringIndex = pick(difficulty.stringIndices);
  const notes = computeScaleNotes({ rootPitchClass, intervals: family.intervals, degreeLabels: family.degreeLabels, fretStart: fretMin, fretEnd: fretMax })
    .filter((n) => n.string === stringIndex)
    .sort((a, b) => a.fret - b.fret);

  const notesToPlay = notes.map((n) => ({ stringIndex: n.string, fret: n.fret, midi: midiForCell(n.string, n.fret) }));

  const distractors = shuffle(pool.filter((k) => k !== correctKey)).slice(0, 3);
  const choices = shuffle([correctKey, ...distractors]).map((k) => ({ key: k, labelKey: `scaleFamily.${k}` }));

  return {
    kind: 'scaleid',
    prompt: 'Listen to the scale — which one is it?',
    notesToPlay,
    choices,
    correctChoiceKey: correctKey,
  };
}

export function generateQuestion(modeKey, difficulty) {
  if (modeKey === 'pitch') return generatePitchQuestion(difficulty);
  if (modeKey === 'chord') return generateChordQuestion(difficulty);
  if (modeKey === 'interval') return (Math.random() < 0.5 ? generateTriadQuestion : generateIntervalQuestion)(difficulty);
  if (modeKey === 'scaleid') return generateScaleIdQuestion(difficulty);
  return generateCallResponseQuestion(difficulty);
}

const BEST_STREAK_STORAGE_PREFIX = 'earTrainingBestStreak:';

export function loadBestStreak(modeKey) {
  const raw = localStorage.getItem(BEST_STREAK_STORAGE_PREFIX + modeKey);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function saveBestStreak(modeKey, value) {
  localStorage.setItem(BEST_STREAK_STORAGE_PREFIX + modeKey, String(value));
}
