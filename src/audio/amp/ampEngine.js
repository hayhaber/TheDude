// The virtual amp: a Web Audio graph built on the live input.
//
//   input ─► [dyn worklet: noise gate → compressor pedal]
//         ─► drive pedal (TS-style: mid hump → soft clip → tone → level)
//         ─► AMP: anti-fizz low-pass → voicing pre-EQ → preamp gain
//                → stage 1 waveshaper (asymmetric tube-ish, 4x oversampled)
//                → [lead only: inter-stage band-limit → stage 2]
//                → DC block → tone stack (bass / mid / treble) → presence
//         ─► CABINET (generated speaker IR, ConvolverNode)
//         ─► effects loop: chorus → delay → reverb (parallel wet paths)
//         ─► master volume → safety soft-limiter ─► output meter ─► mute ─► out
//                                         (the recorder taps `recordOut`,
//                                          before master and mute)
//
// Every knob is 0..10 (ampSettings.js). Switching a pedal or voicing
// crossfades / ramps (setTargetAtTime) so nothing clicks.

import { loadGateWorklet, createGateNode } from './gateWorklet';
import { cabinetImpulse, reverbImpulse } from './cabinet';
import { readLevel } from './liveInput';

const R = 16; // waveshaper domain: the curve's ±1 input spans ±R "units"
const CURVE_N = 8192;
const TC = 0.015; // ramp time constant (s)

const dbToGain = (db) => Math.pow(10, db / 20);
const lerp = (a, b, k) => a + (b - a) * (k / 10);

// Per voicing: pre-EQ, preamp gain range (dB over the knob), curve, cab.
export const VOICES = {
  clean: { hp: 70, aa: 9000, bright: 3, midF: 500, midQ: 0.7, midDb: -2, gainDb: [-4, 14], bias: 0.08, stages: 1, trim: 2.6, cab: 'open' },
  crunch: { hp: 95, aa: 7500, bright: 1.5, midF: 800, midQ: 0.8, midDb: 2, gainDb: [6, 32], bias: 0.25, stages: 1, trim: 0.55, cab: 'closed' },
  lead: { hp: 130, aa: 6500, bright: 0, midF: 750, midQ: 0.9, midDb: 4, gainDb: [12, 38], bias: 0.3, stages: 2, trim: 0.45, cab: 'closed' },
};

// Asymmetric tanh (a biased tube stage: even harmonics), over u in ±R.
function tubeCurve(bias) {
  const c = new Float32Array(CURVE_N);
  const off = Math.tanh(bias);
  const norm = Math.max(Math.tanh(R + bias) - off, off - Math.tanh(-R + bias));
  for (let i = 0; i < CURVE_N; i++) {
    const u = ((i / (CURVE_N - 1)) * 2 - 1) * R;
    c[i] = (Math.tanh(u + bias) - off) / norm;
  }
  return c;
}

// Linear to 0.6, then a smooth knee that never passes 0.95; input ±1 = ±4.
function limiterCurve() {
  const c = new Float32Array(CURVE_N);
  for (let i = 0; i < CURVE_N; i++) {
    const x = ((i / (CURVE_N - 1)) * 2 - 1) * 4;
    const a = Math.abs(x);
    const y = a < 0.6 ? a : 0.6 + 0.35 * Math.tanh((a - 0.6) / 0.35);
    c[i] = Math.sign(x) * y;
  }
  return c;
}

const curves = new Map();
function curveFor(bias) {
  if (!curves.has(bias)) curves.set(bias, tubeCurve(bias));
  return curves.get(bias);
}

function biquad(ctx, type, f, q = 0.707, gain = 0) {
  const b = ctx.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  b.gain.value = gain;
  return b;
}

function gainNode(ctx, v) {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
}

function chain(...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes[nodes.length - 1];
}

/**
 * Builds the amp on `ctx`, fed by `input` (an AudioNode). Resolves to the
 * engine handle. `monitor` false = nothing reaches the speakers/headphones
 * (the recorder can still take `recordOut`).
 */
export async function createAmpEngine(ctx, input, settings, { monitor = false } = {}) {
  const now = () => ctx.currentTime;
  const set = (param, v) => param.setTargetAtTime(v, now(), TC);
  const nodes = [];
  const keep = (n) => (nodes.push(n), n);

  // ---- metering -----------------------------------------------------------
  const inMeter = keep(ctx.createAnalyser());
  inMeter.fftSize = 1024;
  input.connect(inMeter);

  // ---- gate + compressor (worklet; plain pass-through if unavailable) ----
  const hasWorklet = await loadGateWorklet(ctx);
  const dyn = keep(hasWorklet ? createGateNode(ctx) : gainNode(ctx, 1));
  input.connect(dyn);

  // ---- drive pedal --------------------------------------------------------
  const driveIn = keep(gainNode(ctx, 1));
  const driveOut = keep(gainNode(ctx, 1));
  const driveDry = keep(gainNode(ctx, 1));
  const driveWet = keep(gainNode(ctx, 0));
  const dHp = keep(biquad(ctx, 'highpass', 180, 0.6));
  const dHump = keep(biquad(ctx, 'peaking', 720, 0.7, 6));
  const dGain = keep(gainNode(ctx, 1));
  const dShaper = keep(ctx.createWaveShaper());
  dShaper.curve = curveFor(0.05);
  dShaper.oversample = '2x';
  const dTone = keep(biquad(ctx, 'lowpass', 4000, 0.6));
  const dLevel = keep(gainNode(ctx, 1));
  dyn.connect(driveIn);
  driveIn.connect(driveDry).connect(driveOut);
  chain(driveIn, dHp, dHump, dGain, dShaper, dTone, dLevel, driveWet, driveOut);

  // ---- amp ----------------------------------------------------------------
  const aa = keep(biquad(ctx, 'lowpass', 8000, 0.7)); // anti-fizz before clipping
  const preHp = keep(biquad(ctx, 'highpass', 90, 0.7));
  const bright = keep(biquad(ctx, 'highshelf', 2500, 0.7, 0));
  const preMid = keep(biquad(ctx, 'peaking', 700, 0.8, 0));
  const preGain = keep(gainNode(ctx, 1 / R));
  const stage1 = keep(ctx.createWaveShaper());
  stage1.oversample = '4x';
  // Lead's second stage, band-limited between stages like a real preamp.
  const s2Hp = keep(biquad(ctx, 'highpass', 160, 0.7));
  const s2Lp = keep(biquad(ctx, 'lowpass', 5000, 0.7));
  const s2Gain = keep(gainNode(ctx, 4 / R));
  const stage2 = keep(ctx.createWaveShaper());
  stage2.oversample = '4x';
  stage2.curve = curveFor(0.1);
  const oneStage = keep(gainNode(ctx, 1)); // path that skips stage 2
  const twoStage = keep(gainNode(ctx, 0));
  const dcBlock = keep(biquad(ctx, 'highpass', 25, 0.7));
  const bass = keep(biquad(ctx, 'lowshelf', 120, 0.7, 0));
  const mid = keep(biquad(ctx, 'peaking', 650, 0.9, 0));
  const treble = keep(biquad(ctx, 'highshelf', 2800, 0.7, 0));
  const presence = keep(biquad(ctx, 'highshelf', 4000, 0.7, 0));
  const trim = keep(gainNode(ctx, 0.6));
  chain(driveOut, aa, preHp, bright, preMid, preGain, stage1);
  stage1.connect(oneStage).connect(dcBlock);
  chain(stage1, s2Hp, s2Lp, s2Gain, stage2, twoStage, dcBlock);
  chain(dcBlock, bass, mid, treble, presence, trim);

  // ---- cabinet --------------------------------------------------------------
  const [openIr, closedIr] = await Promise.all([cabinetImpulse(ctx, 'open'), cabinetImpulse(ctx, 'closed')]);
  // Two convolvers, crossfaded (swapping a buffer live would click).
  const cabOpen = keep(ctx.createConvolver());
  cabOpen.normalize = false;
  cabOpen.buffer = openIr;
  const cabClosed = keep(ctx.createConvolver());
  cabClosed.normalize = false;
  cabClosed.buffer = closedIr;
  const cabOpenG = keep(gainNode(ctx, 0));
  const cabClosedG = keep(gainNode(ctx, 1));
  const cabOut = keep(gainNode(ctx, 1));
  trim.connect(cabOpen).connect(cabOpenG).connect(cabOut);
  trim.connect(cabClosed).connect(cabClosedG).connect(cabOut);

  // ---- chorus -------------------------------------------------------------
  const chOut = keep(gainNode(ctx, 1));
  const chDry = keep(gainNode(ctx, 1));
  const chWet = keep(gainNode(ctx, 0));
  const chDelay = keep(ctx.createDelay(0.05));
  chDelay.delayTime.value = 0.012;
  const lfo = keep(ctx.createOscillator());
  lfo.frequency.value = 1;
  const lfoDepth = keep(gainNode(ctx, 0));
  lfo.connect(lfoDepth).connect(chDelay.delayTime);
  lfo.start();
  cabOut.connect(chDry).connect(chOut);
  chain(cabOut, chDelay, chWet, chOut);

  // ---- delay --------------------------------------------------------------
  const dlOut = keep(gainNode(ctx, 1));
  const dlLine = keep(ctx.createDelay(1.5));
  const dlFb = keep(gainNode(ctx, 0));
  const dlFilt = keep(biquad(ctx, 'lowpass', 3500, 0.6));
  const dlWet = keep(gainNode(ctx, 0));
  chOut.connect(dlOut);
  chOut.connect(dlLine);
  chain(dlLine, dlFilt, dlFb, dlLine);
  chain(dlFilt, dlWet, dlOut);

  // ---- reverb -------------------------------------------------------------
  const rvOut = keep(gainNode(ctx, 1));
  rvOut.channelCount = 2;
  rvOut.channelCountMode = 'explicit';
  const rv = keep(ctx.createConvolver());
  rv.normalize = false;
  const rvTone = keep(biquad(ctx, 'lowpass', 6000, 0.5));
  const rvWet = keep(gainNode(ctx, 0));
  dlOut.connect(rvOut);
  chain(dlOut, rv, rvTone, rvWet, rvOut);
  let rvSeconds = 0;

  // ---- master / limiter / meters / mute -----------------------------------
  const master = keep(gainNode(ctx, 0));
  const limIn = keep(gainNode(ctx, 0.25));
  const limiter = keep(ctx.createWaveShaper());
  limiter.curve = limiterCurve();
  const outMeter = keep(ctx.createAnalyser());
  outMeter.fftSize = 1024;
  const mute = keep(gainNode(ctx, monitor ? 1 : 0));
  chain(rvOut, master, limIn, limiter);
  limiter.connect(outMeter);
  limiter.connect(mute).connect(ctx.destination);
  // Recorder tap: the amp sound at a fixed level, whatever the volume knob.
  const recIn = keep(gainNode(ctx, 0.25 * 0.4));
  const recordOut = keep(ctx.createWaveShaper());
  recordOut.curve = limiter.curve;
  rvOut.connect(recIn).connect(recordOut);

  let voicing = null;
  function update(s) {
    const v = VOICES[s.voicing] || VOICES.clean;
    if (s.voicing !== voicing) {
      voicing = s.voicing;
      stage1.curve = curveFor(v.bias);
      set(oneStage.gain, v.stages === 1 ? 1 : 0);
      set(twoStage.gain, v.stages === 2 ? 1 : 0);
      set(cabOpenG.gain, v.cab === 'open' ? 1 : 0);
      set(cabClosedG.gain, v.cab === 'open' ? 0 : 1);
      set(aa.frequency, v.aa);
      set(preHp.frequency, v.hp);
      set(bright.gain, v.bright);
      set(preMid.frequency, v.midF);
      set(preMid.Q, v.midQ);
      set(preMid.gain, v.midDb);
      set(trim.gain, v.trim);
    }
    const a = s.amp;
    set(preGain.gain, dbToGain(lerp(v.gainDb[0], v.gainDb[1], a.gain)) / R);
    set(bass.gain, (a.bass - 5) * 2.4);
    set(mid.gain, (a.mid - 5) * 2);
    set(treble.gain, (a.treble - 5) * 2.4);
    set(presence.gain, (a.presence - 5) * 1.6);
    set(master.gain, 1.6 * Math.pow(a.volume / 10, 2));

    // Gate: knob 0 = off, 1..10 = -76..-40 dBFS.
    if (hasWorklet) {
      const p = dyn.parameters;
      p.get('threshold').setValueAtTime(s.gate <= 0.05 ? -100 : -80 + s.gate * 4, now());
      const c = s.pedals.comp;
      p.get('compOn').setValueAtTime(c.on ? 1 : 0, now());
      const cThr = -12 - c.sustain * 3.6;
      const ratio = 3 + c.sustain * 0.5;
      // Auto makeup: most of the reduction a typical note (-12 dBFS) gets.
      const typicalRed = Math.max(0, -12 - cThr) * (1 - 1 / ratio);
      p.get('compThreshold').setValueAtTime(cThr, now());
      p.get('compRatio').setValueAtTime(ratio, now());
      p.get('compMakeup').setValueAtTime(dbToGain(typicalRed * 0.8 + (c.level - 5) * 2.4), now());
    }

    const d = s.pedals.drive;
    set(driveDry.gain, d.on ? 0 : 1);
    set(driveWet.gain, d.on ? 0.5 : 0);
    set(dGain.gain, dbToGain(lerp(4, 34, d.drive)) / R);
    set(dTone.frequency, lerp(1200, 7200, d.tone));
    set(dLevel.gain, dbToGain((d.level - 5) * 2.4));

    const ch = s.pedals.chorus;
    const chMix = ch.on ? ch.mix / 10 : 0;
    set(chWet.gain, chMix * 0.8);
    set(chDry.gain, 1 - chMix * 0.3);
    set(lfo.frequency, 0.15 + ch.rate * 0.5);
    set(lfoDepth.gain, ch.depth * 0.0004);

    const dl = s.pedals.delay;
    set(dlLine.delayTime, 0.08 + dl.time * 0.07);
    set(dlFb.gain, dl.on ? dl.feedback * 0.075 : 0);
    set(dlWet.gain, dl.on ? (dl.mix / 10) * 0.8 : 0);

    const r = s.pedals.reverb;
    const secs = Math.round((0.4 + r.decay * 0.36) * 10) / 10;
    if (secs !== rvSeconds) {
      rvSeconds = secs;
      rv.buffer = reverbImpulse(ctx, secs);
    }
    set(rvTone.frequency, lerp(2000, 12000, r.tone));
    set(rvWet.gain, r.on ? (r.mix / 10) * 0.5 : 0);
  }

  update(settings);

  const lvlBuf = new Float32Array(1024);
  return {
    hasGate: hasWorklet,
    recordOut,
    output: limiter,
    update,
    setMonitor(on) {
      set(mute.gain, on ? 1 : 0);
    },
    inputLevel: () => readLevel(inMeter, lvlBuf),
    outputLevel: () => readLevel(outMeter, lvlBuf),
    dispose() {
      try {
        lfo.stop();
      } catch {
        /* stopped */
      }
      try {
        input.disconnect(inMeter);
        input.disconnect(dyn);
      } catch {
        /* gone */
      }
      for (const n of nodes) {
        try {
          n.disconnect();
        } catch {
          /* gone */
        }
      }
    },
  };
}
