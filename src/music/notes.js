// Pitch classes: 0=C, 1=C#/Db, 2=D, ... 11=B
// Standard tuning, low string (6) to high string (1).
// baseMidi is the open string's actual pitch (E2=40, A2=45, D3=50, G3=55,
// B3=59, E4=64) — used for audio playback, where octave (not just pitch
// class) matters.
export const STANDARD_TUNING = [
  { stringNumber: 6, openNote: 'E', pitchClass: 4, baseMidi: 40 },
  { stringNumber: 5, openNote: 'A', pitchClass: 9, baseMidi: 45 },
  { stringNumber: 4, openNote: 'D', pitchClass: 2, baseMidi: 50 },
  { stringNumber: 3, openNote: 'G', pitchClass: 7, baseMidi: 55 },
  { stringNumber: 2, openNote: 'B', pitchClass: 11, baseMidi: 59 },
  { stringNumber: 1, openNote: 'E', pitchClass: 4, baseMidi: 64 },
];

export const MAX_FRET = 24;
export const FRET_MARKERS = [3, 5, 7, 9, 12, 15, 17, 19, 21];
export const DOUBLE_DOT_FRETS = [12, 24];

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export const NATURAL_PITCH_CLASS = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export function mod(n, m) {
  return ((n % m) + m) % m;
}
