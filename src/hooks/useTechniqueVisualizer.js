import { useState } from 'react';

// Studies -> Technique & Guitar Masters: which exercise (if any) is
// currently shown as a fretboard overlay, and the animation state for
// stepping through it. Lifted to App.jsx (like cagedLessonId/scalesLesson)
// because the actual rendering happens in the shared Stage Fretboard, not
// inside TechniqueMastersView itself — see App.jsx's stageFretboardProps.
export function useTechniqueVisualizer() {
  const [exerciseId, setExerciseId] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Selecting the exercise already being visualized closes it instead —
  // same "toggle" affordance as the Visualize button that triggers this.
  function toggleExercise(id) {
    setExerciseId((current) => (current === id ? null : id));
    setActiveStep(0);
    setIsPlaying(false);
  }

  function play() {
    setIsPlaying(true);
  }

  function pause() {
    setIsPlaying(false);
  }

  // Caller (TechniqueMastersView) owns the actual interval timer, since only
  // it knows the currently-visualized exercise's step count.
  function advance(totalSteps) {
    setActiveStep((s) => (s + 1) % Math.max(totalSteps, 1));
  }

  return { exerciseId, activeStep, isPlaying, toggleExercise, play, pause, advance, setActiveStep };
}
