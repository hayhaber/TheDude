import { getAudioContext } from './audioContext';
import { playDrumHit } from './drumSounds';
import { DRUM_STYLES } from '../music/drumPatterns';
import { MIX_BUCKET } from '../music/drumKit';

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

// Each instrument rides one of the mixer's group faders (drumKit.js:
// kick / drums (snare, rim, clap, toms) / cymbals / percussion).
export function startDrumEngine({ bpm, beatsPerMeasure, styleKey, getPattern, getMix, fillsEnabled, onStep }) {
  const ctx = getAudioContext();
  // `getPattern` (the step sequencer: a user pattern or a draft being
  // edited) is read on every step, so edits are heard at once; else the
  // built-in style.
  const fixed = DRUM_STYLES[styleKey] ?? DRUM_STYLES.rock;
  const pattern = () => (getPattern && getPattern()) || fixed;

  let beatIndex = 0;
  let stepIndex = 0;
  let measureIndex = 0;
  let nextStepTime = ctx.currentTime + 0.05;
  // Set the step right after a fill measure ends, so a crash (if the style
  // defines one) lands exactly on the downbeat the fill was leading into —
  // layered on top of that beat's normal groove hit, not replacing it.
  let pendingCrash = false;

  const intervalId = setInterval(() => {
    while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
      const style = pattern();
      const stepsPerBeat = style.stepsPerBeat;
      if (stepIndex >= stepsPerBeat) stepIndex = 0; // the grid changed mid-beat
      // The fill (if any) only ever replaces the LAST beat of a fill
      // measure — every other beat plays the style's normal groove.
      const isLastBeatOfMeasure = beatIndex === beatsPerMeasure - 1;
      const isFillMeasure = fillsEnabled && style.fill && measureIndex % FILL_INTERVAL_BARS === FILL_INTERVAL_BARS - 1;
      const role = beatIndex % style.cell.length;
      const hits = { ...(isLastBeatOfMeasure && isFillMeasure ? style.fill[stepIndex] ?? {} : style.cell[role]?.[stepIndex] ?? {}) };
      if (pendingCrash && beatIndex === 0 && stepIndex === 0) {
        hits.crash = style.fillCrashVelocity;
        pendingCrash = false;
      }
      const mix = getMix ? getMix() : { kick: 1, snare: 1, hihat: 1, perc: 1 };

      for (const [instrument, velocity] of Object.entries(hits)) {
        if (!velocity || mix.rows?.[instrument]) continue; // a row muted in the sequencer
        playDrumHit(ctx, instrument, nextStepTime, velocity * (mix[MIX_BUCKET[instrument] ?? 'snare'] ?? 1));
      }
      if (onStep) {
        const at = { role, step: stepIndex, beat: beatIndex };
        setTimeout(() => onStep(at), Math.max(0, (nextStepTime - ctx.currentTime) * 1000));
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
      nextStepTime += 60 / bpm / stepsPerBeat;
    }
  }, LOOKAHEAD_INTERVAL);

  return {
    stop() {
      clearInterval(intervalId);
    },
  };
}
