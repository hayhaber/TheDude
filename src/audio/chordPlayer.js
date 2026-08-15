import { STANDARD_TUNING } from '../music/notes';
import { getAudioContext } from './audioContext';
import { getSoundfontInstrument } from './instrumentEngine';
import { resolveGuitarProfile } from './instrumentProfiles';
import { getCurrentGuitarProfile } from './audioSettingsStore';

const STRUM_STAGGER = 0.03; // seconds between successive strings, low to high
const NOTE_DURATION = 1.6; // seconds each note rings out
const SAMPLE_VELOCITY = 100; // smplr's 0-127 MIDI-style velocity, a solid mezzo-forte pluck

export function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Resolves the currently-selected guitar sound profile to a ready-to-play
// sampled instrument, or null if the profile is 'synth' or its samples
// haven't finished loading yet — callers fall back to the oscillator synth
// in either case. Synchronous (reads instrumentEngine's `isReady` flag, not
// its ready Promise) so ahead-of-time scheduling (strums, licks) never has
// to await mid-schedule — see instrumentEngine.js's comment for why.
function getReadySampledInstrument() {
  const profile = resolveGuitarProfile(getCurrentGuitarProfile());
  if (!profile.soundfontName) return null;
  const entry = getSoundfontInstrument(profile.soundfontName);
  return entry?.isReady ? entry.instrument : null;
}

function playOscillatorNote(ctx, midi, startTime) {
  const stopTime = startTime + NOTE_DURATION;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = midiToFrequency(midi);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.22, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(stopTime + 0.05);
}

// Plays one note at the given absolute AudioContext time — sampled guitar
// if a sampled profile is selected and loaded, the original synthesized
// pluck (unchanged) otherwise. This is the one place both playback paths
// meet, reused by playNote/playPosition below and by lickPlayer.js.
function playNoteAt(midi, startTime) {
  const ctx = getAudioContext();
  const instrument = getReadySampledInstrument();
  if (instrument) {
    instrument.start({ note: midi, time: startTime, velocity: SAMPLE_VELOCITY, duration: NOTE_DURATION });
    return;
  }
  playOscillatorNote(ctx, midi, startTime);
}

// Plays every fretted/open string in `strings` (the same 6-length array the
// Fretboard renders) as a gently strummed chord. `capoFret` (default 0)
// shifts every sounding pitch up by that many semitones without changing
// which frets are drawn/fingered — exactly what a physical capo does — so
// Play actually sounds the real pitch a capo'd guitar would produce.
export function playPosition(strings, capoFret = 0) {
  const now = getAudioContext().currentTime;
  const soundingStrings = strings
    .map((s, i) => (s.fret === null ? null : { midi: STANDARD_TUNING[i].baseMidi + s.fret + capoFret }))
    .filter(Boolean);

  soundingStrings.forEach((note, index) => {
    playNoteAt(note.midi, now + index * STRUM_STAGGER);
  });
}

// Plays a single plucked note — used when a specific dot on the fretboard
// is clicked, or by any "hear this note" affordance elsewhere in the app.
export function playNote(midi) {
  playNoteAt(midi, getAudioContext().currentTime);
}
