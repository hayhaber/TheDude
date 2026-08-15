// Pure frequency <-> note-name math for the pitch-detection tuner. Inverse
// of chordPlayer.js's midiToFrequency (kept separate since that file is
// playback-focused and this one is analysis-focused, but the formula is the
// same equal-temperament relationship).
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function frequencyToMidi(frequency) {
  return 69 + 12 * Math.log2(frequency / 440);
}

// MIDI 60 = C4, matching the octave numbering STANDARD_TUNING's baseMidi
// values already use (E2 = 40, A4 = 69, ...).
export function midiToNoteName(midi) {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${SHARP_NAMES[pitchClass]}${octave}`;
}

// Given a detected frequency, returns the nearest note and how far off (in
// cents, +/-50) the actual pitch is from that note's exact frequency.
export function frequencyToNote(frequency) {
  const exactMidi = frequencyToMidi(frequency);
  const midi = Math.round(exactMidi);
  const centsOff = Math.round((exactMidi - midi) * 100);
  return { midi, name: midiToNoteName(midi), centsOff };
}
