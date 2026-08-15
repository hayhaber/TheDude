import { CHORD_QUALITIES } from './chordQualities';

// Middle C (MIDI 60) — chord tones are placed in the octave starting here
// by default, a comfortable, universally-expected default range for a
// "show me this chord" display (matches how most chord/piano-diagram tools
// default to middle C regardless of key).
const MIDDLE_C = 60;

// Instrument-agnostic chord data (chordQualities.js's CHORD_QUALITIES —
// already { degree, semitones, role } per tone, no fret concept in it at
// all) turned into plain MIDI note numbers — the piano equivalent of what
// computeChordPositions.js does for the fretboard, but far simpler: no
// fret-fitting/shape search, just root + interval. Reused as-is by Compose
// (and, later, any other feature that wants "show this chord on piano").
export function computePianoChordTones({ root, qualityKey, bass }) {
  const quality = CHORD_QUALITIES[qualityKey];
  if (!quality || !root) return [];

  // Root placed near middle C by pitch class, every other tone stacked
  // *above* it by its raw semitone offset — NOT `% 12`'d individually.
  // Wrapping each tone's semitone offset into 0-11 independently (the old
  // approach) put a wrong note below the root whenever
  // rootPitchClass + semitones >= 12 — e.g. G major's fifth (semitones: 7)
  // landed at (7+7)%12=2 → D *below* G and the third, instead of D above
  // both. A chord's tones are only ever correctly ascending when computed
  // from one fixed root anchor, not each modulo'd back into the same
  // octave independently.
  const rootMidi = MIDDLE_C + root.pitchClass;
  const tones = quality.tones.map((tone) => ({
    midi: rootMidi + tone.semitones,
    role: tone.role,
    isRoot: tone.role === 'root',
  }));

  if (bass) {
    // A slash chord's specified bass note is voiced an octave below the
    // rest of the chord, the way a player would actually play it.
    tones.unshift({ midi: MIDDLE_C - 12 + bass.pitchClass, role: 'bass', isRoot: false, isBass: true });
  }

  return tones;
}
