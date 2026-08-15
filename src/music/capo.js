import { transposeChordText, transposeNoteName } from './transpose';

// Highest fret a capo can realistically sit at on a normal guitar — also
// keeps the transposed pitch class math meaningful (a capo at 12 would just
// reproduce the open strings an octave up, not a new key).
export const MAX_CAPO_FRET = 11;

// What a fingered chord shape actually sounds like with a capo on
// `capoFret` (0 = no capo, returned unchanged). The shape/fingering and the
// chord's quality never change — a capo doesn't alter what you finger, only
// where the "open" strings actually sit — so this is exactly
// transposeChordText's root/bass-shifting math, just non-destructive
// (unlike Compose -> Transpose, this never rewrites what's actually typed).
export function soundingChordText(chordText, capoFret) {
  return transposeChordText(chordText, capoFret);
}

// A detected key label (scaleAnalyzer.js's "F Major" format) transposed the
// same way — what key the progression actually SOUNDS in in with a capo on,
// not what key the typed/fingered shapes are in.
export function soundingKeyName(keyLabel, capoFret) {
  if (!keyLabel || !capoFret) return keyLabel;
  const [tonic, ...rest] = keyLabel.split(' ');
  return [transposeChordText(tonic, capoFret), ...rest].join(' ');
}

// A physical capo doesn't change what shape you finger — it changes where
// the guitar's effective "nut" is. Every fretted note sits `capoFret` frets
// higher than the shape says, and every *open* string (fret 0) now actually
// rings at exactly the capo's fret instead of the true nut — you physically
// cannot reach behind the capo at all once it's clamped down. It also
// changes what actually SOUNDS at that string: a note labeled "E" in the
// shape's own (capo-agnostic) data now rings `capoFret` semitones higher —
// e.g. capo 3 turns that same string into a "G" — so the label shown must be
// re-derived the same way soundingChordText re-derives the chord's own
// letter, or the dot would show the shape's original note name instead of
// what a player actually hears. This derives the on-screen fretboard
// position to draw from the shape's own true (capo-agnostic) position, so
// every other system that already understands `position` objects
// (matchPosition's chord-to-chord sync, the position roadmap, Position
// Controls' shape picker, audio's own capo math in chordPlayer.js) keeps
// operating on the real, unshifted shape/labels — only this derived copy,
// used purely for what the fretboard *draws*, ever sees the capo's offset.
export function applyCapoToPosition(position, capoFret) {
  if (!position || !capoFret) return position;
  const strings = position.strings.map((s) =>
    s.fret === null ? s : { ...s, fret: s.fret + capoFret, label: transposeNoteName(s.label, capoFret) }
  );
  const frettedFrets = strings.map((s) => s.fret).filter((f) => f !== null);
  return {
    ...position,
    baseFret: frettedFrets.length > 0 ? Math.min(...frettedFrets) : position.baseFret,
    strings,
  };
}

// Same capo offset (fret AND label) as applyCapoToPosition, but for the
// flatter `{ string, fret, label, ... }` note-list shape used by the
// fretboard's other overlays (landing-note suggestions, Smooth's
// voice-leading dots) rather than a full 6-string `position` object.
export function applyCapoToNotes(notes, capoFret) {
  if (!capoFret) return notes;
  return notes.map((n) =>
    n.fret === null ? n : { ...n, fret: n.fret + capoFret, label: transposeNoteName(n.label, capoFret) }
  );
}
