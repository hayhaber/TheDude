import { useState } from 'react';

// Owns the Scales course's "what's currently being shown/practiced" state —
// which lesson, which key, degree-vs-note labels, which of the 5 positions,
// and ascending/descending — one hook instance created once in App.jsx (same
// pattern as useMetronome/useCagedProgress), read by both ScalesView (for its
// controls) and App.jsx's stageFretboardProps resolver (to know what to feed
// the shared Fretboard).
export function useScalesLesson(lessons) {
  const [lessonId, setLessonIdState] = useState(lessons[0].id);
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [labelMode, setLabelMode] = useState('degree');
  const [positionIndex, setPositionIndex] = useState(0);
  const [direction, setDirection] = useState('ascending');

  // Selecting a new lesson resets the position index — a saved position 4
  // from a 5-position lesson would be out of range (or just irrelevant) for
  // one that only shows a single continuous window.
  function setLessonId(id) {
    setLessonIdState(id);
    setPositionIndex(0);
  }

  return {
    lessonId,
    setLessonId,
    rootPitchClass,
    setRootPitchClass,
    labelMode,
    setLabelMode,
    positionIndex,
    setPositionIndex,
    direction,
    setDirection,
  };
}
