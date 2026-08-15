import { useState } from 'react';
import { DEFAULT_INVERSION } from '../music/pianoInversions';

// Owns the Harmony course's "what's currently being shown" state — which
// lesson, which root the active demo widget is using, the single chord
// text that widget is currently previewing (every demo type ultimately
// reduces to "preview this one chord," see harmonyCurriculum.js's
// resolveHarmonyStageProps), and the piano-only inversion the Inversions
// lesson's widget controls. Same one-hook-instance-in-App.jsx pattern as
// useScalesLesson.js/useCircleOfFifthsLesson.js.
export function useHarmonyLesson(lessons) {
  const [lessonId, setLessonIdState] = useState(lessons[0].id);
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [previewChordText, setPreviewChordText] = useState(null);
  const [inversionKey, setInversionKey] = useState(DEFAULT_INVERSION);

  // Switching lessons drops whichever chord the previous lesson's widget was
  // previewing — each demo widget re-establishes its own preview on mount,
  // so a stale chord from lesson A never lingers on the shared Fretboard
  // while lesson B's own controls haven't rendered/fired yet.
  function setLessonId(id) {
    setLessonIdState(id);
    setPreviewChordText(null);
    setInversionKey(DEFAULT_INVERSION);
  }

  return {
    lessonId,
    setLessonId,
    rootPitchClass,
    setRootPitchClass,
    previewChordText,
    setPreviewChordText,
    inversionKey,
    setInversionKey,
  };
}
