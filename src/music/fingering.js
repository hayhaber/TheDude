// Assigns a standard, ergonomically-correct finger number (1=index,
// 2=middle, 3=ring, 4=pinky) to every fretted string in a position, given
// only the concrete frets being played — no per-shape authored data needed.
//
// The rule, verified against real chord-chart conventions:
//   - Open strings (fret 0) and muted strings (fret null) need no finger.
//   - Whichever fretted string(s) sit at the position's LOWEST fret get the
//     index finger (1) — this is exactly what a barre is (e.g. an E-shape
//     barre chord: the strings that were open in the equivalent open-chord
//     shape become the barre when the shape is moved up the neck). The
//     index always barres this group regardless of how many strings it
//     covers, since it's naturally lying flat across the whole fret as part
//     of normal hand position.
//   - Every other fret is handled group by group, ascending: a group of 1-2
//     strings gets that many separate fingers (2, 3, 4 in order) — matches
//     open C (index/middle/ring, one string each) and an F barre chord
//     (middle on G, then ring+pinky separately on D+A despite sharing a
//     fret — two adjacent fingertips fit two adjacent strings fine). A
//     group of 3+ strings at the same fret gets ONE shared finger (usually
//     ring or pinky) instead of one each — e.g. a C-shape barre chord's
//     D-G-B strings, fretted 2 frets above the index barre: three separate
//     fingertips can't actually fit on three adjacent strings at one fret
//     line, so real players (and this) barre them with a single finger.
//
// Returns an array the same length as `position.strings`, each entry either
// a finger number (1-4), 0 (open string), or null (muted).
export function assignFingers(position) {
  const strings = position.strings;

  const fretted = strings
    .map((s, index) => (s.fret !== null && s.fret > 0 ? { index, fret: s.fret } : null))
    .filter(Boolean);

  const fingerByIndex = new Map();

  if (fretted.length > 0) {
    const minFret = Math.min(...fretted.map((f) => f.fret));
    const barre = fretted.filter((f) => f.fret === minFret);
    barre.forEach((f) => fingerByIndex.set(f.index, 1));

    const remainingByFret = new Map();
    fretted
      .filter((f) => f.fret !== minFret)
      .forEach((f) => {
        if (!remainingByFret.has(f.fret)) remainingByFret.set(f.fret, []);
        remainingByFret.get(f.fret).push(f);
      });

    const fretsAscending = [...remainingByFret.keys()].sort((a, b) => a - b);
    let nextFinger = 2;
    fretsAscending.forEach((fret) => {
      const group = remainingByFret.get(fret).sort((a, b) => a.index - b.index);
      if (group.length >= 3) {
        // Can't fit 3+ separate fingertips on 3+ adjacent strings at one
        // fret line — one finger barres the whole group. The middle finger
        // never does this in practice (too awkward right next to an index
        // barre) — it's the ring or pinky, so skip past 2 even if nothing
        // else has claimed it yet.
        const finger = Math.min(Math.max(nextFinger, 3), 4);
        group.forEach((f) => fingerByIndex.set(f.index, finger));
        nextFinger = finger + 1;
      } else {
        group.forEach((f) => {
          fingerByIndex.set(f.index, Math.min(nextFinger, 4));
          nextFinger += 1;
        });
      }
    });
  }

  return strings.map((s, index) => {
    if (s.fret === null) return null;
    if (s.fret === 0) return 0;
    return fingerByIndex.get(index) ?? null;
  });
}
