import { GuitarIcon } from '../components/GuitarIcon/GuitarIcon';
import { BassGuitarIcon } from '../components/BassGuitarIcon/BassGuitarIcon';

// The declarative list of instruments the app knows about — same shape as
// AppShell/sections.js's SECTIONS list. `icon` is either an emoji string
// (rendered as-is) or a component reference (a custom SVG, same convention
// sections.js already uses for Practice's TrainingIcon) — see
// InstrumentToggle.jsx's own icon rendering. Adding Bass/Ukulele/etc. later
// is one more entry here plus a renderer (see PianoKeyboard.jsx) and an
// audio profile (see audio/pianoPlayer.js for the pattern) — nothing else in
// the app needs to change to recognize a new instrument exists.
export const INSTRUMENTS = [
  // Real illustrated artwork (user-supplied) instead of the plain 🎸 emoji —
  // see GuitarIcon's own comment; also used for Improvise's nav icon and
  // InstrumentGate's fallback message, for consistent guitar branding.
  { key: 'guitar', labelKey: 'instrument.guitar', icon: GuitarIcon },
  { key: 'piano', labelKey: 'instrument.piano', icon: '🎹' },
  // No dedicated bass-guitar emoji exists in Unicode, and reusing the
  // guitar emoji made the two indistinguishable at a glance — a custom
  // long-neck/small-body glyph instead (see BassGuitarIcon's own comment).
  { key: 'bass', labelKey: 'instrument.bass', icon: BassGuitarIcon },
];

export const DEFAULT_INSTRUMENT = 'guitar';
