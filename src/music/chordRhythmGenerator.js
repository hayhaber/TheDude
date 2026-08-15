// Practice -> Chord Rhythm's "Starter set" content source — a real
// generator, not a fixed list: picks a random major key and a random common
// progression PATTERN (expressed as diatonic scale-degree indices), then
// resolves those degrees against that key's own diatonic chords via
// harmonyCurriculum.js's buildDiatonicChords — the same theory-correct
// diatonic-chord builder the Harmony course already uses, so every
// generated progression is guaranteed music-theory-valid for whichever key
// got picked, never a copy-pasted fixed-key list that only ever plays in C.
import { buildDiatonicChords } from './harmonyCurriculum';

// I=0, ii=1, iii=2, IV=3, V=4, vi=5, vii°=6 (0-indexed diatonic degree).
// A handful of the most common, real pop/folk/jazz progressions — every one
// picked so no two ADJACENT entries share the same degree. This drill fires
// one strike-event per entry (not "hold this chord for N bars"), so a
// pattern like the old 12-bar-blues shape ([0,0,0,0,3,3,...]) — correct as
// written-out blues bars, but four back-to-back identical strike-events in
// THIS format — read to a player as "the generator is stuck repeating
// itself," not as music. Keep that invariant (no adjacent duplicates) for
// any pattern added here.
export const PROGRESSION_PATTERNS = [
  [0, 3, 4, 0], // I - IV - V - I
  [1, 4, 0], // ii - V - I
  [0, 4, 5, 3], // I - V - vi - IV (the classic pop loop)
  [5, 3, 0, 4], // vi - IV - I - V
  [0, 5, 3, 4], // I - vi - IV - V
  [0, 3, 1, 4], // I - IV - ii - V
  [5, 1, 4, 0], // vi - ii - V - I (the "circle" progression)
  [0, 2, 5, 3], // I - iii - vi - IV
  [0, 4, 3, 4], // I - V - IV - V (rock turnaround)
  [2, 5, 1, 4], // iii - vi - ii - V
  [0, 3, 0, 4], // I - IV - I - V (bluesy turnaround, no repeated strikes)
];

const BEATS_PER_CHORD = 4;
// A comfortable practice tempo band — slow enough to read a freshly
// generated chord before it arrives, fast enough to still feel like a
// rhythm exercise rather than a dirge.
const MIN_BPM = 70;
const MAX_BPM = 100;

export function generateChordRhythmProgression() {
  const rootPitchClass = Math.floor(Math.random() * 12);
  const pattern = PROGRESSION_PATTERNS[Math.floor(Math.random() * PROGRESSION_PATTERNS.length)];
  const diatonic = buildDiatonicChords(rootPitchClass, 'major', false);
  const progressionText = pattern.map((degreeIndex) => diatonic[degreeIndex].chordText).join(' ');
  const bpmSuggested = MIN_BPM + Math.floor(Math.random() * (MAX_BPM - MIN_BPM + 1));
  return { progressionText, bpmSuggested, beatsPerChord: BEATS_PER_CHORD };
}
