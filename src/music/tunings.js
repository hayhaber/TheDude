// Alternate tunings for the tuner (Tools -> Tuner and the app's tuner pill).
// Strings low -> high, as MIDI numbers (E2 = 40, same numbering as
// notes.js's STANDARD_TUNING). `names` are the display letters (flats where
// the tuning is a flat tuning, e.g. Eb standard).
//
// The chosen tuning is a device-level choice, per instrument, in
// localStorage 'tuner-tuning' = { guitar: id, bass: id }.

export const GUITAR_TUNINGS = [
  // capture 50: standard reads exactly like the old chromatic tuner (a
  // pitch is only "a string" within a semitone's half of it), so nothing
  // changes for anyone who never picks another tuning.
  { id: 'standard', midis: [40, 45, 50, 55, 59, 64], names: ['E', 'A', 'D', 'G', 'B', 'E'], capture: 50 },
  { id: 'dropD', midis: [38, 45, 50, 55, 59, 64], names: ['D', 'A', 'D', 'G', 'B', 'E'] },
  { id: 'halfDown', midis: [39, 44, 49, 54, 58, 63], names: ['E♭', 'A♭', 'D♭', 'G♭', 'B♭', 'E♭'] },
  { id: 'wholeDown', midis: [38, 43, 48, 53, 57, 62], names: ['D', 'G', 'C', 'F', 'A', 'D'] },
  { id: 'dropC', midis: [36, 43, 48, 53, 57, 62], names: ['C', 'G', 'C', 'F', 'A', 'D'] },
  { id: 'openG', midis: [38, 43, 50, 55, 59, 62], names: ['D', 'G', 'D', 'G', 'B', 'D'] },
  { id: 'openD', midis: [38, 45, 50, 54, 57, 62], names: ['D', 'A', 'D', 'F♯', 'A', 'D'] },
  { id: 'dadgad', midis: [38, 45, 50, 55, 57, 62], names: ['D', 'A', 'D', 'G', 'A', 'D'] },
  { id: 'openE', midis: [40, 47, 52, 56, 59, 64], names: ['E', 'B', 'E', 'G♯', 'B', 'E'] },
];

export const BASS_TUNINGS = [
  { id: 'standard', midis: [28, 33, 38, 43], names: ['E', 'A', 'D', 'G'], capture: 50 },
  { id: 'dropD', midis: [26, 33, 38, 43], names: ['D', 'A', 'D', 'G'] },
  { id: 'halfDown', midis: [27, 32, 37, 42], names: ['E♭', 'A♭', 'D♭', 'G♭'] },
  { id: 'wholeDown', midis: [26, 31, 36, 41], names: ['D', 'G', 'C', 'F'] },
];

export function tuningsFor(mode) {
  return mode === 'bass' ? BASS_TUNINGS : GUITAR_TUNINGS;
}

export function findTuning(mode, id) {
  const list = tuningsFor(mode);
  return list.find((x) => x.id === id) ?? list[0];
}

const STORAGE_KEY = 'tuner-tuning';

export function loadTuningId(mode) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return findTuning(mode, saved?.[mode]).id;
  } catch {
    return 'standard';
  }
}

export function saveTuningId(mode, id) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
    saved[mode] = id;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // storage blocked — the choice just lasts for this visit
  }
}

// How far (cents) from a string's target a pitch may be and still be read
// as "that string" in an ALTERNATE tuning (standard uses its own `capture`) — wide enough to cover retuning a string by a whole tone
// (E -> D for Drop D is 200 cents), narrower than the gap to the next string
// in every tuning above, beyond that the tuner reads the note chromatically.
export const STRING_CAPTURE_CENTS = 250;

/**
 * The string of `tuning` closest to `frequency` (in cents), or null when the
 * pitch is further than STRING_CAPTURE_CENTS from every string (a fretted
 * note — the caller falls back to the plain chromatic reading).
 * Returns { index, midi, name, cents } — cents = how far the pitch is from
 * that string's target, rounded like pitchUtils.frequencyToNote's.
 */
export function nearestString(frequency, tuning) {
  if (!(frequency > 0) || !tuning) return null;
  const exact = 69 + 12 * Math.log2(frequency / 440);
  let best = null;
  tuning.midis.forEach((midi, index) => {
    const cents = (exact - midi) * 100;
    if (!best || Math.abs(cents) < Math.abs(best.cents)) best = { index, midi, name: tuning.names[index], cents };
  });
  const capture = tuning.capture ?? STRING_CAPTURE_CENTS;
  if (!best || Math.abs(best.cents) > capture) return null;
  return { ...best, cents: Math.round(best.cents) };
}

export function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}
