import { mod } from './notes';
import { parseNoteName } from './spelling';

// Same simple sharps-only pitch-class spelling used elsewhere for
// supplementary/derived chord text (earTraining.js's noteNameForMidi,
// capo.js's soundingChordText) — good enough for a transposed chord symbol,
// not trying to match harmonic-analysis-correct sharp/flat spelling.
const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Shifts a chord symbol's root (and, for a slash chord, its bass note) by
// `semitones`, keeping the quality suffix (m, maj7, dim, sus4, ...) exactly
// as typed — e.g. "Em7" transposed +3 -> "Gm7". Used both for Compose ->
// Transpose (actually rewriting the typed progression, for fitting a song to
// a singer's range) and for Compose -> Capo's "sounds as" label (a capo's
// effect on a shape's sounding pitch is the same root/bass math, just
// non-destructive — see capo.js).
export function transposeChordText(chordText, semitones) {
  if (!chordText || !semitones) return chordText;

  const [chordPart, bassPart] = chordText.split('/');
  const rootMatch = /^([A-Ga-g])([#b]{0,2})/.exec(chordPart);
  if (!rootMatch) return chordText;

  const root = parseNoteName(rootMatch[0]);
  if (!root) return chordText;
  const suffix = chordPart.slice(rootMatch[0].length);
  const newChordPart = PITCH_CLASS_NAMES[mod(root.pitchClass + semitones, 12)] + suffix;

  if (bassPart === undefined) return newChordPart;
  const bassRoot = parseNoteName(bassPart);
  if (!bassRoot) return `${newChordPart}/${bassPart}`;
  return `${newChordPart}/${PITCH_CLASS_NAMES[mod(bassRoot.pitchClass + semitones, 12)]}`;
}

// Shifts a single note name (a fretboard dot's label, e.g. "G#") by
// `semitones` — the per-note equivalent of transposeChordText's root
// shifting, used by capo.js's applyCapoToPosition/applyCapoToNotes so a
// capo'd dot's label shows what note actually sounds there, not the shape's
// original (pre-capo) note name.
export function transposeNoteName(noteName, semitones) {
  if (!noteName || !semitones) return noteName;
  const parsed = parseNoteName(noteName);
  if (!parsed) return noteName;
  return PITCH_CLASS_NAMES[mod(parsed.pitchClass + semitones, 12)];
}
