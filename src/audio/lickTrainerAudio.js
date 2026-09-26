// Lick Trainer audio: sample-accurate reference playback (with count-in and
// optional click) and raw input capture for analysis.
//
// Playback uses a lookahead scheduler on the AudioContext clock (the same
// "Tale of Two Clocks" pattern as metronome.js) instead of lickPlayer.js's
// per-note setTimeout: rhythm is the whole point here, and setTimeout
// jitter (and background-tab throttling) would make the reference itself
// sloppy. Notes are handed to the audio engine only ~120ms ahead, so stop()
// can still cancel everything that hasn't been scheduled yet.
//
// Capture uses an AudioWorklet that copies raw input samples (tagged with
// the AudioContext frame they were captured at) to the main thread, so a
// take can be analyzed afterwards with every sample and exact timing.
import { getAudioContext } from './audioContext';
import { midiToFrequency } from './chordPlayer';
import { getSoundfontInstrument } from './instrumentEngine';
import { resolveGuitarProfile } from './instrumentProfiles';
import { getCurrentGuitarProfile } from './audioSettingsStore';
import { getAudioInputSettings } from './audioInputSettingsStore';
import { STANDARD_TUNING } from '../music/notes';

const SCHEDULE_AHEAD = 0.12;
const TICK_MS = 25;
const BEND_RISE_MAX = 0.15; // seconds to reach a bend's target
const GLIDE_TIME = 0.07; // slide / release glide
const VIBRATO_HZ = 5.5;
const VIBRATO_DEPTH = 0.3; // semitones
const LEGATO = new Set(['hammer', 'pull', 'slide', 'release']);

function readyInstrument() {
  const profile = resolveGuitarProfile(getCurrentGuitarProfile());
  if (!profile.soundfontName) return null;
  const entry = getSoundfontInstrument(profile.soundfontName);
  return entry?.isReady ? entry.instrument : null;
}

function scheduleClick(ctx, time, accent, volume = 1) {
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = accent ? 1600 : 1000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime((accent ? 0.35 : 0.22) * volume, time + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.05);
  return { osc, gain };
}

// Pitch (midi, fractional) of a note at `t` seconds into it — the contour the
// synth follows and the sampled path approximates in steps.
function contour(note, prevNote, t, dur) {
  const midi = note.midi;
  let m = midi;
  if (note.technique === 'bend') {
    const rise = Math.min(BEND_RISE_MAX, dur * 0.4);
    m = midi + Math.min(1, t / rise) * (note.bend ?? 2);
  } else if (note.technique === 'release') {
    const from = midi + (note.bend ?? 2);
    m = from + Math.min(1, t / Math.min(GLIDE_TIME * 1.5, dur * 0.5)) * (midi - from);
  } else if (note.technique === 'slide' && prevNote) {
    const from = prevNote.midi;
    m = from + Math.min(1, t / Math.min(GLIDE_TIME, dur * 0.5)) * (midi - from);
  }
  if (note.vibrato) {
    const settle = note.technique === 'bend' ? Math.min(BEND_RISE_MAX, dur * 0.4) : 0.12;
    if (t > settle) m += VIBRATO_DEPTH * Math.sin(2 * Math.PI * VIBRATO_HZ * (t - settle)) * Math.min(1, (t - settle) / 0.15);
  }
  return m;
}

function playNoteAt(ctx, instrument, note, prevNote, time, dur, voices) {
  const moving = note.technique === 'bend' || note.technique === 'release' || note.vibrato || (note.technique === 'slide' && prevNote);
  const legato = LEGATO.has(note.technique);
  if (instrument) {
    if (!moving) {
      instrument.start({ note: note.midi, time, velocity: legato ? 75 : 100, duration: dur });
    } else {
      // No live pitch automation on samples: step the detune along the
      // contour every ~25ms (smplr voices are fixed-pitch once started).
      const step = 0.04;
      for (let t = 0; t < dur - 0.005; t += step) {
        const cents = (contour(note, prevNote, t + step / 2, dur) - note.midi) * 100;
        instrument.start({ note: note.midi, time: time + t, velocity: t === 0 && !legato ? 100 : 70, duration: Math.min(step + 0.03, dur - t), detune: cents });
      }
    }
    voices.push({ midi: note.midi });
    return;
  }
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const steps = Math.max(2, Math.ceil(dur / 0.01));
  osc.frequency.setValueAtTime(midiToFrequency(contour(note, prevNote, 0, dur)), time);
  if (moving) {
    for (let i = 1; i <= steps; i += 1) {
      const t = (i / steps) * dur;
      osc.frequency.linearRampToValueAtTime(midiToFrequency(contour(note, prevNote, t, dur)), time + t);
    }
  }
  const gain = ctx.createGain();
  const peak = legato ? 0.16 : 0.22;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(peak, time + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + dur + 0.08);
  voices.push({ osc, gain });
}

/**
 * Schedules a lick (and/or clicks) starting at `startTime` (AudioContext
 * seconds; beat 0 of the lick). Returns { stop, clickTimes, noteTimes, endTime }.
 * @param {object} p
 * @param {Array} p.notes         lick notes ({start, duration} in beats, midi, technique, bend, vibrato)
 * @param {number} p.bpm
 * @param {number} p.startTime
 * @param {number} p.countInBeats clicks before beat 0
 * @param {boolean} p.playNotes   play the reference notes
 * @param {boolean} p.clickDuring keep clicking through the lick
 * @param {number} p.lengthBeats
 */
export function scheduleLick({ notes, bpm, startTime, countInBeats = 0, playNotes = true, clickDuring = false, lengthBeats }) {
  const ctx = getAudioContext();
  const spb = 60 / bpm;
  const events = [];
  const clickTimes = [];
  for (let b = -countInBeats; b < (clickDuring ? lengthBeats : 0); b += 1) {
    const time = startTime + b * spb;
    clickTimes.push(time);
    events.push({ kind: 'click', time, accent: ((b % 4) + 4) % 4 === 0 });
  }
  const noteTimes = notes.map((n) => ({ time: startTime + n.start * spb, duration: n.duration * spb }));
  if (playNotes) {
    notes.forEach((note, i) => {
      // Ring until the next note (same idea as a real string being
      // re-fretted), capped at the written length plus a little sustain.
      const next = notes[i + 1];
      const written = note.duration * spb;
      const untilNext = next ? (next.start - note.start) * spb : written + 0.4;
      events.push({ kind: 'note', time: noteTimes[i].time, note, prev: notes[i - 1] ?? null, dur: Math.max(0.05, Math.min(untilNext, written + 0.3)) });
    });
  }
  events.sort((a, b) => a.time - b.time);

  const instrument = playNotes ? readyInstrument() : null;
  const voices = [];
  let cursor = 0;
  function tick() {
    const horizon = ctx.currentTime + SCHEDULE_AHEAD;
    while (cursor < events.length && events[cursor].time < horizon) {
      const e = events[cursor];
      if (e.time >= ctx.currentTime - 0.01) {
        if (e.kind === 'click') voices.push(scheduleClick(ctx, e.time, e.accent));
        else playNoteAt(ctx, instrument, e.note, e.prev, e.time, e.dur, voices);
      }
      cursor += 1;
    }
  }
  tick();
  const id = setInterval(tick, TICK_MS);
  const endTime = startTime + lengthBeats * spb;

  function stop() {
    clearInterval(id);
    const now = ctx.currentTime;
    for (const v of voices) {
      if (v.midi !== undefined) {
        instrument?.stop(v.midi);
        continue;
      }
      try {
        v.gain.gain.cancelScheduledValues(now);
        v.gain.gain.setValueAtTime(v.gain.gain.value, now);
        v.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
        v.osc.stop(now + 0.04);
      } catch {
        // already finished
      }
    }
  }
  return { stop, clickTimes, noteTimes, endTime };
}

// ---- Input capture ---------------------------------------------------------

const WORKLET_SOURCE = `
class LickCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recording = false;
    this.buf = new Float32Array(4096);
    this.fill = 0;
    this.bufStart = 0;
    this.port.onmessage = (e) => {
      if (e.data === 'start') { this.recording = true; this.fill = 0; }
      if (e.data === 'stop') { this.flush(); this.recording = false; this.port.postMessage({ done: true }); }
    };
  }
  flush() {
    if (this.fill > 0) {
      this.port.postMessage({ frame: this.bufStart, samples: this.buf.slice(0, this.fill) });
      this.fill = 0;
    }
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (this.recording && ch) {
      for (let i = 0; i < ch.length; i += 1) {
        if (this.fill === 0) this.bufStart = currentFrame + i;
        this.buf[this.fill++] = ch[i];
        if (this.fill === this.buf.length) this.flush();
      }
    }
    return true;
  }
}
registerProcessor('lick-capture', LickCapture);
`;

let workletLoaded = null;
function loadWorklet(ctx) {
  if (!workletLoaded) {
    const url = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }));
    workletLoaded = ctx.audioWorklet.addModule(url);
  }
  return workletLoaded;
}

/**
 * Opens the input chosen in Settings (device, gain, room-mic vs direct) and
 * returns a capture handle. Call close() when done.
 */
export async function openInput() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();
  const { deviceId, inputMode, gain } = getAudioInputSettings();
  const processing = inputMode === 'microphone';
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: processing,
      noiseSuppression: processing,
      autoGainControl: processing,
      channelCount: 1,
    },
  });
  await loadWorklet(ctx);
  const source = ctx.createMediaStreamSource(stream);
  const gainNode = ctx.createGain();
  gainNode.gain.value = gain;
  const node = new AudioWorkletNode(ctx, 'lick-capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  // Keep the worklet in the rendering graph without making any sound.
  const mute = ctx.createGain();
  mute.gain.value = 0;
  source.connect(gainNode);
  gainNode.connect(node).connect(mute).connect(ctx.destination);
  gainNode.connect(analyser);

  let chunks = [];
  let onDone = null;
  node.port.onmessage = (e) => {
    if (e.data.done) {
      onDone?.();
      return;
    }
    chunks.push(e.data);
  };

  const levelBuf = new Float32Array(analyser.fftSize);
  return {
    inputMode,
    level() {
      gainNode.gain.value = getAudioInputSettings().gain;
      analyser.getFloatTimeDomainData(levelBuf);
      let peak = 0;
      for (let i = 0; i < levelBuf.length; i += 1) peak = Math.max(peak, Math.abs(levelBuf[i]));
      return peak;
    },
    start() {
      chunks = [];
      node.port.postMessage('start');
    },
    stop() {
      return new Promise((resolve) => {
        onDone = () => {
          const total = chunks.reduce((a, c) => a + c.samples.length, 0);
          const samples = new Float32Array(total);
          let o = 0;
          for (const c of chunks) {
            samples.set(c.samples, o);
            o += c.samples.length;
          }
          const firstFrame = chunks.length ? chunks[0].frame : 0;
          resolve({ samples, sampleRate: ctx.sampleRate, t0: firstFrame / ctx.sampleRate });
        };
        node.port.postMessage('stop');
      });
    },
    close() {
      try {
        source.disconnect();
        gainNode.disconnect();
        node.disconnect();
        mute.disconnect();
      } catch {
        // already disconnected
      }
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

// Rough default before calibration: what the browser reports for output +
// a typical input path.
export function defaultLatency() {
  const ctx = getAudioContext();
  return (ctx.outputLatency || 0) + (ctx.baseLatency || 0) + 0.015;
}

export function stringMidi(stringIndex, fret) {
  return STANDARD_TUNING[stringIndex].baseMidi + fret;
}
