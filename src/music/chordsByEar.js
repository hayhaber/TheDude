// The Studies -> Chords by Ear course's own dedicated practice engine — a
// separate, purpose-built question generator (not a reuse of
// music/earTraining.js), because the skill this course trains is genuinely
// different from that generic pitch/interval/chord-ID quiz: FUNCTIONAL,
// relative-pitch hearing — "what scale degree is this, relative to the
// song's own home chord" — rather than absolute pitch recognition. This is
// the real methodology working musicians and ear-training teachers actually
// use (the "Nashville Number System," "movable do," Berklee-style
// functional ear training): you don't need perfect pitch to play along with
// a song by ear, you need to hear a chord's relationship to "home."
//
// Reuses harmonyCurriculum.js's buildDiatonicChords (exact same diatonic
// chord-building math as the Harmony course) so a key's 7 chords here are
// always identical to what that course teaches — no second copy of "how to
// build the chords of a key."
import { buildDiatonicChords } from './harmonyCurriculum';
import { computeChordPositions } from './computeChordPositions';
import { KEY_NAMES } from './scaleAnalyzer';
import { STANDARD_TUNING } from './notes';

function midiForCell(stringIndex, fret) {
  return STANDARD_TUNING[stringIndex].baseMidi + fret;
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A real, playable voicing for a chord symbol — same "reuse the app's one
// chord-shape engine" rule every other course/quiz follows (see
// earTraining.js's own buildChordVoicing for the identical pattern). Capped
// to fret 12 so every drill's audio stays in a comfortable, clearly-audible
// register rather than reaching for an obscure high-fret shape.
export function buildVoicing(chordText) {
  const { isValid, positions } = computeChordPositions(chordText, 'chord');
  if (!isValid || positions.length === 0) return null;
  const inRange = positions.filter((p) => p.strings.every((s) => s.fret === null || s.fret <= 12));
  const chosen = pick(inRange.length > 0 ? inRange : positions);
  const notes = chosen.strings
    .map((s, i) => (s.fret === null ? null : { stringIndex: i, fret: s.fret, midi: midiForCell(i, s.fret), role: s.role }))
    .filter(Boolean);
  return notes.length > 0 ? notes : null;
}

// A single low reference tone for the key's tonic (the "home" pitch a
// listening exercise is anchored against) — the open/near-open E-A-D string
// closest to that pitch class, so it always plays in a clear, low, "bass
// note" register regardless of key.
export function referenceToneMidi(rootPitchClass) {
  for (const stringIndex of [1, 0, 2]) {
    const open = STANDARD_TUNING[stringIndex].pitchClass;
    const fret = (rootPitchClass - open + 12) % 12;
    if (fret <= 5) return midiForCell(stringIndex, fret);
  }
  return midiForCell(1, (rootPitchClass - STANDARD_TUNING[1].pitchClass + 12) % 12);
}

// --- Diatonic degree helper --------------------------------------------
// 0-indexed degree -> its diatonic chords across every key, generated on
// demand rather than cached, since a fresh random key is picked per
// question (see each generator below). `mode: 'minor'` builds over
// HARMONIC minor specifically, not natural minor — same reasoning as
// scaleAnalyzer.js's own minor-key fix elsewhere in this app: natural
// minor's v comes out minor (no real leading tone), which is NOT what real
// minor-key harmony (or a minor blues) actually uses; harmonic minor's
// raised 7th gives a genuine major V, the authentic dominant every minor
// key resolves through.
export function diatonicChordsForKey(rootPitchClass, mode = 'major') {
  return buildDiatonicChords(rootPitchClass, mode === 'minor' ? 'harmonicMinor' : 'major', false);
}

// --- Fretboard "road map" anchoring --------------------------------------
// A chord's own playable shape, specifically the variant whose ROOT lands
// on a given string (0 = low E, 1 = A) — not just "any playable voicing."
// computeChordPositions already enumerates every real shape a chord has
// (same engine Compose/every other course uses); this just picks the one
// that happens to be the barre/open shape rooted on that particular string,
// which is exactly what a real "3 chords off the low E, 3 off the A"
// teaching system anchors on. Returns null if that chord has no shape
// rooted on that string (shouldn't happen for plain major/minor triads).
export function anchoredPosition(chordText, stringIndex) {
  const { isValid, positions } = computeChordPositions(chordText, 'chord');
  if (!isValid) return null;
  return positions.find((p) => p.strings[stringIndex]?.role === 'root') ?? null;
}

// The 6-chord "road map" every degree-1/4/5-style teaching system uses:
// I, ii, iii anchored off the low E string (root frets F, F+2, F+4), IV, V,
// vi anchored off the A string (same 3 fret offsets) — real, not
// coincidental, guitar geometry: the A string's open pitch is a perfect 4th
// above the low E's, and IV is a perfect 4th above I, so the SAME fret
// offsets that build i/ii/iii off the E string rebuild IV/V/vi off the A
// string one string over. vii° is deliberately left out — diminished
// barre shapes aren't part of this beginner-friendly system.
export function buildChordRoadMap(rootPitchClass) {
  const diatonic = diatonicChordsForKey(rootPitchClass);
  return diatonic.slice(0, 6).map((chord, i) => {
    const stringIndex = i < 3 ? 0 : 1;
    return { ...chord, stringIndex, position: anchoredPosition(chord.chordText, stringIndex) };
  });
}

// --- Common progressions bank -------------------------------------------
// Six of the most-recycled chord progressions in popular music — the exact
// "shapes" a working musician recognizes instantly regardless of the actual
// key a given song happens to be in. `degrees` are 0-indexed diatonic
// degrees (I=0, ii=1, iii=2, IV=3, V=4, vi=5, vii°=6) fed straight into
// diatonicChordsForKey's output.
export const COMMON_PROGRESSIONS = [
  {
    id: 'I-IV-V',
    name: { en: 'I – IV – V (blues, folk, rock)', he: 'I – IV – V (בלוז, פולק, רוק)' },
    degrees: [0, 3, 4, 0],
  },
  {
    id: 'I-V-vi-IV',
    name: { en: 'I – V – vi – IV ("the 4 chords")', he: 'I – V – vi – IV ("4 האקורדים")' },
    degrees: [0, 4, 5, 3],
  },
  {
    id: 'I-vi-IV-V',
    name: { en: 'I – vi – IV – V ("the \'50s progression")', he: 'I – vi – IV – V ("רצף שנות ה-50")' },
    degrees: [0, 5, 3, 4],
  },
  {
    id: 'vi-IV-I-V',
    name: { en: 'vi – IV – I – V', he: 'vi – IV – I – V' },
    degrees: [5, 3, 0, 4],
  },
  {
    id: 'ii-V-I',
    name: { en: 'ii – V – I (jazz)', he: 'ii – V – I (ג\'אז)' },
    degrees: [1, 4, 0],
  },
  {
    id: 'I-IV-I-V',
    name: { en: 'I – IV – I – V', he: 'I – IV – I – V' },
    degrees: [0, 3, 0, 4],
  },
  // The most iconic named form in all of popular music pedagogy — every
  // certified guitar/blues method teaches this exact 12-bar shape by name.
  // Included as its own longer degrees sequence rather than a 4-chord loop
  // so both the teaching demo and the pattern-recognition drill treat it as
  // a real, distinctly-timed form (12 bars, not 4) instead of reducing it
  // to "just I-IV-V again."
  {
    id: '12-bar-blues',
    name: { en: '12-Bar Blues', he: 'בלוז 12 שריגים' },
    degrees: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4],
  },
  {
    id: 'I-vi-ii-V',
    name: { en: 'I – vi – ii – V (jazz/doo-wop turnaround)', he: 'I – vi – ii – V (טוויסט ג\'אז/דו-ווופ)' },
    degrees: [0, 5, 1, 4],
  },
  // Same 12-bar TIMING as the major blues shape above, but built over
  // harmonic minor (see diatonicChordsForKey's own comment) so its V is a
  // real dominant, not natural minor's weaker v — i-i-i-i-iv-iv-i-i-V-iv-i-V.
  {
    id: 'minor-blues',
    mode: 'minor',
    name: { en: 'Minor Blues (i – iv – V)', he: 'בלוז מינורי (i – iv – V)' },
    degrees: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4],
  },
];

// Realizes a progression's degree list in a real key — returns the actual
// diatonic-chord objects (roman, chordText, rootPitchClass, ...) in order.
// Reads the progression's own `mode` (major by default, 'minor' for the
// harmonic-minor entries above) rather than assuming major for everything.
export function realizeProgression(progression, keyRootPitchClass) {
  const diatonic = diatonicChordsForKey(keyRootPitchClass, progression.mode ?? 'major');
  return progression.degrees.map((d) => diatonic[d]);
}

// --- Question generators -------------------------------------------------

// Chord-quality-by-ear: the very first listening skill (major "bright" vs
// minor "dark"), extended to dominant7/diminished at the fuller tier.
const QUALITY_SUFFIX = { major: '', minor: 'm', dominant7: '7', dim: 'dim' };
const QUALITY_TIERS = {
  foundation: ['major', 'minor'],
  full: ['major', 'minor', 'dominant7', 'dim'],
};

// Real, playable voicing for an arbitrary root+quality combo — exported so
// the UI can build a comparison voicing for whichever WRONG quality a
// learner picked (see ChordsByEarDrills.jsx's QualityDrill "Compare
// Sounds" remediation replay), not just the correct answer already on the
// question object.
export function voicingForRootQuality(rootPitchClass, qualityKey) {
  return buildVoicing(KEY_NAMES[rootPitchClass] + QUALITY_SUFFIX[qualityKey]);
}

export function generateQualityQuestion(tier = 'full') {
  const pool = QUALITY_TIERS[tier] ?? QUALITY_TIERS.full;
  const qualityKey = pick(pool);
  const rootPitchClass = randomInt(0, 11);
  const chordText = KEY_NAMES[rootPitchClass] + QUALITY_SUFFIX[qualityKey];
  const notesToPlay = buildVoicing(chordText);
  if (!notesToPlay) return generateQualityQuestion(tier);

  const choices = pool.map((k) => ({ key: k, qualityKey: k }));
  return { kind: 'quality', rootPitchClass, chordText, notesToPlay, choices, correctChoiceKey: qualityKey };
}

// Functional hearing: establish a key (reference tone + I chord), then play
// ONE diatonic chord from it — the answer is that chord's scale degree /
// roman numeral, never an absolute note name. `allowedDegrees` (0-indexed)
// lets early lessons restrict the pool to just I/IV/V (the 3 chords that
// alone cover a huge fraction of real songs) before opening up to all 7.
export function generateFunctionalQuestion(allowedDegrees = [0, 1, 2, 3, 4, 5, 6]) {
  const keyRootPitchClass = randomInt(0, 11);
  const diatonic = diatonicChordsForKey(keyRootPitchClass);
  const degreeIndex = pick(allowedDegrees);
  const target = diatonic[degreeIndex];

  const referenceNotesToPlay = buildVoicing(diatonic[0].chordText);
  const targetNotesToPlay = buildVoicing(target.chordText);
  if (!referenceNotesToPlay || !targetNotesToPlay) return generateFunctionalQuestion(allowedDegrees);

  const choices = allowedDegrees.map((d) => ({ key: String(d), roman: diatonic[d].roman, degree: d + 1 }));
  return {
    kind: 'functional',
    keyName: KEY_NAMES[keyRootPitchClass],
    referenceToneMidi: referenceToneMidi(keyRootPitchClass),
    referenceNotesToPlay,
    referenceChordText: diatonic[0].chordText,
    targetNotesToPlay,
    targetChordText: target.chordText,
    choices,
    correctChoiceKey: String(degreeIndex),
  };
}

// Progression-pattern recognition: plays a whole well-known progression
// (transposed to a random key each time, so the answer can never be
// memorized as "always in C") and asks which of the 6 COMMON_PROGRESSIONS
// shapes it is.
export function generateProgressionQuestion() {
  const progression = pick(COMMON_PROGRESSIONS);
  const keyRootPitchClass = randomInt(0, 11);
  const realized = realizeProgression(progression, keyRootPitchClass);
  const chordVoicings = realized.map((c) => buildVoicing(c.chordText));
  if (chordVoicings.some((v) => !v)) return generateProgressionQuestion();

  const distractors = shuffle(COMMON_PROGRESSIONS.filter((p) => p.id !== progression.id)).slice(0, 3);
  const choices = shuffle([progression, ...distractors]).map((p) => ({ key: p.id, name: p.name }));

  return {
    kind: 'progression',
    keyName: KEY_NAMES[keyRootPitchClass],
    chords: realized,
    chordVoicings,
    choices,
    correctChoiceKey: progression.id,
  };
}

// Find the Key: plays a clear I-IV-V-I reference cadence in a random key —
// the strongest, most unambiguous way to establish a "home" by ear (see the
// Function stage's own cbe-nashville lesson) — for the Find-the-Key
// practice lesson, where the user's job is to name that home by picking a
// candidate root on the fretboard rather than a multiple-choice label.
export function generateFindKeyQuestion() {
  const rootPitchClass = randomInt(0, 11);
  const diatonic = diatonicChordsForKey(rootPitchClass);
  const chords = [diatonic[0], diatonic[3], diatonic[4], diatonic[0]];
  const chordVoicings = chords.map((c) => buildVoicing(c.chordText));
  if (chordVoicings.some((v) => !v)) return generateFindKeyQuestion();
  return { kind: 'findKey', rootPitchClass, chordVoicings };
}

// Chord-change detection: chord A holds for `beatsBeforeChange` beats, then
// chord B takes over — trains the specific skill of catching the MOMENT a
// song's rhythm section changes chords, which matters more for real-time
// jamming than identifying any one chord in isolation. Answered as "how
// many beats did you count before it changed", a countable, checkable task
// (rather than a live tap-timing capture, which is far less forgiving of a
// moment's inattention and harder to score fairly).
const CHANGE_BEAT_OPTIONS = [2, 4, 4, 4, 8]; // weighted — 4 beats/bar is by far the most common phrase length

export function generateChangeQuestion(bpm = 92) {
  const keyRootPitchClass = randomInt(0, 11);
  const diatonic = diatonicChordsForKey(keyRootPitchClass);
  const degreeA = randomInt(0, 6);
  let degreeB = randomInt(0, 6);
  while (degreeB === degreeA) degreeB = randomInt(0, 6);
  const beatsBeforeChange = pick(CHANGE_BEAT_OPTIONS);

  const voicingA = buildVoicing(diatonic[degreeA].chordText);
  const voicingB = buildVoicing(diatonic[degreeB].chordText);
  if (!voicingA || !voicingB) return generateChangeQuestion(bpm);

  const options = [...new Set(CHANGE_BEAT_OPTIONS)];
  const choices = options.map((n) => ({ key: String(n), beats: n }));

  return {
    kind: 'change',
    bpm,
    chordA: diatonic[degreeA],
    chordB: diatonic[degreeB],
    voicingA,
    voicingB,
    beatsBeforeChange,
    choices,
    correctChoiceKey: String(beatsBeforeChange),
  };
}

// Bass motion: does the bass note go UP or DOWN from one chord to the
// next? A real, distinct skill many ear-training methods isolate on its
// own (tracking a song's bass line is one of the fastest ways to sense
// where a progression is headed even before the chord above it is
// identified) — directly reinforces the Strategy lesson's "try to hum the
// bass line" step. Compares each voicing's actual lowest sounding note
// (not just the abstract root pitch class), since that's what an ear
// genuinely hears as "the bass."
export function generateBassMotionQuestion() {
  const keyRootPitchClass = randomInt(0, 11);
  const diatonic = diatonicChordsForKey(keyRootPitchClass);
  const degreeA = randomInt(0, 6);
  let degreeB = randomInt(0, 6);
  while (degreeB === degreeA) degreeB = randomInt(0, 6);

  const voicingA = buildVoicing(diatonic[degreeA].chordText);
  const voicingB = buildVoicing(diatonic[degreeB].chordText);
  if (!voicingA || !voicingB) return generateBassMotionQuestion();

  const bassA = Math.min(...voicingA.map((n) => n.midi));
  const bassB = Math.min(...voicingB.map((n) => n.midi));
  if (bassA === bassB) return generateBassMotionQuestion(); // degenerate tie, re-roll

  const correctChoiceKey = bassB > bassA ? 'up' : 'down';
  return {
    kind: 'bassMotion',
    chordA: diatonic[degreeA],
    chordB: diatonic[degreeB],
    voicingA,
    voicingB,
    choices: [{ key: 'up' }, { key: 'down' }],
    correctChoiceKey,
  };
}

// --- Progression dictation (transcribe-by-ear) ---------------------------
// The one skill every other drill in this file has been building TOWARD but
// never actually tests directly: hear a genuinely random chord sequence
// (not one of the 6 named COMMON_PROGRESSIONS shapes) and write down every
// chord in it, one at a time — real "transcribe a progression by ear," not
// pattern-name recognition. Difficulty scales on 3 independent axes real
// ear-training methods all vary together: how many chords, how harmonically
// complex each one is, and how much the answer UI itself gives away —
// beginner tiers get 4-option multiple choice per chord (an "American test"
// — only one option is correct), the top tier drops the safety net entirely
// and asks for the whole sequence typed freeform, parsed the exact same way
// Compose's own chord-progression input already is.
const SEQUENCE_QUALITY_SUFFIX = { major: '', minor: 'm', dominant7: '7', dim: 'dim', major7: 'maj7', minor7: 'm7' };

const SEQUENCE_TIERS = {
  beginner: { chordCount: 2, qualities: ['major', 'minor'], inputMode: 'choice', bpm: 72 },
  intermediate: { chordCount: 4, qualities: ['major', 'minor', 'dominant7'], inputMode: 'choice', bpm: 86 },
  advanced: { chordCount: 5, qualities: ['major', 'minor', 'dominant7', 'dim'], inputMode: 'choice', bpm: 96 },
  expert: {
    chordCount: 6,
    qualities: ['major', 'minor', 'dominant7', 'dim', 'major7', 'minor7'],
    inputMode: 'freeText',
    bpm: 108,
  },
};

export const SEQUENCE_TIER_KEYS = Object.keys(SEQUENCE_TIERS);

// Exported so the UI can render an option's/answer's chord symbol without
// duplicating this root+quality-key -> text rule a second time.
export function sequenceChordText(rootPitchClass, qualityKey) {
  return KEY_NAMES[rootPitchClass] + SEQUENCE_QUALITY_SUFFIX[qualityKey];
}

export function generateSequenceQuestion(tierKey = 'beginner') {
  const tier = SEQUENCE_TIERS[tierKey] ?? SEQUENCE_TIERS.beginner;
  const chords = Array.from({ length: tier.chordCount }, () => {
    const rootPitchClass = randomInt(0, 11);
    const qualityKey = pick(tier.qualities);
    return { rootPitchClass, qualityKey, chordText: sequenceChordText(rootPitchClass, qualityKey) };
  });
  const chordVoicings = chords.map((c) => buildVoicing(c.chordText));
  if (chordVoicings.some((v) => !v)) return generateSequenceQuestion(tierKey);

  // Choice-mode tiers: 4 options per slot (the correct chord + 3 distinct
  // distractors drawn from the same tier's quality pool), same "one right
  // answer among a handful" shape as QuizChoices elsewhere in this course.
  let slotChoices = null;
  if (tier.inputMode === 'choice') {
    slotChoices = chords.map((c) => {
      const correctKey = `${c.rootPitchClass}-${c.qualityKey}`;
      const pool = [{ key: correctKey, rootPitchClass: c.rootPitchClass, qualityKey: c.qualityKey }];
      while (pool.length < 4) {
        const rp = randomInt(0, 11);
        const qk = pick(tier.qualities);
        const key = `${rp}-${qk}`;
        if (pool.some((p) => p.key === key)) continue;
        pool.push({ key, rootPitchClass: rp, qualityKey: qk });
      }
      return { correctKey, options: shuffle(pool) };
    });
  }

  return {
    kind: 'sequence',
    tierKey,
    inputMode: tier.inputMode,
    bpm: tier.bpm,
    chords,
    chordVoicings,
    slotChoices,
  };
}

// Sing the Root: the single most-recommended drill in every certified
// relative-pitch method (Kodály solfège, David Lucas Burge's Ear Training
// courses) — actively singing a pitch back is a stronger, more honest test
// of whether you've truly internalized it than picking from a multiple-
// choice list, which can be passed by elimination without really hearing
// anything. A chord plays; the answer is its ROOT note, sung/hummed back
// and graded by the app's own mic pitch detector (see
// ChordsByEarDrills.jsx's SingRootDrill) — pitch CLASS only, any octave,
// since a singer's voice range has nothing to do with where a guitar
// happens to voice the same chord.
export function generateSingRootQuestion() {
  const rootPitchClass = randomInt(0, 11);
  const qualityKey = pick(['major', 'minor']);
  const chordText = KEY_NAMES[rootPitchClass] + QUALITY_SUFFIX[qualityKey];
  const notesToPlay = buildVoicing(chordText);
  if (!notesToPlay) return generateSingRootQuestion();
  return { kind: 'singRoot', rootPitchClass, chordText, notesToPlay };
}
