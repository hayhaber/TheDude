import { computePianoChordTones } from './pianoChordTones';
import { CHORD_INVERSIONS, applyInversion } from './pianoInversions';

// Piano's equivalent of triadVoiceLeading.js's transitionCost — instead of
// comparing per-string fret numbers, compares sorted core-tone MIDI values
// pairwise (index-aligned after sorting ascending). Chords with different
// tone counts (a triad vs. a 7th chord) still compare fine: only the
// shared low-to-high positions are scored, same simplification the
// fretboard version makes implicitly by treating unused strings as null.
function transitionCost(candidateTones, previousTones) {
  const a = [...candidateTones].sort((x, y) => x.midi - y.midi);
  const b = [...previousTones].sort((x, y) => x.midi - y.midi);
  const len = Math.min(a.length, b.length);
  let cost = 0;
  for (let i = 0; i < len; i += 1) cost += Math.abs(a[i].midi - b[i].midi);
  return cost;
}

// Greedily picks, for every chord in the progression, whichever inversion
// (root/1st/2nd) keeps the total movement of the chord tones smallest
// versus the previous chord's own chosen voicing — piano's version of
// "smoothest fingering for each change".
//
// `anchorInversionKey` — whatever inversion the player has manually chosen
// for the progression's first chord (App.jsx's pianoInversionByChord[0]),
// same anchoring rationale as computeVoiceLeadingSequence: moving that
// first chord's inversion moves the whole Smooth sequence with it, instead
// of the sequence always restarting from root position.
//
// Returns one entry per progression chord: `null` for an unplayable/invalid
// chord (kept so the array stays index-aligned with `progression`),
// otherwise `{ inversionKey, tones }`.
export function computePianoVoiceLeadingSequence(progression, anchorInversionKey = 'root') {
  const sequence = [];
  let previousTones = null;
  let isFirst = true;

  for (const chord of progression) {
    const baseTones = chord.parsed ? computePianoChordTones(chord.parsed) : [];
    if (!chord.parsed || baseTones.length === 0) {
      sequence.push(null);
      continue;
    }

    let chosenKey;
    if (!previousTones) {
      chosenKey = isFirst ? anchorInversionKey : 'root';
    } else {
      chosenKey = CHORD_INVERSIONS.reduce((bestKey, inv) => {
        const candidate = applyInversion(baseTones, inv.key);
        const best = applyInversion(baseTones, bestKey);
        return transitionCost(candidate, previousTones) < transitionCost(best, previousTones) ? inv.key : bestKey;
      }, CHORD_INVERSIONS[0].key);
    }

    const tones = applyInversion(baseTones, chosenKey);
    sequence.push({ inversionKey: chosenKey, tones });
    previousTones = tones;
    isFirst = false;
  }

  return sequence;
}
