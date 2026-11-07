// Triad shapes for the Triads course (pure, no imports). Every shape is
// COMPUTED from theory — never typed by hand — so a wrong fret can't slip in:
// `tri(root, quality, strings, order, near)` puts the chord's tones on three
// strings in the given order (low -> high), each note the nearest one ABOVE
// the previous (close voicing on adjacent strings; a wider "spread" voicing
// when the strings skip one), in the place on the neck nearest `near`.
// Output = the ARPS format of teacher/arpeggios.js: {root, type, notes:
// [[stringNumber, fret], …]} (stringNumber 6 = low E … 1 = high E).

const OPEN = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };
export const QUALITY = { major: [0, 4, 7], minor: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8] };
// which chord tone (0 = root, 1 = 3rd, 2 = 5th) is played on each string, low -> high
export const ORDER = {
  root: [0, 1, 2], // root position: R 3 5
  first: [1, 2, 0], // 1st inversion: 3 5 R
  second: [2, 0, 1], // 2nd inversion: 5 R 3
  spreadRoot: [0, 2, 1], // spread root position: R 5 3
  spreadFirst: [1, 0, 2], // spread 1st inversion: 3 R 5
  spreadSecond: [2, 1, 0], // spread 2nd inversion: 5 3 R
};
export const SETS = { 321: [3, 2, 1], 432: [4, 3, 2], 543: [5, 4, 3], 654: [6, 5, 4], 643: [6, 4, 3], 532: [5, 3, 2], 421: [4, 2, 1] };

/** All playable placements of one triad (frets 0..19, span <= 5), nearest `near` first. */
export function placements(root, quality, set, order) {
  const iv = QUALITY[quality];
  const strings = SETS[set];
  const out = [];
  for (let f0 = 0; f0 <= 19; f0 += 1) {
    const p0 = OPEN[strings[0]] + f0;
    if ((((p0 - root) % 12) + 12) % 12 !== iv[order[0]]) continue;
    const pitches = [p0];
    for (let k = 1; k < 3; k += 1) {
      const pc = (root + iv[order[k]]) % 12;
      let p = pitches[k - 1] + 1;
      while (p % 12 !== pc) p += 1;
      pitches.push(p);
    }
    const frets = pitches.map((p, k) => p - OPEN[strings[k]]);
    if (frets.some((f) => f < 0 || f > 20)) continue;
    const fretted = frets.filter((f) => f > 0);
    const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
    if (span > 5) continue;
    out.push(frets);
  }
  return out;
}

const centre = (frets) => {
  const f = frets.filter((x) => x > 0);
  return f.length ? f.reduce((a, b) => a + b, 0) / f.length : 0;
};

/** One shape in ARPS format, placed nearest `near` (fret). */
export function tri(root, quality, set, order = 'root', near = 5) {
  const all = placements(root, quality, set, ORDER[order] ?? order);
  if (!all.length) throw new Error(`no triad ${root} ${quality} ${set} ${order}`);
  all.sort((a, b) => Math.abs(centre(a) - near) - Math.abs(centre(b) - near));
  const strings = SETS[set];
  return { root, type: quality, notes: all[0].map((f, k) => [strings[k], f]) };
}

const adjacent = (set) => {
  const s = SETS[set];
  return s[0] - s[1] === 1 && s[1] - s[2] === 1;
};

/**
 * Voice leading on one string set: for each chord {root, quality} the
 * inversion that moves least from the previous shape (every finger travels
 * the fewest frets; a common tone that stays = 0). The first chord is put
 * in `firstOrder` nearest `near`.
 */
export function leadPath(chords, set, { firstOrder = 'root', near = 5 } = {}) {
  const out = [];
  let prev = null;
  for (const c of chords) {
    let best;
    if (!prev) best = tri(c.root, c.quality, set, firstOrder, near);
    else {
      let bestCost = Infinity;
      const orders = adjacent(set) ? ['root', 'first', 'second'] : ['spreadRoot', 'spreadFirst', 'spreadSecond'];
      for (const order of orders) {
        for (const frets of placements(c.root, c.quality, set, ORDER[order])) {
          const cost = frets.reduce((a, f, k) => a + Math.abs(f - prev.notes[k][1]), 0);
          if (cost < bestCost) {
            bestCost = cost;
            best = { root: c.root, type: c.quality, notes: frets.map((f, k) => [SETS[set][k], f]) };
          }
        }
      }
    }
    out.push(best);
    prev = best;
  }
  return out;
}

// ---- the course's shapes (ids used by teacher/curriculum/triads.js) ---------
const C = 0, D = 2, E = 4, F = 5, G = 7, A = 9, B = 11;
const S = {};
const add = (id, shape) => {
  S[id] = shape;
};

// unit 1: one chord, four qualities (C, root position, strings 3-2-1)
for (const q of ['major', 'minor', 'dim', 'aug']) add(`t1-C-${q}`, tri(C, q, 321, 'root', 5));
// inversions of C on 3-2-1 (the ladder: root pos fret 5, 1st fret 8, 2nd fret 12)
add('t-C321-r', tri(C, 'major', 321, 'root', 4));
add('t-C321-1', tri(C, 'major', 321, 'first', 8));
add('t-C321-2', tri(C, 'major', 321, 'second', 12));
add('t-C321-8', tri(C, 'major', 321, 'root', 16)); // the octave: root position again
// G major on 3-2-1 (moving the shapes to another root)
add('t-G321-1', tri(G, 'major', 321, 'first', 3));
add('t-G321-2', tri(G, 'major', 321, 'second', 7));
add('t-G321-r', tri(G, 'major', 321, 'root', 11));
// unit 3: I - IV - V in one area (C, around fret 5) and a second area (around 9)
add('t3-C', tri(C, 'major', 321, 'root', 4));
add('t3-F', tri(F, 'major', 321, 'second', 5));
add('t3-G', tri(G, 'major', 321, 'first', 3.5));
add('t3b-C', tri(C, 'major', 321, 'first', 8));
add('t3b-F', tri(F, 'major', 321, 'root', 9));
add('t3b-G', tri(G, 'major', 321, 'second', 7.5));
// unit 4: strings 4-3-2 (C, and I-IV-V there)
add('t-C432-r', tri(C, 'major', 432, 'root', 10));
add('t-C432-1', tri(C, 'major', 432, 'first', 2));
add('t-C432-2', tri(C, 'major', 432, 'second', 5));
add('t4-C', tri(C, 'major', 432, 'second', 5));
add('t4-F', tri(F, 'major', 432, 'first', 5.5));
add('t4-G', tri(G, 'major', 432, 'root', 4));
// unit 5: strings 5-4-3 and 6-5-4 (G; the same shapes on the lowest set = D)
add('t-G543-r', tri(G, 'major', 543, 'root', 10));
add('t-G543-1', tri(G, 'major', 543, 'first', 3));
add('t-G543-2', tri(G, 'major', 543, 'second', 6));
add('t-D654-r', tri(D, 'major', 654, 'root', 10));
add('t-D654-1', tri(D, 'major', 654, 'first', 3));
add('t-D654-2', tri(D, 'major', 654, 'second', 6));
// unit 6: minor, diminished, augmented (A minor on 3-2-1 and 4-3-2; B dim; C aug)
add('t-Am321-r', tri(A, 'minor', 321, 'root', 2));
add('t-Am321-1', tri(A, 'minor', 321, 'first', 5.5));
add('t-Am321-2', tri(A, 'minor', 321, 'second', 9));
add('t-Am432-r', tri(A, 'minor', 432, 'root', 7));
add('t-Am432-1', tri(A, 'minor', 432, 'first', 11));
add('t-Am432-2', tri(A, 'minor', 432, 'second', 2));
add('t-Bdim321', tri(B, 'dim', 321, 'root', 4));
add('t-Bdim432', tri(B, 'dim', 432, 'root', 7));
add('t-Caug-a', tri(C, 'aug', 321, 'root', 4));
add('t-Caug-b', tri(C, 'aug', 321, 'first', 9));
add('t-Caug-c', tri(C, 'aug', 321, 'second', 13));
// unit 7: the chord scale of C major, 2nd inversion on strings 3-2-1 (frets 0-13)
const CMAJ = [
  [C, 'major'],
  [D, 'minor'],
  [E, 'minor'],
  [F, 'major'],
  [G, 'major'],
  [A, 'minor'],
  [B, 'dim'],
];
CMAJ.forEach(([r, q], k) => add(`t7-${k + 1}`, tri(r, q, 321, 'second', k === 0 ? 0 : 2 * k)));
add('t7-8', tri(C, 'major', 321, 'second', 12));
// unit 8: voice leading
const path = (prefix, chords, set, opts) => leadPath(chords.map(([root, quality]) => ({ root, quality })), set, opts).forEach((s, k) => add(`${prefix}-${k + 1}`, s));
path('t8a', [[C, 'major'], [A, 'minor'], [F, 'major'], [G, 'major']], 321, { firstOrder: 'root', near: 4 }); // I vi IV V
path('t8b', [[D, 'minor'], [G, 'major'], [C, 'major']], 432, { firstOrder: 'second', near: 7 }); // ii V I
path('t8c', [[C, 'major'], [F, 'major'], [B, 'dim'], [E, 'minor'], [A, 'minor'], [D, 'minor'], [G, 'major'], [C, 'major']], 321, { firstOrder: 'first', near: 8 }); // cycle of 4ths
path('t8d', [[C, 'major'], [G, 'major'], [A, 'minor'], [F, 'major']], 432, { firstOrder: 'root', near: 10 }); // I V vi IV
// unit 9: spread triads (G with the root on 6, C with the root on 5, F with the root on 4)
add('t9-close', tri(G, 'major', 432, 'root', 5));
add('t9-G', tri(G, 'major', 643, 'spreadRoot', 3));
add('t9-C', tri(C, 'major', 532, 'spreadRoot', 4));
add('t9-F', tri(F, 'major', 421, 'spreadRoot', 3));
add('t9-G1', tri(G, 'major', 532, 'spreadFirst', 3));
add('t9-G2', tri(G, 'major', 421, 'spreadSecond', 4));
path('t9p', [[G, 'major'], [C, 'major'], [D, 'major'], [G, 'major']], 643, { firstOrder: 'spreadRoot', near: 3 });
// unit 10: using them — upper structures, sus colour, a song progression
add('t10-Cover', tri(C, 'major', 321, 'root', 4)); // C triad over an A bass = Am7
add('t10-Fover', tri(F, 'major', 321, 'second', 5)); // F triad over a D bass = Dm7
add('t10-D', tri(D, 'major', 321, 'second', 2)); // the open-position D: A D F#
add('t10-Dsus4', { root: D, type: 'sus4', notes: [[3, 2], [2, 3], [1, 3]] }); // A D G
add('t10-Dsus2', { root: D, type: 'sus2', notes: [[3, 2], [2, 3], [1, 0]] }); // A D E
path('t10s', [[G, 'major'], [E, 'minor'], [C, 'major'], [D, 'major']], 321, { firstOrder: 'root', near: 12 }); // I vi IV V in G
path('t10f', [[A, 'minor'], [F, 'major'], [C, 'major'], [G, 'major']], 432, { firstOrder: 'first', near: 6 });

// ---- etudes (v1.0.135): a short piece at the end of a unit = its chords
// picked in a pattern (indices into the shape's three notes, low = 0), each
// copy keeps its own chord so the labels stay right. Our own.
const etude = (name, ids, seq) => ids.map((src, k) => {
  const id = `${name}-${k + 1}`;
  S[id] = { ...S[src], seq };
  return id;
});
export const ETUDES = {
  // unit 2: the C ladder, low - high - middle - high on each shape, up and down
  e2: etude('e2', ['t-C321-r', 't-C321-1', 't-C321-2', 't-C321-8', 't-C321-2', 't-C321-1', 't-C321-r'], [0, 2, 1, 2]),
  // unit 3: C F C G rolled (low - middle - high - middle)
  e3: etude('e3', ['t3-C', 't3-F', 't3-C', 't3-G', 't3-C'], [0, 1, 2, 1]),
  // unit 4: C F C G on 4-3-2, high - low - middle - low
  e4: etude('e4', ['t4-C', 't4-F', 't4-C', 't4-G', 't4-C'], [2, 0, 1, 0]),
  // unit 5: G and D low riff, bass - top - middle - top
  e5: etude('e5', ['t-G543-2', 't-D654-2', 't-G543-2', 't-D654-2', 't-G543-2'], [0, 2, 1, 2]),
  // unit 6: A minor i - iv - V - i (Am Dm E Am), led on 3-2-1
  e6: (() => {
    path('t6e', [[A, 'minor'], [D, 'minor'], [E, 'major'], [A, 'minor']], 321, { firstOrder: 'first', near: 5 });
    return etude('e6', ['t6e-1', 't6e-2', 't6e-3', 't6e-4'], [0, 1, 2, 1]);
  })(),
  // unit 7: the chord scale picked downwards on each chord (high - middle - low)
  e7: etude('e7', ['t7-1', 't7-2', 't7-3', 't7-4', 't7-5', 't7-6', 't7-7', 't7-8'], [2, 1, 0]),
  // unit 8: C Am F G, twice, the top voice carries the melody (top - middle - low - middle)
  e8: etude('e8', ['t8a-1', 't8a-2', 't8a-3', 't8a-4', 't8a-1', 't8a-2', 't8a-3', 't8a-4'], [2, 1, 0, 1]),
  // unit 9: fingerstyle G C D G, thumb - finger - finger - finger
  e9: etude('e9', ['t9p-1', 't9p-2', 't9p-3', 't9p-4'], [0, 1, 2, 1]),
  // unit 10: G Em C D, bass - top - middle - top
  e10: etude('e10', ['t10s-1', 't10s-2', 't10s-3', 't10s-4', 't10s-1'], [0, 2, 1, 2]),
};

export const TRIAD_ARPS = S;
