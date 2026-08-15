import { STANDARD_TUNING, mod } from './notes';
import { CHORD_QUALITIES } from './chordQualities';

const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

// Note importance, per the spec's own priority order: chord tone > scale
// tone > passing tone > avoid note. "Avoid" here uses the standard
// jazz-theory heuristic — a scale tone sitting a half-step above a chord
// tone clashes with it (e.g. the natural 4th a half-step above a major 3rd).
export function computeHeatMapNotes({ rootPitchClass, qualityKey, tonicPitchClass, fretStart, fretEnd }) {
  const quality = CHORD_QUALITIES[qualityKey];
  if (!quality || tonicPitchClass == null) return [];

  const chordPitchClasses = new Set(quality.tones.map((t) => mod(rootPitchClass + t.semitones, 12)));
  const scalePitchClasses = new Set(MAJOR_SCALE_INTERVALS.map((i) => mod(tonicPitchClass + i, 12)));

  const notes = [];
  STANDARD_TUNING.forEach((stringInfo, stringIndex) => {
    for (let fret = Math.max(0, fretStart); fret <= fretEnd; fret += 1) {
      const pitchClass = mod(stringInfo.pitchClass + fret, 12);
      let tier;
      if (chordPitchClasses.has(pitchClass)) {
        tier = 'chord';
      } else if (scalePitchClasses.has(pitchClass)) {
        tier = chordPitchClasses.has(mod(pitchClass - 1, 12)) ? 'avoid' : 'scale';
      } else {
        tier = 'passing';
      }
      notes.push({ string: stringIndex, fret, tier });
    }
  });
  return notes;
}
