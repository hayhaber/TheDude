// Piano-specific, same reasoning as pianoInversions.js: guitar has no
// analogous "which hand plays what" concept, so this stays a display-layer
// transform over computePianoChordTones's (possibly already-inverted)
// output rather than new chord-tone math.
//
// The standard beginner block-chord accompaniment pattern real method books
// teach: left hand plays the chord's root alone, an octave below the right
// hand's full voicing — not a second copy of the chord, just the one note
// that anchors the harmony low, freeing the right hand to play the chord
// exactly as already resolved (root position or whichever inversion is
// selected). A slash-chord's explicit bass note (isBass) is used instead of
// the plain root when present, for the same reason applyInversion leaves it
// untouched — the person who wrote "C/E" already chose that bass note.
export function applyTwoHandVoicing(tones) {
  if (!tones || tones.length === 0) return tones ?? [];
  const bassTone = tones.find((t) => t.isBass);
  const rootTone = bassTone ?? tones.find((t) => t.isRoot) ?? tones[0];
  const leftHand = { ...rootTone, midi: rootTone.midi - 12, hand: 'left' };
  const rightHand = tones.map((t) => ({ ...t, hand: 'right' }));
  return [leftHand, ...rightHand];
}
