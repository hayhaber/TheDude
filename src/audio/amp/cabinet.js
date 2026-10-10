// Impulse responses generated in the browser (nothing to download):
//  - a guitar speaker cabinet, miked close: the filter shape of a real
//    speaker (cone resonance in the lows, a dip around 400 Hz, the 2–4 kHz
//    "bite", then a STEEP roll-off from ~5 kHz — the speaker's top end is
//    what turns raw distortion fizz into a guitar tone) plus two tiny
//    early reflections (cab back wall / mic distance) that give the
//    comb-notched, boxy texture a plain EQ lacks;
//  - a plate-ish reverb tail (decaying stereo noise).
//
// The cabinet is rendered once per voice through an OfflineAudioContext
// running the very biquads a "filter-set cab" would use, then played by a
// ConvolverNode (the spec gives ConvolverNode zero latency).

const CABS = {
  // 1x12 open back — clean channel: airier, less low-mid.
  open: {
    filters: [
      ['highpass', 85, 0.8, 0],
      ['peaking', 180, 1.0, 1.5],
      ['peaking', 450, 1.0, -2],
      ['peaking', 1400, 1.0, 2],
      ['peaking', 3000, 1.4, 3],
      ['lowpass', 6000, 0.7, 0],
      ['lowpass', 7500, 0.8, 0],
    ],
    reflections: [
      [0.0005, 0.22],
      [0.0013, -0.1],
    ],
  },
  // 4x12 closed back (V30-ish) — crunch/lead: thump, mids, a firm top cut.
  closed: {
    filters: [
      ['highpass', 75, 1.1, 0],
      ['peaking', 110, 1.2, 3],
      ['peaking', 400, 1.0, -3],
      ['peaking', 2200, 1.5, 4],
      ['peaking', 3600, 2.0, 2],
      ['lowpass', 5000, 0.7, 0],
      ['lowpass', 6200, 0.9, 0],
      ['lowpass', 9000, 0.5, 0],
    ],
    reflections: [
      [0.0006, 0.25],
      [0.0016, -0.12],
    ],
  },
};

const LENGTH_S = 0.06;

// Magnitude of an IR at one frequency (direct DFT).
function magnitudeAt(data, sr, f) {
  let re = 0;
  let im = 0;
  const w = (2 * Math.PI * f) / sr;
  for (let i = 0; i < data.length; i++) {
    re += data[i] * Math.cos(w * i);
    im -= data[i] * Math.sin(w * i);
  }
  return Math.hypot(re, im);
}

const cache = new Map();

/** AudioBuffer (mono) of a cabinet IR — `kind` 'open' | 'closed'. */
export async function cabinetImpulse(ctx, kind) {
  const key = `${kind}@${ctx.sampleRate}`;
  if (cache.has(key)) return cache.get(key);
  const spec = CABS[kind] || CABS.closed;
  const sr = ctx.sampleRate;
  const len = Math.round(LENGTH_S * sr);
  const OfflineCtor = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const off = new OfflineCtor(1, len, sr);
  // An impulse plus the reflections, then the speaker's filters.
  const imp = off.createBuffer(1, len, sr);
  const d = imp.getChannelData(0);
  d[0] = 1;
  for (const [t, a] of spec.reflections) d[Math.round(t * sr)] += a;
  const src = off.createBufferSource();
  src.buffer = imp;
  let node = src;
  for (const [type, f, q, gain] of spec.filters) {
    const b = off.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    b.gain.value = gain;
    node.connect(b);
    node = b;
  }
  node.connect(off.destination);
  src.start(0);
  const rendered = await off.startRendering();
  const data = rendered.getChannelData(0);
  // Short fade at the tail; unity gain at 1 kHz.
  const fade = Math.round(0.01 * sr);
  for (let i = 0; i < fade; i++) data[len - 1 - i] *= i / fade;
  const m = magnitudeAt(data, sr, 1000) || 1;
  for (let i = 0; i < len; i++) data[i] /= m;
  const buf = ctx.createBuffer(1, len, sr);
  buf.copyToChannel(data, 0);
  cache.set(key, buf);
  return buf;
}

/** Stereo reverb tail, `seconds` long (RT60), with a short pre-delay. */
export function reverbImpulse(ctx, seconds) {
  const sr = ctx.sampleRate;
  const pre = Math.round(0.012 * sr);
  const len = pre + Math.round(seconds * sr);
  const buf = ctx.createBuffer(2, len, sr);
  const k = 6.9 / seconds; // -60 dB at `seconds`
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / sr;
      // Slightly low-passed noise: a darker, smoother tail than white noise.
      lp += ((Math.random() * 2 - 1) - lp) * 0.6;
      d[i] = lp * Math.exp(-k * t);
    }
    // A few early reflections.
    for (const [t, a] of [[0.007, 0.5], [0.013, 0.35], [0.021, 0.28]]) {
      const i = pre + Math.round((t + c * 0.0017) * sr);
      if (i < len) d[i] += a;
    }
  }
  // Normalise the energy so a longer tail isn't louder.
  let e = 0;
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) e += d[i] * d[i];
  }
  const s = 1 / Math.sqrt(e / 2 || 1);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] *= s;
  }
  return buf;
}
