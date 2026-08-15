import { CHORD_QUALITIES } from './chordQualities';

const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function mod12(n) {
  return ((n % 12) + 12) % 12;
}

// Best-effort match: which root+quality from CHORD_QUALITIES best explains a
// cluster of MIDI note numbers sounding together (used by
// parseMidiChords.js, one note-cluster at a time). Not a full harmonic
// analyzer — just scores every root/quality combo by how well its expected
// tone set overlaps the notes actually present, preferring an exact tone
// match and the lowest-sounding note as the root when there's a tie.
// Returns a chord SYMBOL string (e.g. "Am", "G7"), or null if nothing
// scores as at least a plausible triad.
export function identifyChord(midiNotes) {
  if (!midiNotes || midiNotes.length === 0) return null;
  const pitchClasses = new Set(midiNotes.map(mod12));
  if (pitchClasses.size < 2) return null; // a single note isn't a chord
  const bassPitchClass = mod12(Math.min(...midiNotes));

  let best = null;
  for (let root = 0; root < 12; root += 1) {
    for (const [key, quality] of Object.entries(CHORD_QUALITIES)) {
      const expected = new Set(quality.tones.map((t) => mod12(root + t.semitones)));
      const matched = [...expected].filter((pc) => pitchClasses.has(pc)).length;
      if (matched !== expected.size) continue; // require every expected tone present
      const extra = pitchClasses.size - matched; // notes present that this quality doesn't explain
      const score = matched * 2 - extra - (root === bassPitchClass ? 0 : 0.5);
      if (!best || score > best.score) best = { root, key, score };
    }
  }
  if (!best) return null;
  const quality = CHORD_QUALITIES[best.key];
  return PITCH_CLASS_NAMES[best.root] + (quality.aliases[0] || '');
}
