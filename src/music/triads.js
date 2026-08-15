import { STANDARD_TUNING, MAX_FRET, mod } from './notes';

// The four playable "3 adjacent strings" sets, by string index (0 = low E ... 5 = high E).
// Ordered highest strings first (3-2-1, the ones players reach for most on
// guitar) down to lowest (6-5-4), since that's the order we want them
// displayed/cycled through in triad mode.
const STRING_SETS = [
  { indices: [3, 4, 5] }, // strings 3-2-1
  { indices: [2, 3, 4] }, // strings 4-3-2
  { indices: [1, 2, 3] }, // strings 5-4-3
  { indices: [0, 1, 2] }, // strings 6-5-4
];

// Which chord tone sits on the lowest string of the set, low to high.
const INVERSIONS = [
  { name: 'Root position', order: ['root', 'third', 'fifth'] },
  { name: '1st inversion', order: ['third', 'fifth', 'root'] },
  { name: '2nd inversion', order: ['fifth', 'root', 'third'] },
];

function stringSetLabel(stringSet) {
  return stringSet.indices.map((i) => STANDARD_TUNING[i].stringNumber).join('-');
}

// Every 3-notes-per-string-set triad position for a chord: root/3rd/5th only
// (a 7th chord's extra tone is ignored in triad mode), one note per string,
// so there's never a duplicated pitch class. `tones` is the quality's
// root/third/fifth entries ({role, semitones}).
export function enumerateTriadPositions(rootPitchClass, tones) {
  const semitonesByRole = Object.fromEntries(tones.map((t) => [t.role, t.semitones]));
  const results = [];

  STRING_SETS.forEach((stringSet, stringSetOrder) => {
    for (const inversion of INVERSIONS) {
      for (let baseOctave = 0; baseOctave <= 2; baseOctave += 1) {
        let prevFret = null;
        const frets = [];
        let ok = true;

        for (let i = 0; i < 3; i += 1) {
          const stringIndex = stringSet.indices[i];
          const role = inversion.order[i];
          const openPitch = STANDARD_TUNING[stringIndex].pitchClass;
          const targetPitch = mod(rootPitchClass + semitonesByRole[role], 12);
          const base = mod(targetPitch - openPitch, 12);

          let fret;
          if (prevFret === null) {
            fret = base + 12 * baseOctave;
          } else {
            // Closest octave of this note to the previous string's fret, so
            // the three notes stay physically close together on the neck.
            fret = [base, base + 12, base + 24].reduce((best, c) =>
              Math.abs(c - prevFret) < Math.abs(best - prevFret) ? c : best
            );
          }
          if (fret > MAX_FRET) {
            ok = false;
            break;
          }
          frets.push({ stringIndex, fret, role });
          prevFret = fret;
        }
        if (!ok) continue;

        const strings = STANDARD_TUNING.map(() => ({ fret: null }));
        for (const f of frets) strings[f.stringIndex] = { fret: f.fret, role: f.role };

        results.push({
          shapeName: `Strings ${stringSetLabel(stringSet)} — ${inversion.name}`,
          baseFret: Math.min(...frets.map((f) => f.fret)),
          lowestRole: inversion.order[0],
          stringSetOrder,
          strings,
        });
      }
    }
  });

  const seen = new Map();
  for (const p of results) {
    const key = p.strings.map((s) => (s.fret === null ? 'x' : s.fret)).join('-');
    if (!seen.has(key)) seen.set(key, p);
  }
  // Grouped by string set (highest strings first), then by fret within each group.
  const deduped = [...seen.values()];
  deduped.sort((a, b) => a.stringSetOrder - b.stringSetOrder || a.baseFret - b.baseFret);
  return deduped;
}
