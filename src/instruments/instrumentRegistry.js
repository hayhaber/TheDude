// The declarative list of instruments the app knows about — same shape as
// AppShell/sections.js's SECTIONS list. Adding Bass/Ukulele/etc. later is
// one more entry here plus a renderer (see PianoKeyboard.jsx) and an audio
// profile (see audio/pianoPlayer.js for the pattern) — nothing else in the
// app needs to change to recognize a new instrument exists.
export const INSTRUMENTS = [
  { key: 'guitar', labelKey: 'instrument.guitar', icon: '🎸' },
  { key: 'piano', labelKey: 'instrument.piano', icon: '🎹' },
];

export const DEFAULT_INSTRUMENT = 'guitar';
