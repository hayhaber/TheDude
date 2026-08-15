// Emotion Mode (spec #9): an emotional target adapts phrasing, bends,
// vibrato intensity, and note density — without ever fighting the actual
// chord's harmony (an emotion never forces a pitch that clashes with the
// chord being played; that would just sound wrong, not "dark" or "epic").
// `scaleMood` is descriptive/advisory (shown in the UI, and used to nudge
// which of the already-valid suggested scales — Phase 2's scaleAnalyzer —
// gets emphasized) rather than a hard override, since major/relative-minor
// share the same notes and are always simultaneously valid.
export const EMOTIONS = [
  { key: 'happy', label: { en: 'Happy', he: 'שמח' } },
  { key: 'dark', label: { en: 'Dark', he: 'אפל' } },
  { key: 'epic', label: { en: 'Epic', he: 'אפי' } },
  { key: 'sad', label: { en: 'Sad', he: 'עצוב' } },
  { key: 'dreamy', label: { en: 'Dreamy', he: 'חלומי' } },
  { key: 'aggressive', label: { en: 'Aggressive', he: 'אגרסיבי' } },
  { key: 'romantic', label: { en: 'Romantic', he: 'רומנטי' } },
  { key: 'heroic', label: { en: 'Heroic', he: 'הרואי' } },
];

// pace: duration multiplier (stacks with the artist's own ARTIST_PACE in
//   licks.js) — >1 slower/more spacious, <1 faster/tighter.
// density: 'sparse' thins the generated lick down (fewer, more deliberate
//   notes); 'normal'/'dense' leave it as generated.
// bendSemitones / vibratoRate / vibratoDepth: intensity applied to every
//   bend/vibrato-tagged note (see audio/lickPlayer.js).
export const EMOTION_PROFILES = {
  happy: {
    scaleMood: 'major',
    density: 'normal',
    pace: 0.95,
    bendSemitones: 1,
    vibratoRate: 6,
    vibratoDepth: 0.2,
    description: { en: 'Bright major-leaning phrasing, light bends, brisk pace.', he: 'ניסוח בהיר בנטייה מז\'ורית, כפיפות קלות, קצב מהיר.' },
  },
  dark: {
    scaleMood: 'minor',
    density: 'sparse',
    pace: 1.3,
    bendSemitones: 1,
    vibratoRate: 4,
    vibratoDepth: 0.2,
    description: { en: 'Minor-leaning phrasing, sparser notes, slower pace.', he: 'ניסוח בנטייה מינורית, תווים דלילים יותר, קצב איטי יותר.' },
  },
  epic: {
    scaleMood: 'minor',
    density: 'normal',
    pace: 0.9,
    bendSemitones: 2,
    vibratoRate: 7,
    vibratoDepth: 0.35,
    description: { en: 'Full minor-leaning runs, wide bends, driving pace.', he: 'ריצות מלאות בנטייה מינורית, כפיפות רחבות, קצב דוחף.' },
  },
  sad: {
    scaleMood: 'minor',
    density: 'sparse',
    pace: 1.5,
    bendSemitones: 1,
    vibratoRate: 4,
    vibratoDepth: 0.3,
    description: { en: 'Sparse minor-leaning phrasing, slow expressive bends and vibrato.', he: 'ניסוח דליל בנטייה מינורית, כפיפות וויברטו איטיים ומלאי ביטוי.' },
  },
  dreamy: {
    scaleMood: 'major',
    density: 'sparse',
    pace: 1.6,
    bendSemitones: 1.5,
    vibratoRate: 5,
    vibratoDepth: 0.4,
    description: { en: 'Long sustained notes, wide slow vibrato, spacious phrasing.', he: 'תווים ארוכים ומתמשכים, ויברטו רחב ואיטי, ניסוח מרווח.' },
  },
  aggressive: {
    scaleMood: 'minor',
    density: 'normal',
    pace: 0.7,
    bendSemitones: 2,
    vibratoRate: 8,
    vibratoDepth: 0.3,
    description: { en: 'Fast, dense minor-leaning runs, hard bends, tight vibrato.', he: 'ריצות מהירות וצפופות בנטייה מינורית, כפיפות חזקות, ויברטו הדוק.' },
  },
  romantic: {
    scaleMood: 'major',
    density: 'sparse',
    pace: 1.4,
    bendSemitones: 1.5,
    vibratoRate: 5,
    vibratoDepth: 0.35,
    description: { en: 'Warm major-leaning phrasing, expressive bends, relaxed pace.', he: 'ניסוח חם בנטייה מז\'ורית, כפיפות מלאות ביטוי, קצב רגוע.' },
  },
  heroic: {
    scaleMood: 'major',
    density: 'normal',
    pace: 0.85,
    bendSemitones: 2,
    vibratoRate: 6,
    vibratoDepth: 0.3,
    description: { en: 'Soaring major-leaning runs, confident bends, driving pace.', he: 'ריצות מרקיעות בנטייה מז\'ורית, כפיפות בטוחות, קצב דוחף.' },
  },
};

export function emotionProfile(emotionKey) {
  return EMOTION_PROFILES[emotionKey] ?? null;
}
