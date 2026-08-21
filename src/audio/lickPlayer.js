import { STANDARD_TUNING } from '../music/notes';
import { getAudioContext } from './audioContext';
import { midiToFrequency } from './chordPlayer';
import { getSoundfontInstrument } from './instrumentEngine';
import { resolveGuitarProfile } from './instrumentProfiles';
import { getCurrentGuitarProfile } from './audioSettingsStore';

const NOTE_DURATION = 0.35; // seconds each note rings before the next starts
const NOTE_GAP = 0.05; // seconds of silence between notes
const BEND_SEMITONES = 1.5; // full+half-step bend, matching real string-bend range
const VIBRATO_RATE = 6; // Hz
const VIBRATO_DEPTH_SEMITONES = 0.25;
const SAMPLE_VELOCITY = 100;

// Same synchronous readiness check as chordPlayer.js — see
// instrumentEngine.js for why this must not await a Promise mid-schedule.
function getReadySampledInstrument() {
  const profile = resolveGuitarProfile(getCurrentGuitarProfile());
  if (!profile.soundfontName) return null;
  const entry = getSoundfontInstrument(profile.soundfontName);
  return entry?.isReady ? entry.instrument : null;
}

// Plays a lick's notes in sequence (not strummed together, unlike
// playPosition) — each note is either a sampled guitar hit (if a sampled
// profile is selected and loaded) or the original synthesized tone, with a
// pitch-bend ramp or vibrato LFO layered on for notes tagged with those
// techniques. A sampled instrument has no per-note pitch automation, so a
// bend/vibrato-tagged note plays as a clean sustained sample instead — the
// real guitar timbre is still a clear upgrade, this is a disclosed
// trade-off rather than a silently dropped feature.
// A note's `durationMultiplier` (from Motif Development's "Rhythmic
// variation") stretches/shrinks just that note instead of every note
// getting the same fixed length — timing is cumulative to support that.
//
// Every note's actual audio trigger — not just the onNoteStart/onDone UI
// callbacks — is scheduled via setTimeout firing in real time, rather than
// handed to the audio engine all at once with a future absolute
// AudioContext time (the more "precise" approach, tried first). That
// matters for stop(): a note already told to start at some future audio-
// clock time has nothing for stop() to cancel on the sampled-instrument
// path specifically — smplr's own stop(midi) can only silence a voice
// that has already started sounding, not prevent one that hasn't been
// triggered yet — so a still-playing lick's LATER notes kept firing
// regardless of stop() being called, verified directly against a real
// multi-note lick. Triggering each note's audio from its own setTimeout
// means clearTimeout genuinely prevents a not-yet-started note from ever
// sounding, on both the sampled and synthesized paths alike — the same
// timing precision the UI callbacks already accepted as good enough.
//
// Returns `{ stop }` — cancels every note that hasn't started yet and
// silences whatever's currently sounding; existing call sites that don't
// need this just ignore the return value, same as before.
export function playLick(notes, { onNoteStart, onDone } = {}) {
  const ctx = getAudioContext();
  const instrument = getReadySampledInstrument();

  let cursor = 0;
  const schedule = notes.map((note) => {
    const duration = NOTE_DURATION * (note.durationMultiplier ?? 1);
    const offset = cursor;
    cursor += duration + NOTE_GAP;
    return { note, offset, duration };
  });
  const totalMs = cursor * 1000;

  const timers = [];
  const activeVoices = []; // { osc, gain, lfo? } (synth path) or { midi } (sampled path) — only CURRENTLY SOUNDING notes

  function triggerNote(note, duration) {
    const midi = STANDARD_TUNING[note.string].baseMidi + note.fret;
    const startTime = ctx.currentTime;
    const stopTime = startTime + duration;

    if (instrument) {
      instrument.start({ note: midi, time: startTime, velocity: SAMPLE_VELOCITY, duration });
      activeVoices.push({ midi });
      return;
    }

    const baseFreq = midiToFrequency(midi);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';

    let lfo = null;
    if (note.technique === 'bend') {
      // note.bendSemitones (set by Emotion Mode, generateLick.js) overrides
      // the default bend width when present.
      const bentFreq = midiToFrequency(midi + (note.bendSemitones ?? BEND_SEMITONES));
      osc.frequency.setValueAtTime(baseFreq, startTime);
      osc.frequency.linearRampToValueAtTime(bentFreq, stopTime);
    } else if (note.technique === 'vibrato') {
      // note.vibratoRate/vibratoDepth (same source) override the defaults.
      osc.frequency.setValueAtTime(baseFreq, startTime);
      lfo = ctx.createOscillator();
      lfo.frequency.value = note.vibratoRate ?? VIBRATO_RATE;
      const lfoGain = ctx.createGain();
      const depth = note.vibratoDepth ?? VIBRATO_DEPTH_SEMITONES;
      lfoGain.gain.value = baseFreq * (Math.pow(2, depth / 12) - 1);
      lfo.connect(lfoGain).connect(osc.frequency);
      lfo.start(startTime);
      lfo.stop(stopTime);
    } else {
      osc.frequency.value = baseFreq;
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.22, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    osc.connect(gain).connect(ctx.destination);
    osc.start(startTime);
    osc.stop(stopTime + 0.05);
    const voice = { osc, gain, lfo };
    activeVoices.push(voice);
    // Once this note's own natural ring-out is done, it's no longer
    // "currently sounding" — drop it so stop() (if called much later,
    // after this note already finished) doesn't try to re-stop it.
    timers.push(
      setTimeout(() => {
        const i = activeVoices.indexOf(voice);
        if (i !== -1) activeVoices.splice(i, 1);
      }, (stopTime - ctx.currentTime + 0.1) * 1000)
    );
  }

  schedule.forEach(({ note, offset, duration }) => {
    timers.push(
      setTimeout(() => {
        onNoteStart?.(note);
        triggerNote(note, duration);
      }, offset * 1000)
    );
  });
  if (onDone) {
    timers.push(setTimeout(onDone, totalMs));
  }

  function stop() {
    timers.forEach(clearTimeout);
    const cutoff = ctx.currentTime;
    activeVoices.forEach((voice) => {
      if (voice.midi !== undefined) {
        instrument?.stop(voice.midi);
        return;
      }
      try {
        voice.gain.gain.cancelScheduledValues(cutoff);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, cutoff);
        voice.gain.gain.exponentialRampToValueAtTime(0.0001, cutoff + 0.03);
        voice.osc.stop(cutoff + 0.04);
        voice.lfo?.stop(cutoff);
      } catch {
        // Already stopped (its own scheduled stopTime already passed) —
        // nothing left to cut short.
      }
    });
    activeVoices.length = 0;
  }

  return { stop };
}
