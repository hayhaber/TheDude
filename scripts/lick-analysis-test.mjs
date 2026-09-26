// Regression test for the Lick Trainer analysis engine on synthetic guitar audio.
// Run: npx esbuild scripts/lick-analysis-test.mjs --bundle --platform=node --format=esm --outfile=/tmp/lat.mjs && node /tmp/lat.mjs
import { analyzeTake, estimateLatency } from '../src/music/lickTrainer/analysis.js';

const SR = 48000;
const TUNING = [40, 45, 50, 55, 59, 64];

// Guitar-ish tone: harmonics 1..8, pluck attack, exponential decay; pitch
// contour f(tRel) in midi; continuous phase. Legato notes get a soft attack.
function render(notes, totalS, { noise = 0.0005, clicks = [], clickLevel = 0 } = {}) {
  const out = new Float32Array(Math.ceil(totalS * SR));
  // group notes into "strings": each note stops the previous one
  notes.forEach((n, idx) => {
    const next = notes[idx + 1];
    const end = Math.min(next ? next.t : totalS, n.t + n.d + 0.25);
    const s0 = Math.floor(n.t * SR), s1 = Math.min(out.length, Math.floor(end * SR));
    const phases = new Float64Array(9);
    const amp0 = n.legato ? 0.12 : 0.3;
    for (let s = s0; s < s1; s += 1) {
      const tr = (s - s0) / SR;
      const midi = n.contour ? n.contour(tr) : n.midi;
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      const att = n.legato ? Math.min(1, tr / 0.004) : Math.min(1, tr / 0.002);
      const env = amp0 * att * Math.exp(-tr / 0.9) * (s1 - s < 240 ? (s1 - s) / 240 : 1);
      let v = 0;
      for (let k = 1; k <= 8; k += 1) {
        phases[k] += (2 * Math.PI * f * k) / SR;
        v += Math.sin(phases[k]) / (k * (k > 1 ? 1.3 : 1));
      }
      out[s] += env * v;
    }
  });
  for (const c of clicks) {
    const s0 = Math.floor(c * SR);
    for (let s = 0; s < 0.03 * SR && s0 + s < out.length; s += 1) out[s0 + s] += clickLevel * (Math.random() * 2 - 1) * Math.exp(-s / 300);
  }
  for (let i = 0; i < out.length; i += 1) out[i] += noise * (Math.random() * 2 - 1);
  return out;
}

// A lick: [start beat, dur beat, string idx, fret, tech, bend]
const bpm = 90, spb = 60 / bpm;
const lick = [
  [0, 0.5, 3, 7, null], [0.5, 0.5, 3, 5, null], [1, 0.5, 2, 7, null], [1.5, 0.5, 3, 5, null],
  [2, 1, 3, 7, 'bend', 2], [3, 0.5, 3, 7, 'release', 2], [3.5, 0.25, 3, 5, 'pull'], [3.75, 0.25, 3, 7, 'hammer'],
  [4, 0.5, 4, 5, null], [4.5, 0.5, 4, 8, 'slide'], [5, 2, 5, 5, null, 0, true],
];
const START = 1.0; // performance time of beat 0 (s)
function expectedFrom(l) {
  return l.map(([b, d, st, fr, tech, bend, vib]) => ({
    time: START + b * spb, duration: d * spb, midi: TUNING[st] + fr, technique: tech, bend: bend || (tech ? 2 : undefined), vibrato: !!vib,
  }));
}
function perform(l, { shift = 0, jitter = 0, edits = {}, bendReach = 1 } = {}) {
  const notes = [];
  l.forEach(([b, d, st, fr, tech, bend, vib], i) => {
    if (edits.skip === i) return;
    const midi = TUNING[st] + fr + (edits.wrong === i ? 2 : 0);
    const t = START + b * spb + shift + (Math.random() * 2 - 1) * jitter;
    let contour = null;
    if (tech === 'bend') contour = (x) => midi + Math.min(1, x / 0.15) * (bend || 2) * bendReach;
    if (tech === 'release') contour = (x) => midi + Math.max(0, 1 - x / 0.12) * (bend || 2);
    if (tech === 'slide') { const from = TUNING[st] + l[i - 1][3]; contour = (x) => from + Math.min(1, x / 0.06) * (midi - from); }
    if (vib) contour = (x) => midi + 0.3 * Math.sin(2 * Math.PI * 5.5 * x) * Math.min(1, x / 0.3);
    notes.push({ t, d: d * spb, midi, contour, legato: ['hammer', 'pull', 'slide', 'release'].includes(tech) });
    if (edits.extraAfter === i) notes.push({ t: t + (d * spb) / 2, d: d * spb / 2, midi: midi + 3, legato: false });
  });
  return notes;
}
function run(name, opts, check, renderOpts = {}) {
  const latency = opts.latency ?? 0;
  const perf = perform(lick, opts);
  // capture timeline: sample 0 is ctx time t0; room event at performance t is captured at t+latency
  const t0 = 0.2;
  const captured = perf.map((n) => ({ ...n, t: n.t + latency - t0 }));
  const clicksCap = (renderOpts.clicks ?? []).map((c) => c + latency - t0);
  const samples = render(captured, 9, { ...renderOpts, clicks: clicksCap });
  const t1 = Date.now();
  const res = analyzeTake({ samples, sampleRate: SR, t0, latency, expected: expectedFrom(lick), clickTimes: renderOpts.clicks ?? [] });
  const ms = Date.now() - t1;
  const line = res.notes.map((n) => `${n.index}:${n.status}${n.offsetMs != null ? `(${n.offsetMs})` : ''}${n.bend ? `b${n.bend.reached}` : ''}${n.vibrato ? `v${n.vibrato.depth}` : ''}${n.release ? `r${n.release.endHeight.toFixed(2)}` : ''}`).join(' ');
  const ok = check(res);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} [${ms}ms] score=${res.summary.score} verdict=${res.summary.verdict} tips=${res.summary.tips.map((t) => t.key).join(',')} extras=${res.extras.length}\n     ${line}`);
  return ok;
}
let all = true;
const okAll = (r) => r.notes.every((n) => n.status === 'ok');
all &= run('clean take', {}, (r) => okAll(r) && r.summary.score >= 90 && r.extras.length === 0);
all &= run('clean + 150ms latency', { latency: 0.15 }, (r) => okAll(r) && r.summary.score >= 90);
all &= run('dragging +55ms', { shift: 0.055 }, (r) => r.summary.tips.some((t) => t.key === 'dragging'));
all &= run('rushing -50ms', { shift: -0.05 }, (r) => r.summary.tips.some((t) => t.key === 'rushing'));
all &= run('wrong note #1', { edits: { wrong: 1 } }, (r) => r.notes[1].status === 'wrong' && r.notes.filter((n, i) => i !== 1).every((n) => n.status === 'ok'));
all &= run('missed note #8', { edits: { skip: 8 } }, (r) => r.notes[8].status === 'missed' && r.notes[9].status !== 'missed');
all &= run('extra note after #0', { edits: { extraAfter: 0 } }, (r) => r.extras.length === 1 && r.notes[1].status === 'ok');
all &= run('flat bend (75%)', { bendReach: 0.72 }, (r) => r.notes[4].status === 'technique' && r.summary.tips.some((t) => t.key === 'bendsFlat'));
all &= run('jitter ±20ms', { jitter: 0.02 }, (r) => r.notes.filter((n) => n.status === 'ok').length >= 10);
all &= run('with leaked clicks', {}, (r) => okAll(r) && r.extras.length === 0, { clicks: [0.2, 0.2 + spb, 0.2 + 2 * spb, 0.2 + 3 * spb, 1.0, 1.0 + spb, 1.0 + 2 * spb, 1.0 + 3 * spb, 1 + 4 * spb, 1 + 5 * spb], clickLevel: 0.15 });

// calibration
{
  const latency = 0.11, t0 = 0;
  const clickTimes = Array.from({ length: 8 }, (_, i) => 0.5 + i * 0.6);
  const notes = clickTimes.map((c) => ({ t: c + latency + (Math.random() * 2 - 1) * 0.01, d: 0.3, midi: 45 }));
  const samples = render(notes, 6, { clicks: clickTimes, clickLevel: 0.2 });
  const est = estimateLatency({ samples, sampleRate: SR, t0, clickTimes });
  const ok = est != null && Math.abs(est - latency) < 0.015;
  console.log(`${ok ? 'PASS' : 'FAIL'} calibration est=${est && est.toFixed(3)} true=${latency}`);
  all &= ok;
}
console.log(all ? 'ALL PASS' : 'SOME FAILED');
{
  const perf = perform(lick, {});
  const t0 = 0.2;
  const samples = render(perf.map((n) => ({ ...n, t: n.t - t0 })), 9);
  const res = analyzeTake({ samples, sampleRate: SR, t0, latency: 0, expected: expectedFrom(lick) });
  console.log('extras', res.extras.map((e) => `${e.time.toFixed(3)}:${e.midi}`), 'expected', expectedFrom(lick).map((e) => `${e.time.toFixed(3)}:${e.midi}`).join(' '));
}
// Stress: fast sixteenths at 120 bpm on low strings, distortion, noise
{
  const bpm2 = 120, spb2 = 60 / bpm2;
  const run = [[0,5],[0,8],[1,5],[1,7],[2,5],[2,7],[3,5],[3,7],[4,5],[4,8],[5,5],[5,8],[5,5],[4,8],[4,5],[3,7]];
  const exp = run.map(([st, fr], i) => ({ time: 1 + i * spb2 / 4, duration: spb2 / 4, midi: TUNING[st] + fr, technique: null }));
  for (const [label, dist, noise] of [['fast clean', 0, 0.0005], ['fast distorted', 4, 0.003]]) {
    const perf = exp.map((e) => ({ t: e.time - 0.2 + (Math.random() * 2 - 1) * 0.008, d: e.duration, midi: e.midi }));
    let samples = render(perf, 4, { noise });
    if (dist) samples = samples.map((v) => Math.tanh(v * dist) * 0.6);
    const res = analyzeTake({ samples, sampleRate: SR, t0: 0.2, latency: 0, expected: exp });
    const ok = res.notes.filter((n) => n.status === 'ok').length;
    console.log(`${ok >= 14 ? 'PASS' : 'FAIL'} ${label}: ${ok}/16 ok, extras ${res.extras.length}, score ${res.summary.score}`, res.notes.filter((n) => n.status !== 'ok').map((n) => `${n.index}:${n.status}${n.playedMidi != null ? '/' + n.playedMidi : ''}`).join(' '));
  }
}
