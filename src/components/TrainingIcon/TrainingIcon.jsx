// A small "practice loop" glyph for the Practice nav destination — a
// repeat-loop arrow (the core mechanic of practicing: running something
// again and again) wrapped around an eighth-note (the music-specific
// anchor), so it reads as "repeat, musically" rather than either symbol
// alone. Replaces two earlier attempts (a metronome, then a dumbbell)
// that were both reported as unclear/low-quality — this is the user's
// own supplied design. Same stroke-based icon style as the rest of this
// set (fill="none", stroke="currentColor") so it reads as part of the
// same icon family.
export function TrainingIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Open circular repeat arrow */}
      <path d="M 12 3 A 9 9 0 1 1 3.5 10.5" />
      <polyline points="7.5 11 3.5 10.5 3 6.5" />

      {/* Eighth note, centered */}
      <ellipse cx="10" cy="15.5" rx="2" ry="1.5" fill="currentColor" stroke="none" />
      <path d="M 12 15.5 V 9.5 C 12 9.5 13.5 8.5 15.5 9.5" />
    </svg>
  );
}
