import { STANDARD_TUNING } from './notes';

// The actual pitch of the highest-sounding string in a position — the
// "melody" note if you were arpeggiating or strumming through a progression.
// Used so chord-to-chord position matching keeps that top voice moving
// smoothly instead of jumping several strings/octaves for no audible reason.
function topNoteMidi(position) {
  for (let i = position.strings.length - 1; i >= 0; i -= 1) {
    const s = position.strings[i];
    if (s.fret !== null) return STANDARD_TUNING[i].baseMidi + s.fret;
  }
  return null;
}

// Which strings are actually sounded, as a comparable signature — two
// positions "feel" comfortable together only if the fretting hand stays on
// roughly the same strings, not just the same fret number (a barre chord and
// a triad shape can share a fret while using completely different strings).
function stringSignature(position) {
  return position.strings.map((s, i) => (s.fret !== null ? i : null)).filter((i) => i !== null).join(',');
}

// How well `candidate` fits as a follow-on to `target`, combining physical
// comfort (fret distance, staying on the same strings) with melodic
// smoothness (how far the top note moves). Lower is better.
export function positionMatchScore(candidate, target) {
  const fretDistance = Math.abs(candidate.baseFret - target.baseFret);

  const targetTop = topNoteMidi(target);
  const candidateTop = topNoteMidi(candidate);
  const melodicDistance = targetTop !== null && candidateTop !== null ? Math.abs(candidateTop - targetTop) : 0;

  const stringSetPenalty = stringSignature(candidate) === stringSignature(target) ? 0 : 2;

  return fretDistance + melodicDistance * 0.5 + stringSetPenalty;
}

// Finds the index of whichever position in `candidates` best matches `target`.
export function findClosestPositionIndex(candidates, target) {
  let bestIndex = 0;
  let bestScore = Infinity;
  candidates.forEach((candidate, index) => {
    const score = positionMatchScore(candidate, target);
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}
