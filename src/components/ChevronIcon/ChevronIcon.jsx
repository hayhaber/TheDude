// A single-chevron directional glyph for compact step controls (e.g. Scale
// Practice's position stepper). Same stroke-based icon style as the rest of
// this set (fill="none", stroke="currentColor") — `direction` just rotates
// the same path rather than hand-authoring a mirrored one.
export function ChevronIcon({ direction = 'left', size = 16 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: direction === 'right' ? 'rotate(180deg)' : undefined }}
    >
      <path d="M15 18 9 12l6-6" />
    </svg>
  );
}
