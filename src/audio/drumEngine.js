import { getAudioContext } from './audioContext';
import { playDrumHit } from './drumSounds';
import { DRUM_STYLES } from '../music/drumPatterns';

// Same lookahead-scheduler approach as audio/metronome.js (see its comment
// for why), just subdivided per-step instead of per-beat so patterns can use
// 8th/triplet/16th grids. Runs its own setInterval loop, but both engines
// schedule against the same AudioContext clock (audioContext.js hands out a
// single shared instance) and both anchor their first hit at
// ctx.currentTime + 0.05 when started, so a click engine and a drum engine
// started together stay phase-locked without needing one clock object.
const SCHEDULE_AHEAD_TIME = 0.1;
const LOOKAHEAD_INTERVAL = 25;

// Every 4th measure gets a fill (when enabled) — a standard musical phrase
// length, not a magic number tied to any one genre.
const FILL_INTERVAL_BARS = 4;

// Toms ride the snare fader (they're the other "drum voice" on a kit, same
// as a real mixer's tom sends usually don't get their own channel either),
// crash rides the hi-hat fader (the other "cymbal" sound) — keeps the
// mixer at its existing 3 channels instead of growing one per new sound.
const MIX_BUCKET = {
  kick: 'kick',
  snare: 'snare',
  hihatClosed: 'hihat',
  hihatOpen: 'hihat',
  tomHigh: 'snare',
  tomMid: 'snare',
  tomLow: 'snare',
  crash: 'hihat',
};

// `getMix` is called fresh at each scheduled step (like metronome's
// getVolume) so mixer sliders/mutes take effect live without restarting.
// Returns { kick, snare, hihat } each 0-1 — already folds in the master
// volume, so this is the final per-instrument gain to play at.
export function startDrumEngine({ bpm, beatsPerMeasure, styleKey, getMix, fillsEnabled }) {
  const ctx = getAudioContext();
  const style = DRUM_STYLES[styleKey] ?? DRUM_STYLES.rock;
  const stepsPerBeat = style.stepsPerBeat;

  let beatIndex = 0;
  let stepIndex = 0;
  let measureIndex = 0;
  let nextStepTime = ctx.currentTime + 0.05;
  // Set the step right after a fill measure ends, so a crash (if the style
  // defines one) lands exactly on the downbeat the fill was leading into —
  // layered on top of that beat's normal groove hit, not replacing it.
  let pendingCrash = false;
  const secondsPerStep = () => 60 / bpm / stepsPerBeat;

  const intervalId = setInterval(() => {
    while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
      // The fill (if any) only ever replaces the LAST beat of a fill
      // measure — every other beat plays the style's normal groove
      // untouched, same as before this feature existed.
      const isLastBeatOfMeasure = beatIndex === beatsPerMeasure - 1;
      const isFillMeasure = fillsEnabled && style.fill && measureIndex % FILL_INTERVAL_BARS === FILL_INTERVAL_BARS - 1;
      const role = beatIndex % 4;
      const hits = { ...(isLastBeatOfMeasure && isFillMeasure ? style.fill[stepIndex] ?? {} : style.cell[role]?.[stepIndex] ?? {}) };
      if (pendingCrash && beatIndex === 0 && stepIndex === 0) {
        hits.crash = style.fillCrashVelocity;
        pendingCrash = false;
      }
      const mix = getMix ? getMix() : { kick: 1, snare: 1, hihat: 1 };

      for (const [instrument, velocity] of Object.entries(hits)) {
        if (!velocity) continue;
        playDrumHit(ctx, instrument, nextStepTime, velocity * mix[MIX_BUCKET[instrument] ?? 'snare']);
      }

      stepIndex += 1;
      if (stepIndex >= stepsPerBeat) {
        stepIndex = 0;
        const finishedFillMeasure = isLastBeatOfMeasure && isFillMeasure;
        beatIndex += 1;
        if (beatIndex >= beatsPerMeasure) {
          beatIndex = 0;
          measureIndex += 1;
          if (finishedFillMeasure && style.fillCrashVelocity) pendingCrash = true;
        }
      }
      nextStepTime += secondsPerStep();
    }
  }, LOOKAHEAD_INTERVAL);

  return {
    stop() {
      clearInterval(intervalId);
    },
  };
}
