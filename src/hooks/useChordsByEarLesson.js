import { useState } from 'react';

// Owns the Chords by Ear course's "what's currently being shown/previewed"
// state — which lesson, the single chord text a teaching demo/drill widget
// is currently sounding (previewChordText), and — for the movable-scale-
// shape lesson specifically — a scale preview context (previewScaleContext:
// { rootPitchClass, fretStart, fretEnd } | null), since a scale overlay is
// a genuinely different Fretboard prop (scaleNotes) than a chord position
// and the two are mutually exclusive at any moment (see
// resolveChordsByEarStageProps in chordsByEarCurriculum.js). Same
// one-hook-instance-in-App.jsx pattern as useHarmonyLesson.js/
// useScalesLesson.js.
export function useChordsByEarLesson(lessons) {
  const [lessonId, setLessonIdState] = useState(lessons[0].id);
  const [previewChordText, setPreviewChordText] = useState(null);
  const [previewScaleContext, setPreviewScaleContext] = useState(null);
  // A specific, already-resolved Fretboard position (root ANCHORED to a
  // particular string) — for the chord-road-map lesson, which needs the
  // exact low-E- or A-string-rooted shape (chordsByEar.js's
  // anchoredPosition), not just "whichever voicing computeChordPositions
  // happens to return first" the way previewChordText's generic lookup
  // would give it (see resolveChordsByEarStageProps).
  const [previewPosition, setPreviewPosition] = useState(null);

  // Switching lessons drops whichever chord/scale/position the previous
  // lesson's widget was previewing/playing, and stops that demo's own audio
  // (each demo widget owns its own playback cancel-function internally and
  // cleans up on unmount) — a stale preview from lesson A never lingers on
  // the shared Fretboard while lesson B's own controls haven't rendered yet.
  function setLessonId(id) {
    setLessonIdState(id);
    setPreviewChordText(null);
    setPreviewScaleContext(null);
    setPreviewPosition(null);
  }

  return {
    lessonId,
    setLessonId,
    previewChordText,
    setPreviewChordText,
    previewScaleContext,
    setPreviewScaleContext,
    previewPosition,
    setPreviewPosition,
  };
}
