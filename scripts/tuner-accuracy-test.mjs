// Tuner accuracy regression test: max error in cents, first estimate (McLeod) -> refined fundamental,
// for pure / harmonic / guitar / piano (inharmonic) / weak or missing fundamental tones.
// Run: npx esbuild scripts/tuner-accuracy-test.mjs --bundle --platform=node --format=esm --outfile=/tmp/ta.mjs && node /tmp/ta.mjs
import { refineFundamental } from '../src/music/pitchUtils.js';
import { PitchDetector } from 'pitchy';
const sr = 48000, N = 2048, det = PitchDetector.forFloat32Array(N);
const make = (f, kind) => { const b = new Float32Array(N); const B = kind === 'pianoHi' ? 0.002 : kind === 'guitar' ? 0.00008 : 0.0004;
  const amps = [1, 0.6, 0.45, 0.3, 0.25, 0.18, 0.12, 0.08, 0.06, 0.04];
  let parts = kind === 'sine' ? [[1, 1]] : kind === 'saw' ? Array.from({ length: 12 }, (_, k) => [k + 1, 1 / (k + 1)]) : amps.map((a, k) => [(k + 1) * Math.sqrt(1 + B * (k + 1) ** 2), a]);
  if (kind === 'noFund') parts = parts.slice(1); if (kind === 'weakFund') parts[0][1] = 0.08;
  const ph = parts.map(() => Math.random() * 6.28);
  for (let i = 0; i < N; i++) { let v = 0; parts.forEach(([m, a], j) => { if (f * m < sr / 2) v += a * Math.sin(2 * Math.PI * f * m * i / sr + ph[j]); }); b[i] = 0.2 * v + (Math.random() - 0.5) * 0.002; } return b; };
for (const kind of ['sine', 'saw', 'guitar', 'piano', 'pianoHi', 'weakFund', 'noFund']) {
  const row = [];
  for (const m of [36, 40, 45, 48, 52, 57, 60, 64, 69, 72, 76, 81, 84, 88]) {
    const f = 440 * 2 ** ((m - 69) / 12); const errs = [];
    for (let r = 0; r < 6; r++) { const b = make(f, kind); const [p0, c] = det.findPitch(b, sr); if (c < 0.9) { errs.push(NaN); continue; } const p1 = refineFundamental(b, sr, p0); errs.push([1200 * Math.log2(p0 / f), 1200 * Math.log2(p1 / f)]); }
    const ok = errs.filter((e) => Array.isArray(e)); const mx = (i) => ok.length ? Math.max(...ok.map((e) => Math.abs(e[i]))).toFixed(1) : 'na';
    row.push(`${m}:${mx(0)}→${mx(1)}`);
  }
  console.log(kind.padEnd(8), row.join(' '));
}
