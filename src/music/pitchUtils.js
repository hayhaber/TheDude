// Pure frequency <-> note-name math for the pitch-detection tuner. Inverse
// of chordPlayer.js's midiToFrequency (kept separate since that file is
// playback-focused and this one is analysis-focused, but the formula is the
// same equal-temperament relationship).
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function frequencyToMidi(frequency) {
  return 69 + 12 * Math.log2(frequency / 440);
}

// MIDI 60 = C4, matching the octave numbering STANDARD_TUNING's baseMidi
// values already use (E2 = 40, A4 = 69, ...).
export function midiToNoteName(midi) {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${SHARP_NAMES[pitchClass]}${octave}`;
}

// Given a detected frequency, returns the nearest note and how far off (in
// cents, +/-50) the actual pitch is from that note's exact frequency.
export function frequencyToNote(frequency) {
  const exactMidi = frequencyToMidi(frequency);
  const midi = Math.round(exactMidi);
  const centsOff = Math.round((exactMidi - midi) * 100);
  return { midi, name: midiToNoteName(midi), centsOff };
}

// ---- fundamental refinement (the tuner) -------------------------------------
// A piano string (and to a lesser degree a guitar string) is inharmonic: its
// upper partials sit a little SHARP of exact multiples of the fundamental.
// The McLeod period estimate is pulled up by them — a perfectly tuned piano
// note read ~+8 cents (synthetic B = 0.0004 tone). A tuner should read the
// FUNDAMENTAL. Complex demodulation at the first estimate f0: multiply the
// frame by e^(-i·2π·f0·t), average over exactly one period of f0 (a boxcar
// that nulls every harmonic of f0, and the 2·f0 image), and the phase of
// what's left turns at (f_true − f0): its slope, fitted over the frame,
// gives the fundamental's frequency directly. When the fundamental is too
// weak to read (a low note on a phone speaker), the first estimate stays.

/**
 * Frequency of the partial near `fc` (Hz) by complex demodulation over a
 * one-period boxcar of `base` Hz (nulls every other multiple of `base`).
 * Returns { f, amp } (amp = the partial's amplitude) or null.
 */
function partialNear(buffer, sampleRate, fc, base) {
  const n = buffer.length;
  const L = Math.round(sampleRate / base);
  if (L < 4 || L * 1.4 > n) return null;
  const w = (2 * Math.PI * fc) / sampleRate;
  const sI = new Float64Array(n + 1);
  const sQ = new Float64Array(n + 1);
  for (let k = 0; k < n; k++) {
    const x = buffer[k];
    sI[k + 1] = sI[k] + x * Math.cos(w * k);
    sQ[k + 1] = sQ[k] - x * Math.sin(w * k);
  }
  const step = Math.max(1, Math.floor((n - L) / 256));
  let prev = null;
  let unwrap = 0;
  let sw = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  let count = 0;
  for (let k = L; k <= n; k += step) {
    const zi = (sI[k] - sI[k - L]) / L;
    const zq = (sQ[k] - sQ[k - L]) / L;
    const a = Math.hypot(zi, zq);
    let ph = Math.atan2(zq, zi);
    if (prev != null) {
      const d = ph - prev;
      if (d > Math.PI) unwrap -= 2 * Math.PI;
      else if (d < -Math.PI) unwrap += 2 * Math.PI;
    }
    prev = ph;
    ph += unwrap;
    sw += a;
    sx += a * k;
    sy += a * ph;
    sxx += a * k * k;
    sxy += a * k * ph;
    count += 1;
  }
  if (count < 8 || sw <= 0) return null;
  const denom = sw * sxx - sx * sx;
  if (Math.abs(denom) < 1e-12) return null;
  const slope = (sw * sxy - sx * sy) / denom;
  return { f: fc + (slope * sampleRate) / (2 * Math.PI), amp: (2 * sw) / count };
}

/**
 * The fundamental near a first estimate `f0` (Hz), or `f0` itself when it
 * can't be read reliably. Pure function of the frame.
 *  1) The fundamental partial itself, when it is strong enough.
 *  2) Otherwise (a low note on a phone speaker: little or no fundamental)
 *     from partials 2 and 3: a stiff string's partials follow
 *     f_k = k·f1·√(1 + B·k²), so their ratio gives B and then f1.
 */
export function refineFundamental(buffer, sampleRate, f0) {
  const n = buffer.length;
  if (!(f0 > 0)) return f0;
  let energy = 0;
  for (let k = 0; k < n; k++) energy += buffer[k] * buffer[k];
  const rms = Math.sqrt(energy / n);
  if (rms < 1e-5) return f0;
  const near = (f) => {
    const c = 1200 * Math.log2(f / f0);
    return Number.isFinite(c) && Math.abs(c) <= 30;
  };
  const p1 = partialNear(buffer, sampleRate, f0, f0);
  if (p1 && p1.amp >= 0.35 * rms && near(p1.f)) return p1.f;
  const p2 = partialNear(buffer, sampleRate, 2 * f0, f0);
  const p3 = partialNear(buffer, sampleRate, 3 * f0, f0);
  if (!p2 || !p3 || p2.amp < 0.2 * rms || p3.amp < 0.1 * rms) return f0;
  const r2 = (p3.f / (1.5 * p2.f)) ** 2;
  const B = (r2 - 1) / (9 - 4 * r2);
  if (!(B > -0.0002 && B < 0.02)) return f0;
  const f1 = p2.f / (2 * Math.sqrt(1 + 4 * Math.max(0, B)));
  return near(f1) ? f1 : f0;
}
