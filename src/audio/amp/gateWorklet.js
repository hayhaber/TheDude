// The amp's dynamics stage, as one AudioWorklet (runs on the audio thread,
// sample by sample, adds NO latency): a noise gate followed by the
// compressor pedal. Loaded from a Blob URL so there's no separate file to
// serve.
//
// Why not DynamicsCompressorNode: Chrome's has a fixed ~6 ms look-ahead,
// i.e. 6 ms more delay between the string and your ears — on a live amp
// that matters. This compressor is feed-forward without look-ahead (a
// guitar compressor pedal works the same way: the pick attack slips
// through, which is part of the sound).
//
// Gate: opens instantly when the guitar is louder than the threshold, holds
// 60 ms, then closes over ~80 ms; the close point sits 6 dB under the open
// point so a fading note doesn't chatter. threshold <= -99 dB = off.
//
// Comp: soft-knee (6 dB), attack 4 ms, release 200 ms, makeup gain after.
// `compOn` is smoothed (~15 ms) so switching the pedal never clicks.

const NAME = 'dudestar-amp-dyn';

const SOURCE = `
class DudeStarAmpDyn extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -100, minValue: -120, maxValue: 0, automationRate: 'k-rate' },
      { name: 'compOn', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'compThreshold', defaultValue: -24, minValue: -80, maxValue: 0, automationRate: 'k-rate' },
      { name: 'compRatio', defaultValue: 4, minValue: 1, maxValue: 20, automationRate: 'k-rate' },
      { name: 'compMakeup', defaultValue: 1, minValue: 0, maxValue: 64, automationRate: 'k-rate' },
    ];
  }
  constructor() {
    super();
    const sr = sampleRate;
    // gate
    this.env = 0;
    this.g = 1;
    this.hold = 0;
    this.envRel = Math.exp(-1 / (0.02 * sr));
    this.att = 1 - Math.exp(-1 / (0.0008 * sr));
    this.rel = 1 - Math.exp(-1 / (0.08 * sr));
    this.holdLen = Math.round(0.06 * sr);
    // comp
    this.cEnv = 0;
    this.cAtt = 1 - Math.exp(-1 / (0.004 * sr));
    this.cRel = 1 - Math.exp(-1 / (0.2 * sr));
    this.mix = 0;
    this.mixStep = 1 - Math.exp(-1 / (0.015 * sr));
    this.makeup = 1;
  }
  process(inputs, outputs, params) {
    const inp = inputs[0];
    const out = outputs[0];
    if (!out || !out.length) return true;
    const n = out[0].length;
    if (!inp || !inp.length) {
      for (let c = 0; c < out.length; c++) out[c].fill(0);
      return true;
    }
    const x = inp[0];
    const thr = params.threshold[0];
    const gateOn = thr > -99;
    const open = Math.pow(10, thr / 20);
    const close = open * 0.5;
    const compTarget = params.compOn[0] >= 0.5 ? 1 : 0;
    const cThr = params.compThreshold[0];
    const slope = 1 - 1 / Math.max(1, params.compRatio[0]);
    const makeupT = params.compMakeup[0];
    const knee = 6;
    const o = out[0];
    for (let i = 0; i < n; i++) {
      let s = x[i];
      // --- gate ---
      if (gateOn) {
        const a = s < 0 ? -s : s;
        this.env = a > this.env ? a : this.env * this.envRel;
        let target;
        if (this.env >= open) {
          target = 1;
          this.hold = this.holdLen;
        } else if (this.hold > 0) {
          this.hold--;
          target = 1;
        } else if (this.env < close) {
          target = 0;
        } else {
          target = this.g > 0.5 ? 1 : 0;
        }
        this.g += (target - this.g) * (target > this.g ? this.att : this.rel);
        s *= this.g;
      } else {
        this.g = 1;
      }
      // --- compressor ---
      this.mix += (compTarget - this.mix) * this.mixStep;
      this.makeup += (makeupT - this.makeup) * this.mixStep;
      if (this.mix > 1e-4) {
        const a = s < 0 ? -s : s;
        this.cEnv += (a - this.cEnv) * (a > this.cEnv ? this.cAtt : this.cRel);
        const lvl = 20 * Math.log10(this.cEnv + 1e-9);
        const over = lvl - cThr;
        let red = 0;
        if (over >= knee / 2) red = over * slope;
        else if (over > -knee / 2) red = (slope * (over + knee / 2) * (over + knee / 2)) / (2 * knee);
        const gc = Math.pow(10, -red / 20) * this.makeup;
        s = s * (1 - this.mix) + s * gc * this.mix;
      } else {
        this.cEnv = 0;
      }
      o[i] = s;
    }
    for (let c = 1; c < out.length; c++) out[c].set(o);
    return true;
  }
}
registerProcessor('${NAME}', DudeStarAmpDyn);
`;

const loaded = new WeakMap();

/** Resolves true when the dynamics node can be created on this context. */
export function loadGateWorklet(ctx) {
  if (!ctx.audioWorklet || typeof AudioWorkletNode === 'undefined') return Promise.resolve(false);
  if (!loaded.has(ctx)) {
    const url = URL.createObjectURL(new Blob([SOURCE], { type: 'application/javascript' }));
    loaded.set(
      ctx,
      ctx.audioWorklet
        .addModule(url)
        .then(() => true)
        .catch(() => false)
        .finally(() => URL.revokeObjectURL(url))
    );
  }
  return loaded.get(ctx);
}

export function createGateNode(ctx) {
  return new AudioWorkletNode(ctx, NAME, {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    channelCount: 1,
    channelCountMode: 'explicit',
  });
}
