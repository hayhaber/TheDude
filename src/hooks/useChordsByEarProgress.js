import { useEffect, useState } from 'react';

const STORAGE_KEY = 'chordsByEar-progress';

function getInitialProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored && typeof stored === 'object' ? stored : {};
  } catch {
    return {};
  }
}

// Per-lesson progress for the Chords by Ear course — same localStorage
// persistence pattern (and independent storage key) as every other Studies
// course's own progress hook (useHarmonyProgress.js, etc.).
export function useChordsByEarProgress() {
  const [progress, setProgress] = useState(getInitialProgress);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  function entryFor(lessonId) {
    return progress[lessonId] ?? { completed: false, quizCorrect: 0, quizTotal: 0, bestStreak: 0 };
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
    updateEntry(lessonId, (e) => {
      const streak = correct ? (e.streak ?? 0) + 1 : 0;
      return {
        ...e,
        quizCorrect: e.quizCorrect + (correct ? 1 : 0),
        quizTotal: e.quizTotal + 1,
        streak,
        bestStreak: Math.max(e.bestStreak ?? 0, streak),
      };
    });
  }

  function resetProgress() {
    setProgress({});
  }

  return { entryFor, isComplete, markComplete, recordQuizResult, resetProgress };
}
