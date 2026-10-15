import { DRUM_STYLES } from '../../music/drumPatterns';

// The project's drum track: the app's drum machine grooves, as a pure
// function of TIMELINE time — hits for any window [t0, t1) of the song. The
// live scheduler asks for the window just ahead (loops and pre-roll map to
// the right bars by themselves) and the export renders the whole song from
// the same hits, so what you hear while recording is what you export.
// Same groove rules as audio/drumEngine.js: 4-beat cell by beat role, a
// fill on the last beat of every 4th bar, a crash on the 1 after a fill.

const FILL_EVERY = 4;
const MIX = { kick: 1, snare: 1, hihatClosed: 0.9, hihatOpen: 0.9, tomHigh: 1, tomMid: 1, tomLow: 1, crash: 0.9 };

/** [{ time, instrument, velocity }] with time in [t0, t1) (timeline s). */
export function drumHits({ style: styleKey, fills }, bpm, beats, t0, t1) {
  const style = DRUM_STYLES[styleKey] ?? DRUM_STYLES.rock;
  const spb = style.stepsPerBeat;
  const step = 60 / bpm / spb;
  const out = [];
  let n = Math.max(0, Math.ceil(t0 / step - 1e-9));
  for (; n * step < t1; n++) {
    const time = n * step;
    const beat = Math.floor(n / spb);
    const s = n % spb;
    const bar = Math.floor(beat / beats);
    const b = beat % beats;
    const fillBar = fills && style.fill && bar % FILL_EVERY === FILL_EVERY - 1;
    const hits = { ...((fillBar && b === beats - 1 ? style.fill[s] : style.cell[b % 4]?.[s]) ?? {}) };
    if (fills && style.fillCrashVelocity && bar > 0 && bar % FILL_EVERY === 0 && b === 0 && s === 0) hits.crash = style.fillCrashVelocity;
    for (const [instrument, v] of Object.entries(hits)) {
      if (v) out.push({ time, instrument, velocity: v * (MIX[instrument] ?? 1) });
    }
  }
  return out;
}

/** Beat clicks in [t0, t1): [{ time, accent }]. */
export function clickTimes(bpm, beats, t0, t1) {
  const beat = 60 / bpm;
  const out = [];
  for (let n = Math.max(0, Math.ceil(t0 / beat - 1e-9)); n * beat < t1; n++) out.push({ time: n * beat, accent: n % beats === 0 });
  return out;
}

/** One click (a short sine blip) at ctx time `when` into `out`. */
export function playClick(ctx, when, accent, out, level = 0.5) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = accent ? 1760 : 1320;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(level * (accent ? 1 : 0.7), when + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0005, when + 0.05);
  osc.connect(g).connect(out);
  osc.start(when);
  osc.stop(when + 0.06);
}
