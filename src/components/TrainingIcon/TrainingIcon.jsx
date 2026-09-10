// A metronome — the universal symbol for music practice — for the Practice
// nav destination (drills + ear training). Replaces earlier attempts (a
// repeat-loop, a dumbbell) that read as unclear/off. Deliberately spare so
// it stays legible at tab-bar size: a clean pyramid body on a stand, the
// pendulum rod, and its weight. Same family as the rest of the icon set
// (fill="none", stroke="currentColor").
export function TrainingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Pyramid body */}
      <path d="M6.3 18.3 L9.8 4 L14.2 4 L17.7 18.3 Z" />
      {/* Stand / foot */}
      <path d="M4.6 20.7 H19.4" />
      {/* Pendulum rod + weight */}
      <path d="M12 5 L9.5 14.8" />
      <circle cx="10.5" cy="10.8" r="1.35" fill="currentColor" stroke="none" />
    </svg>
  );
}
