// Practice -> Chord Rhythm (guitar)'s content source. Judging is chroma/
// pitch-class based (see chromaChordDetector.js + useMicChordDetector.js)
// — it can tell WHICH chord (root + quality) was played from the mic, but
// genuinely cannot tell WHICH SHAPE/POSITION produced those pitch classes
// (an open G and a barre G at the 3rd fret contain the exact same three
// pitch classes; there is no way to distinguish them from audio alone).
// So the four modes below control which CHORD NAMES the practice draws
// from, not which hand shape is required — confirmed acceptable with the
// user before building this.
import { PROGRESSION_PATTERNS } from './chordRhythmGenerator';
import { parseChordSymbol, capitalizeChordRoot, normalizeAmbiguousMinorM } from './chordSymbolParser';
import { CHORD_QUALITIES } from './chordQualities';
import { spellTone } from './spelling';

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
const SEQUENCE_LENGTH = 8;

// --- 'open' mode: hand-curated real progressions -----------------------
// The open-chord vocabulary above (C E G D A / Am Em Dm / A7 D7 E7 G7) is
// far too restrictive for a programmatic diatonic generator (see the
// openBarre/triads/all generator below) — most keys' diatonic ii/iii/vi
// chords land outside this list entirely (e.g. key of C's IV is F, not an
// open chord at all). Rather than fight that, this is a small hand-picked
// bank of REAL progressions that live entirely inside the open set, each
// one an actual roman-numeral-analyzable progression in a key that happens
// to fit, not a random walk. `generateGuitarChordRhythmProgression` chains
// a few of these together (never repeating the same one back to back) to
// build a full practice sequence, so "genuine music theory, not just
// randomly-picked chords" holds for this mode too.
const OPEN_PROGRESSIONS = [
  [{ root: 7, quality: 'major' }, { root: 2, quality: 'major' }, { root: 4, quality: 'minor' }, { root: 0, quality: 'major' }], // G D Em C — I-V-vi-IV in G
  [{ root: 7, quality: 'major' }, { root: 4, quality: 'minor' }, { root: 0, quality: 'major' }, { root: 2, quality: 'major' }], // G Em C D — I-vi-IV-V in G, the classic "50s progression"
  [{ root: 9, quality: 'minor' }, { root: 4, quality: 'minor' }, { root: 7, quality: 'major' }, { root: 2, quality: 'major' }], // Am Em G D — ii-vi-I-V in G
  [{ root: 9, quality: 'major' }, { root: 2, quality: 'major' }, { root: 4, quality: 'major' }, { root: 9, quality: 'major' }], // A D E A — I-IV-V-I in A
  [{ root: 0, quality: 'major' }, { root: 9, quality: 'minor' }, { root: 2, quality: 'minor' }, { root: 7, quality: 'major' }], // C Am Dm G — I-vi-ii-V in C, the classic turnaround
  [{ root: 9, quality: 'minor' }, { root: 2, quality: 'minor' }, { root: 7, quality: 'major' }, { root: 0, quality: 'major' }], // Am Dm G C — vi-ii-V-I in C, the "circle" resolving home
  [{ root: 4, quality: 'minor' }, { root: 0, quality: 'major' }, { root: 7, quality: 'major' }, { root: 2, quality: 'major' }], // Em C G D — vi-IV-I-V in G
  [{ root: 0, quality: 'major' }, { root: 7, quality: 'major' }, { root: 4, quality: 'minor' }, { root: 9, quality: 'minor' }], // C G Em Am — I-V-iii-vi in C
  [{ root: 9, quality: 'dominant7' }, { root: 2, quality: 'dominant7' }, { root: 9, quality: 'dominant7' }, { root: 4, quality: 'dominant7' }], // A7 D7 A7 E7 — I7-IV7-I7-V7, a classic blues quick-change turnaround in A
  [{ root: 4, quality: 'dominant7' }, { root: 2, quality: 'dominant7' }, { root: 9, quality: 'dominant7' }, { root: 9, quality: 'dominant7' }], // E7 D7 A7 A7 — V7-IV7-I7-I7, another common blues turnaround shape in A
];

function specToChord({ root, quality }) {
  return { rootPitchClass: root, qualityKey: quality, chordText: chordText(root, quality) };
}

function pickOpenProgressionChain(length) {
  const sequence = [];
  let lastProgression = null;
  let guard = 0;
  while (sequence.length < length && guard < length * 10) {
    guard += 1;
    const progression = OPEN_PROGRESSIONS[Math.floor(Math.random() * OPEN_PROGRESSIONS.length)];
    if (progression === lastProgression && OPEN_PROGRESSIONS.length > 1) continue;
    lastProgression = progression;
    for (const spec of progression) {
      if (sequence.length >= length) break;
      const chord = specToChord(spec);
      if (sequence.length > 0 && sequence[sequence.length - 1].chordText === chord.chordText) continue;
      sequence.push(chord);
    }
  }
  return sequence;
}

// --- 'openBarre' / 'triads' / 'all' modes: real diatonic generator -----
// Unlike 'open', these modes' pools cover EVERY root (barre/triad shapes
// are movable, so major/minor — and, for 'all', dominant7 — exist in all
// 12 keys). That means the same theory-correct approach the piano version
// uses (chordRhythmGenerator.js: a random key + a real chord-progression
// PATTERN expressed as diatonic scale degrees) works cleanly here too,
// reusing the exact same curated PATTERNS rather than inventing a second
// set — one real bank of progressions, shared across instruments.
const MAJOR_SCALE_DEGREE_SEMITONES = [0, 2, 4, 5, 7, 9]; // I ii iii IV V vi (vii° excluded — no diminished quality in this practice's guitar vocabulary)
const MAJOR_SCALE_DEGREE_QUALITIES = ['major', 'minor', 'minor', 'major', 'major', 'minor'];

function buildDiatonicGuitarChord(keyRoot, degreeIndex, allowDominant7) {
  const root = (keyRoot + MAJOR_SCALE_DEGREE_SEMITONES[degreeIndex]) % 12;
  let quality = MAJOR_SCALE_DEGREE_QUALITIES[degreeIndex];
  // Real functional-harmony color, not a random quality swap: about half
  // the time, resolve the V into its dominant 7th — V7 resolving to I is
  // the single most fundamental cadence in tonal harmony, and 'all' mode's
  // pool includes dominant7 specifically so this substitution has
  // somewhere to land.
  if (allowDominant7 && degreeIndex === 4 && Math.random() < 0.5) quality = 'dominant7';
  return { rootPitchClass: root, qualityKey: quality, chordText: chordText(root, quality) };
}

function generateDiatonicSequence(length, allowDominant7) {
  const keyRoot = Math.floor(Math.random() * 12);
  const sequence = [];
  let guard = 0;
  while (sequence.length < length && guard < length * 10) {
    guard += 1;
    const pattern = PROGRESSION_PATTERNS[Math.floor(Math.random() * PROGRESSION_PATTERNS.length)];
    for (const degreeIndex of pattern) {
      if (sequence.length >= length) break;
      const chord = buildDiatonicGuitarChord(keyRoot, degreeIndex, allowDominant7);
      if (sequence.length > 0 && sequence[sequence.length - 1].chordText === chord.chordText) continue;
      sequence.push(chord);
    }
  }
  return sequence;
}

export function generateGuitarChordRhythmProgression(modeKey, length = SEQUENCE_LENGTH) {
  const sequence =
    modeKey === 'open' ? pickOpenProgressionChain(length) : generateDiatonicSequence(length, modeKey === 'all');
  const bpmSuggested = MIN_BPM + Math.floor(Math.random() * (MAX_BPM - MIN_BPM + 1));
  return { sequence, bpmSuggested, beatsPerChord: BEATS_PER_CHORD };
}

// --- 'Type your own' / song-structure text parsing ----------------------
// Same parsing pipeline Compose/the piano Chord Rhythm's own custom-text
// field already uses (capitalizeChordRoot + normalizeAmbiguousMinorM +
// parseChordSymbol) — reused rather than reinvented so a chord typed here
// behaves identically to typing it anywhere else in the app. Any quality
// parseChordSymbol recognizes (not just major/minor/dominant7) is
// accepted — the mic judge (matchChordFromChroma) already scores against
// every quality in CHORD_QUALITIES, not just the four generated modes'
// restricted pools.
export function parseGuitarChordProgressionText(text) {
  return (text || '')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => capitalizeChordRoot(t))
    .map((t) => normalizeAmbiguousMinorM(t))
    .map((t) => {
      const parsed = parseChordSymbol(t);
      if (!parsed) return null;
      return { rootPitchClass: parsed.root.pitchClass, qualityKey: parsed.qualityKey, chordText: t };
    })
    .filter(Boolean);
}

// --- Late-window hint: "what notes actually make up this chord" ---------
// Used by GuitarChordRhythmPanel once a chord's judging window is almost
// out of time and still unanswered — the block/chip already shows the
// chord's NAME the whole time, but a player who doesn't yet recognize a
// name like "F#m7" by ear benefits from seeing its actual spelled notes.
// Reuses the same real letter-stacking spelling (spellTone, from
// spelling.js) every other chord display in the app already uses, rather
// than a simplified/enharmonic-sloppy label.
export function getChordToneLabels(rootPitchClass, qualityKey) {
  const quality = CHORD_QUALITIES[qualityKey];
  if (!quality) return [];
  const rootLetter = PITCH_CLASS_NAMES[rootPitchClass][0];
  return quality.tones.map((tone) => spellTone(rootLetter, rootPitchClass, tone.degree, tone.semitones).label);
}
