import { Midi } from '@tonejs/midi';
import { identifyChord } from './chordFromNotes';

// Notes starting within this many seconds of each other are treated as one
// simultaneous "chord" rather than a separate cluster each — real
// performance-recorded MIDI never has note-on events at exactly the same
// tick, so a strict equality check would never cluster anything.
const CLUSTER_EPSILON_S = 0.05;

// Reads a user-supplied Standard MIDI File (via @tonejs/midi, a pure
// file-format parser — no audio, no network) and derives a chord timeline
// from it: group simultaneous notes into clusters, identify each cluster's
// chord via chordFromNotes.js (reusing this app's own CHORD_QUALITIES data),
// and keep only the moments the chord actually changes. This only ever
// processes a file the user provides locally — no YouTube audio, no
// extraction, no external service.
export async function parseMidiToChordTimeline(arrayBuffer) {
  const midi = new Midi(arrayBuffer);
  const allNotes = midi.tracks.flatMap((track) => track.notes);
  allNotes.sort((a, b) => a.time - b.time);

  const clusters = [];
  for (const note of allNotes) {
    const last = clusters[clusters.length - 1];
    if (last && note.time - last.time < CLUSTER_EPSILON_S) {
      last.notes.push(note.midi);
    } else {
      clusters.push({ time: note.time, notes: [note.midi] });
    }
  }

  const entries = [];
  let lastChord = null;
  for (const cluster of clusters) {
    const chord = identifyChord(cluster.notes);
    if (chord && chord !== lastChord) {
      entries.push({ time: cluster.time, chord });
      lastChord = chord;
    }
  }
  return entries;
}
