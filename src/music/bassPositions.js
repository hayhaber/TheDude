import { BASS_TUNING, MAX_FRET, mod } from './notes';
import { accidentalSymbol } from './spelling';

// Compose -> Bass mode: a single root-note dot per chord (not a full 4-string
// shape — see the app's own Smart/Capo/Position-controls being guitar-only
// elsewhere, none of which have a bass-root-only equivalent). Kept as its
// own small module rather than extending computeChordPositions.js, so the
// guitar/triad shape-enumeration path (used everywhere else in the app)
// stays completely untouched by this feature.
const MAX_COMFORTABLE_FRET = 12; // stay in the lower half of the neck

// Picks the lowest-fret placement of `pitchClass` across the 4 bass strings,
// preferring the lowest (thickest) string on a tie — same "low, comfortable
// position" preference a bassist reading a chord chart would default to.
function nearestLowFret(pitchClass) {
  let best = null;
  BASS_TUNING.forEach((string, stringIndex) => {
    const fret = mod(pitchClass - string.pitchClass, 12);
    if (fret > MAX_COMFORTABLE_FRET) return;
    if (!best || fret < best.fret || (fret === best.fret && stringIndex < best.stringIndex)) {
      best = { stringIndex, fret };
    }
  });
  return best;
}

// `root` is the `{ letter, accidental, pitchClass }` shape parseChordSymbol
// already returns (App.jsx's `activeParsed.root`) — null/undefined for an
// empty or unparseable chord, in which case every string comes back with a
// null fret (an empty neck), matching how the rest of the app already shows
// nothing for an invalid chord rather than erroring.
export function computeBassRootPosition(root) {
  const placement = root ? nearestLowFret(root.pitchClass) : null;
  const label = root ? root.letter + accidentalSymbol(root.accidental) : '';

  return {
    strings: BASS_TUNING.map((_, i) =>
      placement && i === placement.stringIndex ? { fret: placement.fret, role: 'root', label, degree: 1 } : { fret: null }
    ),
  };
}

// Finds the one sounding string in a computeBassRootPosition() result and
// returns its actual pitch (BASS_TUNING's baseMidi + fret) — null if the
// position has no note (empty/invalid chord).
export function bassPositionToMidi(position) {
  const stringIndex = position.strings.findIndex((s) => s.fret !== null);
  if (stringIndex === -1) return null;
  return BASS_TUNING[stringIndex].baseMidi + position.strings[stringIndex].fret;
}
