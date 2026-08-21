import { getAudioContext } from './audioContext';
import { getSoundfontInstrument } from './instrumentEngine';
import { resolveBassProfile } from './instrumentProfiles';
import { getCurrentBassProfile } from './audioSettingsStore';

const NOTE_DURATION = 1.6; // seconds a plucked bass note rings out
const VELOCITY = 100; // smplr's 0-127 MIDI-style velocity

function playOscillatorNote(ctx, midi, startTime) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const stopTime = startTime + NOTE_DURATION;

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.25, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(stopTime + 0.05);
}

// Resolves the currently-selected bass sound profile to a ready-to-play
// smplr entry — mirrors chordPlayer.js's getReadySampledInstrument /
// pianoPlayer.js's getCurrentPianoEntry exactly, just for the bass profile
// family (see audio/instrumentProfiles.js's BASS_SOUND_PROFILES).
function getCurrentBassEntry() {
  const profile = resolveBassProfile(getCurrentBassProfile());
  return profile.soundfontName ? getSoundfontInstrument(profile.soundfontName) : null;
}

// Mirrors pianoPlayer.js/chordPlayer.js exactly: a synchronous isReady check
// (not an awaited Promise — see instrumentEngine.js's own comment for why),
// falling back to a plain oscillator pluck if the sample hasn't finished
// loading yet (or the selected profile is 'synth', which has no
// soundfontName at all) rather than staying silent.
export function playBassNote(midi) {
  if (midi === null || midi === undefined) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const entry = getCurrentBassEntry();
  if (entry?.isReady) {
    entry.instrument.start({ note: midi, time: now, velocity: VELOCITY, duration: NOTE_DURATION });
    return;
  }
  playOscillatorNote(ctx, midi, now);
}

// Kicks off a background sample preload for whichever bass profile is
// currently selected — called when Bass is first selected
// (InstrumentContext.jsx) and whenever the profile changes
// (useAudioSettings.js), same "preload on selection" pattern already used
// for guitar/piano.
export function preloadBassSamples() {
  const profile = resolveBassProfile(getCurrentBassProfile());
  if (profile.soundfontName) getSoundfontInstrument(profile.soundfontName);
}
