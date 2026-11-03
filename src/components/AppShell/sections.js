// Top-level destinations of an instrument. `icon` names a drawing in the
// shared LineIcon set (components/LineIcon) — the same pictures as the home
// cards' shortcuts; `pianoIcon` overrides it on the piano.
export const SECTIONS = [
  { key: 'compose', labelKey: 'nav.compose', icon: 'compose' },
  // Guitar only: every chord in every key, its voicings, inversions, slash chords.
  { key: 'chords', labelKey: 'nav.chords', icon: 'chords', pianoIcon: 'pianoChords' },
  { key: 'improvise', labelKey: 'nav.improvise', icon: 'improvise' },
  { key: 'practice', labelKey: 'nav.practice', icon: 'practice' },
  // Bass only: the bass's own practice (BassPracticeView) — same nav name.
  { key: 'bassPractice', labelKey: 'nav.practice', icon: 'practice' },
  // Guitar only: the teacher (lessons, homework, mastery) — the goal-based
  // practice Coach now lives inside it (Today -> Practice plan).
  { key: 'teacher', labelKey: 'nav.teacher', icon: 'teacher' },
  { key: 'studies', labelKey: 'nav.studies', icon: 'studies' },
  { key: 'songs', labelKey: 'nav.songs', icon: 'songs' },
  // Guitar Pro files: play the song with its band, practice its solo.
  { key: 'guitarpro', labelKey: 'nav.guitarpro', icon: 'guitarpro' },
  // Piano only: a big keyboard to play freely (pedal, live chord, recording).
  { key: 'freeplay', labelKey: 'nav.freeplay', icon: 'freeplay' },
  { key: 'vocal', labelKey: 'nav.vocal', icon: 'vocal' },
];
