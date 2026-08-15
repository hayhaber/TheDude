// Practice -> Chord Rhythm (guitar)'s content source. Judging is chroma/
// pitch-class based (see chromaChordDetector.js + useMicChordDetector.js)
// — it can tell WHICH chord (root + quality) was played from the mic, but
// genuinely cannot tell WHICH SHAPE/POSITION produced those pitch classes
// (an open G and a barre G at the 3rd fret contain the exact same three
// pitch classes; there is no way to distinguish them from audio alone).
// So the four modes below control which CHORD NAMES the practice draws
// from, not which hand shape is required — confirmed acceptable with the
// user before building this.
const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function chordText(rootPitchClass, qualityKey) {
  const suffix = { major: '', minor: 'm', dominant7: '7' }[qualityKey] ?? '';
  return PITCH_CLASS_NAMES[rootPitchClass] + suffix;
}

// The standard beginner open-position set — every one of these is commonly
// taught/played as an actual open chord (uses at least one open string),
// unlike the other modes below which are generated across all 12 roots and
// necessarily require a barre/moved shape for most of them.
const OPEN_CHORD_SPECS = [
  { root: 0, quality: 'major' }, // C
  { root: 4, quality: 'major' }, // E
  { root: 7, quality: 'major' }, // G
  { root: 2, quality: 'major' }, // D
  { root: 9, quality: 'major' }, // A
  { root: 9, quality: 'minor' }, // Am
  { root: 4, quality: 'minor' }, // Em
  { root: 2, quality: 'minor' }, // Dm
  { root: 9, quality: 'dominant7' }, // A7
  { root: 2, quality: 'dominant7' }, // D7
  { root: 4, quality: 'dominant7' }, // E7
  { root: 7, quality: 'dominant7' }, // G7
];

function buildPool(specs) {
  return specs.map(({ root, quality }) => ({ rootPitchClass: root, qualityKey: quality, chordText: chordText(root, quality) }));
}

const OPEN_POOL = buildPool(OPEN_CHORD_SPECS);

// Barre mode: major/minor across every root — the whole point of learning
// a movable barre shape is that it works everywhere the open set can't
// reach, so this deliberately covers all 12 roots rather than repeating
// the open set.
const BARRE_POOL = buildPool(
  Array.from({ length: 12 }, (_, root) => [
    { root, quality: 'major' },
    { root, quality: 'minor' },
  ]).flat()
);

// Triad mode: same coverage as barre (major/minor, all 12 roots) — framed
// as "play this as a 3-note triad shape" rather than a full 6-string
// chord. Musically the SAME pitch-class content as the barre pool (see
// this file's own top comment on why judging can't tell them apart), kept
// as a separate pool mainly so the practice text/framing is honest about
// what's being asked, and so a future addition (e.g. richer qualities
// exclusive to one mode) has somewhere to go without reshuffling everything.
const TRIAD_POOL = BARRE_POOL;

// Everything: adds dominant7 across all 12 roots on top of the barre/triad
// coverage.
const ALL_POOL = [
  ...BARRE_POOL,
  ...buildPool(Array.from({ length: 12 }, (_, root) => ({ root, quality: 'dominant7' }))),
];

export const GUITAR_CHORD_RHYTHM_MODES = [
  { key: 'open', pool: OPEN_POOL },
  { key: 'openBarre', pool: [...OPEN_POOL, ...BARRE_POOL] },
  { key: 'triads', pool: TRIAD_POOL },
  { key: 'all', pool: ALL_POOL },
];

const BEATS_PER_CHORD = 4;
const MIN_BPM = 60;
const MAX_BPM = 90; // slower than the piano version's range — strumming/re-fretting a full chord takes longer than one key press

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Same "no two adjacent entries share a chord" invariant the piano version
// learned the hard way (see chordRhythmGenerator.js's own comment) — picks
// SEQUENCE_LENGTH chords one at a time, rejecting an immediate repeat of
// the previous pick and re-rolling.
const SEQUENCE_LENGTH = 8;

export function generateGuitarChordRhythmProgression(modeKey) {
  const mode = GUITAR_CHORD_RHYTHM_MODES.find((m) => m.key === modeKey) ?? GUITAR_CHORD_RHYTHM_MODES[0];
  const pool = mode.pool;
  const sequence = [];
  for (let i = 0; i < SEQUENCE_LENGTH; i += 1) {
    let next = pickRandom(pool);
    let guard = 0;
    while (sequence.length > 0 && next.chordText === sequence[sequence.length - 1].chordText && guard < 20) {
      next = pickRandom(pool);
      guard += 1;
    }
    sequence.push(next);
  }
  const bpmSuggested = MIN_BPM + Math.floor(Math.random() * (MAX_BPM - MIN_BPM + 1));
  return { sequence, bpmSuggested, beatsPerChord: BEATS_PER_CHORD };
}
