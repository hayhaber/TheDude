// Nav icon for the Chord Library: a chord box (nut, strings, frets, dots).
export function ChordsNavIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M5 4h14" strokeWidth="2.4" />
      <path d="M5 4v16M9.7 4v16M14.3 4v16M19 4v16" opacity=".55" />
      <path d="M5 9.3h14M5 14.6h14M5 20h14" opacity=".55" />
      <circle cx="9.7" cy="6.7" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="14.3" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
