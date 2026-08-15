import { useEffect, useState } from 'react';

const STORAGE_KEY = 'circle-of-fifths-progress';

function getInitialProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored && typeof stored === 'object' ? stored : {};
  } catch {
    return {};
  }
}

// Per-lesson progress for the Circle of Fifths course, same localStorage
// persistence pattern (and independent storage key) as useScalesProgress.js/
// useCagedProgress.js. Adds recordQuizResult (the flashcard drill has an
// actual correct/incorrect signal, same role earTraining results play in
// useScalesProgress) and recordPracticeSession (for the two metronome
// drills, same role as Scales' own practice-session tracking).
export function useCircleOfFifthsProgress() {
  const [progress, setProgress] = useState(getInitialProgress);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  function entryFor(lessonId) {
    return progress[lessonId] ?? { completed: false, quizCorrect: 0, quizTotal: 0, bestTempo: 0, practiceMs: 0 };
  }

  function updateEntry(lessonId, updater) {
    setProgress((prev) => ({ ...prev, [lessonId]: updater(prev[lessonId] ?? entryFor(lessonId)) }));
  }

  function isComplete(lessonId) {
    return entryFor(lessonId).completed;
  }

  function markComplete(lessonId) {
    updateEntry(lessonId, (e) => ({ ...e, completed: true }));
  }

  function recordQuizResult(lessonId, correct) {
    updateEntry(lessonId, (e) => ({
      ...e,
      quizCorrect: e.quizCorrect + (correct ? 1 : 0),
      quizTotal: e.quizTotal + 1,
    }));
  }

  function recordPracticeSession(lessonId, { tempo, durationMs }) {
    updateEntry(lessonId, (e) => ({
      ...e,
      bestTempo: Math.max(e.bestTempo, tempo ?? 0),
      practiceMs: e.practiceMs + (durationMs ?? 0),
    }));
  }

  function resetProgress() {
    setProgress({});
  }

  return { entryFor, isComplete, markComplete, recordQuizResult, recordPracticeSession, resetProgress };
}
