// Curated starter library of guitarist-style licks. Each note is expressed as
// a scale degree + semitone offset from the *chord root* (same shape as
// CHORD_QUALITIES tones), a string index (0 = low E ... 5 = high E, matching
// STANDARD_TUNING/position.strings convention), and an optional technique.
// generateLick.js resolves each note to a concrete fret near whatever
// position/shape is currently on screen.

export const ARTISTS = [
  { key: 'slash', name: 'Slash' },
  { key: 'gilmour', name: 'David Gilmour' },
  { key: 'hendrix', name: 'Jimi Hendrix' },
  { key: 'clapton', name: 'Eric Clapton' },
  { key: 'bbking', name: 'B.B. King' },
  { key: 'vai', name: 'Steve Vai' },
  { key: 'mayer', name: 'John Mayer' },
  { key: 'moore', name: 'Gary Moore' },
  { key: 'satriani', name: 'Joe Satriani' },
  { key: 'johnson', name: 'Eric Johnson' },
];

// Per-lick metadata (spec #5: "Each lick should contain difficulty, style,
// position, scale used, technique"). Style/difficulty are per-artist — a
// reasonable real-world genre/skill association for each — while position,
// scale, and technique are derived per-generated-lick in generateLick.js
// (position depends on where the shape actually lands on the neck; scale
// depends on the chord quality actually being played; technique is read
// straight off whichever note techniques the lick's notes use).
export const ARTIST_STYLE = {
  slash: 'Hard Rock',
  gilmour: 'Rock',
  hendrix: 'Classic Rock',
  clapton: 'Blues',
  bbking: 'Blues',
  vai: 'Fusion',
  mayer: 'Pop',
  moore: 'Hard Rock',
  satriani: 'Rock',
  johnson: 'Rock',
};

export const ARTIST_DIFFICULTY = {
  slash: 'Intermediate',
  gilmour: 'Beginner',
  hendrix: 'Intermediate',
  clapton: 'Beginner',
  bbking: 'Beginner',
  vai: 'Advanced',
  mayer: 'Intermediate',
  moore: 'Advanced',
  satriani: 'Advanced',
  johnson: 'Advanced',
};

// The "Rhythm" dimension of a style preset (spec #15: phrasing, bends,
// scale choices, rhythm, techniques) — a baseline picking-feel multiplier
// applied to every generated note's duration (spec's Emotion Mode "pace"
// stacks on top of this, so both the chosen artist AND the chosen emotion
// shape the rhythm). <1 = tighter/faster picking feel, >1 = more spacious.
export const ARTIST_PACE = {
  slash: 1,
  gilmour: 1.3,
  hendrix: 1,
  clapton: 1.05,
  bbking: 1.2,
  vai: 0.85,
  mayer: 1.05,
  moore: 1,
  satriani: 0.85,
  johnson: 0.9,
};

const SCALE_LABEL_BY_QUALITY = {
  major: 'Major Pentatonic',
  minor: 'Minor Pentatonic',
  dominant7: 'Blues Scale',
};

export function scaleLabelForQuality(qualityKey) {
  return SCALE_LABEL_BY_QUALITY[qualityKey] ?? 'Minor Pentatonic';
}

// Shorthand scale-degree tones, reused across licks below.
const R = { degree: 1, semitones: 0 }; // root
const b2 = { degree: 2, semitones: 1 };
const M2 = { degree: 2, semitones: 2 };
const b3 = { degree: 3, semitones: 3 };
const M3 = { degree: 3, semitones: 4 };
const P4 = { degree: 4, semitones: 5 };
const b5 = { degree: 5, semitones: 6 };
const P5 = { degree: 5, semitones: 7 };
const M6 = { degree: 6, semitones: 9 };
const b7 = { degree: 7, semitones: 10 };

function note(tone, string, technique = null) {
  return { ...tone, string, technique };
}

// LICKS[artistKey][qualityKey] = array of variations, each an array of notes.
export const LICKS = {
  slash: {
    major: [
      [note(R, 2), note(M2, 2), note(M3, 3, 'hammer'), note(P5, 3), note(M6, 4), note(R, 5)],
      [note(M3, 3), note(P5, 3, 'slide'), note(M6, 4), note(R, 5), note(M2, 5), note(R, 5, 'vibrato')],
    ],
    minor: [
      [note(R, 2), note(b3, 2, 'hammer'), note(P4, 3), note(P5, 3), note(b7, 4), note(R, 5, 'vibrato')],
      [note(b3, 3), note(P4, 3, 'hammer'), note(P5, 4), note(b7, 4), note(R, 5), note(b3, 5, 'bend')],
    ],
    dominant7: [
      [note(R, 2), note(b3, 2, 'bend'), note(P4, 3), note(P5, 3), note(b7, 4), note(R, 5)],
      [note(P4, 3), note(P5, 3, 'hammer'), note(b7, 4), note(R, 5), note(b3, 5, 'bend'), note(R, 5)],
    ],
  },

  gilmour: {
    major: [
      [note(P5, 4), note(M6, 4, 'bend'), note(R, 5), note(R, 5, 'vibrato')],
      [note(M3, 3, 'bend'), note(P5, 4), note(M6, 4), note(R, 5, 'vibrato')],
    ],
    minor: [
      [note(P4, 4), note(P5, 4, 'bend'), note(b7, 4), note(R, 5, 'vibrato')],
      [note(b3, 4, 'bend'), note(P5, 4), note(b3, 5, 'bend'), note(R, 5, 'vibrato')],
    ],
    dominant7: [
      [note(b7, 4), note(R, 5), note(b3, 5, 'bend'), note(R, 5, 'vibrato')],
      [note(P4, 4, 'bend'), note(P5, 4), note(b7, 4), note(R, 5, 'vibrato')],
    ],
  },

  hendrix: {
    major: [
      [note(R, 2), note(b7, 2), note(M2, 3), note(M3, 3, 'bend'), note(P5, 4), note(R, 5)],
      [note(M3, 3, 'bend'), note(P4, 3), note(P5, 4), note(b7, 4), note(R, 5, 'vibrato')],
    ],
    minor: [
      [note(R, 2), note(b7, 2), note(b3, 3, 'bend'), note(P4, 3), note(P5, 4), note(b7, 4, 'vibrato')],
      [note(b3, 3, 'bend'), note(P5, 4), note(b7, 4), note(R, 5), note(b3, 5, 'bend')],
    ],
    dominant7: [
      [note(R, 2), note(b3, 2, 'bend'), note(P4, 3), note(b5, 3), note(P5, 4), note(b7, 4, 'vibrato')],
      [note(b7, 2), note(R, 3), note(b3, 3, 'bend'), note(P5, 4), note(b7, 4), note(R, 5)],
    ],
  },

  clapton: {
    major: [
      [note(R, 2), note(M2, 3), note(M3, 3), note(P5, 4, 'bend'), note(R, 5)],
      [note(P5, 3), note(M6, 4), note(M3, 4, 'bend'), note(R, 5), note(M2, 5)],
    ],
    minor: [
      [note(R, 2), note(b3, 3, 'bend'), note(P4, 3), note(P5, 4), note(b7, 4)],
      [note(P4, 3), note(P5, 4, 'bend'), note(b7, 4), note(R, 5), note(b3, 5)],
    ],
    dominant7: [
      [note(R, 2), note(b3, 3, 'bend'), note(P4, 3), note(P5, 4), note(b7, 4), note(R, 5)],
      [note(P5, 3), note(b7, 4, 'bend'), note(R, 5), note(b3, 5, 'bend'), note(R, 5)],
    ],
  },

  bbking: {
    major: [
      [note(P5, 4), note(M6, 4, 'bend'), note(R, 5), note(M2, 5, 'vibrato')],
      [note(M3, 4), note(P5, 4, 'bend'), note(M6, 4), note(R, 5, 'vibrato')],
    ],
    minor: [
      [note(P4, 4), note(P5, 4, 'bend'), note(b7, 4), note(R, 5, 'vibrato')],
      [note(P5, 4), note(b7, 4, 'bend'), note(R, 5), note(b3, 5, 'vibrato')],
    ],
    dominant7: [
      [note(P4, 4), note(P5, 4, 'bend'), note(b7, 4), note(R, 5, 'vibrato')],
      [note(b3, 4, 'bend'), note(P5, 4), note(b7, 4), note(R, 5, 'vibrato')],
    ],
  },

  vai: {
    major: [
      [note(R, 1), note(M2, 2, 'hammer'), note(M3, 2), note(P5, 3, 'hammer'), note(M6, 4), note(R, 5, 'pull')],
      [note(M3, 2), note(P5, 3, 'hammer'), note(M6, 3), note(R, 4), note(M2, 5, 'hammer'), note(M3, 5)],
    ],
    minor: [
      [note(R, 1), note(b3, 2, 'hammer'), note(P4, 2), note(b7, 3, 'hammer'), note(R, 4), note(b3, 5, 'pull')],
      [note(b5, 2), note(P5, 3, 'hammer'), note(b7, 3), note(R, 4), note(b3, 5, 'hammer'), note(P4, 5)],
    ],
    dominant7: [
      [note(R, 1), note(b2, 2), note(M2, 2, 'hammer'), note(b3, 3), note(M3, 3, 'hammer'), note(b7, 4)],
      [note(b7, 2), note(R, 3), note(b5, 3, 'hammer'), note(P5, 4), note(b3, 5, 'hammer'), note(R, 5)],
    ],
  },

  mayer: {
    major: [
      [note(R, 2), note(M2, 3, 'hammer'), note(M3, 3), note(P5, 4, 'bend'), note(M6, 4), note(R, 5)],
      [note(M3, 3), note(P5, 3, 'hammer'), note(M6, 4, 'bend'), note(R, 5), note(M2, 5)],
    ],
    minor: [
      [note(R, 2), note(b3, 3, 'hammer'), note(P4, 3), note(P5, 4, 'bend'), note(b7, 4), note(R, 5)],
      [note(P4, 3), note(b3, 3, 'bend'), note(P5, 4), note(b7, 4, 'hammer'), note(R, 5)],
    ],
    dominant7: [
      [note(R, 2), note(b3, 2, 'bend'), note(M3, 3), note(P5, 3), note(b7, 4, 'hammer'), note(R, 5)],
      [note(P4, 3), note(P5, 3, 'bend'), note(b7, 4), note(R, 5), note(M6, 5, 'hammer')],
    ],
  },

  moore: {
    major: [
      [note(P5, 3), note(M6, 4, 'bend'), note(M3, 4, 'bend'), note(R, 5), note(R, 5, 'vibrato')],
      [note(M3, 3), note(P5, 4, 'bend'), note(M6, 4), note(R, 5, 'vibrato')],
    ],
    minor: [
      [note(P4, 3), note(P5, 4, 'bend'), note(b7, 4, 'bend'), note(R, 5), note(R, 5, 'vibrato')],
      [note(b3, 3, 'bend'), note(P4, 4), note(P5, 4, 'bend'), note(b7, 4), note(R, 5, 'vibrato')],
    ],
    dominant7: [
      [note(b3, 3, 'bend'), note(P4, 4), note(P5, 4, 'bend'), note(b7, 4), note(R, 5, 'vibrato')],
      [note(P4, 3), note(P5, 3, 'bend'), note(b7, 4), note(R, 5), note(R, 5, 'vibrato')],
    ],
  },

  satriani: {
    major: [
      [note(R, 1), note(M2, 1, 'hammer'), note(M3, 2, 'hammer'), note(P5, 2, 'hammer'), note(M6, 3, 'pull'), note(R, 4, 'bend')],
      [note(M2, 2), note(M3, 2, 'hammer'), note(P5, 3, 'hammer'), note(M6, 3), note(R, 4, 'pull'), note(M2, 4)],
    ],
    minor: [
      [note(R, 1), note(b3, 1, 'hammer'), note(P4, 2, 'hammer'), note(P5, 2, 'hammer'), note(b7, 3, 'pull'), note(R, 4, 'bend')],
      [note(b3, 2), note(P4, 2, 'hammer'), note(P5, 3, 'hammer'), note(b7, 3), note(R, 4, 'pull'), note(b3, 4)],
    ],
    dominant7: [
      [note(R, 1), note(M2, 1, 'hammer'), note(M3, 2, 'hammer'), note(b5, 2, 'hammer'), note(P5, 3, 'pull'), note(b7, 4, 'bend')],
      [note(b7, 2), note(R, 3, 'hammer'), note(M2, 3), note(M3, 4, 'hammer'), note(P5, 4, 'pull')],
    ],
  },

  johnson: {
    major: [
      [note(P5, 3, 'hammer'), note(M6, 4, 'pull'), note(M3, 4, 'bend'), note(P5, 4), note(R, 5, 'vibrato')],
      [note(M2, 3), note(M3, 3, 'hammer'), note(P5, 4, 'bend'), note(M6, 4), note(R, 5, 'vibrato')],
    ],
    minor: [
      [note(P4, 3, 'hammer'), note(P5, 4, 'pull'), note(b3, 4, 'bend'), note(P5, 4), note(R, 5, 'vibrato')],
      [note(b7, 3), note(R, 4, 'hammer'), note(P4, 4), note(b3, 5, 'bend'), note(R, 5, 'vibrato')],
    ],
    dominant7: [
      [note(P4, 3, 'hammer'), note(P5, 4, 'pull'), note(b7, 4, 'bend'), note(R, 5), note(R, 5, 'vibrato')],
      [note(b3, 3, 'bend'), note(P4, 4), note(P5, 4), note(b7, 4, 'hammer'), note(R, 5, 'vibrato')],
    ],
  },
};

const FALLBACK_QUALITY = {
  major7: 'major',
  minor7: 'minor',
  sus2: 'major',
  sus4: 'major',
  add9: 'major',
  dim: 'minor',
  dim7: 'minor',
  aug: 'major',
};

// Walks qualityKey -> its fallback chain -> 'major', returning the first
// quality that has lick data for this artist. Guarantees every chord quality
// produces *some* lick even if it isn't hand-authored yet.
export function resolveLickQuality(artistKey, qualityKey) {
  const artistLicks = LICKS[artistKey];
  if (!artistLicks) return null;
  let key = qualityKey;
  const seen = new Set();
  while (key && !seen.has(key)) {
    if (artistLicks[key]) return key;
    seen.add(key);
    key = FALLBACK_QUALITY[key];
  }
  return artistLicks.major ? 'major' : null;
}
