// The Songwriter's song model. Pure.
//
// song = { id, title, key: null | { pc, minor }, bpm, time: '4/4'|'3/4'|'6/8'|'2/4',
//          sections: [section], ideas: [take], createdAt, updatedAt }
// section = { id, kind: 'verse'|'prechorus'|'chorus'|'bridge'|'intro'|'outro'|'hook', lines: [line] }
// line = { id, raw: '[Am]words…' (chords ChordPro-style inside the text),
//          syl?: 'hel-lo world' (the writer's own syllable split),
//          melody?: { notes: [{ p: midi, s: start beat, d: beats, c?: true
//                     (continues the previous syllable — a melisma) }] },
//          takes: [take] }
// take = { id, at (ms), dur (s), peaks: number[], star?: true, bpm, time }
// Beats are the click's beats (6/8 = six eighth-note beats a bar). Beat 0 =
// the line's first downbeat; a pickup has negative starts.

import { parseLine, words, syllables } from './lyrics';

export const SECTION_KINDS = ['verse', 'prechorus', 'chorus', 'bridge', 'intro', 'outro', 'hook'];
export const TIMES = ['4/4', '3/4', '6/8', '2/4'];
export const KEY_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const KEY_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
// The usual name of each key (Db not C#, F# not Gb; minor: C#m, Ebm…).
const MAJOR_KEY = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_KEY = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
// Keys written with flats.
const FLAT_MAJOR = new Set([5, 10, 3, 8, 1]); // F Bb Eb Ab Db
const FLAT_MINOR = new Set([2, 7, 0, 5, 10, 3]); // Dm Gm Cm Fm Bbm Ebm

export const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function keyName(key) {
  if (!key) return '';
  return key.minor ? MINOR_KEY[key.pc] + 'm' : MAJOR_KEY[key.pc];
}

export function usesFlats(key) {
  if (!key) return false;
  return key.minor ? FLAT_MINOR.has(key.pc) : FLAT_MAJOR.has(key.pc);
}

export function beatsPerBar(time) {
  return Number(String(time ?? '4/4').split('/')[0]) || 4;
}

/** The note value of one beat (4 = quarter, 8 = eighth). */
export function beatUnit(time) {
  return Number(String(time ?? '4/4').split('/')[1]) || 4;
}

export function newLine(raw = '') {
  return { id: uid('l'), raw, takes: [] };
}

export function newSection(kind = 'verse') {
  return { id: uid('s'), kind, lines: [newLine()] };
}

export function newSong(title = '') {
  const now = Date.now();
  return {
    id: uid('song'),
    title,
    key: null,
    bpm: 90,
    time: '4/4',
    sections: [newSection('verse'), newSection('chorus')],
    ideas: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ---- chords --------------------------------------------------------------------

const ROOT_RE = /^([A-G])([#b]?)(.*)$/;
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function notePc(name) {
  const m = /^([A-G])([#b]?)$/.exec(name);
  if (!m) return null;
  return (PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? 11 : 0)) % 12;
}

/** "Am7" + 3 -> "Cm7"; flats when `flats`. Unknown text is left alone. */
export function transposeSymbol(symbol, semis, flats = false) {
  const [main, bass] = String(symbol).split('/');
  const m = ROOT_RE.exec(main);
  if (!m) return symbol;
  const names = flats ? KEY_NAMES_FLAT : KEY_NAMES_SHARP;
  const pc = notePc(m[1] + m[2]);
  const root = names[(pc + semis + 120) % 12];
  if (bass === undefined) return root + m[3];
  const bpc = notePc(bass);
  return root + m[3] + '/' + (bpc == null ? bass : names[(bpc + semis + 120) % 12]);
}

/** Chord root + quality ('' major, 'm', '7', 'm7', 'maj7', 'dim', 'sus4', …). */
export function chordParts(symbol) {
  const [main, bass] = String(symbol).split('/');
  const m = ROOT_RE.exec(main);
  if (!m) return null;
  return { root: notePc(m[1] + m[2]), rest: m[3], bass: bass ? notePc(bass) : null };
}

const QUALITY_TONES = [
  [/^(maj7|M7|Δ7?)$/, [0, 4, 7, 11]],
  [/^(m7b5|ø7?)$/, [0, 3, 6, 10]],
  [/^(dim7|°7)$/, [0, 3, 6, 9]],
  [/^(dim|°)$/, [0, 3, 6]],
  [/^(aug|\+)$/, [0, 4, 8]],
  [/^(m|min|-)$/, [0, 3, 7]],
  [/^(m7|min7|-7)$/, [0, 3, 7, 10]],
  [/^(m6)$/, [0, 3, 7, 9]],
  [/^(m9)$/, [0, 3, 7, 10, 14]],
  [/^(madd9)$/, [0, 3, 7, 14]],
  [/^(7)$/, [0, 4, 7, 10]],
  [/^(9)$/, [0, 4, 7, 10, 14]],
  [/^(7sus4)$/, [0, 5, 7, 10]],
  [/^(sus4|sus)$/, [0, 5, 7]],
  [/^(sus2)$/, [0, 2, 7]],
  [/^(add9|add2)$/, [0, 4, 7, 14]],
  [/^(6)$/, [0, 4, 7, 9]],
  [/^(5)$/, [0, 7, 12]],
  [/^(maj9)$/, [0, 4, 7, 11, 14]],
];

/** Sounding notes of a chord symbol for playback (root around C3), or null. */
export function chordMidis(symbol) {
  const p = chordParts(symbol);
  if (!p || p.root == null) return null;
  const rest = p.rest.trim();
  const tones = (QUALITY_TONES.find(([re]) => re.test(rest)) ?? [null, [0, 4, 7]])[1];
  const base = 48 + p.root; // C3..B3
  const notes = tones.map((t) => base + t);
  const bass = (p.bass ?? p.root) + 36; // C2..B2
  return [bass, ...notes];
}

/** The key's diatonic triads (I ii iii IV V vi vii° / i ii° III iv v VI VII). */
export function diatonicChords(key) {
  if (!key) return [];
  const names = usesFlats(key) ? KEY_NAMES_FLAT : KEY_NAMES_SHARP;
  const steps = key.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const quals = key.minor ? ['m', 'dim', '', 'm', 'm', '', ''] : ['', 'm', 'm', '', '', 'm', 'dim'];
  return steps.map((s, i) => names[(key.pc + s) % 12] + quals[i]);
}

/** Every chord used in the song, in first-use order. */
export function songChords(song) {
  const seen = [];
  for (const sec of song.sections) for (const l of sec.lines) for (const c of parseLine(l.raw).chords) if (!seen.includes(c.symbol)) seen.push(c.symbol);
  return seen;
}

// ---- transposition --------------------------------------------------------------

/** The whole song moved by `semis` (chords, melodies, key). */
export function transposeSong(song, semis, newKey = null) {
  if (!semis) return { ...song, key: newKey ?? song.key };
  const key = newKey ?? (song.key ? { ...song.key, pc: (song.key.pc + semis + 120) % 12 } : null);
  const flats = usesFlats(key);
  const moveRaw = (raw) => String(raw).replace(/\[([^\]]+)\]/g, (_, s) => `[${transposeSymbol(s.trim(), semis, flats)}]`);
  return {
    ...song,
    key,
    sections: song.sections.map((sec) => ({
      ...sec,
      lines: sec.lines.map((l) => ({
        ...l,
        raw: moveRaw(l.raw),
        melody: l.melody ? { ...l.melody, notes: l.melody.notes.map((n) => ({ ...n, p: n.p + semis })) } : l.melody,
      })),
    })),
  };
}

// ---- notes <-> syllables -----------------------------------------------------------

/**
 * Which syllable each note sings: a note marked `c` continues the syllable
 * before it; the rest take the next one. -1 = more notes than syllables.
 */
export function noteSyllables(notes, sylCount) {
  let idx = -1;
  return notes.map((n) => {
    if (!n.c || idx < 0) idx += 1;
    return idx < sylCount ? idx : -1;
  });
}

/** Sorted copy (by start). */
export function sortNotes(notes) {
  return [...notes].sort((a, b) => a.s - b.s || a.p - b.p);
}

/**
 * When a take gives more notes than the line has syllables, the extra ones
 * become melismas — first the notes that came without a new attack (a pitch
 * change on the same vowel), then the shortest. Fewer notes than syllables
 * leaves the last syllables without a note (shown in red).
 */
export function fitToSyllables(notes, sylCount, attacks = null) {
  const out = notes.map((n) => ({ ...n, c: undefined }));
  let extra = out.length - sylCount;
  if (extra <= 0 || sylCount <= 0) return out.map(clean);
  const order = out
    .map((n, i) => ({ i, legato: attacks ? !attacks[i] : false, d: n.d }))
    .filter((x) => x.i > 0)
    .sort((a, b) => Number(b.legato) - Number(a.legato) || a.d - b.d);
  for (const x of order) {
    if (extra <= 0) break;
    out[x.i].c = true;
    extra -= 1;
  }
  return out.map(clean);
}

function clean(n) {
  const o = { p: n.p, s: n.s, d: n.d };
  if (n.c) o.c = true;
  return o;
}

// ---- timing ---------------------------------------------------------------------

/** Beats the line takes (whole bars; at least one bar). */
export function lineBeats(line, time) {
  const bpb = beatsPerBar(time);
  const notes = line.melody?.notes ?? [];
  const end = notes.reduce((m, n) => Math.max(m, n.s + n.d), 0);
  const chordsN = parseLine(line.raw).chords.length;
  const bars = notes.length ? Math.max(1, Math.ceil(end / bpb - 1e-6)) : Math.max(1, chordsN);
  return bars * bpb;
}

/**
 * When each chord of the line starts (beats from the line's downbeat): over
 * the note that sings the first syllable of its word; a line without a
 * melody gets one chord per bar.
 */
export function chordTimes(line, time) {
  const { text, chords } = parseLine(line.raw);
  if (!chords.length) return [];
  const bpb = beatsPerBar(time);
  const notes = sortNotes(line.melody?.notes ?? []);
  const total = lineBeats(line, time);
  if (!notes.length) return chords.map((c, i) => ({ symbol: c.symbol, beat: i * bpb, until: (i + 1) * bpb }));
  const syl = syllables(text, line.syl);
  const ofNote = noteSyllables(notes, syl.length);
  const ws = words(text);
  const wordOfChar = (at) => {
    for (let i = 0; i < ws.length; i += 1) if (at < ws[i].end) return i;
    return ws.length;
  };
  const beats = chords.map((c) => {
    const wi = wordOfChar(c.at);
    const si = syl.findIndex((s) => s.word >= wi);
    if (si < 0) return total;
    const ni = ofNote.findIndex((x) => x >= si);
    if (ni < 0) return total;
    return notes[ni].s;
  });
  // Never before the downbeat; keep them in order.
  const out = [];
  let prev = 0;
  beats.forEach((b, i) => {
    // A pickup or a slightly late first word: the first chord is on the downbeat.
    const beat = i === 0 && b < 1 ? 0 : Math.max(prev, Math.round(b * 2) / 2);
    out.push({ symbol: chords[i].symbol, beat });
    prev = beat;
  });
  out.forEach((c, i) => (c.until = i + 1 < out.length ? out[i + 1].beat : total));
  return out.filter((c) => c.until > c.beat || c === out[out.length - 1]);
}

/**
 * The song (or one section / line) as a timeline for playback: notes and
 * chords with start times in seconds. `only` = { section, line } ids.
 */
export function songTimeline(song, { only = null } = {}) {
  const spb = 60 / (song.bpm || 90);
  const notes = [];
  const chords = [];
  const lines = [];
  let beat = 0;
  for (const sec of song.sections) {
    if (only?.section && sec.id !== only.section) continue;
    for (const l of sec.lines) {
      if (only?.line && l.id !== only.line) continue;
      if (!l.raw.trim() && !l.melody?.notes?.length) continue;
      const len = lineBeats(l, song.time);
      const pickup = Math.min(0, ...(l.melody?.notes ?? []).map((n) => n.s));
      // A pickup on the very first line needs room before it.
      if (beat === 0 && pickup < 0) beat = -pickup;
      for (const n of l.melody?.notes ?? []) notes.push({ midi: n.p, start: (beat + n.s) * spb, dur: n.d * spb, line: l.id });
      for (const c of chordTimes(l, song.time)) chords.push({ symbol: c.symbol, start: (beat + c.beat) * spb, dur: (c.until - c.beat) * spb, line: l.id });
      lines.push({ id: l.id, section: sec.id, start: (beat + Math.min(0, pickup)) * spb, downbeat: beat * spb, end: (beat + len) * spb });
      beat += len;
    }
  }
  return { notes, chords, lines, duration: beat * spb };
}
