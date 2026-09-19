// Pure scale-to-fretboard computation, no React — parallel in spirit to
// heatMap.js's per-fret loop (same STANDARD_TUNING x fret-range iteration)
// and voicings.js's shape-root reuse (fivePositionWindows anchors off the
// exact same 5 CAGED root frets the Studies CAGED course already shows).
import { STANDARD_TUNING, MAX_FRET, mod } from './notes';
import { SHAPE_TEMPLATES } from './shapeTemplates';

// Plain sharp-only names — same simplification Ear Training already uses
// (noteNameForMidi in music/earTraining.js), not full per-scale enharmonic
// spelling (spelling.js's spellTone assumes a 7-letter diatonic degree
// stack, which doesn't cleanly cover 5/6/8-note scales).
const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteNameForPitchClass(pitchClass) {
  return PITCH_CLASS_NAMES[mod(pitchClass, 12)];
}

// Every fretboard position (across all 6 strings) whose pitch class belongs
// to the scale, tagged with its theory-correct degree label and whether
// it's the root. `intervals`/`degreeLabels` are parallel arrays (see
// scalesCurriculum.js's SCALE_FAMILIES).
export function computeScaleNotes({ rootPitchClass, intervals, degreeLabels, fretStart, fretEnd }) {
  const notes = [];
  const start = Math.max(0, fretStart);
  const end = Math.min(MAX_FRET, fretEnd);

  STANDARD_TUNING.forEach((stringInfo, stringIndex) => {
    for (let fret = start; fret <= end; fret += 1) {
      const pitchClass = mod(stringInfo.pitchClass + fret, 12);
      const degreeIndex = intervals.findIndex((i) => mod(rootPitchClass + i, 12) === pitchClass);
      if (degreeIndex === -1) continue;
      notes.push({
        string: stringIndex,
        fret,
        degreeLabel: String(degreeLabels[degreeIndex]),
        noteName: noteNameForPitchClass(pitchClass),
        isRoot: degreeIndex === 0,
      });
    }
  });
  return notes;
}

// The b5 "blue note" — a chromatic passing tone commonly added to the
// minor pentatonic scale (turning it into a 6-note "blues-flavored" scale)
// without switching to the full Blues scale entry. Shared by Studies ->
// Scales (scalesCurriculum.js) and Practice -> Scale Practice
// (scalePracticeContent.js) rather than defined twice.
export const BLUE_NOTE_INTERVAL = 6;

// Only minorPentatonic ever gets the b5 injected as an opt-in extra — every
// other scale family (including Blues, whose OWN interval set already has
// a real b5) is returned unchanged.
export function scaleFamilyWithBlueNote(scaleKey, family, includeBlueNote) {
  if (scaleKey !== 'minorPentatonic' || !includeBlueNote) return family;
  const intervals = [...family.intervals, BLUE_NOTE_INTERVAL].sort((a, b) => a - b);
  const degreeLabels = intervals.map((interval) => {
    const knownIndex = family.intervals.indexOf(interval);
    return knownIndex === -1 ? 'b5' : family.degreeLabels[knownIndex];
  });
  return { intervals, degreeLabels };
}

// Highlights which note IS the blue note — minorPentatonic's b5 only exists
// at all when scaleFamilyWithBlueNote() injected it above, and Blues' own
// b5 is a native scale tone the lesson explicitly calls "the blue note" in
// its own description — either way the degree label 'b5' unambiguously
// identifies it here. Deliberately scoped to just these two scale keys:
// other scales with a real b5 degree (Locrian, diminished, ...) aren't
// being taught as "there's one added blue note," so tagging their b5 the
// same way would misrepresent them.
export function tagBlueNote(notes, scaleKey) {
  if (scaleKey !== 'minorPentatonic' && scaleKey !== 'blues') return notes;
  return notes.map((n) => (n.degreeLabel === 'b5' ? { ...n, isBlueNote: true } : n));
}

// The 5 CAGED-style position anchors for a given root — reuses
// SHAPE_TEMPLATES.major's own root-fret math (the same shapes the CAGED
// course displays) rather than hand-authoring separate scale-position
// templates. Each window is anchor-1..anchor+3 (5 frets) around that
// shape's root fret, sorted low-to-high up the neck.
//
// This width went through two other values first:
//   - The original -2/+4 (6 frets): with real CAGED root frets landing only
//     ~2-3 frets apart (verified across all 12 keys), consecutive positions
//     shared 4-5 of their 6 frets — switching Position looked like nothing
//     was removed, just added to.
//   - A narrower -1/+2 (4 frets) fixed the overlap, but broke something
//     more basic: a real "position" is a root-to-root box (you should see
//     the root note at BOTH the low and high end, one octave apart) — at 4
//     frets wide, some shape/key combinations only fit ONE root occurrence
//     (verified: minimum dropped to 1 across all 12 keys), i.e. the box
//     genuinely lost real notes it should contain, not just extra overlap.
// At 5 frets, every shape in every key keeps both root occurrences
// (verified minimum: 2) while overlap with neighbors stays a real, modest
// 2-3 frets — not the 4-5-fret near-duplication the original width had.
export function fivePositionWindows(rootPitchClass) {
  const anchors = SHAPE_TEMPLATES.major.map((template) => {
    const anchorIndex = template.strings.findIndex((s) => s.role === 'root');
    const anchorOpenPitch = STANDARD_TUNING[anchorIndex].pitchClass;
    const anchorFret = template.strings[anchorIndex].fret;
    const templateRootPitch = mod(anchorOpenPitch + anchorFret, 12);
    const baseOffset = mod(rootPitchClass - templateRootPitch, 12);
    return { shapeName: template.name, rootFret: baseOffset };
  });

  return anchors
    .map(({ shapeName, rootFret }) => ({
      shapeName,
      rootFret,
      fretStart: Math.max(0, rootFret - 1),
      fretEnd: Math.min(MAX_FRET, rootFret + 3),
    }))
    .sort((a, b) => a.rootFret - b.rootFret);
}
