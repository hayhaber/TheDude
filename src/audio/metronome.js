import { getAudioContext } from './audioContext';
import { getDrumMachine } from './instrumentEngine';
import { METRONOME_PERCUSSION_OPTIONS, resolveMetronomePercussion } from './instrumentProfiles';

// Precise audio scheduling needs a lookahead scheduler rather than relying on
// setInterval to fire audio directly — setInterval timing drifts under
// browser load, but scheduling notes ahead of time on the AudioContext's own
// clock keeps the click rock-solid. This is the standard pattern (see Chris
// Wilson's "A Tale of Two Clocks").
const SCHEDULE_AHEAD_TIME = 0.1; // seconds of audio to keep scheduled
const LOOKAHEAD_INTERVAL = 25; // ms between scheduler ticks

const CLICK_SOUNDS = {
  click: { type: 'square', accentFreq: 1600, beatFreq: 1000, duration: 0.04 },
  beep: { type: 'sine', accentFreq: 1320, beatFreq: 880, duration: 0.09 },
  tick: { type: 'triangle', accentFreq: 2000, beatFreq: 1400, duration: 0.025 },
};

// click/beep/tick stay the default, always-available synth set (no network
// dependency); the sampled percussion options are additional, opt-in real
// drum-machine hits (see instrumentProfiles.js's METRONOME_PERCUSSION_OPTIONS
// for exactly which kit/sample backs each one).
export const CLICK_SOUND_OPTIONS = [
  { key: 'click', label: 'Click' },
  { key: 'beep', label: 'Beep' },
  { key: 'tick', label: 'Tick' },
  ...METRONOME_PERCUSSION_OPTIONS.map((p) => ({ key: p.key, label: p.labelKey })),
];

function scheduleOscillatorClick(ctx, time, isAccent, soundKey, volume) {
  const sound = CLICK_SOUNDS[soundKey] ?? CLICK_SOUNDS.click;
  const freq = isAccent ? sound.accentFreq : sound.beatFreq;

  const osc = ctx.createOscillator();
  osc.type = sound.type;
  osc.frequency.value = freq;

  const gain = ctx.createGain();
  const peak = (isAccent ? 0.5 : 0.32) * volume;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(peak, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + sound.duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + sound.duration + 0.02);
}

// Sampled percussion click — synchronous readiness check (see
// instrumentEngine.js's comment on why ahead-of-time scheduling can't await
// a Promise mid-schedule) with an immediate oscillator-click fallback if
// the kit hasn't finished loading yet, so a metronome that's actively
// counting time never silently drops a beat while samples download.
function scheduleClick(ctx, time, isAccent, soundKey, volume) {
  if (volume <= 0) return;
  const percussion = resolveMetronomePercussion(soundKey);
  if (percussion) {
    const entry = getDrumMachine(percussion.kit);
    if (entry?.isReady) {
      entry.instrument.start({ note: percussion.sample, time, velocity: (isAccent ? 110 : 85) * volume });
      return;
    }
    scheduleOscillatorClick(ctx, time, isAccent, 'click', volume);
    return;
  }
  scheduleOscillatorClick(ctx, time, isAccent, soundKey, volume);
}

// A running metronome. Call stop() to tear it down.
// `getVolume` is called fresh at each scheduled click (0-1) so the volume
// slider can be dragged live without restarting the scheduler.
export function startMetronome({ bpm, beatsPerMeasure, soundKey, onBeat, getVolume }) {
  const ctx = getAudioContext();
  let nextBeatTime = ctx.currentTime + 0.05;
  let beatIndex = 0;
  const secondsPerBeat = () => 60 / bpm;

  const intervalId = setInterval(() => {
    while (nextBeatTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
      const isAccent = beatIndex === 0;
      const volume = getVolume ? getVolume() : 1;
      scheduleClick(ctx, nextBeatTime, isAccent, soundKey, volume);
      if (onBeat) {
        const beatToReport = beatIndex;
        const delayMs = Math.max(0, (nextBeatTime - ctx.currentTime) * 1000);
        setTimeout(() => onBeat(beatToReport), delayMs);
      }
      beatIndex = (beatIndex + 1) % beatsPerMeasure;
      nextBeatTime += secondsPerBeat();
    }
  }, LOOKAHEAD_INTERVAL);

  return {
    stop() {
      clearInterval(intervalId);
    },
  };
}
