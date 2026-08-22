// A dedicated bass-guitar glyph for the instrument switcher — there's no
// distinct "bass guitar" emoji in Unicode (🎸 is guitar-only), and reusing
// the guitar emoji for both Guitar and Bass made the two options
// indistinguishable at a glance in the instrument dropdown. Same
// stroke-based icon style as TrainingIcon (fill="none", stroke="currentColor")
// so it reads as part of the same icon family — proportioned with a long,
// slim neck and a small offset double-cutaway body (a P/J-bass silhouette)
// specifically LONGER-necked/smaller-bodied than a standard guitar shape,
// so it's recognizable as "bass" by proportion alone, not just by label text.
export function BassGuitarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {/* Headstock + 4 tuning pegs */}
      <path d="M9.5 1.5 H14.5 L13.7 4.5 H10.3 Z" />
      <path d="M9.5 2.2 H7.8 M9.5 3.6 H7.8 M14.5 2.2 H16.2 M14.5 3.6 H16.2" />

      {/* Long slim neck */}
      <path d="M10.5 4.5 V16 M13.5 4.5 V16" />

      {/* Offset double-cutaway body, smaller/lower than a standard guitar's */}
      <path d="M8.5 16 C6.5 17.3 6 19.3 7.5 20.8 C9 22.3 11 22.6 12 21.6 C13 22.6 15.3 22.3 16.6 20.8 C18 19.2 17.3 17.2 15.5 16 Z" />

      {/* Single center string line for detail */}
      <path d="M12 4.2 V21.6" strokeWidth="1.1" />
    </svg>
  );
}
