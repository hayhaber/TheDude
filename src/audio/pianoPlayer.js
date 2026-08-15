import { getAudioContext } from './audioContext';
import { getSplendidPiano, getSoundfontInstrument } from './instrumentEngine';
import { getCurrentPianoProfile } from './audioSettingsStore';
import { resolvePianoProfile } from './instrumentProfiles';

const NOTE_DURATION = 1.4; // seconds a struck key rings out
const VELOCITY = 96; // smplr's 0-127 MIDI-style velocity

// Master volume for piano playback only (0-100, matching smplr's own
// output.setVolume scale) — set from the on-keyboard panel's Volume
// control (or Settings, if ever added there). Module-level rather than
// per-call: PianoKeyboard's panel is the only caller of setPianoVolume,
// and every note-playing path here (oscillator fallback AND whichever
// smplr instrument is currently selected) should reflect the same one
// "how loud is the keyboard" setting, the way a real instrument's volume
// knob affects every voice, not just the current note.
let pianoVolume = 100;

export function setPianoVolume(volume) {
  pianoVolume = Math.max(0, Math.min(100, Math.round(volume)));
}

export function getPianoVolume() {
  return pianoVolume;
}

// Mirrors chordPlayer.js's playNote/playPosition exactly, but for piano:
// same shared AudioContext, same synchronous-isReady-gated fallback (see
// instrumentEngine.js's comment for why this must be a synchronous check,
// not an awaited Promise) — the only difference is which smplr instrument
// backs it. If the selected profile's samples haven't finished loading yet
// (or fail to load), falls back to a plain oscillator tone rather than
// staying silent, matching how Classic guitar mode is chordPlayer.js's
// literal fallback.
function playOscillatorNote(ctx, midi, startTime) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const stopTime = startTime + NOTE_DURATION;

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;

  // Floored at 0.0001, not 0 — exponentialRampToValueAtTime below throws if
  // asked to ramp from/to a literal 0, which pianoVolume = 0 would produce.
  const peakGain = Math.max(0.2 * (pianoVolume / 100), 0.0001);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(stopTime + 0.05);
}

// Resolves the currently-selected piano sound profile to a ready-to-play
// smplr entry — 'acoustic' keeps using the dedicated SplendidGrandPiano
// sampled instrument (real Steinway samples, not a generic GM patch);
// every other profile is a General MIDI Soundfont instrument, fetched
// through the exact same generic getter chordPlayer.js's guitar profiles
// already use, so a second profile family needed zero engine changes.
function getCurrentPianoEntry() {
  const profile = resolvePianoProfile(getCurrentPianoProfile());
  return profile.soundfontName ? getSoundfontInstrument(profile.soundfontName) : getSplendidPiano();
}

function playNoteAt(midi, startTime) {
  const ctx = getAudioContext();
  const entry = getCurrentPianoEntry();
  if (entry?.isReady) {
    // smplr's own output channel volume (0-100, its default) — set on every
    // call rather than only when it changes, which is cheap (just a control
    // value write) and guarantees whichever instrument is currently
    // selected (switching sounds swaps to a differently-cached entry)
    // always reflects the latest volume without needing its own change
    // listener wired up per profile.
    entry.instrument.output?.setVolume?.(pianoVolume);
    entry.instrument.start({ note: midi, time: startTime, velocity: VELOCITY, duration: NOTE_DURATION });
    return;
  }
  playOscillatorNote(ctx, midi, startTime);
}

// Plays a single key — used when a key is clicked, or by any "hear this
// note" affordance in Piano mode.
export function playPianoNote(midi) {
  playNoteAt(midi, getAudioContext().currentTime);
}

// Press-and-hold sustain, for input methods that have a real press/release
// (a connected MIDI keyboard, the computer-keyboard-as-piano feature) —
// mouse clicks stay the plain one-shot playPianoNote above unchanged.
// Only sample-based (non-acoustic) profiles actually sustain: a held organ/
// electric-piano/synth note rings until released, matching how those
// instruments really behave. 'acoustic' (SplendidGrandPiano) and the
// oscillator fallback keep their existing natural one-shot decay — a real
// piano string keeps ringing briefly after the key/damper releases, so
// there's nothing to "stop" there, exactly the exception asked for.
export function playPianoNoteOn(midi) {
  const ctx = getAudioContext();
  const entry = getCurrentPianoEntry();
  const profile = resolvePianoProfile(getCurrentPianoProfile());
  if (entry?.isReady && profile.soundfontName) {
    entry.instrument.output?.setVolume?.(pianoVolume);
    entry.instrument.start({ note: midi, time: ctx.currentTime, velocity: VELOCITY });
    return;
  }
  playNoteAt(midi, ctx.currentTime);
}

// Releases a note started with playPianoNoteOn — a no-op for
// acoustic/oscillator playback (see playPianoNoteOn's own comment for why).
export function playPianoNoteOff(midi) {
  const entry = getCurrentPianoEntry();
  const profile = resolvePianoProfile(getCurrentPianoProfile());
  if (entry?.isReady && profile.soundfontName) {
    entry.instrument.stop(midi);
  }
}

// Plays a set of keys together (a chord) with a very slight roll, the
// piano equivalent of chordPlayer.js's guitar strum stagger — subtle
// enough to sound like a played chord rather than a mechanically
// simultaneous MIDI chord, without becoming a guitar-style strum.
const ROLL_STAGGER = 0.012;

export function playPianoChord(midiNotes) {
  const now = getAudioContext().currentTime;
  midiNotes.forEach((midi, index) => playNoteAt(midi, now + index * ROLL_STAGGER));
}

// A melodic run (e.g. a pentascale) rather than a chord roll — same
// scheduled-ahead-of-time approach as playPianoChord, just with a gap wide
// enough to hear as distinct notes in sequence instead of a strum.
const SEQUENCE_NOTE_GAP = 0.28;

export function playPianoSequence(midiNotes, noteGapSeconds = SEQUENCE_NOTE_GAP) {
  const now = getAudioContext().currentTime;
  midiNotes.forEach((midi, index) => playNoteAt(midi, now + index * noteGapSeconds));
}
