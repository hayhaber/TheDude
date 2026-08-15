import { STANDARD_TUNING } from './notes';

const LANDING_ROLES = ['root', 'third', 'fifth', 'bass'];

// The next chord's own root/3rd/5th (and bass, for a slash chord) *are* the
// strongest landing notes — per the spec's own example (Am -> F gives A, C,
// F, exactly F's root/3rd/5th. Reads them straight off `nextPosition`, the
// SAME already-computed position that chord-to-chord navigation will
// actually display (App.jsx's positionIndexByChord, synced via
// matchPosition.js's comfort+melodic matching) — not re-derived
// independently, so the suggestion never contradicts what Next actually
// shows.
export function computeLandingNotes(nextPosition) {
  if (!nextPosition) return [];
  return nextPosition.strings
    .map((s, stringIndex) => (s.fret !== null && LANDING_ROLES.includes(s.role) ? { ...s, string: stringIndex } : null))
    .filter(Boolean);
}

// "Move up N frets" / "Move down N frets" / "Stay on this note" / a
// string+fret instruction when no candidate exists on the same string —
// the nearest of nextPosition's own root/3rd/5th/bass tones to
// lastPlayedNote. Reads the same `nextPosition` as computeLandingNotes so
// this always agrees with it (and with what Next-chord navigation shows).
export function voiceLeadingHint(nextPosition, lastPlayedNote) {
  if (!lastPlayedNote || !nextPosition) return null;
  const candidates = computeLandingNotes(nextPosition);
  if (candidates.length === 0) return null;

  const sameString = candidates.filter((c) => c.string === lastPlayedNote.string);
  if (sameString.length > 0) {
    const best = sameString.reduce((a, b) =>
      Math.abs(a.fret - lastPlayedNote.fret) <= Math.abs(b.fret - lastPlayedNote.fret) ? a : b
    );
    const delta = best.fret - lastPlayedNote.fret;
    if (delta === 0) return 'Stay on this note';
    const frets = Math.abs(delta) === 1 ? 'fret' : 'frets';
    return delta > 0 ? `Move up ${delta} ${frets}` : `Move down ${-delta} ${frets}`;
  }

  // No candidate on the same string in the shape that's about to be shown —
  // the smallest real move is a string change, not a same-string fret shift.
  const best = candidates.reduce((a, b) =>
    Math.abs(a.fret - lastPlayedNote.fret) <= Math.abs(b.fret - lastPlayedNote.fret) ? a : b
  );
  return `Move to fret ${best.fret} on string ${STANDARD_TUNING[best.string].stringNumber}`;
}
