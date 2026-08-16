// A small metronome glyph for the Practice nav destination — ticks/rhythm
// is the one thread running through everything under Practice (drills,
// rhythm game, chord changes, bending, ...), so a metronome reads as a
// distinctive, on-theme mark rather than a generic bullseye. Same
// stroke-based icon style as SparklesIcon/DisplayOptionsMenu's own icon
// (fill="none", stroke="currentColor") so it reads as part of the same
// icon set, and inherits color automatically (picks up the nav item's
// own active/accent color for free).
//
// v2: a real, recognizable metronome silhouette (trapezoid body with a
// pivot cap on top, swinging arm, sliding tempo weight) instead of the
// first pass's thin freeform lines, which read as noise rather than a
// clear pictogram at nav-icon size (16-18px). Kept to the same small set
// of clean geometric strokes every other icon in this set uses (Feather/
// Lucide-style: rounded joins, one weight, no fussy detail) so it holds up
// at a glance instead of needing to be studied.
export function MetronomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 21h11" />
      <path d="M8.7 21 10.3 5h3.4l1.6 16Z" />
      <path d="M10.6 6.6h2.8" />
      <circle cx="12" cy="4.3" r="1" fill="currentColor" stroke="none" />
      <path d="M12 6.6 9.8 18" />
    </svg>
  );
}
