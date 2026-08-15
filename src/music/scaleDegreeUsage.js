// Insights panel's scale-tone strip (under "Detected key:") — for each of
// the parent key's 7 diatonic degrees, works out whether the CURRENT typed
// progression actually uses that degree, and if so, whether it uses it
// diatonically or as a borrowed (mode-mixture) chord. Reuses
// scaleAnalyzer.js's own diatonic-quality data (single source) rather than
// a second copy, and chordQualities.js's tone data for the clash check.
import {
  MAJOR_SCALE_INTERVALS,
  DIATONIC_BUCKET,
  MINOR_SCALE_INTERVALS,
  MINOR_DIATONIC_BUCKETS,
  MINOR_ROMAN_BY_BUCKET,
  KEY_NAMES,
  simplifyQuality,
} from './scaleAnalyzer';
import { CHORD_QUALITIES } from './chordQualities';
import { mod } from './notes';

const MAJOR_ROMAN_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const DIATONIC_QUALITY_KEY = { major: 'major', minor: 'minor', dim: 'dim' };

// null < 'diatonic' < 'borrowed' < 'clash' — a degree touched by more than
// one chord in the progression (e.g. both a diatonic and a borrowed use of
// the same root across the song) always shows its most notable usage.
const PRIORITY = { diatonic: 1, borrowed: 2, clash: 3 };

function higherUsage(a, b) {
  if (!a) return b;
  if (!b) return a;
  return PRIORITY[b] > PRIORITY[a] ? b : a;
}

// True if any tone of `chord` sits exactly a half-step BELOW (not above)
// the tone in the SAME chord-tone role (root/3rd/5th/7th, by array
// position) of the plain diatonic triad that would normally occupy this
// root — a LOWERED tone, the real "borrowed b3 against the parallel major
// 3rd" style tension (Kostka & Payne's "mode mixture" chapter). This app has
// no live melody-note input to compare against directly, so this is the
// closest computable, theory-grounded proxy: does the borrowed chord's own
// altered tone clash with the tone it's standing in for.
//
// Deliberately NOT symmetric — a tone a half-step ABOVE the diatonic one
// (e.g. B major's D# standing in for the diatonic iii chord Bm's D natural)
// is a RAISED tone, i.e. a leading tone: that's exactly what makes a
// secondary dominant (V/vi, V/ii, ...) work, resolving smoothly upward
// rather than clashing — one of the most common, pleasant-sounding borrowed
// chords there is, not a dissonance. Only a lowered tone creates the
// bittersweet "fights the note it replaced" tension worth flagging red.
function hasHalfStepClash(chordQualityKey, rootPitchClass, diatonicBucket, diatonicRootPitchClass) {
  const chordTones = CHORD_QUALITIES[chordQualityKey]?.tones;
  const diatonicTones = CHORD_QUALITIES[DIATONIC_QUALITY_KEY[diatonicBucket]]?.tones;
  if (!chordTones || !diatonicTones) return false;

  return chordTones.some((tone, i) => {
    const diatonicTone = diatonicTones[i];
    if (!diatonicTone) return false;
    const pc = mod(rootPitchClass + tone.semitones, 12);
    const diatonicPc = mod(diatonicRootPitchClass + diatonicTone.semitones, 12);
    return mod(pc - diatonicPc, 12) === 11; // pc is exactly 1 semitone below diatonicPc
  });
}

// { degrees: [{degree:1-7, roman, noteName, pitchClass, usage}], extras: [{noteName, roman, usage}] }
// usage is null (not used) | 'diatonic' | 'borrowed' | 'clash'. `mode` is
// 'major' | 'minor' — a minor-key result (see analyzeScale) needs its own
// interval/roman-numeral set, since natural/harmonic/melodic minor's
// several standard forms don't reduce to one fixed quality per degree the
// way a major key's 7 diatonic triads do (see MINOR_DIATONIC_BUCKETS).
export function computeScaleDegreeUsage(progression, tonicPitchClass, mode = 'major') {
  const isMinor = mode === 'minor';
  const intervals = isMinor ? MINOR_SCALE_INTERVALS : MAJOR_SCALE_INTERVALS;

  const diatonic = intervals.map((interval, i) => ({
    pitchClass: mod(tonicPitchClass + interval, 12),
    buckets: isMinor ? MINOR_DIATONIC_BUCKETS[i] : [DIATONIC_BUCKET[i]],
    // The "natural" form's roman/bucket — used as both the default label
    // for a degree the progression never touches, and the reference
    // quality the half-step-clash check compares a borrowed chord against.
    defaultBucket: isMinor ? MINOR_DIATONIC_BUCKETS[i][0] : DIATONIC_BUCKET[i],
    defaultRoman: isMinor ? MINOR_ROMAN_BY_BUCKET[i][MINOR_DIATONIC_BUCKETS[i][0]] : MAJOR_ROMAN_NUMERALS[i],
  }));
  const degrees = diatonic.map((d, i) => ({
    degree: i + 1,
    roman: d.defaultRoman,
    pitchClass: d.pitchClass,
    noteName: KEY_NAMES[d.pitchClass],
    usage: null,
  }));
  const extrasByPitchClass = new Map();
  // Per-chord severity, keyed by chord text — lets the "Borrowed chords:"
  // legend line color each chord name the same way its circle is colored,
  // without re-deriving the same match/clash logic a second time.
  const chordSeverity = new Map();

  const chords = progression.filter((c) => c.parsed).map((c) => ({ text: c.text, ...c.parsed }));

  chords.forEach((chord) => {
    const dIndex = diatonic.findIndex((d) => d.pitchClass === chord.root.pitchClass);
    const match = dIndex === -1 ? null : diatonic[dIndex];
    const entry = dIndex === -1 ? null : degrees[dIndex];
    if (!match || !entry) {
      // Root outside the 7 diatonic pitch classes entirely (e.g. a bVI/bVII
      // borrowed chord) — labeled the standard way, relative to the
      // diatonic degree it sits a half-step below.
      const above = diatonic.find((d) => mod(d.pitchClass - chord.root.pitchClass, 12) === 1);
      const roman = above ? `b${above.defaultRoman.replace('°', '').toUpperCase()}` : '?';
      const prev = extrasByPitchClass.get(chord.root.pitchClass);
      extrasByPitchClass.set(chord.root.pitchClass, {
        noteName: KEY_NAMES[chord.root.pitchClass],
        roman,
        usage: higherUsage(prev?.usage, 'borrowed'),
      });
      chordSeverity.set(chord.text, 'borrowed');
      return;
    }

    const bucket = simplifyQuality(chord.qualityKey);
    if (match.buckets.includes(bucket)) {
      // Show the roman numeral for whichever acceptable form is actually
      // playing here (e.g. "V" not "v" once a major chord shows up on the
      // minor key's 5th degree), not always the natural-minor default.
      entry.roman = isMinor ? MINOR_ROMAN_BY_BUCKET[dIndex][bucket] ?? entry.roman : entry.roman;
      entry.usage = higherUsage(entry.usage, 'diatonic');
      chordSeverity.set(chord.text, 'diatonic');
      return;
    }
    const clashes = hasHalfStepClash(chord.qualityKey, chord.root.pitchClass, match.defaultBucket, match.pitchClass);
    const severity = clashes ? 'clash' : 'borrowed';
    entry.usage = higherUsage(entry.usage, severity);
    chordSeverity.set(chord.text, severity);
  });

  return { degrees, extras: [...extrasByPitchClass.values()], chordSeverity };
}
