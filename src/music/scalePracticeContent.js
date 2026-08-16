// Practice -> Scale Practice's content source. Judging reuses the EXACT
// same generic engine as Practice -> Rhythm Practice (hooks/useRhythmGame.js
// — one note per metronome beat, judged by real mic pitch detection within
// a hit window) — every function here just builds a `{sequence, bpmSuggested}`
// object in that hook's own generic shape (`sequence: [{string, fret, ...}]`),
// exactly like scalesCurriculum.js's own buildScaleExercise already does for
// the Studies course. No new judging/audio code, only new CONTENT.
//
// Three modes, matching real guitar pedagogy (not invented conventions):
//   'position'   — one CAGED-anchored box position (2-3 notes/string),
//                   the standard way a scale shape is first introduced.
//   'linear'     — the scale's own pitch sequence walked along one or two
//                   ADJACENT strings the full length of the neck (the
//                   classic "single-string scale" / "two-string pattern"
//                   exercise) — removes the box-shape crutch and builds
//                   real fretboard-note fluency.
//   'transition' — connects position N straight into position N+1 by
//                   playing the scale's own continuous pitch sequence along
//                   one string across the boundary between them — the
//                   standard way teachers demonstrate that positions
//                   overlap rather than being separate, disconnected
//                   shapes (same linear-run mechanics as 'linear', just
//                   scoped to the two positions' own fret span).
import { computeScaleNotes, fivePositionWindows } from './scaleShapes';
import { SCALE_FAMILIES } from './scalesCurriculum';
import { MAX_FRET } from './notes';

// The b5 "blue note" — a chromatic passing tone commonly added to the
// minor pentatonic scale (turning it into a 6-note "blues-flavored"
// scale) without actually switching to the full Blues scale entry.
const BLUE_NOTE_INTERVAL = 6;

const MIN_BPM = 55;
const MAX_BPM = 85; // one note per beat — kept comfortably inside useRhythmGame's own 600ms hit window even at the top of this range

function suggestedBpm() {
  return MIN_BPM + Math.floor(Math.random() * (MAX_BPM - MIN_BPM + 1));
}

// Only minorPentatonic has a defined "blue note" concept here — every
// other scale family is returned unchanged.
function scaleIntervals(scaleKey, includeBlueNote) {
  const family = SCALE_FAMILIES[scaleKey];
  if (scaleKey !== 'minorPentatonic' || !includeBlueNote) return family;
  const intervals = [...family.intervals, BLUE_NOTE_INTERVAL].sort((a, b) => a - b);
  const degreeLabels = intervals.map((interval) => {
    const knownIndex = family.intervals.indexOf(interval);
    return knownIndex === -1 ? 'b5' : family.degreeLabels[knownIndex];
  });
  return { intervals, degreeLabels };
}

// Ascending up to the top note, then back down to the root without
// repeating the top note twice in a row — the standard scale-run shape
// every method book uses, rather than just a one-way ascent.
function upAndDown(notesAscending) {
  const descending = notesAscending.slice(0, -1).reverse();
  return [...notesAscending, ...descending];
}

// --- Mode: 'position' — one box shape, standard CAGED-style practice -----
export function buildPositionExercise(scaleKey, rootPitchClass, positionIndex, { includeBlueNote = false } = {}) {
  const windows = fivePositionWindows(rootPitchClass);
  const window = windows[positionIndex] ?? windows[0];
  const { intervals, degreeLabels } = scaleIntervals(scaleKey, includeBlueNote);
  const notes = computeScaleNotes({ rootPitchClass, intervals, degreeLabels, fretStart: window.fretStart, fretEnd: window.fretEnd }).sort(
    (a, b) => a.string - b.string || a.fret - b.fret
  );
  // shapeNotes: the plain (non-repeated) note set, for a static "study this
  // shape before you start" fretboard preview — see ScalePracticePanel.jsx.
  // `sequence` (up-and-down, judged one note at a time) is what actually
  // drives the metronome/mic engine.
  return { title: null, bpmSuggested: suggestedBpm(), sequence: upAndDown(notes), shapeNotes: notes, window };
}

// --- Mode: 'linear' — single/two-string run the length of the neck -------
export function buildLinearExercise(
  scaleKey,
  rootPitchClass,
  { stringIndex = 2, stringCount = 1, includeBlueNote = false, fretEnd = 15 } = {}
) {
  const { intervals, degreeLabels } = scaleIntervals(scaleKey, includeBlueNote);
  const strings = stringCount === 2 ? [stringIndex, stringIndex + 1] : [stringIndex];
  const notes = computeScaleNotes({ rootPitchClass, intervals, degreeLabels, fretStart: 0, fretEnd: Math.min(MAX_FRET, fretEnd) })
    .filter((n) => strings.includes(n.string))
    .sort((a, b) => a.string - b.string || a.fret - b.fret);
  return { title: null, bpmSuggested: suggestedBpm(), sequence: upAndDown(notes), shapeNotes: notes };
}

// --- Mode: 'transition' — bridge position N straight into N+1 ------------
export function buildTransitionExercise(scaleKey, rootPitchClass, positionIndex, { stringIndex = 2, includeBlueNote = false } = {}) {
  const windows = fivePositionWindows(rootPitchClass);
  const from = windows[positionIndex] ?? windows[0];
  const to = windows[positionIndex + 1] ?? from;
  const { intervals, degreeLabels } = scaleIntervals(scaleKey, includeBlueNote);
  const notes = computeScaleNotes({ rootPitchClass, intervals, degreeLabels, fretStart: from.fretStart, fretEnd: to.fretEnd })
    .filter((n) => n.string === stringIndex)
    .sort((a, b) => a.fret - b.fret);
  return { title: null, bpmSuggested: suggestedBpm(), sequence: upAndDown(notes), shapeNotes: notes, from, to };
}
