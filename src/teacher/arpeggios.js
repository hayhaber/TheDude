// Arpeggio shapes for the teacher's lessons (pure). Each shape is a list of
// [stringNumber, fret] in PLAY ORDER (low to high), over one chord.
// stringNumber: 6 = low E … 1 = high E (standard tuning).
import { chordTones } from '../music/chordLibrary';

const OPEN_MIDI = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };

export const ARPS = {
  // the open C chord picked string by string (5 -> 1)
  'C-open': { root: 0, type: 'major', notes: [[5, 3], [4, 2], [3, 0], [2, 1], [1, 0]] },
  // the open Am chord picked string by string
  'Am-open': { root: 9, type: 'minor', notes: [[5, 0], [4, 2], [3, 2], [2, 1], [1, 0]] },
  // root on string 6 (the E-shape barre chord), G at fret 3 — two octaves
  'G-E': { root: 7, type: 'major', notes: [[6, 3], [5, 2], [5, 5], [4, 5], [3, 4], [2, 3], [1, 3]] },
  // root on string 5 (the A-shape barre chord), C at fret 3
  'C-A': { root: 0, type: 'major', notes: [[5, 3], [4, 2], [4, 5], [3, 5], [2, 5], [1, 3]] },
  // C triads on the top three strings, climbing the neck
  'C-top1': { root: 0, type: 'major', notes: [[3, 5], [2, 5], [1, 3]] }, // C E G  — root position
  'C-top2': { root: 0, type: 'major', notes: [[3, 9], [2, 8], [1, 8]] }, // E G C  — 1st inversion
  'C-top3': { root: 0, type: 'major', notes: [[3, 12], [2, 13], [1, 12]] }, // G C E — 2nd inversion
};

/** The notes of one or more shapes: {string (0 = low E), fret, midi, noteName, degreeLabel, isRoot}. */
export function arpNotes(ids) {
  const out = [];
  for (const id of [].concat(ids)) {
    const a = ARPS[id];
    if (!a) continue;
    const tones = chordTones(a.root, a.type);
    for (const [sn, fret] of a.notes) {
      const midi = OPEN_MIDI[sn] + fret;
      const tone = tones.find((x) => x.pc === midi % 12);
      const deg = tone?.role === 'root' ? '1' : (tone?.interval ?? '').replace(/^R$/, '1');
      out.push({ string: 6 - sn, fret, midi, noteName: tone?.name ?? '', degreeLabel: deg, isRoot: tone?.role === 'root', shape: id });
    }
  }
  return out;
}

/** Play order: each shape up (and back down when `updown`), shapes one after another. */
export function playOrder(ids, updown = false) {
  const list = [].concat(ids);
  if (!updown) return arpNotes(list);
  return list.flatMap((id) => {
    const up = arpNotes(id);
    return [...up, ...up.slice(0, -1).reverse()];
  });
}
