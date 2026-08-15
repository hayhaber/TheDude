import { CHORD_QUALITIES } from './chordQualities';

const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MIN_HZ = 80; // below the guitar's lowest open string with headroom
const MAX_HZ = 2000; // covers fretted range + a couple of harmonics, without high-frequency noise

// Turns one frame of frequency-domain data (AnalyserNode.getFloatFrequencyData,
// in dB) into a 12-bin chroma vector — the energy present at each pitch
// class (C, C#, D, ...) summed across all octaves. This is the standard
// building block real chord-ID tools (Chordino/NNLS-Chroma included) start
// from; what's NOT standard here is the matching step below, which is a
// simple template match rather than a trained model — there's no pretrained
// ML model available to this app, so this is a best-effort heuristic, not
// a Chordino-equivalent.
export function computeChroma(freqData, sampleRate, fftSize) {
  const chroma = new Float32Array(12);
  const binHz = sampleRate / fftSize;
  const minBin = Math.max(1, Math.floor(MIN_HZ / binHz));
  const maxBin = Math.min(freqData.length - 1, Math.ceil(MAX_HZ / binHz));

  for (let bin = minBin; bin <= maxBin; bin += 1) {
    const db = freqData[bin];
    if (!Number.isFinite(db) || db < -90) continue; // treat near-silence as noise, not signal
    const freq = bin * binHz;
    const midi = 69 + 12 * Math.log2(freq / 440);
    const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
    const magnitude = 10 ** (db / 20); // dB -> linear amplitude
    chroma[pitchClass] += magnitude;
  }

  const total = chroma.reduce((sum, v) => sum + v, 0);
  if (total > 0) for (let i = 0; i < 12; i += 1) chroma[i] /= total;
  return chroma;
}

// Scores every root/quality combo in CHORD_QUALITIES against a chroma
// vector — the AVERAGE energy per expected tone (not the raw sum) minus a
// penalty for energy that falls outside the chord's own tones — and returns
// the best match with a 0-1-ish confidence. Averaging by tone count matters:
// summing raw energy instead would let a "richer" chord that happens to
// contain a simpler chord's tones (e.g. Fmaj7 contains A/C/E, exactly an Am
// triad, plus F) tie with the correct simpler match whenever the extra tone
// (F) has ~zero measured energy — ties then get silently decided by
// iteration order rather than which chord actually fits. Dividing by tone
// count fixes that: a 4-tone chord needs real energy on all 4 tones to beat
// a 3-tone chord explaining the same signal, not just a coincidental
// superset. Returns null below MIN_CONFIDENCE rather than forcing a guess on
// silence/noise.
const MIN_CONFIDENCE = 0.18;

export function matchChordFromChroma(chroma) {
  let best = null;
  for (let root = 0; root < 12; root += 1) {
    for (const [key, quality] of Object.entries(CHORD_QUALITIES)) {
      const tones = new Set(quality.tones.map((t) => (root + t.semitones) % 12));
      let onTone = 0;
      let offTone = 0;
      for (let pc = 0; pc < 12; pc += 1) {
        if (tones.has(pc)) onTone += chroma[pc];
        else offTone += chroma[pc];
      }
      const confidence = onTone / tones.size - offTone * 0.5;
      if (!best || confidence > best.confidence) best = { root, key, confidence };
    }
  }
  if (!best || best.confidence < MIN_CONFIDENCE) return null;
  const quality = CHORD_QUALITIES[best.key];
  return {
    chord: PITCH_CLASS_NAMES[best.root] + (quality.aliases[0] || ''),
    confidence: Math.min(1, best.confidence),
  };
}
