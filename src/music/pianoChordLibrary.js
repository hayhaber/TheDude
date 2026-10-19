// Piano Chord Library (Piano -> Chords, 2026-10-19). Pure — no React/audio.
// Same chord types / names / spelling as the guitar library
// (chordLibrary.js); what is different on a keyboard is HOW a chord is laid
// out: which inversion, close or spread, one hand or two, and with which
// fingers. Voicings here are built from those rules (they are standard
// keyboard practice), not searched like guitar shapes.

import { CHORD_TYPES, chordTones, typeByKey, ROOTS } from './chordLibrary';

function spellNinth(rootPc) {
  return chordTones(rootPc, 'add9').find((t) => t.degree === 9).name;
}
import { mod } from './notes';

// Voicing styles. `needs7` = only for chords with a 7th (shell / rootless are
// jazz voicings of 7th chords).
export const PIANO_VOICINGS = [
  { key: 'close', needs7: false }, // one hand, notes stacked as close as possible
  { key: 'twoHands', needs7: false }, // LH root (+5th), RH the chord
  { key: 'open', needs7: false }, // drop-2 spread (4+ notes), two hands
  { key: 'shell', needs7: true }, // LH root, RH 3rd + 7th (guide tones)
  { key: 'rootless', needs7: true, rootless: true }, // LH 3-5-7-9 / 7-9-3-5, no root
];

export const hasSeventh = (typeKey) => typeByKey(typeKey).tones.some((t) => t.role === 'seventh');
// Rootless (Bill Evans) forms are for chords with a real 3rd + 7th, not the diminished family.
const ROOTLESS_OK = (typeKey) => hasSeventh(typeKey) && !['m7b5', 'dim7', 'sus7'].includes(typeKey);
export const voicingsFor = (typeKey) => PIANO_VOICINGS.filter((v) => (!v.needs7 || hasSeventh(typeKey)) && (!v.rootless || ROOTLESS_OK(typeKey)));

// Where the right hand / left hand sit (lowest note of the hand lands in
// this window): RH around middle C, LH an octave+ below.
const RH_LOW = 55; // G3
const LH_LOW = 40; // E2

function placeAbove(pcs, lowMin) {
  // stack pitch classes upward, the first one at or above lowMin
  const out = [];
  let prev = null;
  for (const pc of pcs) {
    let m = prev == null ? lowMin + mod(pc - lowMin, 12) : prev + mod(pc - prev, 12) || prev + 12;
    if (prev != null && m <= prev) m += 12;
    out.push(m);
    prev = m;
  }
  return out;
}

/** Close position: `bassTone` lowest, the rest packed into the octave above it. */
function packed(tones, bassTone) {
  const rest = tones.filter((t) => t !== bassTone).sort((a, b) => mod(a.pc - bassTone.pc, 12) - mod(b.pc - bassTone.pc, 12));
  return [bassTone, ...rest];
}

/** The chord's tones in stacking order (root, 3rd, 5th, 7th, 9th…) with pc. */
function stack(rootPc, typeKey, { dropFifthOver = 4 } = {}) {
  let tones = chordTones(rootPc, typeKey);
  // more than `dropFifthOver` notes in one hand: a plain perfect 5th goes
  // first (the least colour), as pianists do
  if (tones.length > dropFifthOver) tones = tones.filter((t) => !(t.role === 'fifth' && t.opt));
  if (tones.length > dropFifthOver) tones = tones.filter((t) => !(t.opt && t.role === 'extension'));
  return tones;
}

/** Inversions this voicing can show: 0 = root position .. n-1. */
export function inversionCount(typeKey, voicing) {
  if (voicing === 'shell' || voicing === 'rootless') return 2;
  const n = stack(0, typeKey).length;
  if (typeByKey(typeKey).power) return 2;
  return Math.min(voicing === 'twoHands' ? n - 1 : n, 4);
}

// Standard keyboard fingering (1 = thumb … 5 = little finger).
function rhFingers(n, inversion) {
  if (n === 1) return [1];
  if (n === 2) return [1, 5];
  if (n === 3) return inversion === 1 ? [1, 2, 5] : [1, 3, 5];
  if (n === 4) return [1, 2, 3, 5];
  return [1, 2, 3, 4, 5].slice(0, n);
}
function lhFingers(n, inversion) {
  // low -> high
  if (n === 1) return [5];
  if (n === 2) return [5, 1];
  if (n === 3) return inversion === 2 ? [5, 2, 1] : [5, 3, 1];
  if (n === 4) return [5, 3, 2, 1];
  return [5, 4, 3, 2, 1].slice(0, n);
}

/**
 * One voicing as keys: [{ midi, pc, role, name, interval, hand: 'left'|'right', finger }]
 * low -> high, plus the slash bass (left hand) when bassPc isn't a chord tone
 * or an inversion is asked through bassPc.
 */
export function pianoVoicing(rootPc, typeKey, { voicing = 'close', inversion = 0, bassPc = null } = {}) {
  const type = typeByKey(typeKey);
  const all = chordTones(rootPc, typeKey);
  const keys = [];
  const add = (midis, tones, hand, fingers) =>
    midis.forEach((midi, i) => keys.push({ midi, pc: mod(midi, 12), role: tones[i].role, name: tones[i].name, interval: tones[i].interval, hand, finger: fingers[i] }));
  const slash = bassPc != null && !all.some((t) => t.pc === bassPc) ? bassPc : null;
  // A chord tone asked as the bass = that inversion (close / two hands)
  if (bassPc != null && slash == null && bassPc !== rootPc) {
    const idx = stack(rootPc, typeKey).findIndex((t) => t.pc === bassPc);
    if (idx > 0) inversion = idx;
  }

  if (voicing === 'shell' || voicing === 'rootless') {
    const third = all.find((t) => t.role === 'third');
    const fifth = all.find((t) => t.role === 'fifth');
    const seventh = all.find((t) => t.role === 'seventh');
    const ext = all.filter((t) => t.role === 'extension');
    const ninth = ext.find((t) => t.degree === 9) ?? null;
    if (voicing === 'shell') {
      const root = all[0];
      const top = ext.length ? ext[ext.length - 1] : null;
      const guide = inversion === 0 ? [third, seventh] : [seventh, third];
      const rh = top ? [...guide, top] : guide;
      add([LH_LOW + mod(rootPc - LH_LOW, 12)], [root], 'left', [5]);
      add(placeAbove(rh.map((t) => t.pc), RH_LOW), rh, 'right', rhFingers(rh.length, 0));
    } else {
      // Bill Evans A / B forms: 3-5-7-9 and 7-9-3-5 (13 in place of the 5th
      // on a 13th chord). Every rootless voicing has a 9th — the chord's own,
      // else the natural 9th, as jazz players add it.
      const ninthTone = ninth ?? { degree: 9, semitones: 14, role: 'extension', pc: mod(rootPc + 14, 12), name: spellNinth(rootPc), interval: '9' };
      const thirteenth = ext.find((t) => t.degree === 13);
      const five = thirteenth ?? fifth;
      const form = inversion === 0 ? [third, five, seventh, ninthTone] : [seventh, ninthTone, third, five];
      const voiced = packed(form, form[0]);
      add(placeAbove(voiced.map((t) => t.pc), 48), voiced, 'left', lhFingers(voiced.length, 0));
    }
    return finish(keys, rootPc, typeKey, slash);
  }

  const st = type.power ? all : stack(rootPc, typeKey, { dropFifthOver: voicing === 'close' ? 4 : 5 });
  if (voicing === 'close') {
    const order = packed(st, st[Math.min(inversion, st.length - 1)]);
    const midis = placeAbove(order.map((t) => t.pc), RH_LOW - 2);
    add(midis, order, 'right', rhFingers(order.length, inversion));
  } else if (voicing === 'twoHands') {
    const root = st[0];
    const fifth = st.find((t) => t.role === 'fifth' && t.semitones === 7);
    const lh = fifth && st.length >= 3 ? [root, fifth] : [root];
    const lhMidis = placeAbove(lh.map((t) => t.pc), LH_LOW);
    add(lhMidis, lh, 'left', lhFingers(lh.length, 0));
    // the right hand: the whole triad; on bigger chords the colour notes only
    // (root and plain 5th are already in the left hand)
    let rh = st.length >= 4 ? st.filter((t) => t !== st[0] && (t !== fifth || !fifth.opt)) : st;
    if (rh.length < 3) rh = st.filter((t) => t !== st[0]);
    rh = packed(rh, rh[Math.min(inversion, rh.length - 1)]);
    add(placeAbove(rh.map((t) => t.pc), Math.max(RH_LOW, lhMidis[lhMidis.length - 1] + 1)), rh, 'right', rhFingers(rh.length, inversion));
  } else if (voicing === 'open') {
    // drop 2: the close voicing with its 2nd-highest note an octave lower
    const order = packed(st, st[Math.min(inversion, st.length - 1)]);
    const close = placeAbove(order.map((t) => t.pc), RH_LOW);
    if (close.length >= 3) {
      const i = close.length - 2;
      close[i] -= 12;
    }
    const pairs = close.map((m, i) => ({ m, t: order[i] })).sort((a, b) => a.m - b.m);
    const lh = pairs.slice(0, Math.ceil(pairs.length / 2));
    const rh = pairs.slice(lh.length);
    add(lh.map((p) => p.m), lh.map((p) => p.t), 'left', lhFingers(lh.length, 0));
    add(rh.map((p) => p.m), rh.map((p) => p.t), 'right', rhFingers(rh.length, 0));
  }
  return finish(keys, rootPc, typeKey, slash);
}

function finish(keys, rootPc, typeKey, slash) {
  if (slash != null) {
    const low = Math.min(...keys.map((k) => k.midi));
    let m = LH_LOW + mod(slash - LH_LOW, 12);
    while (m >= low) m -= 12;
    const flats = [3, 5, 8, 10].includes(rootPc);
    const name = ['C', flats ? 'D♭' : 'C♯', 'D', flats ? 'E♭' : 'D♯', 'E', 'F', flats ? 'G♭' : 'F♯', 'G', flats ? 'A♭' : 'G♯', 'A', flats ? 'B♭' : 'A♯', 'B'][slash];
    keys.unshift({ midi: m, pc: slash, role: 'bass', name, interval: 'bass', hand: 'left', finger: 5 });
  }
  return keys.sort((a, b) => a.midi - b.midi);
}

/**
 * Name what is being played (any of the 29 types, slash chords too):
 * { rootPc, typeKey, bassPc } or null. Every required tone must sound and
 * nothing outside the chord (a slash bass may be outside).
 */
export function identifyPianoChord(midis) {
  if (!midis || midis.length < 2) return null;
  const pcs = new Set(midis.map((m) => mod(m, 12)));
  const bass = mod(Math.min(...midis), 12);
  let best = null;
  for (let r = 0; r < 12; r++) {
    for (const type of CHORD_TYPES) {
      const tones = type.tones.map((t) => ({ pc: mod(r + t.semitones, 12), opt: t.opt }));
      const set = new Set(tones.map((t) => t.pc));
      if (!tones.every((t) => t.opt || pcs.has(t.pc))) continue;
      const extra = [...pcs].filter((pc) => !set.has(pc));
      // only the bass may be outside the chord (slash)
      if (extra.length > 1 || (extra.length === 1 && extra[0] !== bass)) continue;
      const missingOpt = tones.filter((t) => t.opt && !pcs.has(t.pc)).length;
      const score = set.size * 2 - missingOpt * 1.5 - extra.length * 3 - (r === bass || extra.length ? 0 : 1) - (type.power ? 1 : 0);
      if (!best || score > best.score) best = { rootPc: r, typeKey: type.key, bassPc: bass === r ? null : bass, score };
    }
  }
  return best;
}

export { ROOTS };
