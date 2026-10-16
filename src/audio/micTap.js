// A sample tap on a node via an AudioWorklet — the path the Recorder
// captures through, which works on the iPhone. On the iPhone the tuner's
// AnalyserNode read pure zeros (context running, mic track live, session
// auto — 2026-10-16) while the Recorder's worklet got the sound, so the
// tuner reads its frames from here and keeps the analyser only as a
// fallback. The worklet posts mono blocks of BLOCK samples; the main thread
// keeps the latest `size` samples in a ring.

const NAME = 'dudestar-mic-tap';
const BLOCK = 512;

const SOURCE = `
class DudeStarMicTap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(${BLOCK});
    this.n = 0;
  }
  process(inputs) {
    const inp = inputs[0];
    if (!inp || !inp.length) return true;
    const chs = inp.length;
    const len = inp[0].length;
    for (let i = 0; i < len; i++) {
      let s = 0;
      for (let c = 0; c < chs; c++) s += inp[c][i];
      this.buf[this.n++] = s / chs;
      if (this.n === ${BLOCK}) {
        this.port.postMessage(this.buf);
        this.buf = new Float32Array(${BLOCK});
        this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor('${NAME}', DudeStarMicTap);
`;

const loaded = new WeakMap();
function load(ctx) {
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
 * Taps `node`. Returns { read(out) -> true when `out` was filled with the
 * latest out.length samples, blocks (count received), dispose() }, or null
 * when AudioWorklet is unavailable.
 */
export async function createMicTap(ctx, node, size) {
  if (!ctx.audioWorklet || typeof AudioWorkletNode === 'undefined') return null;
  await load(ctx);
  const tap = new AudioWorkletNode(ctx, NAME, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
  const silent = ctx.createGain();
  silent.gain.value = 0;
  node.connect(tap);
  tap.connect(silent).connect(ctx.destination);
  const ring = new Float32Array(size);
  let w = 0;
  let filled = 0;
  const state = { blocks: 0 };
  tap.port.onmessage = (e) => {
    const b = e.data;
    if (!(b instanceof Float32Array)) return;
    state.blocks += 1;
    for (let i = 0; i < b.length; i++) {
      ring[w] = b[i];
      w = (w + 1) % size;
    }
    filled = Math.min(size, filled + b.length);
  };
  return {
    get blocks() {
      return state.blocks;
    },
    read(out) {
      if (filled < out.length) return false;
      let r = (w - out.length + size) % size;
      for (let i = 0; i < out.length; i++) {
        out[i] = ring[r];
        r = (r + 1) % size;
      }
      return true;
    },
    dispose() {
      tap.port.onmessage = null;
      try {
        node.disconnect(tap);
      } catch {
        /* gone */
      }
      try {
        tap.disconnect();
        silent.disconnect();
      } catch {
        /* gone */
      }
    },
  };
}
