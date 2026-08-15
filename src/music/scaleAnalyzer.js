import { mod } from './notes';

// Exported for reuse by scaleDegreeUsage.js (the Insights panel's scale-tone
// strip) — same diatonic-triad-quality-per-degree data, single source.
export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
export const DIATONIC_BUCKET = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim'];

// Natural minor's own intervals, plus — per degree — every chord quality
// real minor-key harmony actually uses there. A minor key isn't just
// "natural minor": the raised 7th (harmonic/melodic minor) turning v into a
// proper dominant V, and the raised 6th (melodic minor ascending) turning
// iv into IV or ii° into ii, are the NORMAL, textbook-standard way minor-key
// music is written — not an exception or a borrowed chord. Scoring every
// one of these as fully diatonic (not "mode-mixture") is what makes the key
// detector actually match how real minor-key songs are harmonized, e.g. a
// i-ii-V (using the raised-leading-tone V and the raised-6th ii) is just as
// "at home" in that minor key as i-iv-v is.
export const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];
export const MINOR_DIATONIC_BUCKETS = [
  ['minor'], // i — the tonic; if this were major it'd be a different (major-key) candidate entirely
  ['dim', 'minor'], // ii° (natural) / ii (melodic, raised 6th — "Dorian ii")
  ['major'], // III
  ['minor', 'major'], // iv (natural/harmonic) / IV (melodic, raised 6th)
  ['minor', 'major'], // v (natural) / V (harmonic/melodic, raised 7th — by far the most common)
  ['major'], // VI
  ['major', 'dim'], // VII (natural, subtonic) / vii° (harmonic/melodic, raised 7th leading tone)
];
// Roman numeral for each degree, per which of that degree's acceptable
// buckets is actually in play — e.g. degree 5 (index 4) reads "v" when the
// chord found there is minor (natural-minor form) or "V" when it's major
// (harmonic/melodic-minor's raised leading tone). Exported for
// scaleDegreeUsage.js's scale-tone strip, so a minor-key result labels each
// degree correctly instead of assuming natural minor's own quality.
export const MINOR_ROMAN_BY_BUCKET = [
  { minor: 'i' },
  { dim: 'ii°', minor: 'ii' },
  { major: 'III' },
  { minor: 'iv', major: 'IV' },
  { minor: 'v', major: 'V' },
  { major: 'VI' },
  { major: 'VII', dim: 'vii°' },
];

// Conventional spelling for each of the 12 major keys (sharps for the
// sharp-side keys, flats for the flat-side keys) — good enough for labeling
// a suggested scale; not trying to match the exact accidental spelling of
// whatever the user typed. Exported for reuse as the Scales course's key
// selector (src/components/ScalesView/ScalesView.jsx) — same list, single
// source of truth.
export const KEY_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Buckets a chord quality down to whichever of a major scale's diatonic
// triad qualities it most naturally belongs to, so e.g. a dominant7 still
// counts as fitting the (major) V slot instead of never matching anything.
const QUALITY_BUCKET = {
  major: 'major',
  major7: 'major',
  add9: 'major',
  sus2: 'major',
  sus4: 'major',
  aug: 'major',
  dominant7: 'major',
  minor: 'minor',
  minor7: 'minor',
  dim: 'dim',
  dim7: 'dim',
};

export function simplifyQuality(qualityKey) {
  return QUALITY_BUCKET[qualityKey] ?? 'major';
}

// A reasonable "what key is this in" guess for a single chord — its own
// root if major/dominant-ish, or its relative major's tonic if minor (so a
// lone Am guesses C major, i.e. A natural minor's own notes, rather than
// literally "A major"). Used as a fallback wherever a 2+-chord progression
// (and so a real analyzeScale result) isn't available yet — e.g. the Heat
// Map and Tension Meter still need *some* scale context for a single typed
// chord.
export function guessTonicPitchClass(rootPitchClass, qualityKey) {
  return simplifyQuality(qualityKey) === 'minor' ? mod(rootPitchClass + 3, 12) : rootPitchClass;
}

// Scores how well a progression fits being in `tonicPitchClass`, in either
// mode: +2 per chord whose root matches one of the key's 7 diatonic degrees
// AND whose quality is one of that degree's acceptable buckets (a single
// fixed bucket for major, per DIATONIC_BUCKET; a small SET of buckets for
// minor, per MINOR_DIATONIC_BUCKETS — see its own comment for why minor
// needs more than one), +0.5 if only the root matches (a real mode-mixture/
// borrowed chord), 0 if the root isn't even in the scale.
function scoreKey(tonicPitchClass, mode, chords) {
  const intervals = mode === 'minor' ? MINOR_SCALE_INTERVALS : MAJOR_SCALE_INTERVALS;
  const diatonic = intervals.map((interval, i) => ({
    pitchClass: mod(tonicPitchClass + interval, 12),
    buckets: mode === 'minor' ? MINOR_DIATONIC_BUCKETS[i] : [DIATONIC_BUCKET[i]],
  }));

  let score = 0;
  const borrowed = [];

  chords.forEach((chord) => {
    const match = diatonic.find((d) => d.pitchClass === chord.root.pitchClass);
    const bucket = simplifyQuality(chord.qualityKey);
    if (match && match.buckets.includes(bucket)) {
      score += 2;
    } else {
      if (match) score += 0.5;
      borrowed.push(chord.text);
    }
  });

  return { score, borrowed };
}

// Analyzes a typed progression (App.jsx's `progression`, [{text, parsed}])
// and suggests the best-fit parent key — tried as EVERY possible tonic in
// BOTH major and minor (24 candidates total), not major-only — plus the
// scales guitarists typically solo with over it. A minor-key progression
// (e.g. i-ii-V using the standard raised-leading-tone dominant) previously
// always lost to whichever major key happened to share 2 of its 3 chords,
// because only major tonics were ever tried; a progression built entirely
// from that minor key's own (fully diatonic, textbook-standard) chords now
// correctly scores higher as that minor key instead. Flags any chord that
// isn't diatonic to the detected key/mode as "borrowed." Recomputing this
// from scratch on every call (no memoization here — the caller memoizes) is
// what makes recommendations "update automatically" as the progression is
// edited.
//
// Deliberately doesn't attempt modulation / secondary-tonicization
// detection — that needs a windowed re-analysis (which section of the
// progression implies which key), not a single whole-progression guess, and
// a half-reliable guess here would be worse than not guessing.
export function analyzeScale(progression) {
  const chords = progression.filter((c) => c.parsed).map((c) => ({ text: c.text, ...c.parsed }));
  if (chords.length < 2) return null;

  let best = null;
  for (const mode of ['major', 'minor']) {
    for (let tonicPitchClass = 0; tonicPitchClass < 12; tonicPitchClass += 1) {
      const { score, borrowed } = scoreKey(tonicPitchClass, mode, chords);
      const isBetter =
        !best ||
        score > best.score ||
        // Tie-break: prefer whichever candidate key the first chord itself
        // implies as tonic (progressions usually start on/near "home"), and
        // prefer matching the first chord's own quality-implied mode too —
        // a progression starting on a minor chord more likely opens on its
        // own minor i than on some major key's vi.
        (score === best.score &&
          chords[0].root.pitchClass === tonicPitchClass &&
          simplifyQuality(chords[0].qualityKey) === (mode === 'minor' ? 'minor' : 'major'));
      if (isBetter) best = { tonicPitchClass, mode, score, borrowed };
    }
  }

  const keyName = KEY_NAMES[best.tonicPitchClass];
  const relativePitchClass = mod(best.tonicPitchClass + (best.mode === 'minor' ? 3 : 9), 12);
  const relativeName = KEY_NAMES[relativePitchClass];

  const suggestedScales =
    best.mode === 'minor'
      ? [`${keyName} Natural Minor`, `${relativeName} Major`, `${keyName} Minor Pentatonic`]
      : [`${keyName} Major`, `${relativeName} Natural Minor`, `${relativeName} Minor Pentatonic`];

  return {
    key: `${keyName} ${best.mode === 'minor' ? 'Minor' : 'Major'}`,
    tonicPitchClass: best.tonicPitchClass,
    mode: best.mode,
    suggestedScales,
    borrowedChords: best.borrowed,
  };
}
