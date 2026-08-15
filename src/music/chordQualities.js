// Each quality lists its chord tones as { degree, semitones, role }.
// - degree: scale-degree number, used for correct letter spelling
// - semitones: interval from the root, used for pitch math
// - role: 'root' | 'third' | 'fifth' | 'seventh' | 'extension'. In the
//   default single-color display mode only root/third/fifth are colored
//   (seventh/extension render gray, same as always); in Chord Tone
//   Highlighting mode (src/music/noteFunction.js) every role gets its own
//   color, including these.
export const CHORD_QUALITIES = {
  // Deliberately does NOT include bare 'M' as a major alias — this app's own
  // convention (per explicit user decision) is that a bare "M" right after
  // the root always means minor, same as lowercase 'm' (a typed-in-caps
  // chord like "AM" is far more likely to be a capitalized "Am" than a
  // deliberate music-theory "M for major" mark). Explicit major, when it
  // needs distinguishing from bare-letter major, is spelled out as
  // 'maj'/'Maj'/'major'/'Major' instead — see normalizeAmbiguousMinorM in
  // chordSymbolParser.js, which also rewrites a typed "AM"/"AM7" to the
  // unambiguous "Am"/"Am7" for display, not just for parsing.
  major: {
    label: 'Major',
    aliases: ['', 'maj', 'Maj', 'major', 'Major'],
    tones: [
      { degree: 1, semitones: 0, role: 'root' },
      { degree: 3, semitones: 4, role: 'third' },
      { degree: 5, semitones: 7, role: 'fifth' },
    ],
  },
  minor: {
    label: 'Minor',
    aliases: ['m', 'M', 'min', '-'],
    tones: [
      { degree: 1, semitones: 0, role: 'root' },
      { degree: 3, semitones: 3, role: 'third' },
      { degree: 5, semitones: 7, role: 'fifth' },
    ],
  },
  dominant7: {
    label: 'Dominant 7th',
    aliases: ['7'],
    tones: [
      { degree: 1, semitones: 0, role: 'root' },
      { degree: 3, semitones: 4, role: 'third' },
      { degree: 5, semitones: 7, role: 'fifth' },
      { degree: 7, semitones: 10, role: 'seventh' },
    ],
  },
  major7: {
    label: 'Major 7th',
    // No bare 'M7' here either, for the same reason major has no bare 'M' —
    // see the comment above the major quality.
    aliases: ['maj7', 'Maj7', 'major7', 'Major7', 'Δ7'],
    tones: [
      { degree: 1, semitones: 0, role: 'root' },
      { degree: 3, semitones: 4, role: 'third' },
      { degree: 5, semitones: 7, role: 'fifth' },
      { degree: 7, semitones: 11, role: 'seventh' },
    ],
  },
  minor7: {
    label: 'Minor 7th',
    aliases: ['m7', 'M7', 'min7', '-7'],
    tones: [
      { degree: 1, semitones: 0, role: 'root' },
      { degree: 3, semitones: 3, role: 'third' },
      { degree: 5, semitones: 7, role: 'fifth' },
      { degree: 7, semitones: 10, role: 'seventh' },
    ],
  },
  sus2: {
    label: 'Suspended 2nd',
    aliases: ['sus2'],
    tones: [
      { degree: 1, semitones: 0, role: 'root' },
      { degree: 2, semitones: 2, role: 'third' }, // replaces the 3rd, still the color-tone
      { degree: 5, semitones: 7, role: 'fifth' },
    ],
  },
  sus4: {
    label: 'Suspended 4th',
    aliases: ['sus4', 'sus'],
    tones: [
      { degree: 1, semitones: 0, role: 'root' },
      { degree: 4, semitones: 5, role: 'third' }, // replaces the 3rd, still the color-tone
      { degree: 5, semitones: 7, role: 'fifth' },
    ],
  },
  dim: {
    label: 'Diminished',
    aliases: ['dim', '°', 'o'],
    tones: [
      { degree: 1, semitones: 0, role: 'root' },
      { degree: 3, semitones: 3, role: 'third' },
      { degree: 5, semitones: 6, role: 'fifth' },
    ],
  },
  dim7: {
    label: 'Diminished 7th',
    aliases: ['dim7', '°7', 'o7'],
    tones: [
      { degree: 1, semitones: 0, role: 'root' },
      { degree: 3, semitones: 3, role: 'third' },
      { degree: 5, semitones: 6, role: 'fifth' },
      { degree: 7, semitones: 9, role: 'seventh' },
    ],
  },
  aug: {
    label: 'Augmented',
    aliases: ['aug', '+'],
    tones: [
      { degree: 1, semitones: 0, role: 'root' },
      { degree: 3, semitones: 4, role: 'third' },
      { degree: 5, semitones: 8, role: 'fifth' },
    ],
  },
  add9: {
    label: 'Add 9',
    aliases: ['add9'],
    tones: [
      { degree: 1, semitones: 0, role: 'root' },
      { degree: 3, semitones: 4, role: 'third' },
      { degree: 5, semitones: 7, role: 'fifth' },
      { degree: 9, semitones: 14, role: 'extension' },
    ],
  },
};

// Longest aliases first so "maj7" matches before "m" would incorrectly match "maj7".
export const QUALITY_ALIAS_LOOKUP = Object.entries(CHORD_QUALITIES)
  .flatMap(([key, q]) => q.aliases.map((alias) => ({ alias, key })))
  .sort((a, b) => b.alias.length - a.alias.length);
