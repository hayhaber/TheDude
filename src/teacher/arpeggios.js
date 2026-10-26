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

  // ---- Tapping (lesson g4-tapping, Lick Trainer genre 'tapping') ----------
  // notes: [stringNumber, fret, finger] — finger 'T' = TAPPED by the picking
  // hand's middle finger, 1-4 = fretting hand. `seq` = play order (indices
  // into notes, repeats allowed). `scale` = label every note by its interval
  // from the root (not only chord tones). `gap` = s between notes for Hear.
  // Basic tap + pull-off: B string, index holds E (fret 5), tap B (fret 12).
  'tap-pull': { root: 4, type: 'minor', scale: true, gap: 0.3, notes: [[2, 5, 1], [2, 12, 'T']], seq: [1, 0, 1, 0, 1, 0, 1, 0] },
  // The classic triplet: tap 12, pull off to 5, hammer 8 — A minor's
  // 5th (E), root (A), 3rd (C) on the high E string.
  'tap-Am': { root: 9, type: 'minor', gap: 0.17, notes: [[1, 5, 1], [1, 8, 4], [1, 12, 'T']], seq: [2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1] },
  // Am - F - C - G with the same tap / pull / hammer, two cycles each.
  // Am -> F: the fretting hand stays (A, C are in both chords), only the tap moves 12 -> 13.
  'tap-Am2': { root: 9, type: 'minor', gap: 0.17, notes: [[1, 5, 1], [1, 8, 4], [1, 12, 'T']], seq: [2, 0, 1, 2, 0, 1] },
  'tap-F': { root: 5, type: 'major', gap: 0.17, notes: [[1, 5, 1], [1, 8, 4], [1, 13, 'T']], seq: [2, 0, 1, 2, 0, 1] },
  'tap-C': { root: 0, type: 'major', gap: 0.17, notes: [[1, 8, 1], [1, 12, 4], [1, 15, 'T']], seq: [2, 0, 1, 2, 0, 1] },
  'tap-G': { root: 7, type: 'major', gap: 0.17, notes: [[1, 7, 1], [1, 10, 4], [1, 15, 'T']], seq: [2, 0, 1, 2, 0, 1] },
  // A tapped MELODY over a pedal note (the melodic style): index holds E on
  // the B string, the tap plays B C D E D C B (E natural minor), each tap
  // pulled off back to the pedal.
  'tap-melody': {
    root: 4, type: 'minor', scale: true, gap: 0.24,
    notes: [[2, 5, 1], [2, 12, 'T'], [2, 13, 'T'], [2, 15, 'T'], [2, 17, 'T']],
    seq: [1, 0, 2, 0, 3, 0, 4, 0, 3, 0, 2, 0, 1, 0],
  },
  // Tapping in a solo: A minor pentatonic box 1 (frets 5-8) + one tapped
  // note per string above the box. Tap - pull - pull triplets, high E then
  // B string, ending on the root A.
  'tap-penta': {
    root: 9, type: 'minor', scale: true, gap: 0.17,
    notes: [[1, 5, 1], [1, 8, 4], [1, 12, 'T'], [2, 5, 1], [2, 8, 4], [2, 10, 'T']],
    seq: [2, 1, 0, 2, 1, 0, 5, 4, 3, 5, 4, 3, 0],
  },
};

const INTERVAL = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
/** Seconds between notes when an arpeggio is played to the student. */
export const arpGap = (id) => ARPS[id]?.gap ?? null;

/** The notes of one or more shapes: {string (0 = low E), fret, midi, noteName, degreeLabel, isRoot}. */
export function arpNotes(ids) {
  const out = [];
  for (const id of [].concat(ids)) {
    const a = ARPS[id];
    if (!a) continue;
    const tones = chordTones(a.root, a.type);
    for (const [sn, fret, finger] of a.notes) {
      const midi = OPEN_MIDI[sn] + fret;
      const tone = tones.find((x) => x.pc === midi % 12);
      const iv = (((midi - a.root) % 12) + 12) % 12;
      const deg = a.scale ? INTERVAL[iv] : tone?.role === 'root' ? '1' : (tone?.interval ?? '').replace(/^R$/, '1');
      out.push({
        string: 6 - sn,
        fret,
        midi,
        noteName: tone?.name ?? NAMES[midi % 12],
        degreeLabel: deg,
        isRoot: a.scale ? iv === 0 : tone?.role === 'root',
        shape: id,
        ...(finger != null ? { finger, tapped: finger === 'T' } : {}),
      });
    }
  }
  return out;
}

/** Play order: each shape up (and back down when `updown`), shapes one after another. */
export function playOrder(ids, updown = false) {
  const list = [].concat(ids);
  // shapes with a written order (tapping patterns) follow it
  if (list.some((id) => ARPS[id]?.seq)) {
    return list.flatMap((id) => {
      const notes = arpNotes(id);
      return ARPS[id]?.seq ? ARPS[id].seq.map((k) => notes[k]) : notes;
    });
  }
  if (!updown) return arpNotes(list);
  return list.flatMap((id) => {
    const up = arpNotes(id);
    return [...up, ...up.slice(0, -1).reverse()];
  });
}
