// Bass Practice content (Bass card -> Practice). Pure data + builders, no UI.
//
// Every exercise builds to the same shape the engine (hooks/useBassPractice)
// and the bass neck (Fretboard with BASS_TUNING) read:
//   { steps: [{ string, fret, finger, midi, noteName, degreeLabel, isRoot,
//               beat, beats, bar }], bars?: [{ name, startBeat }], totalBeats }
// string = BASS_TUNING index (0 = low E ... 3 = G), beat = start in beats from
// the first note, beats = its length.
//
// The method follows the standard electric-bass curriculum (Hal Leonard Bass
// Method / Ed Friedland, Simandl's double-bass fingering, BassBuzz, Scott's
// Bass Lessons, TalkingBass): alternate i-m plucking, one finger per fret from
// the 5th position (frets are wide down low), Simandl 1-2-4 in 1st position,
// movable one-octave scale and arpeggio boxes (root on the E or A string), and
// grooves built from chord tones — roots, root-5th, root-5th-octave, octaves,
// the 1-3-5-6 blues boogie and a walking line (chord tones + a chromatic
// approach note on beat 4).
import { BASS_TUNING } from '../notes';

export const DEGREE_SEMITONES = {
  '1': 0, '♭2': 1, '2': 2, '♭3': 3, '3': 4, '4': 5, '♭5': 6, '5': 7, '♯5': 8, '♭6': 8, '6': 9, '♭7': 10, '7': 11, '8': 12,
};
const SHARPS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLATS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
// Keys written with flats (major-key view; the minor shapes use the same
// choice for their root, e.g. D / G / C minor read with flats).
const FLAT_KEYS = new Set([5, 10, 3, 8, 1, 6]); // F Bb Eb Ab Db Gb
export const KEY_NAMES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((pc) => (FLAT_KEYS.has(pc) ? FLATS : SHARPS)[pc]);
const MINOR_FLAT_ROOTS = new Set([2, 7, 0, 5, 10, 3]); // D G C F Bb Eb minor

export const MIN_FRET = 0;
export const TOP_FRET = 17; // keep the shapes on the playable part of a 20/21-fret neck

export const midiAt = (string, fret) => BASS_TUNING[string].baseMidi + fret;

function namer(keyPc, minorish = false) {
  const flats = minorish ? MINOR_FLAT_ROOTS.has(keyPc) : FLAT_KEYS.has(keyPc);
  return (midi) => (flats ? FLATS : SHARPS)[((midi % 12) + 12) % 12];
}

// ------------------------------------------------------------------ helpers
function note(string, fret, finger, extra = {}) {
  return { string, fret, finger, midi: midiAt(string, fret), ...extra };
}

// Lays notes one after another, `beats` each (a number or per-note list).
function timeline(notes, beats) {
  let at = 0;
  return notes.map((n, i) => {
    const len = Array.isArray(beats) ? beats[i % beats.length] : n.beats ?? beats;
    const s = { ...n, beat: at, beats: len };
    at += len;
    return s;
  });
}

const upDown = (list) => [...list, ...list.slice(0, -1).reverse()];

// Root fret of `keyPc` on `string`, moved up an octave when the shape would
// need a fret below `lowest` (a shape reaching one fret behind the root needs
// root fret >= 1 + reach).
export function rootFret(keyPc, string, lowest = 1) {
  let f = (((keyPc - BASS_TUNING[string].pitchClass) % 12) + 12) % 12;
  while (f < lowest) f += 12;
  return f;
}

// ----------------------------------------------------------- TECHNIQUE
// Fixed notes (no key). `finger` = fretting finger; for open strings the
// plucking finger (i / m) is shown instead.
function pluckAlternation() {
  const notes = [];
  for (let s = 0; s < 4; s += 1) for (let k = 0; k < 4; k += 1) notes.push(note(s, 0, k % 2 ? 'm' : 'i'));
  return timeline(notes, 0.5);
}
function chromatic5th() {
  const up = [];
  for (let s = 0; s < 4; s += 1) for (let k = 0; k < 4; k += 1) up.push(note(s, 5 + k, k + 1));
  const down = [];
  for (let s = 3; s >= 0; s -= 1) for (let k = 3; k >= 0; k -= 1) down.push(note(s, 5 + k, k + 1));
  return timeline([...up, ...down], 0.5);
}
// Simandl 1st position: fingers 1-2-4 cover frets 1-2-3 (a whole step);
// the ring finger helps the pinky and doesn't play on its own.
function simandl() {
  const up = [];
  for (let s = 0; s < 4; s += 1) [1, 2, 3].forEach((f, k) => up.push(note(s, f, [1, 2, 4][k])));
  return timeline(upDown(up), 1);
}
function permutation1324() {
  const notes = [];
  for (let s = 0; s < 4; s += 1) [[5, 1], [7, 3], [6, 2], [8, 4]].forEach(([f, fi]) => notes.push(note(s, f, fi)));
  for (let s = 3; s >= 0; s -= 1) [[8, 4], [6, 2], [7, 3], [5, 1]].forEach(([f, fi]) => notes.push(note(s, f, fi)));
  return timeline(notes, 0.5);
}
// Up one fret per string: the hand SHIFTS a fret each time (5-8, 6-9, 7-10, 8-11).
function shiftClimb() {
  const notes = [];
  for (let s = 0; s < 4; s += 1) for (let k = 0; k < 4; k += 1) notes.push(note(s, 5 + s + k, k + 1));
  for (let s = 3; s >= 0; s -= 1) for (let k = 3; k >= 0; k -= 1) notes.push(note(s, 5 + s + k, k + 1));
  return timeline(notes, 0.5);
}
// Octave shape: root with the index, octave two strings up two frets with the
// pinky (or ring). G (E3) A (E5) C (A3) D (A5).
function octaves() {
  const pairs = [[0, 3], [0, 5], [1, 3], [1, 5]];
  const notes = [];
  pairs.forEach(([s, f]) => {
    for (let k = 0; k < 2; k += 1) {
      notes.push(note(s, f, 1, { degreeLabel: '1', isRoot: true }));
      notes.push(note(s + 2, f + 2, 4, { degreeLabel: '8' }));
    }
  });
  return timeline(notes, 0.5);
}
// String crossing on one fret: the index stays on fret 5 and rolls across;
// going DOWN the strings the plucking finger "rakes" (the same finger plays
// the next lower string).
function raking() {
  const across = [3, 2, 1, 0, 1, 2].map((s) => note(s, 5, 1));
  return timeline([...across, ...across, note(3, 5, 1)], 1);
}

// ---------------------------------------------------------------- SHAPES
// Movable one-octave boxes: [string offset from the root string, fret offset
// from the root fret, finger, degree]. Fingerings are the standard ones
// taught for each box (major = root with finger 2, minor = root with finger 1).
const SCALE_SHAPES = {
  major: [[0, 0, 2, '1'], [0, 2, 4, '2'], [1, -1, 1, '3'], [1, 0, 2, '4'], [1, 2, 4, '5'], [2, -1, 1, '6'], [2, 1, 3, '7'], [2, 2, 4, '8']],
  minor: [[0, 0, 1, '1'], [0, 2, 3, '2'], [0, 3, 4, '♭3'], [1, 0, 1, '4'], [1, 2, 3, '5'], [1, 3, 4, '♭6'], [2, 0, 1, '♭7'], [2, 2, 3, '8']],
  majPent: [[0, 0, 2, '1'], [0, 2, 4, '2'], [1, -1, 1, '3'], [1, 2, 4, '5'], [2, -1, 1, '6'], [2, 2, 4, '8']],
  minPent: [[0, 0, 1, '1'], [0, 3, 4, '♭3'], [1, 0, 1, '4'], [1, 2, 3, '5'], [2, 0, 1, '♭7'], [2, 2, 3, '8']],
  blues: [[0, 0, 1, '1'], [0, 3, 4, '♭3'], [1, 0, 1, '4'], [1, 1, 2, '♭5'], [1, 2, 3, '5'], [2, 0, 1, '♭7'], [2, 2, 3, '8']],
  mixolydian: [[0, 0, 2, '1'], [0, 2, 4, '2'], [1, -1, 1, '3'], [1, 0, 2, '4'], [1, 2, 4, '5'], [2, -1, 1, '6'], [2, 0, 2, '♭7'], [2, 2, 4, '8']],
};
const ARP_SHAPES = {
  r58: [[0, 0, 1, '1'], [1, 2, 3, '5'], [2, 2, 4, '8']],
  major: [[0, 0, 2, '1'], [1, -1, 1, '3'], [1, 2, 4, '5'], [2, 2, 4, '8']],
  minor: [[0, 0, 1, '1'], [0, 3, 4, '♭3'], [1, 2, 3, '5'], [2, 2, 3, '8']],
  dom7: [[0, 0, 2, '1'], [1, -1, 1, '3'], [1, 2, 4, '5'], [2, 0, 2, '♭7'], [2, 2, 4, '8']],
  maj7: [[0, 0, 2, '1'], [1, -1, 1, '3'], [1, 2, 4, '5'], [2, 1, 3, '7'], [2, 2, 4, '8']],
  m7: [[0, 0, 1, '1'], [0, 3, 4, '♭3'], [1, 2, 3, '5'], [2, 0, 1, '♭7'], [2, 2, 3, '8']],
};
export const SHAPES = { ...Object.fromEntries(Object.entries(SCALE_SHAPES).map(([k, v]) => ['scale:' + k, v])), ...Object.fromEntries(Object.entries(ARP_SHAPES).map(([k, v]) => ['arp:' + k, v])) };

const MINORISH = new Set(['minor', 'minPent', 'blues', 'm7']);

export function buildShape(shapeKey, { key = 0, rootString = 0, beats = 1 } = {}) {
  const [kind, id] = shapeKey.split(':');
  const shape = (kind === 'arp' ? ARP_SHAPES : SCALE_SHAPES)[id];
  const reach = -Math.min(...shape.map((p) => p[1]));
  const r = rootFret(key, rootString, Math.max(1, reach + (reach ? 1 : 0)));
  const nameOf = namer(key, MINORISH.has(id));
  const notes = shape.map(([ds, df, finger, degreeLabel]) => {
    const s = rootString + ds;
    const f = r + df;
    const midi = midiAt(s, f);
    return { string: s, fret: f, finger, midi, degreeLabel, noteName: nameOf(midi), isRoot: degreeLabel === '1' || degreeLabel === '8' };
  });
  return { shapeNotes: notes, steps: timeline(upDown(notes), beats), rootFret: r };
}

// --------------------------------------------------------------- GROOVES
// A chord per bar of 4/4. `pattern(chord, next, nth)` returns
// [{ iv: semitones from the chord root (negative = below), beats, deg }].
const QUALITY = {
  maj: { third: 4, seventh: 11, suffix: '' },
  min: { third: 3, seventh: 10, suffix: 'm' },
  dom7: { third: 4, seventh: 10, suffix: '7' },
  m7: { third: 3, seventh: 10, suffix: 'm7' },
  maj7: { third: 4, seventh: 11, suffix: 'maj7' },
};
const I = (deg, q) => ({ deg, q });
const PROG = {
  pop: [I(0, 'maj'), I(7, 'maj'), I(9, 'min'), I(5, 'maj')], // I V vi IV
  rock: [I(0, 'maj'), I(5, 'maj'), I(7, 'maj'), I(5, 'maj')], // I IV V IV
  country: [I(0, 'maj'), I(5, 'maj'), I(7, 'maj'), I(0, 'maj')], // I IV V I
  ballad: [I(9, 'min'), I(5, 'maj'), I(0, 'maj'), I(7, 'maj')], // vi IV I V
  disco: [I(0, 'maj'), I(9, 'min'), I(5, 'maj'), I(7, 'maj')], // I vi IV V
  blues: [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7].map((d) => I(d, 'dom7')), // 12-bar
  twoFive: [I(2, 'm7'), I(7, 'dom7'), I(0, 'maj7'), I(9, 'dom7')], // ii V I VI
};
const p = (iv, beats, deg) => ({ iv, beats, deg });
const PATTERNS = {
  roots: () => [p(0, 1, '1'), p(0, 1, '1'), p(0, 1, '1'), p(0, 1, '1')],
  eighths: () => Array.from({ length: 8 }, () => p(0, 0.5, '1')),
  // Root on 1, the 5th BELOW on 3 (the classic alternating country bass);
  // above when the 5th below would be under the low E.
  twoFeel: () => [p(0, 2, '1'), p(-5, 2, '5')],
  r585: () => [p(0, 1, '1'), p(7, 1, '5'), p(12, 1, '8'), p(7, 1, '5')],
  octaves: () => [0, 12, 0, 12, 0, 12, 0, 12].map((iv) => p(iv, 0.5, iv ? '8' : '1')),
  // 1-3-5-6 up, ♭7-6-5-3 down on the second bar of a chord (boogie).
  boogie: (c, next, nth) =>
    nth % 2 === 0 ? [p(0, 1, '1'), p(4, 1, '3'), p(7, 1, '5'), p(9, 1, '6')] : [p(10, 1, '♭7'), p(9, 1, '6'), p(7, 1, '5'), p(4, 1, '3')],
  // Walking: root, 3rd, 5th, then a half step BELOW the next chord's root.
  walk: (c, next) => {
    const q = QUALITY[c.q];
    let ap = (((next.deg - c.deg - 1) % 12) + 12) % 12; // semitones above this root
    if (ap === 0) ap = 11; // next chord on the same root: approach from below anyway
    return [p(0, 1, '1'), p(q.third, 1, q.third === 3 ? '♭3' : '3'), p(7, 1, '5'), p(ap > 7 ? ap - 12 : ap, 1, '→')];
  },
};

// Candidate spot for `midi` near a hand position anchored at `anchor`
// (index finger one fret below the root), preferring few string crossings.
function placeNear(midi, anchor, prevString) {
  let best = null;
  for (let s = 0; s < 4; s += 1) {
    const f = midi - BASS_TUNING[s].baseMidi;
    if (f < 0 || f > TOP_FRET) continue;
    if (f === 0 && anchor > 4) continue;
    const lo = anchor - 1;
    const hi = anchor + 3;
    const outside = f === 0 ? 1 : f < lo ? lo - f : f > hi ? f - hi : 0;
    const cost = outside * 3 + Math.abs(f - anchor) * 0.2 + Math.abs(s - prevString) * 0.35;
    if (!best || cost < best.cost) best = { s, f, cost };
  }
  return best;
}

export function buildGroove(grooveDef, { key = 0, rootString = 0 } = {}) {
  const chords = PROG[grooveDef.prog];
  const pattern = PATTERNS[grooveDef.pattern];
  const anchorFret = rootFret(key, rootString, 1);
  const nameOf = namer(key);
  const steps = [];
  const bars = [];
  let beat = 0;
  let prevString = rootString;
  // Chord roots on the E or A string, as close to the key's position as possible.
  const roots = chords.map((c) => {
    const rootPc = (key + c.deg) % 12;
    let root = null;
    for (const s of [0, 1]) {
      for (let f = rootFret(rootPc, s, 0); f <= TOP_FRET; f += 12) {
        const cost = Math.abs(f - anchorFret) + (s === rootString ? 0 : 0.5) + (f === 0 && anchorFret > 4 ? 6 : 0);
        if (!root || cost < root.cost) root = { s, f, cost };
      }
    }
    return root;
  });
  let run = 0;
  chords.forEach((c, i) => {
    run = i > 0 && chords[i - 1].deg === c.deg && chords[i - 1].q === c.q ? run + 1 : 0;
    const next = chords[(i + 1) % chords.length];
    const root = roots[i];
    const nextRoot = roots[(i + 1) % chords.length];
    const rootMidi = midiAt(root.s, root.f);
    const name = nameOf(rootMidi) + QUALITY[c.q].suffix;
    bars.push({ name, startBeat: beat, rootString: root.s, rootFret: root.f });
    const handAnchor = Math.max(1, root.f);
    pattern(c, next, run).forEach((n) => {
      // The 5th below (two-feel) sits on the next LOWER string, same fret;
      // with the root already on the E string it becomes the 5th above.
      const iv = n.iv === -5 && root.s === 0 ? 7 : n.iv;
      let midi = rootMidi + iv;
      if (midi < BASS_TUNING[0].baseMidi) midi += 12; // under the low E: an octave up
      let spot;
      if (iv === 0) spot = { s: root.s, f: root.f };
      else if (n.deg === '→' && nextRoot.f >= 1) {
        // Approach note: one fret under the next root, on its string — the
        // hand moves there on beat 4 and the line slides into the new chord.
        spot = { s: nextRoot.s, f: nextRoot.f - 1 };
      } else spot = placeNear(midi, handAnchor, prevString) ?? { s: root.s, f: root.f };
      prevString = spot.s;
      steps.push({
        string: spot.s,
        fret: spot.f,
        midi: midiAt(spot.s, spot.f),
        noteName: nameOf(midiAt(spot.s, spot.f)),
        degreeLabel: n.deg,
        isRoot: iv % 12 === 0,
        beat,
        beats: n.beats,
        bar: i,
      });
      beat += n.beats;
    });
  });
  // Fingers: one finger per fret from the hand position each bar's notes need.
  bars.forEach((b, i) => {
    const inBar = steps.filter((s) => s.bar === i && s.fret > 0 && s.degreeLabel !== '→');
    if (inBar.length) {
      const index = Math.min(...inBar.map((s) => s.fret)); // index finger on the bar's lowest fret
      inBar.forEach((s) => {
        s.finger = Math.max(1, Math.min(4, s.fret - index + 1));
      });
    }
    // The approach note leads into the next bar's root with the finger below it.
    steps.filter((s) => s.bar === i && s.degreeLabel === '→').forEach((s) => {
      s.finger = 1;
    });
  });
  steps.filter((s) => s.fret === 0).forEach((s) => {
    s.finger = 0;
  });
  return { steps, bars, totalBeats: beat };
}

// ---------------------------------------------------------------- CATALOG
const T = (en, he) => ({ en, he });
// Hebrew strings: Latin / number tokens are wrapped in LRI…PDI so the bidi
// algorithm can't reorder them (e.g. "1-2-4", "i-m").
const L = (s) => '⁦' + s + '⁩';

export const CATEGORIES = [
  { key: 'technique', label: T('Technique', 'טכניקה') },
  { key: 'scales', label: T('Scales', 'סולמות') },
  { key: 'arpeggios', label: T('Arpeggios', 'ארפג׳יו') },
  { key: 'grooves', label: T('Grooves', 'גרוב') },
];

export const LEVELS = { 1: T('Beginner', 'מתחיל'), 2: T('Intermediate', 'בינוני'), 3: T('Advanced', 'מתקדם') };

export const EXERCISES = [
  // ---- technique
  {
    id: 'pluck-im', cat: 'technique', level: 1, bpm: 70, build: pluckAlternation, labels: 'finger',
    title: T('Alternate plucking (i-m) on open strings', 'פריטה מתחלפת (' + L('i-m') + ') על מיתרים פתוחים'),
    how: T(
      'Four eighth notes on each open string, E to G. Alternate index (i) and middle (m) — never the same finger twice in a row. Rest stroke: after plucking, the finger lands on the next lower string. Rest your thumb on the pickup.',
      'ארבע שמיניות על כל מיתר פתוח, מ־' + L('E') + ' עד ' + L('G') + '. מחליפים אצבע מורה (' + L('i') + ') ואמה (' + L('m') + ') — אף פעם לא אותה אצבע פעמיים ברצף. פריטה עם נחיתה: אחרי הפריטה האצבע נוחתת על המיתר הנמוך הבא. האגודל נח על הפיקאפ.'
    ),
    why: T('Even volume and steady timing start in the plucking hand — every bass method begins here.', 'עוצמה אחידה ותזמון יציב מתחילים ביד הפורטת — כל שיטת לימוד בס מתחילה כאן.'),
  },
  {
    id: 'chromatic-5th', cat: 'technique', level: 1, bpm: 60, build: chromatic5th, labels: 'finger',
    title: T('Chromatic 1-2-3-4 at the 5th fret', 'כרומטי ' + L('1-2-3-4') + ' בשריג ' + L('5')),
    how: T(
      'One finger per fret, frets 5-8, up across all four strings and back down. Keep each finger down until the next one is placed; thumb behind the neck, opposite the 2nd finger.',
      'אצבע לכל שריג, שריגים ' + L('5-8') + ', עולים על כל ארבעת המיתרים ויורדים חזרה. כל אצבע נשארת לחוצה עד שהבאה מונחת; האגודל מאחורי הצוואר, מול האצבע השנייה.'
    ),
    why: T('Bass frets are wide: teachers start one-finger-per-fret at the 5th position, where the stretch is easier, and move lower as the hand opens up.', 'השריגים בבס רחבים: מורים מתחילים "אצבע לכל שריג" בפוזיציה ' + L('5') + ', שם המתיחה קלה יותר, ויורדים נמוך יותר כשהיד נפתחת.'),
  },
  {
    id: 'simandl-124', cat: 'technique', level: 1, bpm: 60, build: simandl, labels: 'finger',
    title: T('Simandl fingering 1-2-4 (1st position)', 'אצבוע סימנדל ' + L('1-2-4') + ' (פוזיציה ראשונה)'),
    how: T(
      'Frets 1-2-3 on each string with fingers 1-2-4 — the ring finger helps the pinky but does not play alone. Up all strings and back down.',
      'שריגים ' + L('1-2-3') + ' בכל מיתר עם אצבעות ' + L('1-2-4') + ' — הקמיצה עוזרת לזרת אבל לא מנגנת לבד. עולים על כל המיתרים ויורדים.'
    ),
    why: T('The standard double-bass fingering, used by many electric players in the low positions where 1-2-3-4 over four frets is a big stretch.', 'האצבוע התקני בקונטרבס, וגם הרבה נגני בס חשמלי משתמשים בו בפוזיציות הנמוכות, שבהן ' + L('1-2-3-4') + ' על ארבעה שריגים היא מתיחה גדולה.'),
  },
  {
    id: 'octaves', cat: 'technique', level: 1, bpm: 70, build: octaves, labels: 'degree',
    title: T('Octave shape', 'צורת האוקטבה'),
    how: T(
      'Root with the index, the octave two strings higher and two frets up with the pinky (or ring finger). G, A, C, D — mute the string in between with the fretting fingers.',
      'השורש עם המורה, האוקטבה שני מיתרים מעל ושני שריגים קדימה עם הזרת (או הקמיצה). ' + L('G, A, C, D') + ' — משתיקים את המיתר שבאמצע עם אצבעות היד השמאלית.'
    ),
    why: T('The octave is the bass player\'s ruler: find any root\'s octave instantly, and it is the basis of disco/funk octave grooves.', 'האוקטבה היא הסרגל של הבסיסט: מוצאים מיד את האוקטבה של כל שורש, והיא הבסיס לגרובים של אוקטבות בדיסקו ובפאנק.'),
  },
  {
    id: 'raking', cat: 'technique', level: 2, bpm: 70, build: raking, labels: 'note',
    title: T('String crossing and raking', 'מעבר מיתרים וגריפה (raking)'),
    how: T(
      'Index on fret 5, rolling across the strings G-D-A-E and back. Going down to a lower string, let the same plucking finger "rake" onto it; going up, keep alternating.',
      'המורה על שריג ' + L('5') + ', מתגלגלת על המיתרים ' + L('G-D-A-E') + ' וחזרה. כשיורדים למיתר נמוך יותר, אותה אצבע פורטת "גורפת" אליו; כשעולים, ממשיכים להחליף.'
    ),
    why: T('Clean string changes without wasted motion — the plucking-hand skill behind fast lines.', 'מעברי מיתרים נקיים בלי תנועות מיותרות — המיומנות של היד הפורטת שמאחורי קווים מהירים.'),
  },
  {
    id: 'perm-1324', cat: 'technique', level: 2, bpm: 60, build: permutation1324, labels: 'finger',
    title: T('Finger permutation 1-3-2-4', 'פרמוטציית אצבעות ' + L('1-3-2-4')),
    how: T(
      'Frets 5-7-6-8 (fingers 1-3-2-4) on each string, up and back down (4-2-3-1). Slow and even; fingers stay close to the strings.',
      'שריגים ' + L('5-7-6-8') + ' (אצבעות ' + L('1-3-2-4') + ') בכל מיתר, עולים ויורדים (' + L('4-2-3-1') + '). לאט ושווה; האצבעות נשארות קרובות למיתרים.'
    ),
    why: T('Finger independence: permutations break the habit of fingers moving together.', 'עצמאות אצבעות: פרמוטציות שוברות את ההרגל של אצבעות שזזות יחד.'),
  },
  {
    id: 'shift-climb', cat: 'technique', level: 2, bpm: 60, build: shiftClimb, labels: 'finger',
    title: T('Shifting climb', 'טיפוס עם תזוזות'),
    how: T(
      'Four frets per string, starting one fret higher on each string (5-8, 6-9, 7-10, 8-11), then back down. Shift the whole hand with the thumb — don\'t stretch.',
      'ארבעה שריגים בכל מיתר, ובכל מיתר מתחילים שריג אחד גבוה יותר (' + L('5-8, 6-9, 7-10, 8-11') + '), ואז יורדים. מזיזים את כל היד עם האגודל — לא מותחים.'
    ),
    why: T('Smooth position shifts keep long lines connected up and down the neck.', 'תזוזות פוזיציה חלקות שומרות על קווים ארוכים מחוברים לאורך הצוואר.'),
  },
  // ---- scales (keyed)
  ...[
    ['major', 1, T('Major scale', 'סולם מז׳ור'), T('Root with finger 2. 1-2-3-4-5-6-7-8 and back down. Moves to any key: the shape stays, the root moves.', 'השורש עם אצבע ' + L('2') + '. ' + L('1-2-3-4-5-6-7-8') + ' וחזרה למטה. עובר לכל טון: הצורה נשארת, השורש זז.'), T('The reference every other scale and chord is measured against.', 'נקודת הייחוס שכל סולם ואקורד אחר נמדדים לפיה.')],
    ['minor', 1, T('Natural minor scale', 'סולם מינור טבעי'), T('Root with finger 1: 1-2-♭3-4-5-♭6-♭7-8 and back. The ♭3 is what makes it minor.', 'השורש עם אצבע ' + L('1') + ': ' + L('1-2-♭3-4-5-♭6-♭7-8') + ' וחזרה. ה־' + L('♭3') + ' הוא מה שהופך אותו למינור.'), T('Most rock and pop in minor keys lives in this box.', 'רוב הרוק והפופ בטונים מינוריים נמצא בקופסה הזו.')],
    ['minPent', 1, T('Minor pentatonic', 'פנטטוני מינור'), T('Five notes: 1-♭3-4-5-♭7. Root with finger 1.', 'חמישה צלילים: ' + L('1-♭3-4-5-♭7') + '. השורש עם אצבע ' + L('1') + '.'), T('The most used box in rock, blues and funk bass lines.', 'הקופסה הכי נפוצה בקווי בס של רוק, בלוז ופאנק.')],
    ['majPent', 1, T('Major pentatonic', 'פנטטוני מז׳ור'), T('1-2-3-5-6 — the major scale without 4 and 7. Root with finger 2.', L('1-2-3-5-6') + ' — סולם מז׳ור בלי ' + L('4') + ' ו־' + L('7') + '. השורש עם אצבע ' + L('2') + '.'), T('Safe, melodic fills over major chords — country, pop, soul.', 'מילויים בטוחים ומלודיים מעל אקורדי מז׳ור — קאנטרי, פופ, סול.')],
    ['blues', 2, T('Blues scale', 'סולם בלוז'), T('Minor pentatonic plus the ♭5: 1-♭3-4-♭5-5-♭7.', 'פנטטוני מינור ועוד ' + L('♭5') + ': ' + L('1-♭3-4-♭5-5-♭7') + '.'), T('The ♭5 passing note gives blues and rock lines their bite.', 'צליל המעבר ' + L('♭5') + ' נותן לקווי בלוז ורוק את העוקץ.')],
    ['mixolydian', 2, T('Mixolydian (dominant) scale', 'מיקסולידי (סולם הדומיננט)'), T('The major scale with a ♭7: 1-2-3-4-5-6-♭7-8.', 'סולם מז׳ור עם ' + L('♭7') + ': ' + L('1-2-3-4-5-6-♭7-8') + '.'), T('The scale of a dominant 7 chord — blues, funk and the V chord.', 'הסולם של אקורד ספטים דומיננטי — בלוז, פאנק ואקורד ה־' + L('V') + '.')],
  ].map(([id, level, title, how, why]) => ({ id: 'scale-' + id, cat: 'scales', level, bpm: 70, keyed: true, shape: 'scale:' + id, labels: 'degree', title, how, why })),
  // ---- arpeggios (keyed)
  ...[
    ['r58', 1, T('Root - 5th - octave', 'שורש – קווינטה – אוקטבה'), T('Root (finger 1), 5th one string up two frets (3), octave two strings up two frets (4).', 'שורש (אצבע ' + L('1') + '), קווינטה מיתר אחד מעל ושני שריגים קדימה (' + L('3') + '), אוקטבה שני מיתרים מעל ושני שריגים קדימה (' + L('4') + ').'), T('Fits over any major or minor chord — the backbone of countless lines.', 'מתאים מעל כל אקורד מז׳ור או מינור — עמוד השדרה של אינספור קווים.')],
    ['major', 1, T('Major triad 1-3-5-8', 'משולש מז׳ור ' + L('1-3-5-8')), T('Root with finger 2, the 3rd one string up one fret back (finger 1), 5th and octave with the pinky.', 'השורש עם אצבע ' + L('2') + ', הטרצה מיתר אחד מעל ושריג אחד אחורה (אצבע ' + L('1') + '), הקווינטה והאוקטבה עם הזרת.'), T('Chord tones: root, 3rd, 5th. C major = C E G.', 'צלילי האקורד: יסוד, טרצה, קווינטה. ' + L('C') + ' מז׳ור = ' + L('C E G') + '.')],
    ['minor', 1, T('Minor triad 1-♭3-5-8', 'משולש מינור ' + L('1-♭3-5-8')), T('Root with finger 1, ♭3 three frets up on the same string (finger 4), 5th and octave with finger 3.', 'השורש עם אצבע ' + L('1') + ', ה־' + L('♭3') + ' שלושה שריגים קדימה באותו מיתר (אצבע ' + L('4') + '), הקווינטה והאוקטבה עם אצבע ' + L('3') + '.'), T('A minor = A C E — only the 3rd differs from major.', L('A') + ' מינור = ' + L('A C E') + ' — רק הטרצה שונה ממז׳ור.')],
    ['dom7', 2, T('Dominant 7 arpeggio 1-3-5-♭7', 'ארפג׳יו ספטים דומיננטי ' + L('1-3-5-♭7')), T('Major triad plus the ♭7 (finger 2, two strings above the root on the same fret).', 'משולש מז׳ור ועוד ' + L('♭7') + ' (אצבע ' + L('2') + ', שני מיתרים מעל השורש באותו שריג).'), T('G7 = G B D F — the chord of the blues and of every V–I.', L('G7') + ' = ' + L('G B D F') + ' — האקורד של הבלוז ושל כל ' + L('V–I') + '.')],
    ['maj7', 2, T('Major 7 arpeggio 1-3-5-7', 'ארפג׳יו מז׳ור ספטים ' + L('1-3-5-7')), T('Major triad plus the 7, a half step under the octave (finger 3).', 'משולש מז׳ור ועוד ה־' + L('7') + ', חצי טון מתחת לאוקטבה (אצבע ' + L('3') + ').'), T('Cmaj7 = C E G B — the I chord in jazz and soul.', L('Cmaj7') + ' = ' + L('C E G B') + ' — אקורד ה־' + L('I') + ' בג׳אז ובסול.')],
    ['m7', 2, T('Minor 7 arpeggio 1-♭3-5-♭7', 'ארפג׳יו מינור ספטים ' + L('1-♭3-5-♭7')), T('Minor triad plus the ♭7 (finger 1, two strings above the root on the same fret).', 'משולש מינור ועוד ' + L('♭7') + ' (אצבע ' + L('1') + ', שני מיתרים מעל השורש באותו שריג).'), T('Dm7 = D F A C — the ii chord of ii–V–I, the walking-bass workhorse.', L('Dm7') + ' = ' + L('D F A C') + ' — אקורד ה־' + L('ii') + ' ב־' + L('ii–V–I') + ', סוס העבודה של ה־' + L('walking') + '.')],
  ].map(([id, level, title, how, why]) => ({ id: 'arp-' + id, cat: 'arpeggios', level, bpm: 70, keyed: true, shape: 'arp:' + id, labels: 'degree', title, how, why })),
  // ---- grooves (keyed)
  {
    id: 'groove-roots', cat: 'grooves', level: 1, bpm: 80, keyed: true, groove: { prog: 'pop', pattern: 'roots' }, labels: 'note',
    title: T('Roots on the beat (I–V–vi–IV)', 'שורשים על הפעמה (' + L('I–V–vi–IV') + ')'),
    how: T('Four quarter notes on each chord\'s root, locked to the click. Let each note ring its full length, then mute it just before the next.', 'ארבעה רבעים על השורש של כל אקורד, נעולים על הקליק. כל צליל מצלצל עד הסוף, ומשתיקים אותו רגע לפני הבא.'),
    why: T('The bass player\'s first job: the root, on time, every time.', 'התפקיד הראשון של הבסיסט: השורש, בזמן, בכל פעם.'),
  },
  {
    id: 'groove-eighths', cat: 'grooves', level: 1, bpm: 80, keyed: true, groove: { prog: 'rock', pattern: 'eighths' }, labels: 'note',
    title: T('Driving eighths (rock, I–IV–V–IV)', 'שמיניות דוחפות (רוק, ' + L('I–IV–V–IV') + ')'),
    how: T('Eight even eighth notes per bar on the root, alternating i-m. Every note the same length and volume.', 'שמונה שמיניות שוות בכל תיבה על השורש, בהחלפת ' + L('i-m') + '. כל צליל באותו אורך ובאותה עוצמה.'),
    why: T('Steady eighths are the engine of rock and punk — and the best timing test there is.', 'שמיניות יציבות הן המנוע של רוק ופאנק — ומבחן התזמון הטוב ביותר שיש.'),
  },
  {
    id: 'groove-twofeel', cat: 'grooves', level: 1, bpm: 90, keyed: true, groove: { prog: 'country', pattern: 'twoFeel' }, labels: 'degree',
    title: T('Root – 5th two-feel (country, I–IV–V–I)', 'שורש – קווינטה ב"שתיים" (קאנטרי, ' + L('I–IV–V–I') + ')'),
    how: T('Root on beat 1, the 5th below on beat 3 (half notes). The 5th sits on the next lower string, same fret.', 'השורש בפעמה ' + L('1') + ', הקווינטה מתחת בפעמה ' + L('3') + ' (חצאים). הקווינטה נמצאת במיתר הנמוך הבא, באותו שריג.'),
    why: T('The alternating bass of country, folk and two-beat feels.', 'הבס המתחלף של קאנטרי, פולק ותחושות "שתיים".'),
  },
  {
    id: 'groove-r585', cat: 'grooves', level: 2, bpm: 80, keyed: true, groove: { prog: 'ballad', pattern: 'r585' }, labels: 'degree',
    title: T('Root – 5th – octave – 5th (vi–IV–I–V)', 'שורש – קווינטה – אוקטבה – קווינטה (' + L('vi–IV–I–V') + ')'),
    how: T('Quarter notes 1-5-8-5 on every chord, using the root-5th-octave shape.', 'רבעים ' + L('1-5-8-5') + ' על כל אקורד, בצורת שורש–קווינטה–אוקטבה.'),
    why: T('Outlines each chord without the 3rd, so it fits major and minor alike — pop and ballad standard.', 'משרטט כל אקורד בלי הטרצה, ולכן מתאים גם למז׳ור וגם למינור — סטנדרט בפופ ובבלדות.'),
  },
  {
    id: 'groove-octaves', cat: 'grooves', level: 2, bpm: 90, keyed: true, groove: { prog: 'disco', pattern: 'octaves' }, labels: 'degree',
    title: T('Octave groove (disco / funk, I–vi–IV–V)', 'גרוב אוקטבות (דיסקו / פאנק, ' + L('I–vi–IV–V') + ')'),
    how: T('Eighths alternating root and octave: root on the beat, octave on the "and". Keep the octave short.', 'שמיניות מתחלפות בין שורש לאוקטבה: השורש על הפעמה, האוקטבה על ה"ו". האוקטבה קצרה.'),
    why: T('The classic dance-floor bass pattern; trains the octave shape at tempo.', 'דפוס הבס הקלאסי של רחבת הריקודים; מאמן את צורת האוקטבה בקצב.'),
  },
  {
    id: 'groove-boogie', cat: 'grooves', level: 2, bpm: 90, keyed: true, groove: { prog: 'blues', pattern: 'boogie' }, labels: 'degree',
    title: T('12-bar blues boogie 1-3-5-6', 'בוגי בלוז ' + L('12') + ' תיבות ' + L('1-3-5-6')),
    how: T('1-3-5-6 up, then ♭7-6-5-3 down on the next bar of the same chord, through the 12-bar blues (I7 IV7 V7).', L('1-3-5-6') + ' עולים, ואז ' + L('♭7-6-5-3') + ' יורדים בתיבה הבאה של אותו אקורד, לאורך בלוז ' + L('12') + ' תיבות (' + L('I7 IV7 V7') + ').'),
    why: T('The line under early rock\'n\'roll and blues; learns the 12-bar form by heart.', 'הקו שמתחת לרוקנרול ולבלוז המוקדמים; מלמד את מבנה ה־' + L('12') + ' תיבות בעל־פה.'),
  },
  {
    id: 'groove-walk', cat: 'grooves', level: 3, bpm: 80, keyed: true, groove: { prog: 'twoFive', pattern: 'walk' }, labels: 'degree',
    title: T('Walking bass ii–V–I–VI', 'Walking bass ' + L('ii–V–I–VI')),
    how: T('One quarter note per beat: root on beat 1, then 3rd and 5th, and on beat 4 a chromatic approach — a half step below the next chord\'s root (→).', 'רבע בכל פעמה: השורש בפעמה ' + L('1') + ', אחריו הטרצה והקווינטה, ובפעמה ' + L('4') + ' צליל התקרבות כרומטי — חצי טון מתחת לשורש של האקורד הבא (→).'),
    why: T('How jazz bassists build lines: chord tones on the strong beats, an approach note leading into the next chord.', 'כך נגני בס בג׳אז בונים קו: צלילי אקורד על הפעמות החזקות, וצליל התקרבות שמוביל לאקורד הבא.'),
  },
  {
    id: 'groove-walkblues', cat: 'grooves', level: 3, bpm: 80, keyed: true, groove: { prog: 'blues', pattern: 'walk' }, labels: 'degree',
    title: T('Walking blues (12 bars)', 'Walking בלוז (' + L('12') + ' תיבות)'),
    how: T('The same walking recipe — 1, 3, 5, approach — through the 12-bar blues.', 'אותו מתכון של ' + L('walking') + ' — ' + L('1, 3, 5') + ', התקרבות — לאורך בלוז ' + L('12') + ' תיבות.'),
    why: T('Joins the 12-bar form and walking: the standard jam-session bass part.', 'מחבר את מבנה ה־' + L('12') + ' תיבות עם ' + L('walking') + ': תפקיד הבס הסטנדרטי בג׳אם.'),
  },
];

export const exerciseById = (id) => EXERCISES.find((e) => e.id === id) ?? null;

/** Builds the playable exercise: { steps, shapeNotes, bars, totalBeats }. */
export function buildExercise(ex, { key = 0, rootString = 0 } = {}) {
  if (!ex) return null;
  if (ex.build) {
    const steps = ex.build().map((s) => ({
      ...s,
      noteName: s.noteName ?? SHARPS[s.midi % 12],
      degreeLabel: s.degreeLabel ?? '',
    }));
    const last = steps[steps.length - 1];
    return { steps, shapeNotes: uniqueSpots(steps), bars: null, totalBeats: last.beat + last.beats };
  }
  if (ex.shape) {
    const { steps, shapeNotes } = buildShape(ex.shape, { key, rootString, beats: 1 });
    const last = steps[steps.length - 1];
    return { steps, shapeNotes, bars: null, totalBeats: last.beat + last.beats };
  }
  const g = buildGroove(ex.groove, { key, rootString });
  return { ...g, shapeNotes: null };
}

function uniqueSpots(steps) {
  const seen = new Map();
  steps.forEach((s) => {
    const k = s.string + ':' + s.fret;
    if (!seen.has(k)) seen.set(k, s);
  });
  return [...seen.values()];
}
