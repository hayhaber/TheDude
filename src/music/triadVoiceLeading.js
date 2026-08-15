import { computeChordPositions } from './computeChordPositions';
import { assignFingers } from './fingering';
import { STANDARD_TUNING } from './notes';

// How costly a chord-to-chord transition is for a given candidate triad
// shape, relative to whichever shape was chosen for the previous chord —
// lower is better. Compares strings index-by-index (every triad position's
// `strings` array is always length 6, one entry per STANDARD_TUNING string,
// with `fret: null` for the 3 strings the shape doesn't use — see
// enumerateTriadPositions in triads.js), so this works across different
// string sets too, not just within one.
const SWITCH_PENALTY = 2; // a string entering/leaving the shape entirely
const PIVOT_BONUS = 3; // reward per note that doesn't move at all
function transitionCost(candidate, previous) {
  let cost = 0;
  for (let i = 0; i < STANDARD_TUNING.length; i += 1) {
    const c = candidate.strings[i].fret;
    const p = previous.strings[i].fret;
    if (c !== null && p !== null) {
      cost += c === p ? -PIVOT_BONUS : Math.abs(c - p);
    } else if (c !== null || p !== null) {
      cost += SWITCH_PENALTY;
    }
  }
  return cost;
}

// Greedily picks, for every chord in the progression, whichever triad
// inversion (across all string sets — see triads.js's STRING_SETS) keeps the
// most fingers stationary and moves the rest the shortest distance from the
// previous chord's own chosen shape.
//
// `anchorPosition` — whatever position the player has manually chosen for
// the progression's first chord via the normal (non-Smooth) Position
// Controls (App.jsx's positionIndexByChord[0], any mode: full 6-string
// "chord" or 3-note "triad" both work, since transitionCost only looks at
// per-string fret/null and both shapes' `strings` arrays are always length 6
// — see notes on transitionCost above). When given, the very first chord's
// own triad shape is picked to best match *that* position instead of always
// defaulting to index 0, so moving the first chord up/down the neck moves
// the whole Smooth sequence with it, same rationale as every other step.
// `null` (the default) keeps the old behavior — first chord takes positions[0].
//
// Returns one entry per progression chord: `null` for an unplayable/invalid
// chord (kept so the array stays index-aligned with `progression`), otherwise
// `{ position, pivotMask, fingers }` where pivotMask[stringIndex] is true iff
// that string's note is shared with an ADJACENT chosen chord — the previous
// one, the next one, or both. Marking it on both sides of a shared pair (not
// just the "landing" chord) is deliberate: looking at chord N, you want to
// know which of its own notes are about to stay put before you actually move
// to chord N+1, not only see it confirmed in gold after the fact.
export function computeVoiceLeadingSequence(progression, anchorPosition = null) {
  const sequence = [];
  let previous = null;
  let isFirst = true;

  for (const chord of progression) {
    const { isValid, positions } = computeChordPositions(chord.text, 'triad');
    if (!isValid || positions.length === 0) {
      sequence.push(null);
      continue;
    }

    const matchTarget = previous ?? (isFirst ? anchorPosition : null);

    let chosen;
    if (!matchTarget) {
      chosen = positions[0];
    } else {
      chosen = positions.reduce((best, candidate) =>
        transitionCost(candidate, matchTarget) < transitionCost(best, matchTarget) ? candidate : best
      );
    }

    const pivotMask = STANDARD_TUNING.map((_, i) => {
      if (!previous) return false;
      const c = chosen.strings[i].fret;
      const p = previous.strings[i].fret;
      return c !== null && p !== null && c === p;
    });

    sequence.push({ position: chosen, pivotMask, fingers: assignFingers(chosen) });
    previous = chosen;
    isFirst = false;
  }

  // Second pass: also mark each playable chord's pivotMask wherever it
  // shares a note with the NEXT playable chord (skipping any null/unplayable
  // entries in between) — the pivotMask built above only looks backward, so
  // without this the very first chord (which has no previous chord to
  // compare against) would never show any pivots at all, even though it
  // obviously has notes in common with whatever comes right after it.
  for (let i = 0; i < sequence.length - 1; i += 1) {
    const current = sequence[i];
    if (!current) continue;
    const next = sequence.slice(i + 1).find((entry) => entry !== null);
    if (!next) continue;
    STANDARD_TUNING.forEach((_, s) => {
      const c = current.position.strings[s].fret;
      const n = next.position.strings[s].fret;
      if (c !== null && n !== null && c === n) current.pivotMask[s] = true;
    });
  }

  return sequence;
}
