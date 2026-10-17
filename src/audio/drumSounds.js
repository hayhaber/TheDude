// Synthesized drum hits (no sample files) — Web Audio oscillators/noise so
// tempo changes never affect pitch, matching how audio/metronome.js does
// its click. Each function schedules a fully self-contained, self-cleaning
// node graph for one hit.

let noiseBuffer = null;

// One shared 2s noise buffer, sliced with a random offset per hit so
// consecutive hi-hats don't sound identically "phasey".
function getNoiseBuffer(ctx) {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const length = Math.round(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

function playKick(ctx, time, velocity, out) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.11);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.95 * velocity, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

  osc.connect(gain).connect(out);
  osc.start(time);
  osc.stop(time + 0.32);
}

function playSnare(ctx, time, velocity, out) {
  const buffer = getNoiseBuffer(ctx);

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 1400;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.75 * velocity, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  noise.connect(noiseFilter).connect(noiseGain).connect(out);

  const body = ctx.createOscillator();
  body.type = 'triangle';
  body.frequency.value = 190;
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.3 * velocity, time);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  body.connect(bodyGain).connect(out);

  const offset = Math.random() * (buffer.duration - 0.2);
  noise.start(time, offset, 0.18);
  body.start(time);
  body.stop(time + 0.12);
}

// One shared shape for all three toms — just a different base pitch each
// (high/mid/low) — same pitched-sine-with-downward-sweep recipe as the kick,
// just shorter and higher so it reads as a drum voice, not another kick.
function playTom(ctx, time, velocity, basePitch, out) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(basePitch * 1.4, time);
  osc.frequency.exponentialRampToValueAtTime(basePitch * 0.65, time + 0.16);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.9 * velocity, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

  osc.connect(gain).connect(out);
  osc.start(time);
  osc.stop(time + 0.34);
}

function playCrash(ctx, time, velocity, out) {
  const buffer = getNoiseBuffer(ctx);
  const duration = 1.1; // long, slow-decaying wash — distinct from the hi-hat's short flick

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 4000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.6 * velocity, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  noise.connect(filter).connect(gain).connect(out);

  const offset = Math.random() * Math.max(0, buffer.duration - duration - 0.05);
  noise.start(time, offset, duration + 0.02);
}

function playHiHat(ctx, time, velocity, open, out) {
  const buffer = getNoiseBuffer(ctx);
  const duration = open ? 0.3 : 0.045;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7500;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5 * velocity, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  noise.connect(filter).connect(gain).connect(out);

  const offset = Math.random() * Math.max(0, buffer.duration - duration - 0.05);
  noise.start(time, offset, duration + 0.02);
}


// ---- the rest of the kit (2026-10-17: full kit for the step sequencer) ----

// Side-stick / rim click: a short, high woody knock.
function playRim(ctx, time, velocity, out) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1750, time);
  osc.frequency.exponentialRampToValueAtTime(900, time + 0.03);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.55 * velocity, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  osc.connect(g).connect(out);
  osc.start(time);
  osc.stop(time + 0.06);
  const buffer = getNoiseBuffer(ctx);
  const n = ctx.createBufferSource();
  n.buffer = buffer;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 3200;
  f.Q.value = 1.2;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.35 * velocity, time);
  ng.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
  n.connect(f).connect(ng).connect(out);
  n.start(time, Math.random() * (buffer.duration - 0.1), 0.04);
}

// Hand clap: three quick noise bursts + a short room tail.
function playClap(ctx, time, velocity, out) {
  const buffer = getNoiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1200;
  f.Q.value = 0.9;
  const g = ctx.createGain();
  f.connect(g).connect(out);
  g.gain.setValueAtTime(0.0001, time);
  [0, 0.011, 0.022].forEach((d) => {
    g.gain.setValueAtTime(0.8 * velocity, time + d);
    g.gain.exponentialRampToValueAtTime(0.08 * velocity, time + d + 0.009);
  });
  g.gain.setValueAtTime(0.5 * velocity, time + 0.031);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
  const n = ctx.createBufferSource();
  n.buffer = buffer;
  n.connect(f);
  n.start(time, Math.random() * (buffer.duration - 0.3), 0.22);
}

// Metal: a cluster of square partials at inharmonic ratios (the 808 recipe
// for cymbals / cowbell), band-passed.
function metal(ctx, time, freqs, { velocity, gain, decay, bandFreq, q = 1, highpass = 0 }, out) {
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = bandFreq;
  bp.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain * velocity, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + decay);
  let node = bp;
  if (highpass) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = highpass;
    bp.connect(hp);
    node = hp;
  }
  node.connect(g).connect(out);
  freqs.forEach((fq) => {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = fq;
    o.connect(bp);
    o.start(time);
    o.stop(time + decay + 0.05);
  });
}

function playRide(ctx, time, velocity, out) {
  metal(ctx, time, [205, 304, 369, 522, 540, 800], { velocity, gain: 0.16, decay: 1.3, bandFreq: 7000, q: 0.6, highpass: 5000 }, out);
  // the stick's "ping"
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.value = 3400;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.06 * velocity, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
  o.connect(g).connect(out);
  o.start(time);
  o.stop(time + 0.45);
}

function playRideBell(ctx, time, velocity, out) {
  [[620, 0.16], [1330, 0.1], [2210, 0.07], [3110, 0.04]].forEach(([fq, amp]) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = fq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(amp * velocity, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 1.1);
    o.connect(g).connect(out);
    o.start(time);
    o.stop(time + 1.15);
  });
}

function playCowbell(ctx, time, velocity, out) {
  metal(ctx, time, [540, 800], { velocity, gain: 0.32, decay: 0.38, bandFreq: 800, q: 1.4 }, out);
}

// Shaker: band-passed noise with a soft attack (the beads), short.
function playShaker(ctx, time, velocity, out) {
  const buffer = getNoiseBuffer(ctx);
  const n = ctx.createBufferSource();
  n.buffer = buffer;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 7200;
  f.Q.value = 1.1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(0.42 * velocity, time + 0.018);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
  n.connect(f).connect(g).connect(out);
  n.start(time, Math.random() * (buffer.duration - 0.2), 0.13);
}

// Tambourine: bright noise + a few ringing jingles.
function playTambourine(ctx, time, velocity, out) {
  const buffer = getNoiseBuffer(ctx);
  const n = ctx.createBufferSource();
  n.buffer = buffer;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.38 * velocity, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
  n.connect(hp).connect(g).connect(out);
  n.start(time, Math.random() * (buffer.duration - 0.3), 0.24);
  metal(ctx, time, [4100, 5300, 6700], { velocity, gain: 0.05, decay: 0.25, bandFreq: 5500, q: 2 }, out);
}

// `instrument` is one of: 'kick' | 'snare' | 'hihatClosed' | 'hihatOpen' |
// 'tomHigh' | 'tomMid' | 'tomLow' | 'crash' | 'hihatPedal' | 'rim' | 'clap' |
// 'ride' | 'rideBell' | 'cowbell' | 'shaker' | 'tambourine'. `velocity` is 0-1 and already
// folds in both the pattern's own accent weighting and the mixer's
// per-instrument volume/mute. `out` (optional) is where the hit goes —
// the speakers by default; the recorder routes it into its own mix.
export function playDrumHit(ctx, instrument, time, velocity, out = ctx.destination) {
  if (!velocity || velocity <= 0) return;
  if (instrument === 'kick') playKick(ctx, time, velocity, out);
  else if (instrument === 'snare') playSnare(ctx, time, velocity, out);
  else if (instrument === 'hihatClosed') playHiHat(ctx, time, velocity, false, out);
  else if (instrument === 'hihatOpen') playHiHat(ctx, time, velocity, true, out);
  else if (instrument === 'tomHigh') playTom(ctx, time, velocity, 220, out);
  else if (instrument === 'tomMid') playTom(ctx, time, velocity, 150, out);
  else if (instrument === 'tomLow') playTom(ctx, time, velocity, 100, out);
  else if (instrument === 'crash') playCrash(ctx, time, velocity, out);
  else if (instrument === 'hihatPedal') playHiHat(ctx, time, velocity * 0.7, false, out);
  else if (instrument === 'rim') playRim(ctx, time, velocity, out);
  else if (instrument === 'clap') playClap(ctx, time, velocity, out);
  else if (instrument === 'ride') playRide(ctx, time, velocity, out);
  else if (instrument === 'rideBell') playRideBell(ctx, time, velocity, out);
  else if (instrument === 'cowbell') playCowbell(ctx, time, velocity, out);
  else if (instrument === 'shaker') playShaker(ctx, time, velocity, out);
  else if (instrument === 'tambourine') playTambourine(ctx, time, velocity, out);
}
