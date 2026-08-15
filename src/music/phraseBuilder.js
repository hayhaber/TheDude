import { generateLick } from './generateLick';
import { developMotif, shiftFrets, resolveEndingToRole } from './motifDevelopment';

// Each bar reuses one already-verified motif transform to do a specific
// compositional job, so the 4-bar arc has real shape instead of being 4
// random licks stapled together: state the idea plainly, vary it, raise the
// energy, then land somewhere stable.
const BAR_PLAN = [
  { label: 'Simple motif', kind: 'original' },
  { label: 'Variation', kind: 'variation' },
  { label: 'Build tension', kind: 'sequence' },
  { label: 'Resolve on a chord tone', kind: 'ending' },
];

// Builds a 4-bar solo phrase across the typed progression — one bar per
// chord, in order, wrapping around (or repeating, for a 1-chord
// progression) if there are fewer than 4 chords. Reuses the exact
// position each chord is already showing (chordPositionsList/
// positionIndexByChord, App.jsx's comfort+melodic-synced state), so the
// phrase follows the same shapes already on screen rather than jumping to
// unrelated positions.
export function buildPhrase({ artistKey, progression, chordPositionsList, positionIndexByChord, emotionKey = null }) {
  if (progression.length === 0) return null;

  const bars = BAR_PLAN.map((plan, i) => {
    const chordIndex = i % progression.length;
    const chord = progression[chordIndex];
    const cp = chordPositionsList[chordIndex];
    const position = cp?.positions[positionIndexByChord[chordIndex] ?? 0];
    if (!chord.parsed || !position) return null;

    const base = generateLick({ artistKey, chordSymbol: chord.text, position, emotionKey });
    if (!base) return null;

    const notes = plan.kind === 'original' ? base.notes : developMotif(plan.kind, base.notes, chord.text);
    return { ...base, notes, barLabel: plan.label, chordText: chord.text };
  });

  if (bars.some((b) => !b)) return null;
  return { bars };
}

// Flattens a phrase's bars into one continuous, globally-renumbered note
// sequence for playback (see audio/lickPlayer.js's playLick).
export function flattenPhrase(phrase) {
  return phrase.bars.flatMap((b) => b.notes).map((n, i) => ({ ...n, order: i + 1 }));
}

// Two connected phrases built on real antecedent-consequent period
// structure (the classical "question/answer" phrase form, and exactly how
// call-and-response soloing works in practice):
//
// - Call ("antecedent"): the generated lick, but its ending is forced onto
//   the chord's 5th rather than wherever the template happened to land —
//   a half cadence. Landing on a non-tonic tone is what makes a phrase
//   sound open/unresolved, like a question hanging in the air.
// - Response ("consequent"): the SAME melodic material (so it's clearly
//   answering the same idea, not a new one), restated a step lower —
//   stepwise descending motion into the tonic is standard voice-leading —
//   and then resolved firmly onto the root: an authentic cadence, the
//   textbook way an answer phrase completes the question.
export function buildCallAndResponse({ artistKey, chordSymbol, position, emotionKey = null }) {
  const base = generateLick({ artistKey, chordSymbol, position, emotionKey });
  if (!base) return null;

  const call = { ...base, notes: resolveEndingToRole(base.notes, chordSymbol, 'fifth') };

  const descended = shiftFrets(base.notes, chordSymbol, -2);
  const response = { ...base, notes: resolveEndingToRole(descended, chordSymbol, 'root') };

  return { call, response };
}
