// Studies -> Chord Structure ("מבנה אקורדים", user's request 2026-10-20).
// Pure — no React/audio. The idea: every chord is the open E or open A
// chord with one or two fingers moved (one fret = one semitone), and the
// changed open shape is then barred up the neck exactly like the plain
// E / A barre chords the student already knows (barre at fret 3 = G / C).
//
// Shapes are written low E string -> high E string, as OPEN chords
// (0 = open string = "the barre" once the shape moves up). `null` = muted.
// Every shape is checked by scripts-free test (see chordBuilder test in the
// commit) to contain exactly its chord's tones and to be playable as a
// barre chord (fingerChord at fret 3).

import { chordTones, chordName, fingerChord, toPosition, typeByKey } from './chordLibrary';
import { mod } from './notes';

export const STD_TUNING = [40, 45, 50, 55, 59, 64];

// The two families: which string holds the root (the barre's name), and the
// root of the open shape.
export const FAMILIES = {
  E: { rootString: 0, openRootPc: 4 },
  A: { rootString: 1, openRootPc: 9 },
};

// One entry per lesson. `from` = the shape it is built from (shown on the
// left, the moves are the difference). A family with `null` can't play it
// as a barre chord; `why` says what to do instead.
export const BUILDER_TYPES = [
  { key: 'major', from: null, E: [0, 2, 2, 1, 0, 0], A: [null, 0, 2, 2, 2, 0] },
  { key: 'minor', from: 'major', E: [0, 2, 2, 0, 0, 0], A: [null, 0, 2, 2, 1, 0] },
  { key: 'dom7', from: 'major', E: [0, 2, 0, 1, 0, 0], A: [null, 0, 2, 0, 2, 0] },
  { key: 'maj7', from: 'major', E: [0, 2, 1, 1, 0, 0], A: [null, 0, 2, 1, 2, 0] },
  { key: 'm7', from: 'minor', E: [0, 2, 0, 0, 0, 0], A: [null, 0, 2, 0, 1, 0] },
  { key: 'sus4', from: 'major', E: [0, 2, 2, 2, 0, 0], A: [null, 0, 2, 2, 3, 0] },
  { key: 'sus2', from: 'major', E: null, whyE: 'behindBarre', A: [null, 0, 2, 2, 0, 0] },
  { key: 'six', from: 'major', E: null, whyE: 'fiveFingers', A: [null, 0, 2, 2, 2, 2] },
  { key: 'add9', from: 'major', E: null, whyE: 'fiveFingers', A: [null, 0, 2, 4, 2, 0] },
  { key: 'dom9', from: 'dom7', E: [0, 2, 0, 1, 0, 2], A: null, whyA: 'noRoot' },
  { key: 'dom11', from: 'dom7', E: [0, 2, 0, 2, 0, 0], A: [null, 0, 2, 0, 3, 0] },
  { key: 'dom13', from: 'dom7', E: [0, 2, 0, 1, 2, 0], A: [null, 0, 2, 0, 2, 2] },
  { key: 'm7b5', from: 'm7', E: [0, 1, 0, 0, null, null], A: [null, 0, 1, 0, 1, null] },
  { key: 'dim7', from: 'm7b5', E: null, whyE: 'useA', A: [null, 0, 1, 2, 1, 2] },
  { key: 'aug', from: 'major', E: [0, 3, 2, 1, 1, 0], A: [null, 0, 3, 2, 2, 1] },
];

export const LESSONS = [{ id: 'map' }, { id: 'slide' }, ...BUILDER_TYPES.filter((t) => t.from).map((t) => ({ id: t.key, type: t.key })), { id: 'quiz' }];

export const builderType = (key) => BUILDER_TYPES.find((t) => t.key === key);

/** The open shape of `typeKey` in a family (or null when it can't be barred). */
export const openShape = (typeKey, family) => builderType(typeKey)?.[family] ?? null;

/** A shape moved up the neck: the barre at `fret` (0 = the open chord). */
export const atFret = (frets, fret) => frets && frets.map((f) => (f == null ? null : f + fret));

/** The chord's root when the family's barre sits at `fret`. */
export const rootAt = (family, fret) => mod(FAMILIES[family].openRootPc + fret, 12);

/** Where the barre goes for a root: 1..12 (open position = 12 -> also 0). */
export const fretForRoot = (family, rootPc) => {
  const f = mod(rootPc - FAMILIES[family].openRootPc, 12);
  return f === 0 ? 12 : f;
};

/** Interval labels (1, 3, ♭7…) and roles for each string of a shape. */
export function shapeTones(typeKey, family, fret = 0) {
  const frets = atFret(openShape(typeKey, family), fret);
  if (!frets) return null;
  const rootPc = rootAt(family, fret);
  const pos = toPosition(rootPc, typeKey, frets, STD_TUNING, 'interval');
  const names = toPosition(rootPc, typeKey, frets, STD_TUNING, 'note');
  return {
    frets,
    rootPc,
    name: chordName(rootPc, typeKey),
    intervals: pos.strings.map((s) => s.label ?? null),
    notes: names.strings.map((s) => s.label ?? null),
    roles: pos.strings.map((s) => s.role ?? null),
    pcs: [...new Set(frets.map((f, s) => (f == null ? null : mod(STD_TUNING[s] + f, 12))).filter((x) => x != null))],
    position: pos,
  };
}

/**
 * What changes from the parent shape to this one, string by string:
 * { s, from, to, kind: 'lift' | 'press' | 'up' | 'down' | 'mute', by, was, now }
 * (`was` / `now` = the interval label before / after). Frets are the OPEN
 * shape's, so 0 = the barre.
 */
export function shapeMoves(typeKey, family) {
  const t = builderType(typeKey);
  const to = openShape(typeKey, family);
  const from = t?.from ? openShape(t.from, family) : null;
  if (!to || !from) return [];
  const before = shapeTones(t.from, family);
  const after = shapeTones(typeKey, family);
  const moves = [];
  for (let s = 0; s < 6; s++) {
    const a = from[s];
    const b = to[s];
    if (a === b) continue;
    let kind;
    if (b == null) kind = 'mute';
    else if (a == null || a === 0) kind = 'press';
    else if (b === 0) kind = 'lift';
    else kind = b > a ? 'up' : 'down';
    moves.push({ s, from: a, to: b, kind, by: a != null && b != null ? Math.abs(b - a) : 0, was: before.intervals[s], now: after.intervals[s] });
  }
  return moves;
}

/** Is the shape playable as a barre chord (4 fingers, index barre)? */
export const barrePlayable = (frets) => !!fingerChord(atFret(frets, 3));

/**
 * The chroma a shape should give: every string's note with 8 harmonics
 * (1/k^0.7) folded into pitch classes, normalised. Modelling the harmonics
 * matters: G's 7th harmonic lands on F, so a plain G "contains" G7's F.
 */
export function shapeChroma(frets) {
  const out = new Float32Array(12);
  frets.forEach((f, s) => {
    if (f == null) return;
    const midi = STD_TUNING[s] + f;
    for (let k = 1; k <= 8; k++) out[mod(Math.round(midi + 12 * Math.log2(k)), 12)] += 1 / k ** 0.7;
  });
  const total = out.reduce((a, b) => a + b, 0);
  return total ? out.map((v) => v / total) : out;
}

const cosine = (x, y) => {
  let d = 0;
  let a = 0;
  let b = 0;
  for (let i = 0; i < 12; i++) {
    d += x[i] * y[i];
    a += x[i] * x[i];
    b += y[i] * y[i];
  }
  return a && b ? d / Math.sqrt(a * b) : 0;
};

export const MATCH_MIN = 0.75;
// How much better the target must fit than each rival, as a share of how
// different their two models are (G vs G9 differ far less than G vs Gsus4).
export const MATCH_SHARE = 0.15;

/**
 * Mic check for "play this shape": the averaged chroma (about a second of
 * frames near the strum's attack) against the target shape's model AND its
 * rivals — the shape it was built from, and the same shape a fret off. The
 * target must fit well and beat every rival by MATCH_SHARE of the gap
 * between their models; that is what tells G7 from G (a plain best-chord
 * match mostly answers "G"). Approximate by nature: on synthetic strums
 * (Karplus-Strong, uneven string levels) ~85 % of right chords pass on one
 * window and ~10 % of the parent chords slip through; the view asks for two
 * passing windows in a row. Returns { match, fit, parentFit }.
 */
export function judgeShape(chroma, targetFrets, rivals = []) {
  if (!chroma || !chroma.some((v) => v > 0)) return { match: false, fit: 0, parentFit: 0 };
  const model = shapeChroma(targetFrets);
  const fit = cosine(chroma, model);
  const list = (Array.isArray(rivals?.[0]) || rivals?.length === 0 ? rivals : [rivals]).filter(Boolean);
  let parentFit = 0;
  let beatsAll = true;
  for (const r of list) {
    const rm = shapeChroma(r);
    const rf = cosine(chroma, rm);
    parentFit = Math.max(parentFit, rf);
    if (fit - rf <= Math.max(0.005, MATCH_SHARE * (1 - cosine(model, rm)))) beatsAll = false;
  }
  return { match: fit >= MATCH_MIN && beatsAll, fit, parentFit };
}

/** Pitch classes this chord adds / drops relative to its parent (same root). */
export function changedPcs(typeKey, rootPc) {
  const t = builderType(typeKey);
  const pcsOf = (k) => typeByKey(k).tones.filter((x) => !x.opt).map((x) => mod(rootPc + x.semitones, 12));
  const now = new Set(chordTones(rootPc, typeKey).map((x) => x.pc));
  const before = t?.from ? new Set(chordTones(rootPc, t.from).map((x) => x.pc)) : new Set();
  const required = pcsOf(typeKey);
  return { required, added: required.filter((pc) => !before.has(pc)), dropped: [...before].filter((pc) => !now.has(pc)) };
}
