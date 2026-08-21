import { getAudioContext } from './audioContext';
import { getSoundfontInstrument } from './instrumentEngine';

const NOTE_DURATION = 1.6; // seconds a plucked bass note rings out
const VELOCITY = 100; // smplr's 0-127 MIDI-style velocity

// One fixed sound for this first pass — no Settings picker yet (Compose-only,
// root-note-only MVP scope), unlike guitar/piano's multi-option profiles in
// instrumentProfiles.js. Verified present in the installed smplr package's
// own instrument list (node_modules/smplr/dist/index.mjs), same standard
// every other soundfontName in this app is held to.
const SOUNDFONT_NAME = 'electric_bass_finger';

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

// Mirrors pianoPlayer.js/chordPlayer.js exactly: a synchronous isReady check
// (not an awaited Promise — see instrumentEngine.js's own comment for why),
// falling back to a plain oscillator pluck if the sample hasn't finished
// loading yet rather than staying silent.
export function playBassNote(midi) {
  if (midi === null || midi === undefined) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const entry = getSoundfontInstrument(SOUNDFONT_NAME);
  if (entry?.isReady) {
    entry.instrument.start({ note: midi, time: now, velocity: VELOCITY, duration: NOTE_DURATION });
    return;
  }
  playOscillatorNote(ctx, midi, now);
}

// Kicks off a background sample preload — called once when Bass is first
// selected (InstrumentContext.jsx), same "preload on selection" pattern
// already used for the piano's SplendidGrandPiano samples.
export function preloadBassSamples() {
  getSoundfontInstrument(SOUNDFONT_NAME);
}
