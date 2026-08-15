import { MetronomeIcon } from '../MetronomeIcon/MetronomeIcon';

// Top-level destinations — see the IA in the redesign plan: Compose (build
// the progression), Improvise (generate over it), Practice (skill-building,
// decoupled from the active chord), Studies (structured courses, currently
// the CAGED system), Songs (outbound chord/tab search — doesn't touch the
// shared Fretboard/Stage, since it never displays in-app content), Vocal
// (real-time singing pitch-accuracy training — also self-contained, since
// singing doesn't map to the shared guitar Fretboard/piano keys either).
//
// `icon` is either an emoji string (rendered as-is) or a component
// reference (rendered as <Icon />) — see AppShell.jsx's two render sites.
// Practice uses a custom SVG (MetronomeIcon) instead of an emoji: ticking
// rhythm is the one thread running through everything under it (drills,
// rhythm game, chord changes, bending, ...), a more distinctive and
// on-theme mark than a generic 🎯 bullseye.
export const SECTIONS = [
  { key: 'compose', labelKey: 'nav.compose', icon: '🎼' },
  { key: 'improvise', labelKey: 'nav.improvise', icon: '🎸' },
  { key: 'practice', labelKey: 'nav.practice', icon: MetronomeIcon },
  { key: 'studies', labelKey: 'nav.studies', icon: '📖' },
  { key: 'songs', labelKey: 'nav.songs', icon: '🔍' },
  { key: 'vocal', labelKey: 'nav.vocal', icon: '🎤' },
];
