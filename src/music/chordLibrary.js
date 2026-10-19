// Chord Library (Guitar -> Chords, 2026-10-19): every chord type in every
// key, its playable voicings across the neck, inversions and slash chords,
// in any tuning. Pure — no React, no audio.
//
// Voicings are FOUND, not authored: for each 4-fret window of the neck every
// string may be muted, open, or fretted on a chord tone inside the window;
// a combination counts when it has the right bass note, every required tone,
// few enough fingers (see fingerChord) and at most one muted string inside
// it. Each voicing gets a difficulty score; the library shows the best,
// varied ones in neck order. So all 12 roots x every type exist — the gap
// users complain about in hand-made chord books (e.g. no Dmaj7, no Ab).

import { spellTone } from './spelling';
import { LETTERS, NATURAL_PITCH_CLASS, mod } from './notes';
import { enumeratePositions } from './voicings';

// ---- roots ---------------------------------------------------------------
// The usual spelling per key (flats for Eb/Ab/Bb, sharps for C#/F#),
// the other name shown beside it.
export const ROOTS = [
  { pc: 0, name: 'C' },
  { pc: 1, name: 'C♯', alt: 'D♭' },
  { pc: 2, name: 'D' },
  { pc: 3, name: 'E♭', alt: 'D♯' },
  { pc: 4, name: 'E' },
  { pc: 5, name: 'F' },
  { pc: 6, name: 'F♯', alt: 'G♭' },
  { pc: 7, name: 'G' },
  { pc: 8, name: 'A♭', alt: 'G♯' },
  { pc: 9, name: 'A' },
  { pc: 10, name: 'B♭', alt: 'A♯' },
  { pc: 11, name: 'B' },
];

const ASCII = (s) => s.replace(/♯/g, '#').replace(/♭/g, 'b');

function rootLetter(name) {
  return name[0];
}

// ---- chord types ---------------------------------------------------------
// tones: [degree, semitones, role, optional?]. role = the Fretboard's colour
// role (root/third/fifth/seventh/extension). `opt` tones may be left out of
// a voicing (the 5th of a 7th chord, the 9th of an 11th…), the rest must
// sound. `base` = the CHORD_QUALITIES key Compose / One-Minute Changes
// understand (null = library only).
const T = (degree, semitones, role, opt = false) => ({ degree, semitones, role, opt });
const R = T(1, 0, 'root');
const M3 = T(3, 4, 'third');
const m3 = T(3, 3, 'third');
const P5 = T(5, 7, 'fifth');
const P5o = T(5, 7, 'fifth', true);

export const CHORD_TYPES = [
  { key: 'major', sym: '', group: 'triad', base: 'major', tones: [R, M3, P5] },
  { key: 'minor', sym: 'm', group: 'triad', base: 'minor', tones: [R, m3, P5] },
  { key: 'power', sym: '5', group: 'triad', base: null, tones: [R, P5], power: true },
  { key: 'sus2', sym: 'sus2', group: 'triad', base: 'sus2', tones: [R, T(2, 2, 'third'), P5] },
  { key: 'sus4', sym: 'sus4', group: 'triad', base: 'sus4', tones: [R, T(4, 5, 'third'), P5] },
  { key: 'dim', sym: 'dim', group: 'triad', base: 'dim', tones: [R, m3, T(5, 6, 'fifth')] },
  { key: 'aug', sym: 'aug', group: 'triad', base: 'aug', tones: [R, M3, T(5, 8, 'fifth')] },
  { key: 'add9', sym: 'add9', group: 'added', base: 'add9', tones: [R, M3, P5o, T(9, 14, 'extension')] },
  { key: 'madd9', sym: 'm(add9)', group: 'added', base: null, tones: [R, m3, P5o, T(9, 14, 'extension')] },
  { key: 'six', sym: '6', group: 'added', base: null, tones: [R, M3, P5o, T(6, 9, 'extension')] },
  { key: 'm6', sym: 'm6', group: 'added', base: null, tones: [R, m3, P5o, T(6, 9, 'extension')] },
  { key: 'six9', sym: '6/9', group: 'added', base: null, tones: [R, M3, P5o, T(6, 9, 'extension'), T(9, 14, 'extension')] },
  { key: 'dom7', sym: '7', group: 'seventh', base: 'dominant7', tones: [R, M3, P5o, T(7, 10, 'seventh')] },
  { key: 'maj7', sym: 'maj7', group: 'seventh', base: 'major7', tones: [R, M3, P5o, T(7, 11, 'seventh')] },
  { key: 'm7', sym: 'm7', group: 'seventh', base: 'minor7', tones: [R, m3, P5o, T(7, 10, 'seventh')] },
  { key: 'mMaj7', sym: 'm(maj7)', group: 'seventh', base: null, tones: [R, m3, P5o, T(7, 11, 'seventh')] },
  { key: 'm7b5', sym: 'm7♭5', group: 'seventh', base: null, tones: [R, m3, T(5, 6, 'fifth'), T(7, 10, 'seventh')] },
  { key: 'dim7', sym: 'dim7', group: 'seventh', base: 'dim7', tones: [R, m3, T(5, 6, 'fifth'), T(7, 9, 'seventh')] },
  { key: 'sus7', sym: '7sus4', group: 'seventh', base: null, tones: [R, T(4, 5, 'third'), P5o, T(7, 10, 'seventh')] },
  { key: 'aug7', sym: '7♯5', group: 'seventh', base: null, tones: [R, M3, T(5, 8, 'fifth'), T(7, 10, 'seventh')] },
  { key: 'dom7b5', sym: '7♭5', group: 'seventh', base: null, tones: [R, M3, T(5, 6, 'fifth'), T(7, 10, 'seventh')] },
  { key: 'dom9', sym: '9', group: 'extended', base: null, tones: [R, M3, P5o, T(7, 10, 'seventh'), T(9, 14, 'extension')] },
  { key: 'maj9', sym: 'maj9', group: 'extended', base: null, tones: [R, M3, P5o, T(7, 11, 'seventh'), T(9, 14, 'extension')] },
  { key: 'm9', sym: 'm9', group: 'extended', base: null, tones: [R, m3, P5o, T(7, 10, 'seventh'), T(9, 14, 'extension')] },
  { key: 'dom7b9', sym: '7♭9', group: 'extended', base: null, tones: [R, M3, P5o, T(7, 10, 'seventh'), T(9, 13, 'extension')] },
  { key: 'dom7s9', sym: '7♯9', group: 'extended', base: null, tones: [R, M3, P5o, T(7, 10, 'seventh'), T(9, 15, 'extension')] },
  { key: 'dom11', sym: '11', group: 'extended', base: null, tones: [R, T(3, 4, 'third', true), P5o, T(7, 10, 'seventh'), T(9, 14, 'extension', true), T(11, 17, 'extension')] },
  { key: 'm11', sym: 'm11', group: 'extended', base: null, tones: [R, m3, P5o, T(7, 10, 'seventh'), T(9, 14, 'extension', true), T(11, 17, 'extension')] },
  { key: 'dom13', sym: '13', group: 'extended', base: null, tones: [R, M3, P5o, T(7, 10, 'seventh'), T(9, 14, 'extension', true), T(13, 21, 'extension')] },
];

export const TYPE_GROUPS = ['triad', 'added', 'seventh', 'extended'];
export const typeByKey = (key) => CHORD_TYPES.find((c) => c.key === key) ?? CHORD_TYPES[0];

/** Interval name of a tone, for the "Intervals" label mode and the formula. */
export function intervalName(tone) {
  if (tone.degree === 1) return 'R';
  const major = { 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 9: 14, 11: 17, 13: 21 }[tone.degree];
  const d = tone.semitones - major;
  const acc = d === 0 ? '' : d === -1 ? '♭' : d === 1 ? '♯' : d === -2 ? '♭♭' : '';
  // a minor/diminished third or seventh is "♭3"/"♭7" (degree 4 and 5 use ♯/♭ too)
  return acc + tone.degree;
}

// Theory spelling, except where it would print a double accidental or
// Cb/Fb/E#/B# — chord books write the plain enharmonic name (E, not Fb).
const PLAIN_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const PLAIN_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
function plainName(label, pc) {
  const pretty = label.replace(/##/g, '𝄪').replace(/#/g, '♯').replace(/bb/g, '𝄫').replace(/(?<=[A-G])b/g, '♭');
  if (/𝄪|𝄫/.test(pretty) || /^(C♭|F♭|E♯|B♯)$/.test(pretty)) return /♭|𝄫/.test(pretty) ? PLAIN_FLAT[pc] : PLAIN_SHARP[pc];
  return pretty;
}

/** The chord's notes, spelled (A C♯ E), with their interval and role. */
export function chordTones(rootPc, typeKey) {
  const root = ROOTS[rootPc];
  const letter = rootLetter(root.name);
  return typeByKey(typeKey).tones.map((tone) => {
    const sp = spellTone(letter, rootPc, tone.degree, tone.semitones);
    return { ...tone, pc: mod(rootPc + tone.semitones, 12), name: plainName(sp.label, mod(rootPc + tone.semitones, 12)), interval: intervalName(tone) };
  });
}

/** A note name for any pitch class in this key's spelling (for a slash bass). */
export function bassName(rootPc, typeKey, pc) {
  const own = chordTones(rootPc, typeKey).find((t) => t.pc === pc);
  if (own) return own.name;
  const flats = [3, 5, 8, 10].includes(rootPc) || /m/.test(typeByKey(typeKey).sym) ? true : false;
  return ['C', flats ? 'D♭' : 'C♯', 'D', flats ? 'E♭' : 'D♯', 'E', 'F', flats ? 'G♭' : 'F♯', 'G', flats ? 'A♭' : 'G♯', 'A', flats ? 'B♭' : 'A♯', 'B'][pc];
}

export function chordName(rootPc, typeKey, bassPc = null) {
  const name = ROOTS[rootPc].name + typeByKey(typeKey).sym;
  return bassPc == null || bassPc === rootPc ? name : `${name}/${bassName(rootPc, typeKey, bassPc)}`;
}

/**
 * The chord as the rest of the app writes it (Compose / One-Minute Changes),
 * or null when the type isn't one they know. ASCII accidentals.
 */
export function appSymbol(rootPc, typeKey, bassPc = null) {
  const type = typeByKey(typeKey);
  if (!type.base) return null;
  const alias = { major: '', minor: 'm', dominant7: '7', major7: 'maj7', minor7: 'm7', sus2: 'sus2', sus4: 'sus4', dim: 'dim', dim7: 'dim7', aug: 'aug', add9: 'add9' }[type.base];
  const s = ASCII(ROOTS[rootPc].name) + alias;
  return bassPc == null || bassPc === rootPc ? s : `${s}/${ASCII(bassName(rootPc, typeKey, bassPc))}`;
}

// ---- voicing search ------------------------------------------------------

const WINDOW = 4; // frets under one hand (index .. pinky)
const TOP_START = 14; // highest window start

/**
 * Fingers for a voicing, the way chord books print them: no barre unless the
 * notes need more than 4 fingers; then the index barres the lowest fret (no
 * open string may sit under it) and, if still needed, one more finger barres
 * 2+ neighbouring notes on one fret. Others go 2, 3, 4 by fret, then from
 * the bass string up. Returns { fingers[6] (null muted / 0 open / 1-4),
 * barre: {fret, from, to} | null, count } or null when unplayable.
 */
export function fingerChord(frets) {
  const notes = frets.map((f, s) => (f > 0 ? { s, f } : null)).filter(Boolean);
  const fingers = frets.map((f) => (f == null ? null : f === 0 ? 0 : undefined));
  if (!notes.length) return { fingers, barre: null, count: 0 };
  const order = (a, b) => a.f - b.f || a.s - b.s;
  if (notes.length <= 4) {
    notes.sort(order).forEach((n, i) => (fingers[n.s] = i + 1));
    return { fingers, barre: null, count: notes.length };
  }
  const min = Math.min(...notes.map((n) => n.f));
  const atMin = notes.filter((n) => n.f === min);
  const from = Math.min(...atMin.map((n) => n.s));
  const to = Math.max(...atMin.map((n) => n.s));
  // the index lies flat from `from` to `to`: nothing open under it, nothing
  // lower than the barre on those strings (can't be, min is min)
  for (let s = from; s <= to; s++) if (frets[s] === 0) return null;
  atMin.forEach((n) => (fingers[n.s] = 1));
  let rest = notes.filter((n) => n.f !== min).sort(order);
  let next = 2;
  if (rest.length > 3) {
    // a second, partial barre: the biggest run of neighbouring notes on one fret
    let best = null;
    for (const n of rest) {
      const run = rest.filter((m) => m.f === n.f);
      const lo = Math.min(...run.map((m) => m.s));
      const hi = Math.max(...run.map((m) => m.s));
      const between = frets.slice(lo, hi + 1);
      if (run.length >= 2 && between.every((f) => f == null || f >= n.f) && (!best || run.length > best.length)) best = run;
    }
    if (!best || rest.length - best.length + 1 > 3) return null;
    // fingers in fret order, the run sharing one
    const groups = [];
    for (const n of rest) {
      if (best.includes(n)) {
        if (!groups.includes(best)) groups.push(best);
      } else groups.push([n]);
    }
    groups.forEach((g) => g.forEach((n) => (fingers[n.s] = next)) || next++);
    rest = [];
  }
  rest.forEach((n) => (fingers[n.s] = next++));
  if (next > 5) return null;
  return { fingers, barre: atMin.length > 1 ? { fret: min, from, to } : null, count: next - 1 };
}

function scoreVoicing(v, type) {
  const fretted = v.frets.filter((f) => f > 0);
  const lo = fretted.length ? Math.min(...fretted) : 0;
  const hi = fretted.length ? Math.max(...fretted) : 0;
  const sounding = v.frets.filter((f) => f != null).length;
  const opens = v.frets.filter((f) => f === 0).length;
  let s = 0;
  s += v.fing.count * 0.9;
  s += v.fing.barre ? 1.2 : 0;
  s += Math.max(0, hi - lo) * 1.1;
  s += lo * 0.2;
  // open strings help low down; far below fretted notes they're an odd stretch of sound
  s += lo <= 3 ? -opens * 0.5 : opens * (lo >= 5 ? 1.2 : 0.4);
  s += v.inner * 2.5;
  const want = type.power ? 2 : 5;
  s += Math.max(0, want - sounding) * 1.1;
  s += v.missingOpt * 0.6;
  if (type.power && sounding > 3) s += 2; // power chords are 2-3 strings
  return s;
}

/**
 * Every playable voicing of a chord, best first.
 *  tuning: open-string MIDI numbers, low -> high (6 strings).
 *  bassPc: the lowest note (default the root; another chord tone = an
 *  inversion; any other note = a slash chord, added under the chord).
 */
export function findVoicings(rootPc, typeKey, { tuning = [40, 45, 50, 55, 59, 64], bassPc = null } = {}) {
  const type = typeByKey(typeKey);
  const tones = type.tones.map((t) => ({ ...t, pc: mod(rootPc + t.semitones, 12) }));
  const bass = bassPc ?? rootPc;
  const slash = !tones.some((t) => t.pc === bass);
  const pcs = new Set([...tones.map((t) => t.pc), bass]);
  const required = tones.filter((t) => !t.opt).map((t) => t.pc);
  const optional = tones.filter((t) => t.opt).map((t) => t.pc);
  const strings = tuning.length;
  // inversions and slash chords need the bass AND the chord above it
  const minStrings = type.power ? 2 : tones.length >= 4 || bass !== rootPc ? 4 : 3;
  const out = new Map();
  // The app's own chord-book shapes (open + CAGED barre forms) rank first:
  // they are what teachers show, so they must never be crowded out.
  const STANDARD = [40, 45, 50, 55, 59, 64];
  const known = new Set();
  if (type.base && bass === rootPc && tuning.every((m, i) => m === STANDARD[i])) {
    try {
      for (const p of enumeratePositions(rootPc, type.base)) known.add(p.strings.map((x) => (x.fret == null ? 'x' : x.fret)).join('-'));
    } catch {
      /* no templates for this type */
    }
  }

  for (let start = 1; start <= TOP_START; start++) {
    const choices = tuning.map((open) => {
      const opts = [null];
      if (pcs.has(mod(open, 12))) opts.push(0);
      for (let f = start; f < start + WINDOW; f++) if (pcs.has(mod(open + f, 12))) opts.push(f);
      return opts;
    });
    const frets = new Array(strings);
    const walk = (s) => {
      if (s === strings) return consider();
      for (const f of choices[s]) {
        frets[s] = f;
        walk(s + 1);
      }
      return undefined;
    };
    const consider = () => {
      const play = frets.map((f, s) => (f == null ? null : { s, midi: tuning[s] + f }));
      const sounding = play.filter(Boolean);
      if (sounding.length < minStrings) return;
      if (mod(sounding[0].midi, 12) !== bass) return;
      // a slash bass is under the chord only, never repeated above it
      if (slash && sounding.slice(1).some((n) => mod(n.midi, 12) === bass)) return;
      const have = new Set(sounding.map((n) => mod(n.midi, 12)));
      if (!required.every((pc) => have.has(pc))) return;
      const first = sounding[0].s;
      const last = sounding[sounding.length - 1].s;
      let inner = 0;
      for (let k = first; k <= last; k++) if (frets[k] == null) inner++;
      if (inner > 1) return;
      const fretted = frets.filter((f) => f > 0);
      if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 3) return;
      const fing = fingerChord([...frets]);
      if (!fing) return;
      const key = frets.map((f) => (f == null ? 'x' : f)).join('-');
      if (out.has(key)) return;
      const v = { frets: [...frets], fing, inner, missingOpt: optional.filter((pc) => !have.has(pc)).length };
      v.score = scoreVoicing(v, type) - (known.has(key) ? 4 : 0);
      v.standard = known.has(key);
      out.set(key, v);
    };
    walk(0);
  }
  return [...out.values()].sort((a, b) => a.score - b.score);
}

/** Lowest fretted fret (the "N fr" label of a diagram); 0 = open position. */
export function voicingPosition(frets) {
  const fretted = frets.filter((f) => f > 0);
  if (!fretted.length) return 0;
  const max = Math.max(...fretted);
  return max <= 4 ? 0 : Math.min(...fretted);
}

/**
 * The voicings to show: best first, then varied — a voicing that is just a
 * better one minus some strings is dropped, and no more than 2 per neck
 * area — returned in neck order (open first), the easiest flagged.
 */
export function libraryVoicings(rootPc, typeKey, opts = {}, limit = 8) {
  const all = findVoicings(rootPc, typeKey, opts);
  const picked = [];
  const perArea = new Map();
  for (const v of all) {
    if (picked.length >= limit) break;
    const sub = picked.some((p) => v.frets.every((f, s) => f == null || f === p.frets[s]));
    if (sub) continue;
    const area = Math.floor(voicingPosition(v.frets) / 3);
    if (!v.standard && (perArea.get(area) ?? 0) >= (area === 0 ? 3 : 2)) continue;
    perArea.set(area, (perArea.get(area) ?? 0) + 1);
    picked.push(v);
  }
  if (picked.length) picked[0].easiest = true;
  return picked.sort((a, b) => voicingPosition(a.frets) - voicingPosition(b.frets) || a.score - b.score);
}

/** A voicing as the Fretboard's `position` (low E first). */
export function toPosition(rootPc, typeKey, frets, tuning, labels = 'note', bassPc = null) {
  const tones = chordTones(rootPc, typeKey);
  return {
    baseFret: voicingPosition(frets),
    shapeName: 'Library',
    strings: frets.map((f, s) => {
      if (f == null) return { fret: null };
      const pc = mod(tuning[s] + f, 12);
      const tone = tones.find((t) => t.pc === pc);
      if (!tone) return { fret: f, role: 'bass', label: bassName(rootPc, typeKey, pc) };
      const isBass = bassPc != null && bassPc !== rootPc && s === frets.findIndex((x) => x != null);
      return { fret: f, role: isBass ? 'bass' : tone.role, label: labels === 'interval' ? tone.interval : tone.name };
    }),
  };
}

export { LETTERS, NATURAL_PITCH_CLASS };
