import { STANDARD_TUNING } from './notes';
import { midiToFrequency } from '../audio/chordPlayer';
import { midiToNoteName } from './pitchUtils';

// STANDARD_TUNING is ordered low string (index 0, low E) -> high string
// (index 5, high E) — same convention computeScaleNotes/scaleShapes.js
// already use for `string` indices.
const HIGH_E_INDEX = 5;
const B_INDEX = 4;
const ALL_STRING_INDICES = [0, 1, 2, 3, 4, 5];

export const BEND_TYPES = [
  { key: 'half', label: 'Half-Step', semitones: 1, stepLabel: '1/2' },
  { key: 'full', label: 'Full-Step', semitones: 2, stepLabel: '1' },
  { key: 'oneAndHalf', label: '1.5-Step', semitones: 3, stepLabel: '1 1/2' },
];

export const TOLERANCE_CENTS = 15;
export const SUSTAIN_MS = 500;
const JITTER_THRESHOLD_CENTS = 10;
const JITTER_WINDOW = 6;

export const BEND_STATES = {
  IDLE: 'idle',
  UNDERBENT: 'underbent',
  TARGET_REACHED: 'target_reached',
  OVERBENT: 'overbent',
  UNSTABLE_SUSTAIN: 'unstable_sustain',
  HIT: 'hit',
};

// Dynamic progression: half-step bends on the high strings first (B & high
// E — the two strings bending technique is normally taught on first, being
// both the easiest to push and the most forgiving of pitch error), then
// full-step on the same strings, then full-step across all six, and
// finally 1.5-step across the neck. Each entry is resolved to concrete
// pitches by resolveBendStep below.
export function generateBendProgression() {
  const steps = [];
  for (const stringIndex of [B_INDEX, HIGH_E_INDEX]) {
    for (const startFret of [5, 7, 9]) steps.push({ bendKey: 'half', stringIndex, startFret });
  }
  for (const stringIndex of [B_INDEX, HIGH_E_INDEX]) {
    for (const startFret of [5, 7, 9]) steps.push({ bendKey: 'full', stringIndex, startFret });
  }
  for (const stringIndex of ALL_STRING_INDICES) {
    for (const startFret of [3, 7, 10]) steps.push({ bendKey: 'full', stringIndex, startFret });
  }
  for (const stringIndex of ALL_STRING_INDICES) {
    for (const startFret of [3, 7, 10, 14]) steps.push({ bendKey: 'oneAndHalf', stringIndex, startFret });
  }
  return steps;
}

// Turns one progression step into everything the UI/state-machine needs:
// start/target MIDI+frequency, the fret the pitch corresponds to (for the
// dashed target indicator), and standard TAB text (e.g. "7b9").
export function resolveBendStep(step) {
  const bendType = BEND_TYPES.find((b) => b.key === step.bendKey);
  const string = STANDARD_TUNING[step.stringIndex];
  const startMidi = string.baseMidi + step.startFret;
  const targetMidi = startMidi + bendType.semitones;
  const targetFret = step.startFret + bendType.semitones;
  return {
    ...step,
    bendType,
    stringNumber: string.stringNumber,
    startMidi,
    targetMidi,
    startFret: step.startFret,
    targetFret,
    startNoteName: midiToNoteName(startMidi),
    targetNoteName: midiToNoteName(targetMidi),
    startFrequency: midiToFrequency(startMidi),
    targetFrequency: midiToFrequency(targetMidi),
    tabText: `${step.startFret}b${targetFret}`,
  };
}

// Straight cents-distance formula from the spec — no octave-wrapping like
// Vocal Training's version, since a bend always stays anchored to one
// specific fretted pitch (no ambiguity about which octave the player means).
export function centsFromTarget(frequency, targetFrequency) {
  return 1200 * Math.log2(frequency / targetFrequency);
}

// Classifies one live reading against a resolved bend step. `recentCents`
// is a short rolling window of the last few cents-from-target readings,
// used only to detect jitter (a shaky bend that keeps drifting in and out
// of the tolerance window rather than holding steady).
export function classifyBendState(centsToTarget, recentCents) {
  if (centsToTarget == null) return BEND_STATES.IDLE;
  const inTolerance = Math.abs(centsToTarget) <= TOLERANCE_CENTS;
  if (!inTolerance) {
    return centsToTarget < 0 ? BEND_STATES.UNDERBENT : BEND_STATES.OVERBENT;
  }
  if (recentCents && recentCents.length >= JITTER_WINDOW) {
    const window = recentCents.slice(-JITTER_WINDOW);
    const spread = Math.max(...window) - Math.min(...window);
    if (spread > JITTER_THRESHOLD_CENTS) return BEND_STATES.UNSTABLE_SUSTAIN;
  }
  return BEND_STATES.TARGET_REACHED;
}

export { JITTER_WINDOW };
