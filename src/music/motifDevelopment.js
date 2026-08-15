import { STANDARD_TUNING, MAX_FRET, mod } from './notes';
import { parseChordSymbol } from './chordSymbolParser';
import { CHORD_QUALITIES } from './chordQualities';
import { nearestFretForPitch } from './computeChordPositions';

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function labelForPitchClass(pitchClass) {
  return SHARP_NAMES[mod(pitchClass, 12)];
}

// Which chord tone (if any) a pitch class actually is, by pitch-class
// membership rather than the note's original scale-degree tag — needed
// because a transform can move a note onto a pitch class it never had a
// degree for (e.g. Sequence shifting everything up a step).
function roleForPitchClass(qualityKey, rootPitchClass, pitchClass) {
  const quality = CHORD_QUALITIES[qualityKey];
  const tone = quality?.tones.find((t) => mod(rootPitchClass + t.semitones, 12) === pitchClass);
  return tone ? tone.role : 'passing';
}

function relabel(note, root, qualityKey) {
  const pitchClass = mod(STANDARD_TUNING[note.string].pitchClass + note.fret, 12);
  return { ...note, label: labelForPitchClass(pitchClass), role: roleForPitchClass(qualityKey, root.pitchClass, pitchClass) };
}

function clampFret(fret) {
  return Math.max(0, Math.min(MAX_FRET, fret));
}

function renumber(notes) {
  return notes.map((n, i) => ({ ...n, order: i + 1 }));
}

// Shifts every note by the same number of frets on its own string (each
// string's fret difference IS a semitone difference, so this is a real,
// uniform transposition) — the shared building block behind Sequence
// (+2, up a step) and, for Call & Response, a stepwise descent (-2).
export function shiftFrets(notes, chordSymbol, deltaFrets) {
  const parsed = parseChordSymbol(chordSymbol);
  if (!parsed || notes.length === 0) return notes;
  const toLabel = (n) => relabel(n, parsed.root, parsed.qualityKey);
  return renumber(notes.map((n) => toLabel({ ...n, fret: clampFret(n.fret + deltaFrets) })));
}

// Replaces the final note with a specific chord tone (by role — 'root' for
// a full/authentic cadence, 'fifth' for a half cadence), resolved near
// where the phrase already is. The shared building block behind Ending
// Variation and, for Call & Response, the call's open half-cadence and the
// response's resolving full cadence.
export function resolveEndingToRole(notes, chordSymbol, role) {
  const parsed = parseChordSymbol(chordSymbol);
  if (!parsed || notes.length === 0) return notes;
  const toLabel = (n) => relabel(n, parsed.root, parsed.qualityKey);

  const quality = CHORD_QUALITIES[parsed.qualityKey];
  const tone = quality?.tones.find((t) => t.role === role) ?? quality?.tones[0];
  if (!tone) return notes;

  const targetPitchClass = mod(parsed.root.pitchClass + tone.semitones, 12);
  const last = notes[notes.length - 1];
  const { fret } = nearestFretForPitch(targetPitchClass, last.string, last.fret);
  const endingNote = toLabel({ ...last, fret, technique: null });
  return renumber([...notes.slice(0, -1), endingNote]);
}

export const MOTIF_KINDS = [
  { key: 'original', label: 'Original' },
  { key: 'variation', label: 'Variation' },
  { key: 'sequence', label: 'Sequence' },
  { key: 'inversion', label: 'Inversion' },
  { key: 'octave', label: 'Octave' },
  { key: 'rhythmic', label: 'Rhythmic variation' },
  { key: 'ending', label: 'Ending variation' },
];

// Takes an already-generated lick's notes and algorithmically derives one
// of six standard motif-development transforms (spec #7) — a different
// kind of variety from Regenerate (which swaps to a different hand-authored
// template): these are real compositional techniques applied to the exact
// phrase you already have. Every transform re-labels/re-classifies its
// notes against the actual chord afterward, since moving frets changes
// pitches (and so which chord tone, if any, each note actually is).
export function developMotif(kind, notes, chordSymbol) {
  const parsed = parseChordSymbol(chordSymbol);
  if (!parsed || notes.length === 0) return notes;
  const toLabel = (n) => relabel(n, parsed.root, parsed.qualityKey);

  switch (kind) {
    case 'sequence':
      // Repeats the same shape a whole step higher up the neck.
      return shiftFrets(notes, chordSymbol, 2);

    case 'inversion': {
      // Mirrors each note's actual pitch around the first note's pitch,
      // then resolves back to a fret on that note's OWN string. Mirroring
      // raw fret numbers instead (2*anchorFret - fret) is wrong the moment
      // notes span more than one string: the same fret number is a
      // different pitch on each string, so that produced musically
      // meaningless jumps rather than a real interval inversion.
      const anchorMidi = STANDARD_TUNING[notes[0].string].baseMidi + notes[0].fret;
      return renumber(
        notes.map((n) => {
          const midi = STANDARD_TUNING[n.string].baseMidi + n.fret;
          const invertedMidi = 2 * anchorMidi - midi;
          const fret = clampFret(invertedMidi - STANDARD_TUNING[n.string].baseMidi);
          return toLabel({ ...n, fret });
        })
      );
    }

    case 'octave':
      return renumber(
        notes.map((n) => {
          const up = n.fret + 12;
          const fret = up <= MAX_FRET ? up : Math.max(0, n.fret - 12);
          return toLabel({ ...n, fret });
        })
      );

    case 'rhythmic':
      // Same pitches, a swung long-short feel instead of even note lengths
      // — playLick.js reads durationMultiplier to make this audible.
      return renumber(notes.map((n, i) => ({ ...n, durationMultiplier: i % 2 === 0 ? 1.35 : 0.65 })));

    case 'ending':
      // Replace the final note with the chord's own root — a stronger,
      // targeted resolution (an authentic cadence).
      return resolveEndingToRole(notes, chordSymbol, 'root');

    case 'variation':
    default: {
      // A sparser variant — drop one interior note (never the first or
      // last, so the phrase's start and target note are preserved).
      if (notes.length <= 2) return notes;
      const dropIndex = Math.floor(notes.length / 2);
      return renumber(notes.filter((_, i) => i !== dropIndex));
    }
  }
}
