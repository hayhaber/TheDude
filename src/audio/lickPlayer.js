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
// `onNoteStart(note)`/`onDone()` are optional UI hooks fired via setTimeout
// on the same schedule as the audio — plain timers are precise enough for a
// visual "now playing" indicator, unlike the metronome's lookahead
// scheduler which needs sample-accurate click timing.
//
// Returns `{ stop }` — every note/timer this call scheduled is tracked so a
// caller can cut a still-playing lick short (e.g. a Stop button) instead of
// only ever being able to wait it out. Existing call sites that don't need
// this just ignore the return value, same as before.
export function playLick(notes, { onNoteStart, onDone } = {}) {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
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
  const synthVoices = []; // { osc, gain, lfo? } — the oscillator-synth path
  const sampledMidiNotes = new Set(); // MIDI numbers started on the sampled-instrument path

  if (onNoteStart) {
    schedule.forEach(({ note, offset }) => {
      timers.push(setTimeout(() => onNoteStart(note), offset * 1000));
    });
  }
  if (onDone) {
    timers.push(setTimeout(onDone, totalMs));
  }

  schedule.forEach(({ note, offset, duration }) => {
    const midi = STANDARD_TUNING[note.string].baseMidi + note.fret;
    const startTime = now + offset;
    const stopTime = startTime + duration;

    if (instrument) {
      instrument.start({ note: midi, time: startTime, velocity: SAMPLE_VELOCITY, duration });
      sampledMidiNotes.add(midi);
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
    synthVoices.push({ osc, gain, lfo });
  });

  function stop() {
    timers.forEach(clearTimeout);
    const cutoff = ctx.currentTime;
    synthVoices.forEach(({ osc, gain, lfo }) => {
      try {
        gain.gain.cancelScheduledValues(cutoff);
        gain.gain.setValueAtTime(gain.gain.value, cutoff);
        gain.gain.exponentialRampToValueAtTime(0.0001, cutoff + 0.03);
        osc.stop(cutoff + 0.04);
        lfo?.stop(cutoff);
      } catch {
        // Already stopped (its own scheduled stopTime already passed) —
        // nothing left to cut short.
      }
    });
    sampledMidiNotes.forEach((midi) => instrument?.stop(midi));
  }

  return { stop };
}
