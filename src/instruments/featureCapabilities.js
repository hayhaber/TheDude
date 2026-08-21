// Declarative "which instruments does this learning feature support" map —
// the single source of truth InstrumentGate.jsx reads to decide whether to
// render a feature or a "Guitar Mode only" message. Keep this in sync with
// docs/PIANO_MODE_ARCHITECTURE.md's feature-mapping table when adding a new
// feature or a new instrument.
export const FEATURE_CAPABILITIES = {
  // Bass only supports Compose for now (root-note-per-chord display) — every
  // other feature key below intentionally does NOT list 'bass', so it stays
  // hidden from nav in Bass mode via AppShell.jsx's existing
  // supportsInstrument()-based filtering (same mechanism that already hides
  // guitar-only features from Piano mode).
  compose: ['guitar', 'piano', 'bass'],
  // Top-level section entries — without these, AppShell.jsx's nav filter
  // falls through to "unlisted = supported everywhere" and would show these
  // whole sections (with their default guitar-flavored content) under Bass,
  // even though every one of their own sub-tabs below is guitar/piano-only
  // and Bass has nothing real to show there. `songs` already had this exact
  // entry; `practice`/`studies` were missing it (a real gap, found live:
  // switching to Bass and opening Practice showed full guitar picking
  // drills unfiltered instead of disappearing from nav like Improvise does).
  practice: ['guitar', 'piano'],
  studies: ['guitar', 'piano'],
  scales: ['guitar', 'piano'],
  earTraining: ['guitar', 'piano'],
  songs: ['guitar', 'piano'],
  improvise: ['guitar'], // lick/phrase/solo-coach generation — guitar technique
  drills: ['guitar'], // picking/speed/position-switch drills
  caged: ['guitar'], // the CAGED system is guitar-specific by definition
  techniqueMasters: ['guitar'], // artist-specific guitar technique (bends/vibrato/muting/etc.)
  pitchTrainer: ['guitar'], // mic tuner targets standard guitar-string tuning, guitar tab display
  rhythmGame: ['guitar'], // mic-judged, played on real guitar strings/frets like drills/pitchTrainer
  bendingTraining: ['guitar'], // string-bending technique only makes sense on a fretted string instrument
  soloOpener: ['guitar'], // improvised-solo opening-phrase drill — string/fret language, guitar-specific
  guitarChordRhythm: ['guitar'], // metronome-timed chord-changing practice, judged via mic chroma chord detection — guitar-only
  scalePractice: ['guitar'], // metronome-timed scale-run practice (box position / single-string linear run / position-to-position transition), judged via mic pitch detection — real-fretboard-position pedagogy, guitar-only
  pianoPractice: ['piano'], // leveled piano-only exercises (pentascales, inversion drills, ...)
  fallingNotes: ['piano'], // Synthesia-style falling-notes practice, keyboard-only by nature
  pianoCurriculum: ['piano'], // structured beginner-to-advanced piano course (keyboard geography, staff reading, technique) — piano-native, not a reworded guitar course
  chordRhythm: ['piano'], // metronome-timed chord-changing practice, judged via the shared PianoKeyboard's quiz plumbing — piano-only for now
};

// Unlisted feature keys default to supported everywhere — most of the app
// (metronome, practice timer/dashboard, settings, progress tracking,
// navigation) is instrument-agnostic and never needs an entry here.
export function supportsInstrument(featureKey, instrumentKey) {
  return FEATURE_CAPABILITIES[featureKey]?.includes(instrumentKey) ?? true;
}
