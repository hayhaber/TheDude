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
// A sampled instrument has no live pitch-automation param exposed by smplr
// (detune is fixed per triggered voice) — so a bend/vibrato-tagged note is
// approximated by rapidly re-triggering the same string/fret at a sequence
// of detune values instead of one long sustained sample. Not a true smooth
// glide, but audibly bends/wavers instead of playing clean, which is the
// point: a lick's demo has to actually sound like the technique it's
// teaching, not just show a glyph for it.
const BEND_STEP_COUNT = 5; // retriggers used to climb up to the bend target
const BEND_RISE_FRACTION = 0.5; // climb over the first half of the note, then hold the bent pitch
const VIBRATO_STEP_HZ = 10; // retriggers/sec while oscillating around the base pitch
const SLIDE_GLIDE_TIME = 0.09; // seconds spent gliding into a slide-tagged note
const SLIDE_STEP_COUNT = 4; // sampled-path retriggers used to approximate that glide
const LEGATO_GAP = 0.005; // near-zero gap before a hammer-on/pull-off (vs. a picked NOTE_GAP)
const LEGATO_VELOCITY_SCALE = 0.75; // hammer-ons/pull-offs are softer than a picked attack
const LEGATO_GAIN_SCALE = 0.75; // synth-path equivalent of LEGATO_VELOCITY_SCALE

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
// pitch-bend ramp/retrigger-climb or vibrato LFO/retrigger-wobble layered on
// for notes tagged with those techniques (synth path gets a true continuous
// ramp; sampled path approximates it via retriggers — see BEND_STEP_COUNT's
// comment above for why).
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

  // A hammer-on/pull-off is arrived at *from* the previous note without a
  // fresh pick attack — the gap before it collapses to near-zero (legato)
  // instead of the normal picked NOTE_GAP, same as a guitarist wouldn't
  // leave a picked silence between the two.
  let cursor = 0;
  const schedule = notes.map((note, i) => {
    const duration = NOTE_DURATION * (note.durationMultiplier ?? 1);
    const gapBefore = i === 0 ? 0 : (note.technique === 'hammer' || note.technique === 'pull' ? LEGATO_GAP : NOTE_GAP);
    cursor += gapBefore;
    const offset = cursor;
    cursor += duration;
    return { note, prevNote: notes[i - 1] ?? null, offset, duration };
  });
  const totalMs = cursor * 1000;

  const timers = [];
  const activeVoices = []; // { osc, gain, lfo? } (synth path) or { midi } (sampled path) — only CURRENTLY SOUNDING notes

  function triggerNote(note, duration, prevNote) {
    const midi = STANDARD_TUNING[note.string].baseMidi + note.fret;
    const isLegato = note.technique === 'hammer' || note.technique === 'pull';
    const velocity = isLegato ? SAMPLE_VELOCITY * LEGATO_VELOCITY_SCALE : SAMPLE_VELOCITY;
    const startTime = ctx.currentTime;
    const stopTime = startTime + duration;

    if (instrument) {
      if (note.technique === 'slide') {
        // Glides in from the previous note's pitch on the same string (or a
        // generic whole-step below when there's no same-string predecessor
        // to slide from) up to this note's own pitch, then holds — same
        // retrigger-based approximation the bend/vibrato cases below use,
        // since smplr has no live pitch-automation to ramp continuously.
        const startMidi = prevNote && prevNote.string === note.string ? STANDARD_TUNING[note.string].baseMidi + prevNote.fret : midi - 2;
        const startCents = (startMidi - midi) * 100;
        const glideTime = Math.min(SLIDE_GLIDE_TIME, duration * 0.6);
        const stepDuration = glideTime / SLIDE_STEP_COUNT;
        for (let i = 0; i <= SLIDE_STEP_COUNT; i += 1) {
          const stepStart = startTime + i * stepDuration;
          const stepLength = i < SLIDE_STEP_COUNT ? stepDuration : duration - glideTime;
          if (stepLength <= 0) continue;
          instrument.start({
            note: midi,
            time: stepStart,
            velocity,
            duration: stepLength,
            detune: startCents - (startCents * i) / SLIDE_STEP_COUNT,
          });
        }
      } else if (note.technique === 'bend') {
        const bendCents = (note.bendSemitones ?? BEND_SEMITONES) * 100;
        const riseTime = duration * BEND_RISE_FRACTION;
        const stepDuration = riseTime / BEND_STEP_COUNT;
        for (let i = 0; i <= BEND_STEP_COUNT; i += 1) {
          const stepStart = startTime + i * stepDuration;
          const stepLength = i < BEND_STEP_COUNT ? stepDuration : duration - riseTime;
          if (stepLength <= 0) continue;
          instrument.start({
            note: midi,
            time: stepStart,
            velocity: SAMPLE_VELOCITY,
            duration: stepLength,
            detune: (bendCents * i) / BEND_STEP_COUNT,
          });
        }
      } else if (note.technique === 'vibrato') {
        const depthCents = (note.vibratoDepth ?? VIBRATO_DEPTH_SEMITONES) * 100;
        const stepDuration = 1 / VIBRATO_STEP_HZ;
        const stepCount = Math.max(2, Math.round(duration / stepDuration));
        for (let i = 0; i < stepCount; i += 1) {
          const stepStart = startTime + i * stepDuration;
          const stepLength = Math.min(stepDuration, duration - i * stepDuration);
          if (stepLength <= 0) break;
          instrument.start({
            note: midi,
            time: stepStart,
            velocity: SAMPLE_VELOCITY,
            duration: stepLength,
            detune: i % 2 === 0 ? depthCents : -depthCents,
          });
        }
      } else {
        instrument.start({ note: midi, time: startTime, velocity, duration });
      }
      activeVoices.push({ midi });
      return;
    }

    const baseFreq = midiToFrequency(midi);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';

    let lfo = null;
    if (note.technique === 'slide') {
      // Same glide-in-then-hold idea as the sampled path above, but as a
      // true continuous ramp since the synth path can automate frequency
      // directly.
      const startMidi = prevNote && prevNote.string === note.string ? STANDARD_TUNING[note.string].baseMidi + prevNote.fret : midi - 2;
      const startFreq = midiToFrequency(startMidi);
      const glideTime = Math.min(SLIDE_GLIDE_TIME, duration * 0.6);
      osc.frequency.setValueAtTime(startFreq, startTime);
      osc.frequency.linearRampToValueAtTime(baseFreq, startTime + glideTime);
    } else if (note.technique === 'bend') {
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
    const peakGain = isLegato ? 0.22 * LEGATO_GAIN_SCALE : 0.22;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
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

  schedule.forEach(({ note, prevNote, offset, duration }) => {
    timers.push(
      setTimeout(() => {
        onNoteStart?.(note);
        triggerNote(note, duration, prevNote);
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
