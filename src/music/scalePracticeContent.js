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
//   'transition' — connects position N straight into position N+1 through
//                   a short DIAGONAL run across whichever 2-3 adjacent
//                   strings the two shapes' own overlap zone touches — the
//                   way certified teachers actually demonstrate positions
//                   overlapping (e.g. Guitar Alliance/JustinGuitar-style
//                   "connecting the pentatonic boxes" lessons): a brief
//                   phrase through the shared fret span, crossing strings
//                   as the scale tones naturally fall, not a slide up one
//                   string the full distance (that's a different, separate
//                   technique from 'linear', not what bridges two boxes).
import { computeScaleNotes, fivePositionWindows } from './scaleShapes';
import { SCALE_FAMILIES } from './scalesCurriculum';
import { STANDARD_TUNING, MAX_FRET } from './notes';

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

// The b5 injected by scaleIntervals() is tagged with the literal degree
// label 'b5' — safe to match on here since scalePracticeContent.js is the
// only place that ever injects it (SCALE_FAMILIES entries used elsewhere,
// e.g. the real Blues/Locrian scales, keep their own legitimate 'b5' labels
// untouched — this tag only ever reaches Fretboard notes built by this file).
function tagBlueNote(notes, scaleKey, includeBlueNote) {
  if (scaleKey !== 'minorPentatonic' || !includeBlueNote) return notes;
  return notes.map((n) => (n.degreeLabel === 'b5' ? { ...n, isBlueNote: true } : n));
}

// One-finger-per-fret (OFPF) — the standard system for assigning left-hand
// fingers within a fixed hand position: whichever fret sits lowest in the
// box gets the index finger, and each fret above it steps to the next
// finger (middle, ring, pinky) — matches how certified teachers hand out
// fingerings for a pentatonic/major-scale box. Only meaningful within a
// single fixed hand position ('position' and 'transition' modes below) —
// 'linear' mode deliberately shifts hand position as it runs the neck, so
// a single fixed OFPF numbering wouldn't describe it and is left out.
function withFingering(notes) {
  const fretted = notes.filter((n) => n.fret > 0).map((n) => n.fret);
  if (fretted.length === 0) return notes;
  const baseFret = Math.min(...fretted);
  return notes.map((n) => (n.fret === 0 ? n : { ...n, finger: Math.min(4, n.fret - baseFret + 1) }));
}

// --- Mode: 'position' — one box shape, standard CAGED-style practice -----
export function buildPositionExercise(scaleKey, rootPitchClass, positionIndex, { includeBlueNote = false } = {}) {
  const windows = fivePositionWindows(rootPitchClass);
  const window = windows[positionIndex] ?? windows[0];
  const { intervals, degreeLabels } = scaleIntervals(scaleKey, includeBlueNote);
  const notes = withFingering(
    tagBlueNote(
      computeScaleNotes({ rootPitchClass, intervals, degreeLabels, fretStart: window.fretStart, fretEnd: window.fretEnd }).sort(
        (a, b) => a.string - b.string || a.fret - b.fret
      ),
      scaleKey,
      includeBlueNote
    )
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
  const notes = tagBlueNote(
    computeScaleNotes({ rootPitchClass, intervals, degreeLabels, fretStart: 0, fretEnd: Math.min(MAX_FRET, fretEnd) })
      .filter((n) => strings.includes(n.string))
      .sort((a, b) => a.string - b.string || a.fret - b.fret),
    scaleKey,
    includeBlueNote
  );
  return { title: null, bpmSuggested: suggestedBpm(), sequence: upAndDown(notes), shapeNotes: notes };
}

// Walks a set of fretboard notes strictly ascending in pitch, crossing
// strings as needed rather than sliding up just one. At each pitch step
// (several string/fret spots can share the same pitch), it picks whichever
// candidate is closest to the previous note — fewest strings crossed first,
// then fewest frets — the same "least hand motion" principle a real player
// uses when choosing which adjacent string to move to mid-phrase.
function diagonalPath(rawNotes) {
  const byPitch = new Map();
  rawNotes.forEach((n) => {
    const pitch = STANDARD_TUNING[n.string].baseMidi + n.fret;
    if (!byPitch.has(pitch)) byPitch.set(pitch, []);
    byPitch.get(pitch).push(n);
  });
  const pitches = [...byPitch.keys()].sort((a, b) => a - b);

  const path = [];
  let prev = null;
  pitches.forEach((pitch) => {
    const candidates = byPitch.get(pitch);
    const best = prev
      ? candidates.reduce((a, b) => {
          const costA = Math.abs(a.string - prev.string) * 100 + Math.abs(a.fret - prev.fret);
          const costB = Math.abs(b.string - prev.string) * 100 + Math.abs(b.fret - prev.fret);
          return costB < costA ? b : a;
        })
      : candidates[0];
    path.push(best);
    prev = best;
  });
  return path;
}

// Splits the bridge's notes into "still position N" vs "already position
// N+1" by comparing each note's fret to the midpoint between the two
// positions' own root frets — simpler and always well-defined, unlike
// checking exact window-membership (the bridge sits IN the overlap of
// both windows by construction, so most notes would test true for both
// and the split would degenerate to "everything is shared"). A learner
// reads this the same way regardless: "closer to where I came from" vs
// "closer to where I'm headed."
function tagTransitionSide(notes, from, to) {
  const midFret = (from.rootFret + to.rootFret) / 2;
  return notes.map((n) => ({ ...n, transitionSide: n.fret < midFret ? 'from' : 'to' }));
}

// --- Mode: 'transition' — bridge position N straight into N+1 ------------
export function buildTransitionExercise(scaleKey, rootPitchClass, positionIndex, { includeBlueNote = false } = {}) {
  const windows = fivePositionWindows(rootPitchClass);
  const from = windows[positionIndex] ?? windows[0];
  const to = windows[positionIndex + 1] ?? from;
  const { intervals, degreeLabels } = scaleIntervals(scaleKey, includeBlueNote);

  // Positions are built with a deliberate overlap (see fivePositionWindows)
  // — the bridge is exactly that shared span, not the two positions' full
  // combined range, so the exercise stays a short connecting phrase rather
  // than replaying both boxes end to end.
  const bridgeStart = Math.max(0, Math.min(from.fretEnd, to.fretStart));
  const bridgeEnd = Math.min(MAX_FRET, Math.max(from.fretEnd, to.fretStart));

  const rawNotes = computeScaleNotes({ rootPitchClass, intervals, degreeLabels, fretStart: bridgeStart, fretEnd: bridgeEnd });
  const notes = withFingering(tagTransitionSide(tagBlueNote(diagonalPath(rawNotes), scaleKey, includeBlueNote), from, to));

  return { title: null, bpmSuggested: suggestedBpm(), sequence: upAndDown(notes), shapeNotes: notes, from, to };
}
