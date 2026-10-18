// The studio's 10-band graphic equalizer (EQ-10 rack unit, 2026-10-18).
// One per track and one on the mix bus. Pure helpers + a Web Audio chain
// shared by the live engine and the offline mixdown.
//
// eq = { on: boolean, gains: number[10] (dB, ±12) } — missing = flat.

export const EQ_BANDS = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
export const EQ_LABELS = ['31', '63', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
export const EQ_RANGE = 12; // dB
export const EQ_Q = 1.41; // one octave per band (ISO graphic EQ)

export const flatEq = () => ({ on: true, gains: EQ_BANDS.map(() => 0) });

export function normEq(eq) {
  const g = Array.isArray(eq?.gains) ? eq.gains : [];
  return { on: eq?.on !== false, gains: EQ_BANDS.map((_, i) => clampGain(g[i] ?? 0)) };
}

export function clampGain(db) {
  const v = Math.round(Number(db) * 2) / 2; // 0.5 dB steps
  return Number.isFinite(v) ? Math.max(-EQ_RANGE, Math.min(EQ_RANGE, v)) : 0;
}

/** Does this EQ change the sound at all? */
export function eqActive(eq) {
  return !!eq && eq.on !== false && (eq.gains || []).some((g) => g);
}

/** Gains the filters should get now (all 0 when bypassed). */
export function effectiveGains(eq) {
  const n = normEq(eq);
  return n.on ? n.gains : n.gains.map(() => 0);
}

/**
 * Magnitude response in dB of the whole chain at `freq` (RBJ peaking
 * biquads, the same filters BiquadFilterNode 'peaking' uses).
 */
export function eqResponseDb(eq, freq, sampleRate = 48000) {
  const gains = effectiveGains(eq);
  let db = 0;
  const w = (2 * Math.PI * freq) / sampleRate;
  const cw = Math.cos(w);
  const c2w = Math.cos(2 * w);
  for (let i = 0; i < EQ_BANDS.length; i++) {
    if (!gains[i]) continue;
    const A = Math.pow(10, gains[i] / 40);
    const w0 = (2 * Math.PI * EQ_BANDS[i]) / sampleRate;
    const alpha = Math.sin(w0) / (2 * EQ_Q);
    const c0 = Math.cos(w0);
    const b0 = 1 + alpha * A, b1 = -2 * c0, b2 = 1 - alpha * A;
    const a0 = 1 + alpha / A, a1 = -2 * c0, a2 = 1 - alpha / A;
    // |H|² of (b0 + b1 z⁻¹ + b2 z⁻²) / (a0 + a1 z⁻¹ + a2 z⁻²) at z = e^{jw}
    const num = b0 * b0 + b1 * b1 + b2 * b2 + 2 * (b0 * b1 + b1 * b2) * cw + 2 * b0 * b2 * c2w;
    const den = a0 * a0 + a1 * a1 + a2 * a2 + 2 * (a0 * a1 + a1 * a2) * cw + 2 * a0 * a2 * c2w;
    db += 10 * Math.log10(num / den);
  }
  return db;
}

/**
 * input -> 10 peaking filters -> output. `set(eq)` updates the gains (smoothly
 * when `ramp` — live changes while playing).
 */
export function createEqChain(ctx, eq) {
  const filters = EQ_BANDS.map((f) => {
    const b = ctx.createBiquadFilter();
    b.type = 'peaking';
    b.frequency.value = f;
    b.Q.value = EQ_Q;
    b.gain.value = 0;
    return b;
  });
  for (let i = 1; i < filters.length; i++) filters[i - 1].connect(filters[i]);
  const set = (next, ramp = false) => {
    const gains = effectiveGains(next);
    filters.forEach((b, i) => {
      if (ramp) b.gain.setTargetAtTime(gains[i], ctx.currentTime, 0.03);
      else b.gain.value = gains[i];
    });
  };
  set(eq);
  return {
    input: filters[0],
    output: filters[filters.length - 1],
    set,
    disconnect() {
      filters.forEach((b) => {
        try {
          b.disconnect();
        } catch {
          /* gone */
        }
      });
    },
  };
}
