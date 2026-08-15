import { Soundfont, DrumMachine, SplendidGrandPiano } from 'smplr';
import { getAudioContext } from './audioContext';

// Generic sampled-instrument playback core — no guitar (or piano, or drum)
// specific knowledge lives here, only "hand back a ready-to-play smplr
// instrument, keyed by name, cached." Every instrument profile (guitar
// today; piano/bass/drums later — see instrumentProfiles.js) is just a
// different name passed into these same three getters, all sharing the
// app's one AudioContext (audioContext.js) rather than smplr creating its
// own. That single shared-context design is what makes this a drop-in
// alongside the existing oscillator-based scheduling in chordPlayer.js/
// lickPlayer.js/metronome.js — smplr's `time` option is confirmed (from its
// own source) to be an absolute `audioContext.currentTime`-relative
// timestamp, exactly what those lookahead schedulers already compute.
const soundfontCache = new Map();
const drumMachineCache = new Map();
let splendidPiano = null;

// Samples are fetched from smplr's CDN over the network — offline, a
// blocked CDN, or a slow connection must never throw and break a note
// click. Every entry tracks its own readiness SYNCHRONOUSLY (`isReady`),
// not just via a Promise: scheduled/ahead-of-time playback (chord strums,
// licks, the metronome's lookahead scheduler) computes an absolute
// AudioContext time up front, and awaiting a not-yet-resolved Promise
// before calling `instrument.start()` would let real time drift past that
// scheduled moment while waiting — so callers check `entry.isReady`
// synchronously and fall back to the oscillator synth immediately for that
// one call if samples aren't loaded yet, rather than ever playing a
// sample late.
function createEntry(instrument) {
  const entry = { instrument, isReady: false };
  entry.ready = instrument.ready
    .then(() => {
      entry.isReady = true;
      return true;
    })
    .catch(() => false);
  return entry;
}

export function getSoundfontInstrument(instrumentName) {
  if (!instrumentName) return null;
  let entry = soundfontCache.get(instrumentName);
  if (!entry) {
    entry = createEntry(Soundfont(getAudioContext(), { instrument: instrumentName }));
    soundfontCache.set(instrumentName, entry);
  }
  return entry;
}

export function getDrumMachine(kitName) {
  if (!kitName) return null;
  let entry = drumMachineCache.get(kitName);
  if (!entry) {
    entry = createEntry(DrumMachine(getAudioContext(), { instrument: kitName }));
    drumMachineCache.set(kitName, entry);
  }
  return entry;
}

// Reserved for the future Piano Learning Mode — not wired into any UI yet.
// Confirms the same engine already supports a second instrument family
// with zero changes to the getters above.
export function getSplendidPiano() {
  if (!splendidPiano) {
    splendidPiano = createEntry(SplendidGrandPiano(getAudioContext()));
  }
  return splendidPiano;
}

// Kicks off loading in the background without waiting for it — called when
// the user picks a sampled profile in Settings, so by the time they
// actually play a note, entry.isReady is already true.
export function preloadSoundfontInstrument(instrumentName) {
  getSoundfontInstrument(instrumentName);
}

export function preloadDrumMachine(kitName) {
  getDrumMachine(kitName);
}
