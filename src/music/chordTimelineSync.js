import { capitalizeChordRoot } from './chordSymbolParser';

// Turns a plain space-separated chord sequence ("Am F C G") into a
// timestamped timeline by extrapolating evenly-spaced chord changes from a
// BPM + how many beats each chord holds for — the "tap Sync on beat 1, then
// let the math fill in the rest" fallback for a song with no pre-made
// timeline. `startOffset` is the video's playback time (seconds) at the
// moment the user tapped Sync, i.e. the moment chord #1 actually starts.
export function generateTimelineFromBpm({ chordSequence, bpm, beatsPerChord, startOffset }) {
  const secondsPerBeat = 60 / bpm;
  const secondsPerChord = secondsPerBeat * beatsPerChord;
  return chordSequence
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((chord, i) => ({
      time: startOffset + i * secondsPerChord,
      chord: capitalizeChordRoot(chord),
    }));
}
