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

// The 5 CAGED-style position anchors for a given root — reuses
// SHAPE_TEMPLATES.major's own root-fret math (the same shapes the CAGED
// course displays) rather than hand-authoring separate scale-position
// templates. Each window is a hand-span (anchor - 2 to anchor + 4) around
// that shape's root fret, sorted low-to-high up the neck.
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
      fretStart: Math.max(0, rootFret - 2),
      fretEnd: Math.min(MAX_FRET, rootFret + 4),
    }))
    .sort((a, b) => a.rootFret - b.rootFret);
}
