import { mod } from './notes';

const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
// Base tension by scale-degree function: I is home (lowest), IV/vi are the
// stable "relaxed" chords, ii/iii sit in between, V and vii° are the
// dominant-function chords that pull hardest toward resolution.
const DEGREE_TENSION = { 1: 5, 2: 45, 3: 45, 4: 25, 5: 80, 6: 25, 7: 95 };
const BORROWED_TENSION = 90; // not diatonic to the detected key at all

// Combines the active chord's harmonic function (relative to the detected
// key) with the last note you played (a chord tone pulls toward
// resolution, a passing tone adds tension) into one 0-100 score + label.
export function computeTension({ chordRootPitchClass, tonicPitchClass, lastPlayedNoteRole }) {
  let score = BORROWED_TENSION;
  if (tonicPitchClass != null) {
    const degree = MAJOR_SCALE_INTERVALS.findIndex((i) => mod(tonicPitchClass + i, 12) === chordRootPitchClass) + 1;
    if (degree > 0) score = DEGREE_TENSION[degree];
  }

  if (lastPlayedNoteRole === 'passing') score += 15;
  else if (lastPlayedNoteRole) score -= 5;
  score = Math.max(0, Math.min(100, score));

  let label;
  if (score <= 20) label = 'Resolution';
  else if (score <= 40) label = 'Relaxed';
  else if (score <= 65) label = 'Medium';
  else label = 'High Tension';

  return { score, label };
}
