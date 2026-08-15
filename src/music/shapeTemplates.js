// Hand-authored, pitch-verified chord shapes (CAGED-style), stored at their
// natural lowest position — which, for the root each shape is named after,
// IS the real open chord. `strings` is ordered low string (6) to high (1),
// matching STANDARD_TUNING in notes.js. `fret: null` means muted (not played).
// `role` is 'root' | 'third' | 'fifth' | 'seventh' | 'extension' — only
// root/third/fifth are colored in the default single-color-per-chord display;
// see chordQualities.js and music/noteFunction.js for how all five are used
// in Chord Tone Highlighting mode.
export const SHAPE_TEMPLATES = {
  major: [
    { // open E major: 0 2 2 1 0 0
      name: 'E-shape',
      strings: [
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 2, role: 'root' },
        { fret: 1, role: 'third' },
        { fret: 0, role: 'fifth' },
        { fret: 0, role: 'root' },
      ],
    },
    { // open A major: x 0 2 2 2 0
      name: 'A-shape',
      strings: [
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 2, role: 'root' },
        { fret: 2, role: 'third' },
        { fret: 0, role: 'fifth' },
      ],
    },
    { // open D major: x x 0 2 3 2
      name: 'D-shape',
      strings: [
        { fret: null },
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 3, role: 'root' },
        { fret: 2, role: 'third' },
      ],
    },
    { // open G major: 3 2 0 0 0 3
      name: 'G-shape',
      strings: [
        { fret: 3, role: 'root' },
        { fret: 2, role: 'third' },
        { fret: 0, role: 'fifth' },
        { fret: 0, role: 'root' },
        { fret: 0, role: 'third' },
        { fret: 3, role: 'root' },
      ],
    },
    { // open C major: x 3 2 0 1 0
      name: 'C-shape',
      strings: [
        { fret: null },
        { fret: 3, role: 'root' },
        { fret: 2, role: 'third' },
        { fret: 0, role: 'fifth' },
        { fret: 1, role: 'root' },
        { fret: 0, role: 'third' },
      ],
    },
  ],

  minor: [
    { // open E minor: 0 2 2 0 0 0
      name: 'E-shape',
      strings: [
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 2, role: 'root' },
        { fret: 0, role: 'third' },
        { fret: 0, role: 'fifth' },
        { fret: 0, role: 'root' },
      ],
    },
    { // open A minor: x 0 2 2 1 0
      name: 'A-shape',
      strings: [
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 2, role: 'root' },
        { fret: 1, role: 'third' },
        { fret: 0, role: 'fifth' },
      ],
    },
    { // open D minor: x x 0 2 3 1
      name: 'D-shape',
      strings: [
        { fret: null },
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 3, role: 'root' },
        { fret: 1, role: 'third' },
      ],
    },
  ],

  dominant7: [
    { // open E7: 0 2 0 1 0 0
      name: 'E-shape',
      strings: [
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 0, role: 'seventh' },
        { fret: 1, role: 'third' },
        { fret: 0, role: 'fifth' },
        { fret: 0, role: 'root' },
      ],
    },
    { // open A7: x 0 2 0 2 0
      name: 'A-shape',
      strings: [
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 0, role: 'seventh' },
        { fret: 2, role: 'third' },
        { fret: 0, role: 'fifth' },
      ],
    },
    { // open D7: x x 0 2 1 2
      name: 'D-shape',
      strings: [
        { fret: null },
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 1, role: 'seventh' },
        { fret: 2, role: 'third' },
      ],
    },
  ],

  major7: [
    { // open Emaj7: 0 2 1 1 0 0
      name: 'E-shape',
      strings: [
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 1, role: 'seventh' },
        { fret: 1, role: 'third' },
        { fret: 0, role: 'fifth' },
        { fret: 0, role: 'root' },
      ],
    },
    { // open Amaj7: x 0 2 1 2 0
      name: 'A-shape',
      strings: [
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 1, role: 'seventh' },
        { fret: 2, role: 'third' },
        { fret: 0, role: 'fifth' },
      ],
    },
    { // open Dmaj7: x x 0 2 2 2
      name: 'D-shape',
      strings: [
        { fret: null },
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 2, role: 'seventh' },
        { fret: 2, role: 'third' },
      ],
    },
  ],

  minor7: [
    { // open Em7: 0 2 0 0 0 0
      name: 'E-shape',
      strings: [
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 0, role: 'seventh' },
        { fret: 0, role: 'third' },
        { fret: 0, role: 'fifth' },
        { fret: 0, role: 'root' },
      ],
    },
    { // open Am7: x 0 2 0 1 0
      name: 'A-shape',
      strings: [
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 0, role: 'seventh' },
        { fret: 1, role: 'third' },
        { fret: 0, role: 'fifth' },
      ],
    },
    { // open Dm7: x x 0 2 1 1
      name: 'D-shape',
      strings: [
        { fret: null },
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 1, role: 'seventh' },
        { fret: 1, role: 'third' },
      ],
    },
  ],

  sus2: [
    { // open Asus2: x 0 2 2 0 0
      name: 'A-shape',
      strings: [
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 2, role: 'root' },
        { fret: 0, role: 'third' },
        { fret: 0, role: 'fifth' },
      ],
    },
    { // open Dsus2: x x 0 2 3 0
      name: 'D-shape',
      strings: [
        { fret: null },
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 3, role: 'root' },
        { fret: 0, role: 'third' },
      ],
    },
  ],

  sus4: [
    { // open Asus4: x 0 2 2 3 0
      name: 'A-shape',
      strings: [
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 2, role: 'root' },
        { fret: 3, role: 'third' },
        { fret: 0, role: 'fifth' },
      ],
    },
    { // open Dsus4: x x 0 2 3 3
      name: 'D-shape',
      strings: [
        { fret: null },
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 3, role: 'root' },
        { fret: 3, role: 'third' },
      ],
    },
  ],

  dim: [
    { // compact A-string-root diminished triad: x 0 1 2 1 x
      name: 'A-shape',
      strings: [
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 1, role: 'fifth' },
        { fret: 2, role: 'root' },
        { fret: 1, role: 'third' },
        { fret: null },
      ],
    },
    { // compact D-string-root diminished triad: x x 0 1 3 1
      name: 'D-shape',
      strings: [
        { fret: null },
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 1, role: 'fifth' },
        { fret: 3, role: 'root' },
        { fret: 1, role: 'third' },
      ],
    },
  ],

  dim7: [
    { // symmetric shape (repeats every 3 frets, so this one template covers
      // the whole neck): x x 1 2 1 2
      name: 'Symmetric shape',
      strings: [
        { fret: null },
        { fret: null },
        { fret: 1, role: 'third' },
        { fret: 2, role: 'seventh' },
        { fret: 1, role: 'root' },
        { fret: 2, role: 'fifth' },
      ],
    },
  ],

  aug: [
    { // symmetric shape (repeats every 4 frets): x 0 3 2 2 x
      name: 'A-shape',
      strings: [
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 3, role: 'fifth' },
        { fret: 2, role: 'root' },
        { fret: 2, role: 'third' },
        { fret: null },
      ],
    },
  ],

  add9: [
    { // open Aadd9: x 0 2 4 2 0
      name: 'A-shape',
      strings: [
        { fret: null },
        { fret: 0, role: 'root' },
        { fret: 2, role: 'fifth' },
        { fret: 4, role: 'extension' },
        { fret: 2, role: 'third' },
        { fret: 0, role: 'fifth' },
      ],
    },
    { // open Cadd9: x 3 2 0 3 0
      name: 'C-shape',
      strings: [
        { fret: null },
        { fret: 3, role: 'root' },
        { fret: 2, role: 'third' },
        { fret: 0, role: 'fifth' },
        { fret: 3, role: 'extension' },
        { fret: 0, role: 'third' },
      ],
    },
  ],
};
