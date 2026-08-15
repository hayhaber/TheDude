// Top-level destinations — see the IA in the redesign plan: Compose (build
// the progression), Improvise (generate over it), Practice (skill-building,
// decoupled from the active chord), Studies (structured courses, currently
// the CAGED system), Songs (outbound chord/tab search — doesn't touch the
// shared Fretboard/Stage, since it never displays in-app content), Vocal
// (real-time singing pitch-accuracy training — also self-contained, since
// singing doesn't map to the shared guitar Fretboard/piano keys either).
export const SECTIONS = [
  { key: 'compose', labelKey: 'nav.compose', icon: '🎼' },
  { key: 'improvise', labelKey: 'nav.improvise', icon: '🎸' },
  { key: 'practice', labelKey: 'nav.practice', icon: '🎯' },
  { key: 'studies', labelKey: 'nav.studies', icon: '📖' },
  { key: 'songs', labelKey: 'nav.songs', icon: '🔍' },
  { key: 'vocal', labelKey: 'nav.vocal', icon: '🎤' },
];
