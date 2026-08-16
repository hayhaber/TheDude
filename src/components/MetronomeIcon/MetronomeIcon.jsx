// A small metronome glyph for the Practice nav destination — ticks/rhythm
// is the one thread running through everything under Practice (drills,
// rhythm game, chord changes, bending, ...), so a metronome reads as a
// distinctive, on-theme mark rather than a generic bullseye. Same
// stroke-based icon style as SparklesIcon/DisplayOptionsMenu's own icon
// (fill="none", stroke="currentColor") so it reads as part of the same
// icon set, and inherits color automatically (picks up the nav item's
// own active/accent color for free).
//
// v3: a wider, more evenly-tapered trapezoid body (v2's was too narrow/
// spindly at nav size), a solid pivot cap instead of a thin outlined bar,
// and a solid tilted "weight" clamp on the arm (a real metronome's tempo
// slider) instead of a bare dot — closer to how dedicated metronome apps
// (Soundbrenner, Pro Metronome, ...) draw their own icon, and reads as a
// deliberate, finished mark rather than a rough sketch at 18px.
export function MetronomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 3 14.5 3 17.5 20.5 6.5 20.5Z" />
      <rect x="10.2" y="1.3" width="3.6" height="1.9" rx="0.5" fill="currentColor" stroke="none" />
      <path d="M12 3.2 9.4 19.5" />
      <ellipse cx="10.6" cy="12.2" rx="1" ry="1.8" transform="rotate(-9 10.6 12.2)" fill="currentColor" stroke="none" />
    </svg>
  );
}
