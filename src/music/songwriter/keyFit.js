// "Your key": which key a song should be sung in for THIS voice (v1.0.168).
// A teacher does it by moving the song until (1) its highest and lowest
// notes sit inside the singer's comfortable range with a little room, (2)
// the part of the range the melody lives in (its tessitura, time-weighted)
// sits on the voice's strongest area, and (3) long, held notes don't land
// right on the register break (passaggio). Pure.

import { comfortRange } from '../vocal/voiceRange';

const EASY_MAJOR = new Set([0, 7, 2, 9, 4]); // C G D A E — open-chord keys on guitar
const EASY_MINOR = new Set([9, 4, 2, 11]); // Am Em Dm Bm

/** All melody notes of a song: [{p, d}] (d in beats). */
export function songNotes(song) {
  const out = [];
  for (const sec of song.sections ?? []) for (const l of sec.lines ?? []) for (const n of l.melody?.notes ?? []) out.push({ p: n.p, d: n.d ?? 1 });
  return out;
}

/**
 * The voice's strongest area: the steadiest held notes inside the comfortable
 * range (weight 1 / (1 + wobble / 15), retried notes count half), else a bit
 * below the middle of the comfortable range (where most voices sing best).
 */
export function sweetSpot(range) {
  const c = comfortRange(range);
  const notes = (range.notes ?? []).filter((n) => n.midi >= c.low && n.midi <= c.high);
  if (notes.length >= 3) {
    let w = 0;
    let s = 0;
    for (const n of notes) {
      const k = (1 / (1 + (n.sd ?? 0) / 15)) * (n.retry ? 0.5 : 1);
      w += k;
      s += k * n.midi;
    }
    // Pull a little toward the lower middle, like the default.
    return 0.7 * (s / w) + 0.3 * (c.low + 0.45 * (c.high - c.low));
  }
  return c.low + 0.45 * (c.high - c.low);
}

/**
 * Every shift from −24 to +24 semitones (a melody written in another
 * octave — someone else's voice — moves by an octave too) scored for this voice (lower = better),
 * best first. Each: { shift, key, top, bottom, tess, fits, topRoom, over,
 * under, onBreak, score }.
 */
export function rankKeys(notes, range, key = null) {
  if (!notes.length || !range) return [];
  const c = comfortRange(range);
  const sweet = sweetSpot(range);
  const pas = Number.isFinite(range.passaggio) ? range.passaggio : null;
  const total = notes.reduce((a, n) => a + n.d, 0) || 1;
  const out = [];
  for (let s = -24; s <= 24; s += 1) {
    const ps = notes.map((n) => n.p + s);
    const top = Math.max(...ps);
    const bottom = Math.min(...ps);
    const tess = notes.reduce((a, n) => a + (n.p + s) * n.d, 0) / total;
    const over = Math.max(0, top - c.high);
    const under = Math.max(0, c.low - bottom);
    let score = over * 4 + under * 3 + Math.max(0, top - range.high) * 10 + Math.max(0, range.low - bottom) * 10;
    score += Math.abs(tess - sweet) * 1.2;
    // Room at the top: right on the comfortable edge is tiring for a whole song.
    if (!over && top === c.high) score += 0.6;
    let onBreak = 0;
    if (pas != null) for (const n of notes) if (n.d >= 1 && Math.abs(n.p + s - pas) <= 0.5) onBreak += 1;
    score += Math.min(3.6, onBreak * 1.2);
    const k = key ? { pc: (((key.pc + s) % 12) + 12) % 12, minor: !!key.minor } : null;
    if (k && (k.minor ? EASY_MINOR : EASY_MAJOR).has(k.pc)) score -= 0.4;
    score += Math.abs(s) * 0.03;
    out.push({ shift: s, key: k, top, bottom, tess, fits: !over && !under, topRoom: c.high - top, over, under, onBreak, score });
  }
  return out.sort((a, b) => a.score - b.score);
}
