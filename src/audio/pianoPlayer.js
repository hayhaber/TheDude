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

// Extra loudness for the Vocal section's cues (a phone loudspeaker playing a
// soft piano note is hard to hear): a gain + limiter inserted into the
// piano's own channel, added lazily the first time a boost is asked for and
// left at unity gain (limiter only catches overs) for everything else.
const boosters = new WeakMap();

function setBoost(entry, boost) {
  const out = entry?.instrument?.output;
  if (!out) return;
  let b = boosters.get(out);
  if (!b) {
    if (boost === 1 || !out.addInsert) return;
    const ctx = getAudioContext();
    const gain = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.2;
    out.addInsert(gain);
    out.addInsert(limiter);
    b = { gain };
    boosters.set(out, b);
  }
  b.gain.gain.value = boost;
}

function playNoteAt(midi, startTime, duration = NOTE_DURATION) {
  const ctx = getAudioContext();
  const entry = getCurrentPianoEntry();
  if (entry?.isReady) {
    setBoost(entry, 1);
    // smplr's own output channel volume (0-100, its default) — set on every
    // call rather than only when it changes, which is cheap (just a control
    // value write) and guarantees whichever instrument is currently
    // selected (switching sounds swaps to a differently-cached entry)
    // always reflects the latest volume without needing its own change
    // listener wired up per profile.
    entry.instrument.output?.setVolume?.(pianoVolume);
    entry.instrument.start({ note: midi, time: startTime, velocity: VELOCITY, duration });
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
export function playPianoNoteOn(midi, { pedal = false } = {}) {
  const ctx = getAudioContext();
  const entry = getCurrentPianoEntry();
  const profile = resolvePianoProfile(getCurrentPianoProfile());
  if (entry?.isReady && profile.soundfontName) {
    setBoost(entry, 1);
    entry.instrument.output?.setVolume?.(pianoVolume);
    entry.instrument.start({ note: midi, time: ctx.currentTime, velocity: VELOCITY });
    return;
  }
  // The acoustic piano decays on its own; with the sustain pedal down it
  // rings out much longer (as a real one does with the dampers lifted).
  playNoteAt(midi, ctx.currentTime, pedal ? 6 : NOTE_DURATION);
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

/**
 * Schedules notes ahead on the shared clock — `notes`: [{ midi, start, dur }]
 * with `start` seconds after `at` (an AudioContext time). Returns a function
 * that silences everything still to come or ringing (e.g. on Stop). Used by
 * the Vocal section's piano cues; the one-shot helpers above are unchanged.
 * `boost` (>= 1) makes them louder through a limiter (Vocal's Volume).
 */
export function schedulePianoNotes(notes, at = getAudioContext().currentTime, { velocity = 80, boost = 1 } = {}) {
  const ctx = getAudioContext();
  const entry = getCurrentPianoEntry();
  const stops = [];
  if (entry?.isReady) setBoost(entry, boost);
  for (const n of notes) {
    const time = at + n.start;
    const dur = Math.max(0.15, n.dur ?? 0.8);
    if (entry?.isReady) {
      entry.instrument.output?.setVolume?.(boost > 1 ? Math.max(pianoVolume, 127) : pianoVolume);
      const stop = entry.instrument.start({ note: n.midi, time, velocity, duration: dur });
      if (typeof stop === 'function') stops.push(stop);
      continue;
    }
    const freq = 440 * Math.pow(2, (n.midi - 69) / 12);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    const peak = Math.max(Math.min(0.8, 0.18 * boost * (pianoVolume / 100)), 0.0001);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.012);
    gain.gain.setValueAtTime(peak, time + dur * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + dur + 0.35);
    stops.push(() => {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        osc.stop(ctx.currentTime + 0.02);
      } catch {
        /* already stopped */
      }
    });
  }
  return () => stops.forEach((s) => s());
}

/** Starts loading the selected piano sound (so the first cue isn't a beep). */
export function preparePiano() {
  return getCurrentPianoEntry();
}
