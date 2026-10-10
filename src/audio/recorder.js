// Record yourself: raw PCM captured by an AudioWorklet from any node, then
// written as a 16-bit mono WAV.
//
// Why not MediaRecorder: it gives WebM/Opus on Chrome/Firefox and MP4/AAC
// on Safari — lossy, a different format per browser, and turning it into a
// WAV for download would mean decoding and re-encoding. Capturing the
// samples ourselves gives a lossless WAV everywhere (~5.6 MB per minute at
// 48 kHz), which every DAW and phone opens, and a waveform for free.

const NAME = 'dudestar-rec-capture';
const CHUNK = 4096;

const SOURCE = `
class DudeStarRecCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(${CHUNK});
    this.n = 0;
    this.on = false;
    this.port.onmessage = (e) => {
      if (e.data === 'start') { this.on = true; this.n = 0; }
      else if (e.data === 'stop') {
        this.on = false;
        if (this.n) this.port.postMessage(this.buf.slice(0, this.n));
        this.n = 0;
        this.port.postMessage('done');
      }
    };
  }
  process(inputs) {
    const inp = inputs[0];
    if (!this.on || !inp || !inp.length) return true;
    const chs = inp.length;
    const len = inp[0].length;
    for (let i = 0; i < len; i++) {
      let s = 0;
      for (let c = 0; c < chs; c++) s += inp[c][i];
      this.buf[this.n++] = s / chs;
      if (this.n === ${CHUNK}) {
        this.port.postMessage(this.buf);
        this.buf = new Float32Array(${CHUNK});
        this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor('${NAME}', DudeStarRecCapture);
`;

const loaded = new WeakMap();
function loadCapture(ctx) {
  if (!loaded.has(ctx)) {
    const url = URL.createObjectURL(new Blob([SOURCE], { type: 'application/javascript' }));
    loaded.set(
      ctx,
      ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url))
    );
  }
  return loaded.get(ctx);
}

/**
 * A capture tap on `node`. start() begins collecting; stop() resolves to
 * { samples: Float32Array, sampleRate }. dispose() unhooks it.
 */
export async function createCapture(ctx, node) {
  await loadCapture(ctx);
  const cap = new AudioWorkletNode(ctx, NAME, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
  // Keep it pulled by the graph without making a sound.
  const silent = ctx.createGain();
  silent.gain.value = 0;
  node.connect(cap);
  cap.connect(silent).connect(ctx.destination);
  let chunks = [];
  let count = 0;
  let resolveStop = null;
  cap.port.onmessage = (e) => {
    if (e.data === 'done') {
      const out = new Float32Array(count);
      let o = 0;
      for (const c of chunks) {
        out.set(c, o);
        o += c.length;
      }
      chunks = [];
      count = 0;
      resolveStop?.({ samples: out, sampleRate: ctx.sampleRate });
      resolveStop = null;
      return;
    }
    chunks.push(e.data);
    count += e.data.length;
  };
  return {
    start() {
      chunks = [];
      count = 0;
      cap.port.postMessage('start');
    },
    /** Seconds captured so far. */
    elapsed: () => count / ctx.sampleRate,
    stop() {
      return new Promise((resolve) => {
        resolveStop = resolve;
        cap.port.postMessage('stop');
      });
    },
    dispose() {
      try {
        node.disconnect(cap);
      } catch {
        /* gone */
      }
      try {
        cap.disconnect();
        silent.disconnect();
      } catch {
        /* gone */
      }
      cap.port.onmessage = null;
    },
  };
}

/** 16-bit PCM mono WAV Blob. */
export function encodeWav(samples, sampleRate) {
  const n = samples.length;
  const buffer = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buffer);
  const str = (o, s) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * 2, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    o += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/** `bins` peak values (0..1) for drawing a waveform. */
export function computePeaks(samples, bins = 160) {
  const out = new Array(bins).fill(0);
  if (!samples.length) return out;
  const per = samples.length / bins;
  for (let b = 0; b < bins; b++) {
    const s = Math.floor(b * per);
    const e = Math.min(samples.length, Math.floor((b + 1) * per));
    let p = 0;
    for (let i = s; i < e; i++) {
      const a = Math.abs(samples[i]);
      if (a > p) p = a;
    }
    out[b] = Math.round(Math.min(1, p) * 1000) / 1000;
  }
  return out;
}
