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
