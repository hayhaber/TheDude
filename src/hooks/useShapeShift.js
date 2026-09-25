import { useCallback, useEffect, useRef, useState } from 'react';
import { playPosition } from '../audio/chordPlayer';

// Studies -> CAGED -> Shape-Shift Workout: steps through the same chord in
// every CAGED shape (music/cagedCurriculum.js's buildShapeShiftSteps),
// strumming each one. While playing, it holds each shape for
// BEATS_PER_SHAPE beats at `bpm`, then moves on (looping). Lifted to App
// level because the current step drives the shared Stage Fretboard.
export const SHAPE_SHIFT_BEATS_PER_SHAPE = 4;
export const SHAPE_SHIFT_TEMPOS = [40, 60, 80, 100];

export function useShapeShift(steps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(60);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const count = steps.length;
  const safeIndex = count === 0 ? 0 : Math.min(stepIndex, count - 1);
  const current = count === 0 ? null : steps[safeIndex];

  const strum = useCallback((index) => {
    const s = stepsRef.current[index];
    if (s) playPosition(s.position.strings);
  }, []);

  const goTo = useCallback(
    (index) => {
      const n = stepsRef.current.length;
      if (n === 0) return;
      const next = ((index % n) + n) % n;
      setStepIndex(next);
      strum(next);
    },
    [strum]
  );

  const next = useCallback(() => goTo(safeIndex + 1), [goTo, safeIndex]);
  const previous = useCallback(() => goTo(safeIndex - 1), [goTo, safeIndex]);

  const play = useCallback(() => {
    if (stepsRef.current.length === 0) return;
    setIsPlaying(true);
    strum(safeIndex);
  }, [strum, safeIndex]);

  const stop = useCallback(() => setIsPlaying(false), []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setStepIndex(0);
  }, []);

  // Auto-advance while playing. Re-armed on every step change, so manual
  // Back/Next while playing restarts the full hold for the new shape.
  useEffect(() => {
    if (!isPlaying || count === 0) return undefined;
    const holdMs = (60000 / bpm) * SHAPE_SHIFT_BEATS_PER_SHAPE;
    const id = setTimeout(() => goTo(safeIndex + 1), holdMs);
    return () => clearTimeout(id);
  }, [isPlaying, bpm, safeIndex, count, goTo]);

  return { steps, current, stepIndex: safeIndex, isPlaying, bpm, setBpm, play, stop, next, previous, goTo, reset };
}
