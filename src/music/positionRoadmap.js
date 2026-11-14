import { colorForChord, colorForNextChord } from '../styles/colors';

// A step's fret position, guitar-standard style ("Open" for the nut,
// "Position N" for the fret the hand is anchored at otherwise). Exported for
// reuse by cagedCurriculum.js's single-chord shape roadmap.
export function positionName(baseFret) {
  return baseFret === 0 ? 'Open' : `Position ${baseFret}`;
}

// How the hand moves from one step to the next: no movement, a small
// same-neighborhood shift, or a bigger slide up/down the neck.
export function transitionLabel(deltaFrets) {
  const abs = Math.abs(deltaFrets);
  if (abs === 0) return 'Stay';
  return abs <= 2 ? 'Shift' : 'Slide';
}

// Builds the recommended left-hand movement across the neck for the whole
// typed progression — one step per chord, using the exact position each
// chord is already showing (chordPositionsList/positionIndexByChord, the
// same comfort+melodic-synced state driving the rest of the app), so the
// roadmap describes the real movement you'd actually make navigating the
// progression, not a separately-guessed path.
export function buildPositionRoadmap({ progression, chordPositionsList, positionIndexByChord }) {
  if (progression.length === 0) return null;

  const steps = progression.map((chord, i) => {
    const cp = chordPositionsList[i];
    const position = cp?.positions[positionIndexByChord[i] ?? 0];
    if (!chord.parsed || !position) return null;
    const baseFret = position.baseFret ?? 0;
    return { chordText: chord.text, baseFret, label: positionName(baseFret) };
  });
  if (steps.some((s) => !s)) return null;

  // Each step's own color, computed once here (rather than each consumer —
  // Fretboard's roadmap pins, PositionRoadmapPanel's chips — independently
  // hashing step.chordText) so both always agree on the same color AND so
  // adjacent steps never land on near-identical hues. colorForChord() alone
  // has no idea what's already on screen next to it; chaining through
  // colorForNextChord (already used for the fretboard's own landing-note
  // preview) nudges each step at least 2 steps around the palette wheel from
  // the step right before it whenever they'd otherwise collide (e.g. two
  // different shades of blue back to back).
  steps[0].color = colorForChord(steps[0].chordText);
  for (let i = 1; i < steps.length; i += 1) {
    steps[i].color = colorForNextChord(steps[i].chordText, steps[i - 1].color);
  }

  const transitions = steps.slice(1).map((step, i) => {
    const deltaFrets = step.baseFret - steps[i].baseFret;
    return { deltaFrets, label: transitionLabel(deltaFrets) };
  });

  return { steps, transitions };
}

// Roadmap picker (v1.0.175): the other shapes of ONE progression chord that
// stay near the chords around it, so swapping a hard shape for an easier one
// keeps the hand's journey sensible. Pure. `steps` = the roadmap's steps
// (their baseFret = where the neighbours sit now), `positions` = that
// chord's positions (computeChordPositions), `current` = its chosen index.
// Returns up to `max` entries {index, position, baseFret, frets, difficulty,
// current, easiest}, the current shape first, then by distance to the
// neighbours and ease.
const NEAR_FRETS = 4;

export function shapeDifficulty(position) {
  const frets = position.strings.map((s) => s.fret);
  const fretted = frets.filter((f) => f != null && f > 0);
  if (fretted.length === 0) return 0;
  const lo = Math.min(...fretted);
  const hi = Math.max(...fretted);
  const atLo = fretted.filter((f) => f === lo).length;
  // more than 4 fretted notes = a barre (the index lies flat)
  const barre = fretted.length > 4 && atLo >= 2;
  const fingers = barre ? fretted.length - atLo + 1 : fretted.length;
  return fingers + (barre ? 2.5 : 0) + Math.max(0, hi - lo - 2) * 1.5 + (lo >= 7 ? 0.5 : 0);
}

export function nearbyShapes({ steps, index, positions, current = 0, max = 4 }) {
  if (!positions?.length || !steps?.[index]) return [];
  const around = [steps[index - 1], steps[index + 1]].filter(Boolean).map((s) => s.baseFret);
  const distance = (bf) => (around.length ? Math.min(...around.map((a) => Math.abs(a - bf))) : 0);
  const seen = new Set();
  const all = positions
    .map((position, i) => {
      const frets = position.strings.map((s) => s.fret);
      const baseFret = position.baseFret ?? 0;
      return { index: i, position, baseFret, frets, difficulty: shapeDifficulty(position), dist: distance(baseFret), current: i === current };
    })
    .filter((c) => {
      const key = c.frets.join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return c.current || c.dist <= NEAR_FRETS;
    });
  const cur = all.find((c) => c.current);
  const others = all
    .filter((c) => !c.current)
    .sort((a, b) => a.dist + a.difficulty * 0.6 - (b.dist + b.difficulty * 0.6) || a.baseFret - b.baseFret)
    .slice(0, Math.max(0, max - (cur ? 1 : 0)));
  const list = (cur ? [cur, ...others] : others).sort((a, b) => a.baseFret - b.baseFret);
  if (list.length > 1) {
    const min = Math.min(...list.map((c) => c.difficulty));
    const easiest = list.find((c) => c.difficulty === min);
    // only worth saying when it is really easier than the current shape
    if (!cur || easiest.difficulty < cur.difficulty - 0.5) easiest.easiest = true;
  }
  return list;
}
