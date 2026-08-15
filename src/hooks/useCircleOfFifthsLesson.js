import { useState } from 'react';

// Owns the Circle of Fifths course's "what's currently being shown" state —
// which lesson, and which of the 12 keys is selected on the wheel/fretboard
// — same one-hook-instance-in-App.jsx pattern as useScalesLesson.js.
export function useCircleOfFifthsLesson(lessons) {
  const [lessonId, setLessonId] = useState(lessons[0].id);
  const [keyPosition, setKeyPosition] = useState(0); // 0 = C, matches KEY_CIRCLE
  const [labelMode, setLabelMode] = useState('degree');

  return { lessonId, setLessonId, keyPosition, setKeyPosition, labelMode, setLabelMode };
}
