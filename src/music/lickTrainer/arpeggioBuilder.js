// Triad-arpeggio licks over a chord progression (Lick Trainer genre
// 'arpeggio'). Pure.
//
// The idea (the classic neoclassical / melodic-rock exercise): ONE small
// shape per chord, moved along the neck as the chords change, so the line
// spells each chord while the hand travels. Shapes, by the chord's tones:
//
//  roll3   (3 strings, as the user's reference lick): high E 5th, pull-off to
//          the 3rd, B root, G 5th, B root, E 3rd — "5-3-1-5-1-3".
//          Dm at 17: 17-13 / 15 / 14 / 15 / 13 (A F D A D F).
//  roll3up (the same strings, upward): G 5th, B root, E 3rd, hammer to the
//          5th, pull back to the 3rd, B root.
//  sweep5  (5 strings, the A-string-root sweep shape): A root, D 3rd, G 5th,
//          B root, E 3rd, hammer E 5th, pull E 3rd, then B G D A back down.
//          C at 15: 15 14 12 13 12-15-12 13 12 14 15.
//
// Each chord's shape is placed where it is closest to the previous one
// (voice leading along the neck), starting near `startFret`.
//
// Notes are in the Lick Trainer's internal format: { start, duration (beats),
// string (0 = low E … 5 = high e), fret, technique, vibrato, finger }.

import { chordParts } from '../songwriter/song';

const OPEN = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
const HI = 5;
const B = 4;
const G = 3;
const D = 2;
const A = 1;
const MAX_FRET = 21;

const NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const ARP_SHAPES = ['roll3', 'roll3up', 'sweep5'];
export const ARP_RHYTHMS = ['triplet', 'sextuplet'];
export const ARP_POSITIONS = { high: 17, mid: 12, low: 7 };

/** Ready progressions (chord symbols), each with its theory name. */
export const ARP_PRESETS = [
  { id: 'andalusian-d', chords: 'Dm C Bb A', name: { en: 'Andalusian cadence in D minor (i – ♭VII – ♭VI – V)', he: 'מהלך אנדלוסי בדו מינור (i – ♭VII – ♭VI – V)' } },
  { id: 'andalusian-a', chords: 'Am G F E', name: { en: 'Andalusian cadence in A minor', he: 'מהלך אנדלוסי בלה מינור' } },
  { id: 'minor-145', chords: 'Am Dm E Am', name: { en: 'Minor i – iv – V – i (A minor)', he: 'מינור i – iv – V – i (לה מינור)' } },
  { id: 'pop-1564', chords: 'C G Am F', name: { en: 'Pop I – V – vi – IV (C major)', he: 'פופ I – V – vi – IV (דו מז׳ור)' } },
  { id: 'circle-e', chords: 'Em Am D G C F#dim B', name: { en: 'Circle of fifths in E minor', he: 'מעגל הקווינטות במי מינור' } },
  { id: 'neo-harmonic', chords: 'Am Dm G C F Bdim E Am', name: { en: 'Neoclassical sequence (A harmonic minor)', he: 'רצף ניאו־קלאסי (לה מינור הרמוני)' } },
];

/**
 * A chord symbol -> { symbol, root (pc), third, fifth } (semitones from the
 * root). 7ths and extensions play their triad; sus chords use the sus note
 * as the "3rd". Null when the symbol can't be read.
 */
export function triadOf(symbol) {
  const p = chordParts(symbol);
  if (!p || p.root == null) return null;
  const r = p.rest.trim();
  let third = 4;
  let fifth = 7;
  if (/^(dim|°|o(?![a-z]))/.test(r) || /^m7?b5|^ø/.test(r)) {
    third = 3;
    fifth = 6;
  } else if (/^(aug|\+)/.test(r)) fifth = 8;
  else if (/^sus2/.test(r)) third = 2;
  else if (/^sus/.test(r) || /^7sus/.test(r)) third = 5;
  else if (/^(m(?!aj)|min|-)/.test(r)) third = 3;
  return { symbol: String(symbol).trim(), root: p.root, third, fifth };
}

/** "Dm C Bb A" / "Dm - C | Bb, A" -> chord list, plus the symbols that couldn't be read. */
export function parseProgression(text) {
  const tokens = String(text ?? '')
    .split(/[\s,|–\-]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const chords = [];
  const bad = [];
  for (const tk of tokens) {
    const c = triadOf(tk);
    if (c) chords.push(c);
    else bad.push(tk);
  }
  return { chords, bad };
}

const mod = (n, m) => ((n % m) + m) % m;

// Fingers from the frets of one shape: lowest fret = index, one finger per
// fret, the top capped at the pinky (a 4-fret span = 1-2-3-4 plus a stretch).
function fingersFor(cells) {
  const min = Math.min(...cells.map((c) => c.fret));
  return cells.map((c) => ({ ...c, finger: Math.max(1, Math.min(4, 1 + c.fret - min)) }));
}

// The shape's notes for one chord, its top note (the 5th on the high E) at
// pitch `top` (3-string shapes) or its root on the A string at `root`
// (sweep5), in play order (without timing).
function cellNotes(shape, chord, anchorPitch) {
  const { third, fifth } = chord;
  const at = (string, midi, technique = null) => ({ string, fret: midi - OPEN[string], midi, technique });
  if (shape === 'sweep5') {
    const R = anchorPitch; // root on the A string
    return [
      at(A, R),
      at(D, R + third),
      at(G, R + fifth),
      at(B, R + 12),
      at(HI, R + 12 + third),
      at(HI, R + 12 + fifth, 'hammer'),
      at(HI, R + 12 + third, 'pull'),
      at(B, R + 12),
      at(G, R + fifth),
      at(D, R + third),
      at(A, R),
    ];
  }
  const P = anchorPitch; // the 5th, on the high E
  const t3 = P - (fifth - third); // the 3rd just below it
  const r1 = P - fifth; // the root (B string)
  const p5 = P - 12; // the 5th an octave down (G string)
  if (shape === 'roll3up') {
    return [at(G, p5), at(B, r1), at(HI, t3), at(HI, P, 'hammer'), at(HI, t3, 'pull'), at(B, r1)];
  }
  return [at(HI, P), at(HI, t3, 'pull'), at(B, r1), at(G, p5), at(B, r1), at(HI, t3)];
}

function playable(cells) {
  return cells.every((c) => c.fret >= 1 && c.fret <= MAX_FRET) && Math.max(...cells.map((c) => c.fret)) - Math.min(...cells.map((c) => c.fret)) <= 5;
}

// The anchor fret of a shape (what the position is measured by).
const anchorFret = (shape, cells) => (shape === 'sweep5' ? cells[0].fret : cells[0].string === HI ? cells[0].fret : cells[3].fret);

/**
 * Places every chord's shape on the neck: each one in the octave closest to
 * the previous shape (the first near `startFret`). Returns [{ chord, cells }]
 * or null for a chord that has no playable place.
 */
export function placeShapes(chords, { shape = 'roll3', startFret = 17 } = {}) {
  let target = startFret;
  return chords.map((chord) => {
    const options = [];
    for (let oct = 0; oct < 5; oct++) {
      let pitch;
      if (shape === 'sweep5') pitch = OPEN[A] + mod(chord.root - OPEN[A], 12) + 12 * oct; // root on A
      else pitch = OPEN[HI] + mod(chord.root + chord.fifth - OPEN[HI], 12) + 12 * oct; // 5th on high E
      const cells = cellNotes(shape, chord, pitch);
      if (playable(cells)) options.push(cells);
    }
    if (!options.length) return { chord, cells: null };
    options.sort((a, b) => Math.abs(anchorFret(shape, a) - target) - Math.abs(anchorFret(shape, b) - target));
    const cells = fingersFor(options[0]);
    target = anchorFret(shape, cells);
    return { chord, cells };
  });
}

const STEP = { triplet: 1 / 3, sextuplet: 1 / 6 };

/**
 * The lick: shapes placed and timed. sweep5 runs in sixteenths (11 notes +
 * the last held = 3 beats a chord); the 3-string shapes in triplet or
 * sextuplet eighths (6 notes = 2 or 1 beats a chord). `repeat` plays each
 * chord's shape 1-2 times. The last chord's root ends the lick (held, vib).
 */
export function arpeggioNotes(chords, { shape = 'roll3', rhythm = 'triplet', repeat = 1, startFret = 17 } = {}) {
  const placed = placeShapes(chords, { shape, startFret });
  const missing = placed.filter((p) => !p.cells).map((p) => p.chord.symbol);
  const notes = [];
  let beat = 0;
  for (const { cells } of placed) {
    if (!cells) continue;
    for (let k = 0; k < repeat; k++) {
      if (shape === 'sweep5') {
        cells.forEach((c, i) => {
          const dur = i === cells.length - 1 ? 0.5 : 0.25;
          notes.push(note(beat, dur, c));
          beat += dur;
        });
      } else {
        const step = STEP[rhythm] ?? STEP.triplet;
        cells.forEach((c) => {
          notes.push(note(beat, step, c));
          beat += step;
        });
      }
    }
  }
  // Land on the last chord's root (B string in the 3-string shapes).
  const last = [...placed].reverse().find((p) => p.cells);
  if (last) {
    const rootCell = last.cells.find((c) => c.string === B);
    if (rootCell) notes.push({ ...note(round(beat), 1, rootCell), technique: null, vibrato: true });
  }
  return { notes, placed, missing };
}

const round = (b) => Math.round(b * 1e6) / 1e6;
function note(beat, duration, c) {
  return { start: round(beat), duration: round(duration), string: c.string, fret: c.fret, technique: c.technique ?? null, vibrato: false, finger: c.finger };
}

function levelOf(shape, rhythm) {
  if (shape === 'sweep5' || rhythm === 'sextuplet') return 'advanced';
  return 'intermediate';
}

const NAME_EN = { roll3: '3-string triads', roll3up: '3-string triads, rising', sweep5: '5-string sweeps' };
const NAME_HE = { roll3: 'משולשים על 3 מיתרים', roll3up: 'משולשים על 3 מיתרים, עולה', sweep5: 'סוויפ על 5 מיתרים' };
const L = (s) => '⁦' + s + '⁩';

function shapeAbout(shape) {
  if (shape === 'sweep5')
    return {
      en: 'Per chord: A-string root, D 3rd, G 5th, B root, E 3rd, hammer to the 5th, pull back, and down again — a sweep: one pick stroke per string, the pick falls through the strings.',
      he: 'לכל אקורד: יסוד על מיתר A, ‏3 על D, ‏5 על G, יסוד על B, ‏3 על E, ‏hammer-on ל־5, ‏pull-off חזרה, ויורדים — סוויפ: מכת מפרט אחת לכל מיתר, המפרט "נופל" דרך המיתרים.',
    };
  if (shape === 'roll3up')
    return {
      en: 'Per chord: G 5th, B root, E 3rd, hammer to the 5th, pull back to the 3rd, B root — the same three strings as the falling shape, going up.',
      he: 'לכל אקורד: ‏5 על G, יסוד על B, ‏3 על E, ‏hammer-on ל־5, ‏pull-off חזרה ל־3, יסוד על B — אותם שלושה מיתרים כמו בצורה היורדת, בכיוון עולה.',
    };
  return {
    en: 'Per chord: high E 5th, pull-off to the 3rd, B root, G 5th, B root, E 3rd (5-3-1-5-1-3). Minor = a 4-fret pull-off, major = 3 frets.',
    he: 'לכל אקורד: ‏5 על E הגבוה, ‏pull-off ל־3, יסוד על B, ‏5 על G, יסוד על B, ‏3 על E ‏(5-3-1-5-1-3). במינור ה־pull-off רחוק 4 שריגים, במז׳ור 3.',
  };
}

/** A complete lick (raw — the library's withDerived adds midi/order). */
export function buildArpeggioLick({ id, chords: text, shape = 'roll3', rhythm = 'triplet', repeat = 1, startFret = 17, bpm, level, title, source = 'generated', flats } = {}) {
  const { chords, bad } = parseProgression(text);
  if (!chords.length) return { lick: null, bad, missing: [] };
  const { notes, placed, missing } = arpeggioNotes(chords, { shape, rhythm, repeat, startFret });
  const names = chords.map((c) => c.symbol).join(' – ');
  const positions = placed
    .filter((p) => p.cells)
    .map((p) => `${p.chord.symbol} ${anchorFret(shape, p.cells)}`)
    .join(', ');
  const about = shapeAbout(shape);
  const lick = {
    id: id ?? `arp-${Date.now().toString(36)}`,
    title: title ?? { en: `Arpeggios: ${names}`, he: `ארפג׳יו: ${L(names)}` },
    genre: 'arpeggio',
    level: level ?? levelOf(shape, rhythm),
    key: chords[0].symbol,
    scale: `${NAME_EN[shape]} · chord tones`,
    bpm: bpm ?? (shape === 'sweep5' ? 60 : rhythm === 'sextuplet' ? 66 : 72),
    source,
    arp: { chords: text, shape, rhythm, repeat, startFret, flats: !!flats },
    about: {
      en: `${NAME_EN[shape]} over ${names}. ${about.en} Positions (fret): ${positions}.`,
      he: `${NAME_HE[shape]} על ${L(names)}. ${about.he} מיקומים (שריג): ${L(positions)}.`,
    },
    notes,
  };
  return { lick, bad, missing };
}

/** Chord names spelled for the key (for presets typed with sharps / flats). */
export function chordName(pc, quality, flats) {
  return (flats ? NAMES_FLAT : NAMES_SHARP)[mod(pc, 12)] + quality;
}
