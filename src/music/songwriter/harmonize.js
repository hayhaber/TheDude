// Chords for a sung melody (Songwriter, 2026-11-07). A hummed line has no
// chord in it — this SUGGESTS one per bar, the way Hookpad / Band-in-a-Box
// harmonise a melody: the chord whose tones cover the bar's strong notes
// (on the beats, held longest), from the song's key (estimated from the
// melody when the song has none), with a light preference for the usual
// functions (I IV V vi …), the tonic first and I / V last.
import { KEY_NAMES_FLAT, KEY_NAMES_SHARP, beatsPerBar, chordMidis, lineBeats, noteSyllables, sortNotes, usesFlats } from './song';
import { parseLine, setChordOnWord, syllables } from './lyrics';

// Krumhansl–Kessler key profiles.
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function corr(a, b) {
  const ma = a.reduce((x, y) => x + y, 0) / 12;
  const mb = b.reduce((x, y) => x + y, 0) / 12;
  let n = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < 12; i += 1) {
    n += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? n / Math.sqrt(da * db) : 0;
}

/** The most likely key of some notes ({p, d}) — { pc, minor }. */
export function estimateKey(notes) {
  const w = new Array(12).fill(0);
  for (const n of notes) w[((n.p % 12) + 12) % 12] += Math.max(0.1, n.d);
  // A short tune fits several keys almost equally: the tie goes to where it
  // ends / starts (the tonic, or the 5th for a half cadence) and to major.
  const sorted = [...notes].sort((a, b) => a.s - b.s);
  const lastPc = ((sorted[sorted.length - 1].p % 12) + 12) % 12;
  const firstPc = ((sorted[0].p % 12) + 12) % 12;
  let best = { pc: 0, minor: false, r: -2 };
  for (let pc = 0; pc < 12; pc += 1) {
    for (const minor of [false, true]) {
      const prof = minor ? MINOR : MAJOR;
      const rot = w.map((_, i) => w[(i + pc) % 12]);
      let r = corr(rot, prof);
      if (!minor) r += 0.04;
      if (lastPc === pc) r += 0.08;
      else if (lastPc === (pc + 7) % 12) r += 0.03;
      if (firstPc === pc) r += 0.03;
      if (r > best.r) best = { pc, minor, r };
    }
  }
  return { pc: best.pc, minor: best.minor };
}

/** Candidate chords of a key: its triads (+ the harmonic-minor V in minor), with a function weight. */
function candidates(key) {
  const names = usesFlats(key) ? KEY_NAMES_FLAT : KEY_NAMES_SHARP;
  const steps = key.minor ? [0, 2, 3, 5, 7, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const quals = key.minor ? ['m', 'dim', '', 'm', 'm', '', '', ''] : ['', 'm', 'm', '', '', 'm', 'dim'];
  const prior = key.minor ? [0.25, -0.25, 0.1, 0.2, 0.02, 0.2, 0.15, 0.12] : [0.25, 0.1, 0.03, 0.2, 0.2, 0.15, -0.25];
  return steps.map((s, i) => ({ symbol: names[(key.pc + s) % 12] + quals[i], degree: i, prior: prior[i], tonic: i === 0, dominant: s === 7 && quals[i] === '' }));
}

const pcsOf = (symbol) => new Set((chordMidis(symbol) ?? []).map((m) => m % 12));

/**
 * Per bar of the line: { bar, beat, options: [{symbol, score}] (best first, ≤ 3),
 * word (index of the word sung at the bar's start, or -1) }.
 */
export function suggestChords(line, { key = null, time = '4/4' } = {}) {
  const notes = sortNotes(line.melody?.notes ?? []);
  if (!notes.length) return { key: key ?? null, bars: [] };
  const k = key ?? estimateKey(notes);
  const bpb = beatsPerBar(time);
  const total = lineBeats(line, time);
  const nBars = Math.max(1, Math.ceil(total / bpb - 1e-6));
  const cands = candidates(k).map((c) => ({ ...c, pcs: pcsOf(c.symbol) }));
  const words = wordsAtBars(line, notes, bpb, nBars);
  const bars = [];
  for (let b = 0; b < nBars; b += 1) {
    const from = b * bpb;
    const to = from + bpb;
    // weight of each note inside the bar: length × where it starts
    const inBar = [];
    for (const n of notes) {
      const s = b === 0 ? Math.min(n.s, from) : n.s;
      const e = n.s + n.d;
      const lo = Math.max(s, from);
      const hi = Math.min(e, to);
      if (hi <= lo) continue;
      const onset = n.s >= from - 1e-6 && n.s < to;
      const pos = n.s - from;
      const strong = onset && Math.abs(pos - Math.round(pos)) < 0.05;
      const mult = onset ? (Math.abs(pos) < 0.05 ? 1.6 : strong ? 1.25 : 1) : 0.8;
      inBar.push({ pc: ((n.p % 12) + 12) % 12, w: (hi - lo) * mult, strong });
    }
    const W = inBar.reduce((x, y) => x + y.w, 0);
    if (!W) {
      bars.push({ bar: b, beat: from, options: bars.length ? bars[bars.length - 1].options : cands.slice(0, 3).map((c) => ({ symbol: c.symbol, score: 0 })), word: words[b] });
      continue;
    }
    const scored = cands.map((c) => {
      let fit = 0;
      for (const x of inBar) fit += c.pcs.has(x.pc) ? x.w : -x.w * (x.strong ? 0.6 : 0.15);
      let s = fit / W + c.prior * 0.5;
      if (b === 0 && c.tonic) s += 0.15;
      if (b === nBars - 1) s += c.tonic ? 0.15 : c.dominant ? 0.05 : 0;
      return { symbol: c.symbol, score: Math.round(s * 100) / 100 };
    });
    scored.sort((x, y) => y.score - x.score);
    // keep distinct symbols (minor V and v share a root)
    const seen = new Set();
    const options = scored.filter((x) => !seen.has(x.symbol) && seen.add(x.symbol)).slice(0, 3);
    bars.push({ bar: b, beat: from, options, word: words[b] });
  }
  return { key: k, bars };
}

/** The word sung at each bar's start (-1 = none / the same word as the bar before). */
function wordsAtBars(line, notes, bpb, nBars) {
  const { text } = parseLine(line.raw);
  const syl = syllables(text, line.syl);
  const ofNote = noteSyllables(notes, syl.length);
  const out = [];
  let prevWord = -1;
  for (let b = 0; b < nBars; b += 1) {
    const from = b * bpb;
    let ni = notes.findIndex((n) => n.s >= from - 0.25 && n.s < from + bpb);
    if (ni < 0) ni = notes.findIndex((n) => n.s < from && n.s + n.d > from);
    const si = ni >= 0 ? ofNote[ni] : -1;
    const wi = si >= 0 && syl[si] ? syl[si].word : -1;
    out.push(wi >= 0 && wi !== prevWord ? wi : -1);
    if (wi >= 0) prevWord = wi;
  }
  return out;
}

/** The line's raw text with ONLY the chosen chords, each over its bar's word. */
export function applyChords(line, bars, picks) {
  let raw = parseLine(line.raw).text;
  bars.forEach((b, i) => {
    const sym = picks[i];
    if (sym && b.word >= 0) raw = setChordOnWord(raw, b.word, sym);
  });
  return raw;
}

/** Chords as a timeline ({symbol, beat, until}) for playback. */
export function chordsTimeline(bars, picks, bpb) {
  return bars.map((b, i) => ({ symbol: picks[i], beat: b.beat, until: b.beat + bpb })).filter((c) => c.symbol);
}
