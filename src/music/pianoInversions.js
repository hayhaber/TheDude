// Piano-specific: guitar has no analogous concept (a fretboard's playable
// "shapes" for one chord are a fingering-position choice, not a note-order
// choice — computeChordPositions.js already covers that). Inverting a
// chord is purely reordering which chord tone sits lowest, so this stays a
// display-layer transform over computePianoChordTones's output rather than
// new music theory — the CHORD_QUALITIES tone data itself is untouched.
export const CHORD_INVERSIONS = [
  { key: 'root', labelKey: 'piano.inversion.root' },
  { key: 'first', labelKey: 'piano.inversion.first' },
  { key: 'second', labelKey: 'piano.inversion.second' },
];

export const DEFAULT_INVERSION = 'root';

// Moves the N lowest CORE chord tones up an octave each — 1st inversion
// moves just the root above the third (so the third becomes the lowest
// note); 2nd inversion moves the root and third above the fifth. An
// explicit slash-chord bass note (isBass) is deliberately excluded from
// the rotation and always stays the lowest note — that bass note was a
// specific choice already made by the person who wrote "C/E", not
// something an inversion selector should override.
export function applyInversion(tones, inversionKey) {
  if (!tones || tones.length === 0 || inversionKey === DEFAULT_INVERSION) return tones ?? [];

  const bassTones = tones.filter((t) => t.isBass);
  const coreTones = [...tones.filter((t) => !t.isBass)].sort((a, b) => a.midi - b.midi);

  const rotations = inversionKey === 'first' ? 1 : inversionKey === 'second' ? 2 : 0;
  for (let i = 0; i < rotations && coreTones.length > 0; i += 1) {
    const lowest = coreTones.shift();
    coreTones.push({ ...lowest, midi: lowest.midi + 12 });
  }

  return [...bassTones, ...coreTones].sort((a, b) => a.midi - b.midi);
}

// "C - E - G" style summary of a resolved tone list, in the order they'd
// actually sound low-to-high — the literal display the inversion picker's
// spec asked for, reusing the same plain pitch-class names used everywhere
// else in the app (earTraining.js's noteNameForMidi/PITCH_CLASS_NAMES).
export function inversionSummary(tones, noteNameForMidi) {
  return [...tones].sort((a, b) => a.midi - b.midi).map((t) => noteNameForMidi(t.midi)).join(' - ');
}
