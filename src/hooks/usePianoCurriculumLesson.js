import { useRef, useState } from 'react';

// Owns the Piano course's "what's currently being shown/heard on the shared
// keyboard" state — same one-hook-instance-in-App.jsx role as
// useChordsByEarLesson.js/useHarmonyLesson.js, adapted for this course's
// own needs: `previewNotes` (a demo's currently-highlighted keys, e.g. a
// five-finger pattern), `quizFeedbackKey` (the note-reading quiz's
// green/red answer flash, same shape PianoKeyboard.jsx's own
// quizFeedbackKey prop already expects), and `onKeyClick` — routes a real
// keyboard click to whichever lesson's widget is currently active, since
// only one is ever mounted at a time and App.jsx's stagePianoProps has no
// other way to reach it.
//
// The click router is a plain ref, not useState — storing a *function* in
// React state needs the `() => handler` wrapper trick (state setters treat
// a bare function argument as an updater), and combined with StrictMode's
// double-invoked effects that pattern triggered a real "Cannot update a
// component while rendering a different component" warning (the active
// quiz's mount effect registering the handler raced its own unmount-effect
// cleanup clearing it). A ref sidesteps all of that: registering/reading
// the handler never itself triggers a render, which is exactly what a
// "just route this call to whoever's listening" callback should do.
export function usePianoCurriculumLesson(lessons) {
  const [lessonId, setLessonIdState] = useState(lessons[0].id);
  const [previewNotes, setPreviewNotes] = useState([]);
  const [previewFingers, setPreviewFingers] = useState([]);
  const [quizFeedbackKey, setQuizFeedbackKey] = useState(null);
  const onKeyClickRef = useRef(null);

  function setOnKeyClick(handler) {
    onKeyClickRef.current = handler;
  }

  function onKeyClick(midi) {
    onKeyClickRef.current?.(midi);
  }

  function setLessonId(id) {
    setLessonIdState(id);
    setPreviewNotes([]);
    setPreviewFingers([]);
    setQuizFeedbackKey(null);
    onKeyClickRef.current = null;
  }

  return {
    lessonId,
    setLessonId,
    previewNotes,
    setPreviewNotes,
    previewFingers,
    setPreviewFingers,
    quizFeedbackKey,
    setQuizFeedbackKey,
    onKeyClick,
    setOnKeyClick,
  };
}
