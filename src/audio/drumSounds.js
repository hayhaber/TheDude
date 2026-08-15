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

function playKick(ctx, time, velocity) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.11);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.95 * velocity, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.32);
}

function playSnare(ctx, time, velocity) {
  const buffer = getNoiseBuffer(ctx);

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 1400;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.75 * velocity, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);

  const body = ctx.createOscillator();
  body.type = 'triangle';
  body.frequency.value = 190;
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.3 * velocity, time);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  body.connect(bodyGain).connect(ctx.destination);

  const offset = Math.random() * (buffer.duration - 0.2);
  noise.start(time, offset, 0.18);
  body.start(time);
  body.stop(time + 0.12);
}

function playHiHat(ctx, time, velocity, open) {
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
  noise.connect(filter).connect(gain).connect(ctx.destination);

  const offset = Math.random() * Math.max(0, buffer.duration - duration - 0.05);
  noise.start(time, offset, duration + 0.02);
}

// `instrument` is one of: 'kick' | 'snare' | 'hihatClosed' | 'hihatOpen'.
// `velocity` is 0-1 and already folds in both the pattern's own accent
// weighting and the mixer's per-instrument volume/mute.
export function playDrumHit(ctx, instrument, time, velocity) {
  if (!velocity || velocity <= 0) return;
  if (instrument === 'kick') playKick(ctx, time, velocity);
  else if (instrument === 'snare') playSnare(ctx, time, velocity);
  else if (instrument === 'hihatClosed') playHiHat(ctx, time, velocity, false);
  else if (instrument === 'hihatOpen') playHiHat(ctx, time, velocity, true);
}
