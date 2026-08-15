import { SCALE_FAMILIES } from './scalesCurriculum';

const MIDDLE_C = 60; // see pianoChordTones.js — same default-octave rationale

// Same idea as computePianoChordTones: scalesCurriculum.js's SCALE_FAMILIES
// interval formulas (plain ascending semitone arrays, no fret concept) turned
// into plain ascending MIDI notes for one octave, root distinguished from
// the rest — the piano equivalent of scaleShapes.js's computeScaleNotes,
// again far simpler since there's no fretboard window to fit into.
export function computePianoScaleTones(rootPitchClass, scaleKey) {
  const family = SCALE_FAMILIES[scaleKey];
  if (!family) return [];

  const rootMidi = MIDDLE_C + rootPitchClass;
  const notes = family.intervals.map((semitones, i) => ({
    midi: rootMidi + semitones,
    degreeLabel: family.degreeLabels[i],
    isRoot: semitones === 0,
  }));
  // Closing octave root, so the scale visually reads as a complete octave span.
  notes.push({ midi: rootMidi + 12, degreeLabel: 1, isRoot: true });
  return notes;
}
