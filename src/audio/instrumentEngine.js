import { Soundfont, DrumMachine, SplendidGrandPiano } from 'smplr';
import { getAudioContext } from './audioContext';
import { SOUNDFONT_TUNING, SPLENDID_TUNING, tuningFor } from './sampleTuning';

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

// Every note in tune: each sample set's own tuning error was MEASURED per
// note (sampleTuning.js, scripts/tuning/) and is cancelled here with smplr's
// per-note `detune` (cents) — whatever the caller (chords, licks, keys,
// bass, vocal cues…) plays.
const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function toMidiNumber(note) {
  if (typeof note === 'number') return Math.round(note);
  const m = /^([A-Ga-g])([#b♯♭]*)(-?\d+)$/.exec(String(note ?? ''));
  if (!m) return null;
  const acc = [...m[2]].reduce((a, c) => a + (c === '#' || c === '♯' ? 1 : -1), 0);
  return LETTER[m[1].toUpperCase()] + acc + 12 * (Number(m[3]) + 1);
}
function withTuning(instrument, correctionOf) {
  const start = instrument.start.bind(instrument);
  instrument.start = (event) => {
    const midi = toMidiNumber(event?.note);
    const c = midi == null ? 0 : correctionOf(midi, event?.velocity ?? 100) || 0;
    return c ? start({ ...event, detune: (event.detune ?? 0) + c }) : start(event);
  };
  return instrument;
}
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

// `opts` (optional): { kit, extraGain } — smplr's sample set ('MusyngKite',
// the default, or 'FluidR3_GM') and output gain (smplr's default 5). The
// cache key includes them, so the same instrument name can exist per kit.
export function getSoundfontInstrument(instrumentName, opts = null) {
  if (!instrumentName) return null;
  const key = opts?.kit || opts?.extraGain ? `${instrumentName}|${opts.kit ?? ''}|${opts.extraGain ?? ''}` : instrumentName;
  let entry = soundfontCache.get(key);
  if (!entry) {
    const options = { instrument: instrumentName };
    if (opts?.kit) options.kit = opts.kit;
    if (opts?.extraGain) options.extraGain = opts.extraGain;
    entry = createEntry(withTuning(Soundfont(getAudioContext(), options), (m) => SOUNDFONT_TUNING[`${opts?.kit ?? 'MusyngKite'}/${instrumentName}`]?.[m]));
    soundfontCache.set(key, entry);
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
    splendidPiano = createEntry(withTuning(SplendidGrandPiano(getAudioContext()), (m, velocity) => tuningFor(SPLENDID_TUNING, m, velocity)));
  }
  return splendidPiano;
}

// Kicks off loading in the background without waiting for it — called when
// the user picks a sampled profile in Settings, so by the time they
// actually play a note, entry.isReady is already true.
export function preloadSoundfontInstrument(instrumentName, opts = null) {
  getSoundfontInstrument(instrumentName, opts);
}

export function preloadDrumMachine(kitName) {
  getDrumMachine(kitName);
}
