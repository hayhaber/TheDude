// The registry of software actions a user can bind a keyboard key to (new
// Settings -> Keyboard Shortcuts section). Each entry's `run` is resolved at
// call time from the live handler map App.jsx builds (see
// useGlobalShortcutListener.js) — this file only owns the STATIC catalog
// (id/label/category/default key), not the actual functions, so it has no
// dependency on App.jsx's state.
export const SHORTCUT_CATEGORIES = {
  CHORDS: 'chords',
  PLAYBACK: 'playback',
  METRONOME: 'metronome',
};

export const SHORTCUT_CATEGORY_LABELS = {
  [SHORTCUT_CATEGORIES.CHORDS]: { en: 'Chords & Positions', he: 'אקורדים ופוזיציות' },
  [SHORTCUT_CATEGORIES.PLAYBACK]: { en: 'Playback', he: 'ניגון' },
  [SHORTCUT_CATEGORIES.METRONOME]: { en: 'Metronome', he: 'מטרונום' },
};

// defaultKey uses the same normalized format bindings are stored/compared
// in — see keyboard/keyBinding.js's normalizeKeyEvent/formatBinding.
export const SHORTCUT_ACTIONS = [
  { id: 'nextChord', label: { en: 'Next chord', he: 'אקורד הבא' }, category: SHORTCUT_CATEGORIES.CHORDS, defaultKey: 'ArrowRight' },
  { id: 'prevChord', label: { en: 'Previous chord', he: 'אקורד קודם' }, category: SHORTCUT_CATEGORIES.CHORDS, defaultKey: 'ArrowLeft' },
  // Guitar: steps the fretboard position. Piano: steps the chord inversion.
  // One shared action/binding rather than two separate ones, since only one
  // instrument is ever active at a time — see App.jsx's own handler, which
  // picks the right behavior for whichever instrument is current.
  { id: 'nextPosition', label: { en: 'Next position / inversion', he: 'פוזיציה / היפוך הבא' }, category: SHORTCUT_CATEGORIES.CHORDS, defaultKey: 'ArrowUp' },
  { id: 'prevPosition', label: { en: 'Previous position / inversion', he: 'פוזיציה / היפוך קודם' }, category: SHORTCUT_CATEGORIES.CHORDS, defaultKey: 'ArrowDown' },
  { id: 'playChord', label: { en: 'Play current chord', he: 'נגן את האקורד הנוכחי' }, category: SHORTCUT_CATEGORIES.PLAYBACK, defaultKey: 'Ctrl+Space' },
  { id: 'toggleMute', label: { en: 'Mute / unmute metronome', he: 'השתק / בטל השתקה למטרונום' }, category: SHORTCUT_CATEGORIES.METRONOME, defaultKey: 'Ctrl+M' },
  { id: 'volumeUp', label: { en: 'Volume up', he: 'הגבר ווליום' }, category: SHORTCUT_CATEGORIES.METRONOME, defaultKey: 'Ctrl+ArrowUp' },
  { id: 'volumeDown', label: { en: 'Volume down', he: 'הנמך ווליום' }, category: SHORTCUT_CATEGORIES.METRONOME, defaultKey: 'Ctrl+ArrowDown' },
  { id: 'tempoUp', label: { en: 'Tempo up', he: 'הגבר קצב' }, category: SHORTCUT_CATEGORIES.METRONOME, defaultKey: 'Ctrl+ArrowRight' },
  { id: 'tempoDown', label: { en: 'Tempo down', he: 'הנמך קצב' }, category: SHORTCUT_CATEGORIES.METRONOME, defaultKey: 'Ctrl+ArrowLeft' },
];

export const DEFAULT_BINDINGS = Object.fromEntries(SHORTCUT_ACTIONS.map((a) => [a.id, a.defaultKey]));
