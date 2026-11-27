// Triads across the neck (v1.0.264, user: "one chord on strings 1-3 in every
// position and inversion along the whole neck, then the next chord, then
// strings 2-4 …"). Pure: the path through the drill and the shapes of one
// item. The path follows the user's choices (2026-11-27): MAJOR first on
// every string set, then minor; the string sets from the top (3-2-1, 4-3-2,
// 5-4-3, 6-5-4); inside a set the 12 chords round the cycle of fourths
// (C F B♭ E♭ …) — the order the triad methods drill keys in (Naylor
// "Triads Inside Out", JustinGuitar's triad module, Berklee's chord-scale
// drills), and the order chords move in real songs.
import { ORDER, placements, SETS } from '../teacher/triadShapes';

export const QUALITIES = ['major', 'minor'];
export const STRING_SETS = ['321', '432', '543', '654'];
// the cycle of fourths, C first
export const CYCLE = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];
const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
// which chords are spelled with flats (their usual key signature)
const FLAT_ROOTS = { major: [5, 10, 3, 8, 1, 6], minor: [0, 5, 10, 3, 7, 2] };
const spell = (root, quality) => (FLAT_ROOTS[quality].includes(root) ? FLAT : SHARP);
const OPEN = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };
/** The highest fret a shape may reach (a common neck's last inlay). */
export const TOP_FRET = 15;

export const chordLabel = (root, quality) => spell(root, quality)[root] + (quality === 'minor' ? 'm' : '');
export const itemKey = ({ quality, set, root }) => `${quality}:${set}:${root}`;

/** Every item of the drill in order. */
export function drillPath() {
  const out = [];
  for (const quality of QUALITIES) for (const set of STRING_SETS) for (const root of CYCLE) out.push({ quality, set, root });
  return out;
}

const INVERSIONS = ['root', 'first', 'second'];

/**
 * The shapes of one chord on one string set, from the nut up: every root
 * position / 1st / 2nd inversion that fits frets 0..TOP_FRET. A shape =
 * {inversion, frets [3] low -> high string, notes [{string (0 = low E), fret,
 * midi, noteName, degreeLabel, isRoot}], low (its lowest fretted fret)}.
 */
export function neckShapes(root, quality, set) {
  const strings = SETS[set];
  const names = spell(root, quality);
  const third = quality === 'minor' ? 3 : 4;
  const out = [];
  for (const inv of INVERSIONS) {
    for (const frets of placements(root, quality, set, ORDER[inv])) {
      if (Math.max(...frets) > TOP_FRET) continue;
      const notes = frets.map((fret, k) => {
        const midi = OPEN[strings[k]] + fret;
        const iv = (((midi - root) % 12) + 12) % 12;
        const role = iv === 0 ? '1' : iv === third ? '3' : '5';
        return { string: 6 - strings[k], fret, midi, noteName: names[midi % 12], degreeLabel: role, isRoot: role === '1' };
      });
      const fretted = frets.filter((f) => f > 0);
      out.push({ inversion: inv, frets, notes, low: fretted.length ? Math.min(...fretted) : 0 });
    }
  }
  // up the neck: by the lowest fret, then by the highest
  out.sort((a, b) => a.low - b.low || Math.max(...a.frets) - Math.max(...b.frets));
  return out;
}

/** A shape as a 6-string frets array (low E first, null = not played) — for the chord check. */
export function sixFrets(shape, set) {
  const out = [null, null, null, null, null, null];
  SETS[set].forEach((sn, k) => {
    out[6 - sn] = shape.frets[k];
  });
  return out;
}

/**
 * Rivals for the strummed check: the same strings with the 3rd moved
 * (major <-> minor, the one note a wrong finger usually changes), and the
 * shape a fret lower / higher.
 */
export function rivalFrets(shape, set) {
  const six = sixFrets(shape, set);
  const out = [];
  const third = shape.notes.findIndex((n) => n.degreeLabel === '3');
  if (third >= 0) {
    const sn = SETS[set][third];
    const r = shape.notes.find((x) => x.isRoot).midi;
    const isMajor = (((shape.notes[third].midi - r) % 12) + 12) % 12 === 4;
    const moved = six.slice();
    const f = moved[6 - sn] + (isMajor ? -1 : 1);
    if (f >= 0) {
      moved[6 - sn] = f;
      out.push(moved);
    }
  }
  for (const d of [-1, 1]) {
    if (six.every((f) => f == null || f + d >= 0)) out.push(six.map((f) => (f == null ? null : f + d)));
  }
  return out;
}
