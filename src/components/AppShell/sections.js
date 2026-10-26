import { TrainingIcon } from '../TrainingIcon/TrainingIcon';
import { GuitarIcon } from '../GuitarIcon/GuitarIcon';
import { GuitarProNavIcon } from '../GuitarProIcon/GuitarProIcon';
import { ChordsNavIcon } from '../ChordLibrary/ChordsNavIcon';

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
// Practice uses a custom SVG (TrainingIcon, a metronome) — the universal
// music-practice symbol, and distinctive against the emoji icons around it.
export const SECTIONS = [
  { key: 'compose', labelKey: 'nav.compose', icon: '🎼' },
  // Guitar only: every chord in every key, its voicings, inversions, slash chords.
  { key: 'chords', labelKey: 'nav.chords', icon: ChordsNavIcon },
  { key: 'improvise', labelKey: 'nav.improvise', icon: GuitarIcon },
  { key: 'practice', labelKey: 'nav.practice', icon: TrainingIcon },
  // Bass only: the bass's own practice (BassPracticeView) — same nav name.
  { key: 'bassPractice', labelKey: 'nav.practice', icon: TrainingIcon },
  // Guitar only: the teacher (lessons, homework, mastery) — the goal-based
  // practice Coach now lives inside it (Today -> Practice plan).
  { key: 'teacher', labelKey: 'nav.teacher', icon: '🎓' },
  { key: 'studies', labelKey: 'nav.studies', icon: '📖' },
  { key: 'songs', labelKey: 'nav.songs', icon: '🔍' },
  // Guitar Pro files: play the song with its band, practice its solo.
  { key: 'guitarpro', labelKey: 'nav.guitarpro', icon: GuitarProNavIcon },
  // Piano only: a big keyboard to play freely (pedal, live chord, recording).
  { key: 'freeplay', labelKey: 'nav.freeplay', icon: '🎹' },
  { key: 'vocal', labelKey: 'nav.vocal', icon: '🎤' },
];
