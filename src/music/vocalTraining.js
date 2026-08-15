import { SCALE_FAMILIES } from './scalesCurriculum';
import { midiToNoteName, frequencyToMidi } from './pitchUtils';

const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const VOCAL_MODES = [
  { key: 'hold', label: 'hold' },
  { key: 'interval', label: 'interval' },
  { key: 'scale', label: 'scale' },
];

// A subset of the guitar curriculum's SCALE_FAMILIES that makes sense to
// sing straight through in one breath — modes/exotic scales are still
// reachable by wiring in more SCALE_FAMILIES keys later, no new authoring.
export const VOCAL_SCALE_OPTIONS = [
  { key: 'major', label: 'major' },
  { key: 'naturalMinor', label: 'naturalMinor' },
  { key: 'majorPentatonic', label: 'majorPentatonic' },
  { key: 'minorPentatonic', label: 'minorPentatonic' },
];

export const VOCAL_INTERVALS = [
  { key: 'm2', semitones: 1 },
  { key: 'M2', semitones: 2 },
  { key: 'm3', semitones: 3 },
  { key: 'M3', semitones: 4 },
  { key: 'P4', semitones: 5 },
  { key: 'P5', semitones: 7 },
  { key: 'P8', semitones: 12 },
];

export const VOCAL_PITCH_CLASSES = PITCH_CLASS_NAMES.map((name, index) => ({ value: index, label: name }));

export const VOCAL_OCTAVES = [3, 4, 5];

// Cents-tolerance tiers — same {key,label,...} shape as earTraining.js's
// EAR_TRAINING_DIFFICULTIES, just with a tolerance window instead of a fret
// range. `label` matches the app's existing generic difficulty.* i18n keys
// (difficulty.Beginner/Intermediate/Advanced) rather than new vocal-specific
// strings.
export const VOCAL_DIFFICULTIES = [
  { key: 'beginner', label: 'Beginner', toleranceCents: 30 },
  { key: 'intermediate', label: 'Intermediate', toleranceCents: 20 },
  { key: 'advanced', label: 'Advanced', toleranceCents: 10 },
];

export function pitchClassAndOctaveToMidi(pitchClass, octave) {
  return (octave + 1) * 12 + pitchClass;
}

// Builds the ordered list of target notes for one session. 'hold' is a
// single sustained target; 'interval' is a root -> target two-note jump;
// 'scale' walks every degree of the chosen SCALE_FAMILIES entry up then
// back down, reusing the exact same interval data Studies teaches on
// guitar so a scale learned there is immediately singable here.
export function generateVocalSequence({ mode, rootMidi, scaleKey, intervalSemitones }) {
  if (mode === 'interval') {
    return [
      { midi: rootMidi, name: midiToNoteName(rootMidi) },
      { midi: rootMidi + intervalSemitones, name: midiToNoteName(rootMidi + intervalSemitones) },
    ];
  }
  if (mode === 'scale') {
    const family = SCALE_FAMILIES[scaleKey] ?? SCALE_FAMILIES.major;
    const up = family.intervals.map((semi) => ({ midi: rootMidi + semi, name: midiToNoteName(rootMidi + semi) }));
    const down = [...up].slice(0, -1).reverse();
    return [...up, ...down];
  }
  return [{ midi: rootMidi, name: midiToNoteName(rootMidi) }];
}

// Cents distance from `frequency` to the nearest octave-equivalent of
// `targetMidi`'s pitch class — lets a singer match a target in whatever
// octave is comfortable for their own voice, rather than forcing the exact
// reference octave the exercise happens to be built in.
export function centsFromTargetPitchClass(frequency, targetMidi) {
  const fractional = frequencyToMidi(frequency);
  let diff = (fractional - targetMidi) % 12;
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;
  return diff * 100;
}
