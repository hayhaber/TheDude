// Ear Training & Fretboard Quiz — pure question-generation/scoring logic.
// Reuses the same music-theory data the rest of the app already has
// (STANDARD_TUNING, CHORD_QUALITIES, enumerateTriadPositions) rather than
// duplicating it, so quiz content always matches what's shown elsewhere.
import { STANDARD_TUNING, MAX_FRET, mod } from './notes';
import { CHORD_QUALITIES } from './chordQualities';
import { enumerateTriadPositions } from './triads';
import { SCALE_FAMILIES } from './scalesCurriculum';
import { computeScaleNotes } from './scaleShapes';
import { computeChordPositions, nearestFretForPitch } from './computeChordPositions';

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
// Order here is the Quiz Mode dropdown's own order — deliberately easiest
// to most advanced, not alphabetical or by when each mode was added. Cross-
// checked against how reference ear-training courses actually stage this,
// most usefully Rick Beato's own paid "Ear Training Method" (20 chapters,
// beatoeartraining.com) — a real, well-regarded professional curriculum,
// not just an app's marketing copy — whose own chapter order is Pitch ->
// Intervals -> Triads -> Sevenths -> Tonal Progressions -> ... -> Scales ->
// ... -> Melodic Dictation. That single-note-first, then-intervals,
// THEN-chords, scales-before-full-melodic-dictation shape is the backbone
// here:
//   1. Direction    — even more basic than any of Beato's own chapters:
//                      "can you tell two notes apart at all, and which one's
//                      higher?" The prerequisite beneath his own starting
//                      point.
//   2. Pitch        — Beato ch.1 "Pitch": name a single absolute note.
//   3. Scale Degree — still one note at a time, but by its ROLE in a key
//                      (movable-do) rather than its absolute name — the
//                      natural companion step before jumping to comparing
//                      TWO notes mathematically, and the direct bridge
//                      toward Studies -> Chords by Ear's own functional/
//                      Roman-numeral hearing later.
//   4. Interval     — Beato ch.2 "Intervals": the exact distance between
//                      two notes, a more analytical skill than either of
//                      the two single-note steps above.
//   5. Chord        — Beato ch.3 "Triads" (the Major/Minor-only tier first).
//   6. Triad        — the same skill widened to Diminished/Augmented too;
//                      kept immediately after Chord since it's a direct
//                      extension of it, not a new concept (was its own
//                      split-out mode already — see below).
//   7. Rhythm       — Beato ch.8 "Rhythm": a genuinely different skill axis
//                      (timing, not pitch at all) — placed right where he
//                      places it, after basic chords and before Scales.
//   8. Scale ID     — Beato ch.9 "Scales": the OVERALL color of many
//                      degrees heard as one run, which benefits from
//                      already knowing individual degrees/intervals.
//   9. Call & Response — Beato's own "Melodic Dictation" sits far later
//                      (ch.11, after chords AND scales) for a reason: it's
//                      the integrative, most demanding skill here, drawing
//                      on pitch + interval + tonal hearing all at once to
//                      reproduce a whole phrase — the capstone before
//                      moving on to the full Chords by Ear course.
export const EAR_TRAINING_MODES = [
  { key: 'direction', labelKey: 'earTraining.mode.direction' },
  { key: 'pitch', labelKey: 'earTraining.mode.pitch' },
  { key: 'scaledegree', labelKey: 'earTraining.mode.scaledegree' },
  { key: 'interval', labelKey: 'earTraining.mode.interval' },
  { key: 'chord', labelKey: 'earTraining.mode.chord' },
  // Split out from 'interval' — that mode used to coin-flip between plain
  // intervals and triad-quality questions on every question, so a player
  // wanting to isolate one or the other couldn't. Now each is its own mode.
  { key: 'triad', labelKey: 'earTraining.mode.triad' },
  { key: 'rhythm', labelKey: 'earTraining.mode.rhythm' },
  { key: 'scaleid', labelKey: 'earTraining.mode.scaleid' },
  { key: 'callresponse', labelKey: 'earTraining.mode.callresponse' },
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

// Pitch / Fret Location has its own difficulty shape, separate from the
// shared string/fret ranges above (which still drive interval / chord /
// call-&-response). The note is played on a random string drawn from the
// whole neck at every tier; what changes is the fret stretch and whether
// the answer cells are limited to the string it was played on:
//   beginner / intermediate — you're *told* the string (cells sit only on
//     it), so the task is purely "which fret", over 0–5 then 0–9.
//   advanced — cells on every string across 0–9; find any position that
//     sounds the pitch (every cell with the right pitch is accepted).
const PITCH_DIFFICULTY = {
  beginner: { strings: [0, 1, 2, 3, 4, 5], fretMax: 5, sameStringOnly: true },
  intermediate: { strings: [0, 1, 2, 3, 4, 5], fretMax: 9, sameStringOnly: true },
  advanced: { strings: [0, 1, 2, 3, 4, 5], fretMax: 9, sameStringOnly: false },
};

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
  const p = PITCH_DIFFICULTY[difficulty.key] ?? PITCH_DIFFICULTY.beginner;
  const stringIndex = pick(p.strings);
  const fret = randomInt(0, p.fretMax);
  const midi = midiForCell(stringIndex, fret);
  return {
    kind: 'pitch',
    prompt: `Click the fret that matches the pitch you hear.`,
    notesToPlay: [{ stringIndex, fret, midi }],
    targetMidiSet: [midi],
    // Which cells the answer overlay offers: just the string it was played
    // on, or every string in `p.strings`. Frets 0..answerFretMax either way.
    answerStringIndices: p.sameStringOnly ? [stringIndex] : p.strings,
    answerFretMax: p.fretMax,
    ordered: false,
    choices: null,
    correctChoiceKey: null,
  };
}

// Lowest/highest pitch reachable on the neck at all (open low E .. top fret
// of the high E) — a descending interval can't go below the floor, an
// ascending one can't go above the ceiling, so both generateIntervalQuestion
// and generateDirectionQuestion fall back to the other direction whenever
// the root is too close to either edge.
const MIN_PLAYABLE_MIDI = STANDARD_TUNING[0].baseMidi;
const MAX_PLAYABLE_MIDI = STANDARD_TUNING[STANDARD_TUNING.length - 1].baseMidi + MAX_FRET;

function generateIntervalQuestion(difficulty) {
  const rootCell = randomCell(difficulty);
  const rootMidi = midiForCell(rootCell.stringIndex, rootCell.fret);
  const pool = INTERVALS_BY_DIFFICULTY[difficulty.key] ?? INTERVALS_BY_DIFFICULTY.advanced;
  const correct = pick(pool);
  // Ascending vs descending, and played together (harmonic) vs one after
  // the other (melodic) — both randomized per question so the player
  // actually gets trained on all four combinations over time, matching
  // reference ear-training apps' own "ascending/descending" and "melodic/
  // harmonic" options (see earTrainingPlayer.js for the harmonic playback).
  const descending = Math.random() < 0.5 && rootMidi - correct.semitones >= MIN_PLAYABLE_MIDI;
  const harmonic = Math.random() < 0.5;
  const delta = descending ? -correct.semitones : correct.semitones;
  const secondMidi = rootMidi + delta;
  const secondCell = findCellForMidi(secondMidi) ?? { stringIndex: rootCell.stringIndex, fret: Math.max(0, rootCell.fret + delta) };

  const distractors = shuffle(pool.filter((c) => c.semitones !== correct.semitones)).slice(0, 3);
  // Fixed choice ORDER (the pool's own semitone order), even though which
  // intervals actually appear varies — see generateChordQuestion's own
  // comment for why: shuffling this every question made the answer buttons
  // visibly swap position between questions.
  const choices = [correct, ...distractors]
    .sort((a, b) => a.semitones - b.semitones)
    .map((c) => ({ key: String(c.semitones), label: c.label }));

  return {
    kind: 'interval',
    prompt: 'Listen to the interval — which one is it?',
    descending,
    harmonic,
    notesToPlay: [
      { stringIndex: rootCell.stringIndex, fret: rootCell.fret, midi: rootMidi },
      { stringIndex: secondCell.stringIndex, fret: secondCell.fret, midi: secondMidi },
    ],
    choices,
    correctChoiceKey: String(correct.semitones),
  };
}

// Pitch Direction — "did the pitch go up or down?", the most basic
// relative-pitch skill and the natural prerequisite to full interval-
// quality recognition (see EAR_TRAINING_MODES' own comment; several
// reference ear-training apps ship this as their own dedicated beginner
// drill). Difficulty controls the SIZE of the gap between the two notes —
// wide and obvious for Beginner, down to a single semitone for Advanced —
// the same "narrow the range to make it harder" knob those apps recommend,
// folded into our existing 3-tier difficulty instead of a separate control.
const DIRECTION_SEMITONE_RANGE = {
  beginner: [5, 12],
  intermediate: [2, 7],
  advanced: [1, 3],
};

function generateDirectionQuestion(difficulty) {
  const rootCell = randomCell(difficulty);
  const rootMidi = midiForCell(rootCell.stringIndex, rootCell.fret);
  const [minGap, maxGap] = DIRECTION_SEMITONE_RANGE[difficulty.key] ?? DIRECTION_SEMITONE_RANGE.advanced;
  const gap = randomInt(minGap, maxGap);
  // Direction IS the question — genuinely random each time (unlike the
  // interval mode's ascending/descending, which is an added realism layer
  // on top of a *different* target answer) — only overridden by the
  // playable-range guards below, never biased on its own.
  let higher = Math.random() < 0.5;
  if (higher && rootMidi + gap > MAX_PLAYABLE_MIDI) higher = false;
  if (!higher && rootMidi - gap < MIN_PLAYABLE_MIDI) higher = true;
  const delta = higher ? gap : -gap;
  const secondMidi = rootMidi + delta;
  const secondCell = findCellForMidi(secondMidi) ?? { stringIndex: rootCell.stringIndex, fret: Math.max(0, rootCell.fret + delta) };

  return {
    kind: 'direction',
    prompt: 'Listen — did the second note go higher or lower than the first?',
    notesToPlay: [
      { stringIndex: rootCell.stringIndex, fret: rootCell.fret, midi: rootMidi },
      { stringIndex: secondCell.stringIndex, fret: secondCell.fret, midi: secondMidi },
    ],
    // Fixed order (Higher first) — same "never shuffle a 2-button quiz"
    // lesson as Chord Recognition's Major/Minor buttons.
    choices: [
      { key: 'higher', label: 'Higher' },
      { key: 'lower', label: 'Lower' },
    ],
    correctChoiceKey: higher ? 'higher' : 'lower',
  };
}

// Scale Degree — functional/tonal hearing: a short I-IV-V-I cadence first
// plants a key in the ear (the same "movable-do" priming the reference
// Functional Ear Trainer app centers its entire method on, and its most-
// praised feature by far), then a single melody note is played in that key
// and the player names its scale degree (1-7) rather than its absolute
// pitch or an interval distance. Degree buttons are the pool itself, in
// fixed numeric order — no distractor-shuffling needed (or wanted; see
// generateChordQuestion's own "never shuffle a small fixed choice set"
// lesson) since every degree in the pool is always shown.
//   beginner     — only the tonic triad's own tones (1, 3, 5): the three
//                  most stable degrees, and the natural starting point
//                  every movable-do method teaches first.
//   intermediate — the full major-scale set, 1-7.
//   advanced     — the full set, 1-7, but the key itself is randomly major
//                  or minor — the same degree numbers, a different "feel"
//                  to each one.
const SCALE_DEGREE_POOLS = {
  beginner: [1, 3, 5],
  intermediate: [1, 2, 3, 4, 5, 6, 7],
  advanced: [1, 2, 3, 4, 5, 6, 7],
};
const MAJOR_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const NATURAL_MINOR_SCALE_SEMITONES = [0, 2, 3, 5, 7, 8, 10];
// A comfortable, fixed low-mid register for the priming cadence, independent
// of the fretboard — this is just a "plant the key" audio cue, not a
// fretted position (unlike the single target note below, which needs a
// real string/fret so it can reveal on the neck like every other quiz cell).
const CADENCE_BASE_MIDI = 48;

function generateScaleDegreeQuestion(difficulty) {
  const keyRootPitchClass = randomInt(0, 11);
  // Only Advanced ever asks in a minor key — Beginner/Intermediate stay
  // major so the tonal "home base" being taught is never ambiguous.
  const isMinor = difficulty.key === 'advanced' && Math.random() < 0.5;
  const scaleSemitones = isMinor ? NATURAL_MINOR_SCALE_SEMITONES : MAJOR_SCALE_SEMITONES;
  const keyMode = isMinor ? 'Minor' : 'Major';

  const pool = SCALE_DEGREE_POOLS[difficulty.key] ?? SCALE_DEGREE_POOLS.advanced;
  const degree = pick(pool);
  const targetPitchClass = mod(keyRootPitchClass + scaleSemitones[degree - 1], 12);

  // Land the target note on a real fretboard position (so it reveals on the
  // neck like every other quiz cell) — nearest to a random anchor fret
  // within the difficulty's own range, same technique Compose's slash-chord
  // bass placement already uses (see computeChordPositions.js).
  const stringIndex = pick(difficulty.stringIndices);
  const anchorFret = randomInt(difficulty.fretMin, difficulty.fretMax);
  const { fret } = nearestFretForPitch(targetPitchClass, stringIndex, anchorFret);
  const midi = midiForCell(stringIndex, Math.min(fret, MAX_FRET));

  // I - IV - V - I, root-position triads (V is always major — the dominant's
  // leading tone pulls to the tonic in a minor key too, the standard
  // "harmonic" cadence every functional-ear-training method uses). Plain
  // MIDI chord tones at a fixed register, not tied to any fretboard shape —
  // this is only ever heard, never shown.
  const triad = (rootMidi, major) => [rootMidi, rootMidi + (major ? 4 : 3), rootMidi + 7];
  const cadenceRootMidi = CADENCE_BASE_MIDI + keyRootPitchClass;
  const cadenceChords = [
    triad(cadenceRootMidi, !isMinor),
    triad(cadenceRootMidi + 5, !isMinor),
    triad(cadenceRootMidi + 7, true),
    triad(cadenceRootMidi, !isMinor),
  ];

  return {
    kind: 'scaledegree',
    prompt: 'A cadence sets the key — then listen to the note. Which scale degree is it?',
    cadenceChords,
    keyRootLetter: PITCH_CLASS_NAMES[keyRootPitchClass],
    keyMode,
    notesToPlay: [{ stringIndex, fret: Math.min(fret, MAX_FRET), midi }],
    choices: pool.map((d) => ({ key: String(d), label: String(d) })),
    correctChoiceKey: String(degree),
  };
}

function generateTriadQuestion(difficulty) {
  const rootPitchClass = randomInt(0, 11);
  const qualityKey = pick(TRIAD_QUALITY_KEYS);
  const quality = CHORD_QUALITIES[qualityKey];
  const positions = enumerateTriadPositions(rootPitchClass, quality.tones);
  const inRange = positions.filter((p) => p.strings.every((s) => s.fret === null || s.fret <= difficulty.fretMax + 5));
  // Same fix as buildChordVoicing above: always the first (canonical,
  // lowest-fret) shape — the same one Compose's own Triads mode would
  // default to — instead of a random pick among every valid position.
  const chosen = inRange.length > 0 ? inRange[0] : positions[0];

  const notesToPlay = chosen.strings
    .map((s, i) => (s.fret === null ? null : { stringIndex: i, fret: s.fret, midi: midiForCell(i, s.fret), role: s.role }))
    .filter(Boolean);

  const inversionLabel = (chosen.shapeName.split(' — ')[1] ?? 'Root position').toLowerCase();
  const qualityChoices = TRIAD_QUALITY_KEYS.map((k) => ({ key: k, label: CHORD_QUALITIES[k].label }));

  return {
    kind: 'triad',
    // No inversion mentioned here — nothing is visible to correlate it
    // against until after answering (see EarTrainingModal.jsx's post-answer
    // reveal line, where inversionLabel below is actually used).
    prompt: 'Listen to the triad — what quality is it?',
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
// familiar voicing rather than a separately-invented one — and always the
// SAME one Compose itself would default to (positions[0], lowest baseFret
// first — see voicings.js's own baseFret sort), not a random pick among
// every valid shape. That's what makes a barre chord (e.g. Bb) always show
// as the standard barre shape here too, instead of occasionally landing on
// some other valid-but-unfamiliar position further up the neck.
function buildChordVoicing(rootPitchClass, qualityKey, difficulty) {
  const quality = CHORD_QUALITIES[qualityKey];
  const symbolText = PITCH_CLASS_NAMES[rootPitchClass] + (quality.aliases[0] || '');
  const { isValid, positions } = computeChordPositions(symbolText, 'chord');

  const inRange = isValid ? positions.filter((p) => p.strings.every((s) => s.fret === null || s.fret <= difficulty.fretMax + 5)) : [];
  const chosen = inRange.length > 0 ? inRange[0] : positions.length > 0 ? positions[0] : null;
  if (!chosen) return null;

  const notesToPlay = chosen.strings
    .map((s, i) => (s.fret === null ? null : { stringIndex: i, fret: s.fret, midi: midiForCell(i, s.fret), role: s.role }))
    .filter(Boolean);
  return { notesToPlay, chordText: symbolText, baseFret: chosen.baseFret };
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
  // Fixed choice ORDER (pool's own canonical order — e.g. Major always
  // before Minor), even though which qualities actually appear varies —
  // shuffling this every question (the old behavior) made the two/five
  // answer buttons visibly swap position between questions, which read as
  // broken rather than random.
  const choices = [qualityKey, ...distractors]
    .sort((a, b) => pool.indexOf(a) - pool.indexOf(b))
    .map((k) => ({ key: k, label: CHORD_QUALITIES[k].label }));

  return {
    kind: 'chord',
    needsRoot: false,
    prompt: 'Listen to the chord — what quality is it?',
    notesToPlay: voicing.notesToPlay,
    chordText: voicing.chordText,
    chordBaseFret: voicing.baseFret,
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
    chordText: voicing.chordText,
    chordBaseFret: voicing.baseFret,
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
  // Fixed choice ORDER (the pool's own canonical order) — same reasoning
  // as generateChordQuestion/generateIntervalQuestion.
  const choices = [correctKey, ...distractors]
    .sort((a, b) => pool.indexOf(a) - pool.indexOf(b))
    .map((k) => ({ key: k, labelKey: `scaleFamily.${k}` }));

  return {
    kind: 'scaleid',
    prompt: 'Listen to the scale — which one is it?',
    notesToPlay,
    choices,
    correctChoiceKey: correctKey,
  };
}

// Rhythm Recognition — a genuinely different skill axis from every mode
// above (timing, not pitch at all), reusing the exact same "listen, pick
// from fixed choices, see the reveal" shape so it needs no new interaction
// paradigm or fretboard involvement whatsoever. Patterns are written as
// Kodály-style rhythm syllables — a real, long-established beginner
// rhythm-literacy method (not invented for this app): "Ta" = one beat,
// "Ta-di" = a beat split into two even notes, "Ta-a" = one note held
// across two beats, "(rest)" = a beat of silence. Every pattern in every
// pool is exactly one 4-beat bar, so the difficulty curve is purely about
// how finely subdivided/syncopated that one bar gets, matching Beato's own
// ch.8 placement (right after basic chords, before Scales):
//   beginner     — three maximally-contrasting, UNMIXED patterns (all
//                  quarters / all eighths / two held half-bars) — this is
//                  "can you tell a steady pulse from a running one at all",
//                  not yet "which exact mixed pattern was that".
//   intermediate — quarters and eighths freely mixed within the bar.
//   advanced     — adds held two-beat notes and rests (syncopation).
const RHYTHM_BEAT_MS = 500; // a comfortable, fixed ~120bpm feel
const RHYTHM_CELL_BEATS = { Q: 1, EE: 1, H: 2, R: 1 };
const RHYTHM_CELL_ONSET_FRACTIONS = { Q: [0], EE: [0, 0.5], H: [0], R: [] };
const RHYTHM_CELL_SYLLABLE = { Q: 'Ta', EE: 'Ta-di', H: 'Ta-a', R: '(rest)' };
const RHYTHM_POOLS = {
  beginner: [
    ['Q', 'Q', 'Q', 'Q'],
    ['EE', 'EE', 'EE', 'EE'],
    ['H', 'H'],
  ],
  intermediate: [
    ['Q', 'EE', 'Q', 'Q'],
    ['EE', 'Q', 'EE', 'Q'],
    ['Q', 'Q', 'EE', 'EE'],
    ['EE', 'EE', 'Q', 'Q'],
    ['Q', 'EE', 'EE', 'Q'],
    ['EE', 'Q', 'Q', 'EE'],
  ],
  advanced: [
    ['H', 'Q', 'Q'],
    ['Q', 'Q', 'H'],
    ['Q', 'R', 'Q', 'Q'],
    ['R', 'Q', 'Q', 'Q'],
    ['EE', 'R', 'EE', 'Q'],
    ['Q', 'EE', 'R', 'Q'],
    ['H', 'EE', 'Q'],
    ['EE', 'H', 'Q'],
  ],
};

function syllablesFor(cells) {
  return cells.map((c) => RHYTHM_CELL_SYLLABLE[c]).join(' ');
}

// Every onset (in ms from the start of the bar) the pattern's clicks
// should fire at, at RHYTHM_BEAT_MS per beat.
function rhythmOnsetsMs(cells) {
  const onsets = [];
  let cursorBeats = 0;
  for (const cell of cells) {
    for (const fraction of RHYTHM_CELL_ONSET_FRACTIONS[cell]) {
      onsets.push(Math.round((cursorBeats + fraction) * RHYTHM_BEAT_MS));
    }
    cursorBeats += RHYTHM_CELL_BEATS[cell];
  }
  return onsets;
}

function generateRhythmQuestion(difficulty) {
  const pool = RHYTHM_POOLS[difficulty.key] ?? RHYTHM_POOLS.advanced;
  const correctCells = pick(pool);
  const correctKey = syllablesFor(correctCells);

  const distractors = shuffle(pool.filter((cells) => cells !== correctCells)).slice(0, 3);
  // Fixed choice ORDER (the pool's own order) — same lesson as every other
  // mode: shuffling a small answer set every question made buttons look
  // like they were randomly swapping position between questions.
  const choices = [correctCells, ...distractors]
    .sort((a, b) => pool.indexOf(a) - pool.indexOf(b))
    .map((cells) => ({ key: syllablesFor(cells), label: syllablesFor(cells) }));

  return {
    kind: 'rhythm',
    prompt: 'Listen to the rhythm — which pattern is it?',
    rhythmOnsets: rhythmOnsetsMs(correctCells),
    notesToPlay: [],
    choices,
    correctChoiceKey: correctKey,
  };
}

export function generateQuestion(modeKey, difficulty) {
  if (modeKey === 'pitch') return generatePitchQuestion(difficulty);
  if (modeKey === 'chord') return generateChordQuestion(difficulty);
  if (modeKey === 'triad') return generateTriadQuestion(difficulty);
  if (modeKey === 'direction') return generateDirectionQuestion(difficulty);
  if (modeKey === 'scaledegree') return generateScaleDegreeQuestion(difficulty);
  if (modeKey === 'interval') return generateIntervalQuestion(difficulty);
  if (modeKey === 'rhythm') return generateRhythmQuestion(difficulty);
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

// Lifetime (cross-session) accuracy per mode — same storage pattern as best
// streak above, but a running {correct, total} tally instead of a single
// number. The in-modal score/streak/accuracy tiles all reset to 0 the
// moment a new session starts (by design — "how am I doing right now"), so
// there was previously no way to see whether accuracy on, say, Chord
// Recognition is actually improving week over week. This is that persistent
// record, per explicit request.
const LIFETIME_STATS_STORAGE_PREFIX = 'earTrainingLifetime:';

export function loadLifetimeStats(modeKey) {
  try {
    const raw = localStorage.getItem(LIFETIME_STATS_STORAGE_PREFIX + modeKey);
    if (!raw) return { correct: 0, total: 0 };
    const parsed = JSON.parse(raw);
    const correct = Number(parsed?.correct);
    const total = Number(parsed?.total);
    if (!Number.isFinite(correct) || !Number.isFinite(total) || total < 0 || correct < 0 || correct > total) {
      return { correct: 0, total: 0 };
    }
    return { correct, total };
  } catch {
    return { correct: 0, total: 0 };
  }
}

export function saveLifetimeStats(modeKey, stats) {
  localStorage.setItem(LIFETIME_STATS_STORAGE_PREFIX + modeKey, JSON.stringify(stats));
}
