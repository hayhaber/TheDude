// A small dumbbell glyph for the Practice nav destination — replaces an
// earlier metronome-shaped attempt (v1-v3) that repeated feedback said
// still read as unclear/low-quality at nav-icon size. A dumbbell is a
// widely-recognized "training/practice" symbol in its own right (the same
// convention Duolingo and most fitness/skill-practice apps use for their
// own practice hub), and its shape — two solid weight plates joined by a
// bar — stays legible at 18px without needing to be studied, unlike a
// multi-part metronome silhouette. Solid plates (not just outlines) read
// as bolder/more deliberate than the previous stroke-only attempts.
export function TrainingIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="9" width="3" height="6" rx="1" fill="currentColor" stroke="none" />
      <rect x="6" y="7" width="3" height="10" rx="1" fill="currentColor" stroke="none" />
      <path d="M9.5 12h5" />
      <rect x="15" y="7" width="3" height="10" rx="1" fill="currentColor" stroke="none" />
      <rect x="18.5" y="9" width="3" height="6" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
