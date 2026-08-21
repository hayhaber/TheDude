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

// Globally optimizes, for the WHOLE progression at once, which triad
// inversion (across all string sets — see triads.js's STRING_SETS) to use
// for every chord so the total movement across the entire sequence is
// minimized — not just each transition looked at on its own. A step-by-step
// nearest-neighbor choice can lock in an early "locally fine" shape that
// then forces worse choices later; this instead runs a Viterbi/DP pass:
// for every candidate shape of every chord, track the cheapest total cost
// of any path reaching it from the start, then backtrack from the cheapest
// overall ending shape to recover the whole minimum-cost path. Verified
// concretely against a brute-force optimum on ordinary progressions (e.g.
// "C G Am F") where a plain greedy walk landed on a noticeably worse
// overall fingering path than the true minimum — this DP always matches it.
//
// `anchorPosition` — whatever position the player has manually chosen for
// the progression's first chord via the normal (non-Smooth) Position
// Controls (App.jsx's positionIndexByChord[0], any mode: full 6-string
// "chord" or 3-note "triad" both work, since transitionCost only looks at
// per-string fret/null and both shapes' `strings` arrays are always length 6
// — see notes on transitionCost above). When given, it's treated as a
// virtual "chord -1" the DP's first real chord also has to transition from,
// so moving the first chord up/down the neck moves the whole Smooth
// sequence with it, same rationale as every other step. `null` (the
// default) leaves the first chord unconstrained — chosen purely to
// minimize the rest of the path, same DP either way.
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
  const sequence = new Array(progression.length).fill(null);

  // Only valid/playable chords participate in the DP — an invalid chord
  // stays `null` in the final sequence but doesn't break the transition
  // chain between the valid chords on either side of it (same as before:
  // the chain used to run through `previous`, which an invalid chord left
  // untouched).
  const validIndices = [];
  const candidatesByStep = [];
  progression.forEach((chord, i) => {
    const { isValid, positions } = computeChordPositions(chord.text, 'triad');
    if (isValid && positions.length > 0) {
      validIndices.push(i);
      candidatesByStep.push(positions);
    }
  });

  if (validIndices.length === 0) return sequence;

  const stepCount = validIndices.length;
  const dpCost = candidatesByStep.map((candidates) => new Array(candidates.length).fill(0));
  const dpBack = candidatesByStep.map((candidates) => new Array(candidates.length).fill(-1));

  candidatesByStep[0].forEach((candidate, j) => {
    dpCost[0][j] = anchorPosition ? transitionCost(candidate, anchorPosition) : 0;
  });

  for (let step = 1; step < stepCount; step += 1) {
    const prevCandidates = candidatesByStep[step - 1];
    candidatesByStep[step].forEach((candidate, j) => {
      let bestCost = Infinity;
      let bestPrev = -1;
      prevCandidates.forEach((prevCandidate, k) => {
        const cost = dpCost[step - 1][k] + transitionCost(candidate, prevCandidate);
        if (cost < bestCost) {
          bestCost = cost;
          bestPrev = k;
        }
      });
      dpCost[step][j] = bestCost;
      dpBack[step][j] = bestPrev;
    });
  }

  let bestLast = 0;
  dpCost[stepCount - 1].forEach((cost, j) => {
    if (cost < dpCost[stepCount - 1][bestLast]) bestLast = j;
  });

  const chosenIndex = new Array(stepCount);
  chosenIndex[stepCount - 1] = bestLast;
  for (let step = stepCount - 1; step > 0; step -= 1) {
    chosenIndex[step - 1] = dpBack[step][chosenIndex[step]];
  }

  let previous = null;
  chosenIndex.forEach((candidateIndex, step) => {
    const chosen = candidatesByStep[step][candidateIndex];

    const pivotMask = STANDARD_TUNING.map((_, i) => {
      if (!previous) return false;
      const c = chosen.strings[i].fret;
      const p = previous.strings[i].fret;
      return c !== null && p !== null && c === p;
    });

    sequence[validIndices[step]] = { position: chosen, pivotMask, fingers: assignFingers(chosen) };
    previous = chosen;
  });

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
