import { useEffect, useState } from 'react';

const STORAGE_KEY = 'scales-progress';

function getInitialProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored && typeof stored === 'object' ? stored : {};
  } catch {
    return {};
  }
}

// Per-scale-lesson progress, same localStorage persistence pattern as
// useCagedProgress.js/useTheme.js — independent of the CAGED course's own
// progress (separate storage key). "Accuracy" only comes from Ear Training
// (scaleid mode) attempts, which have an actual correct/incorrect signal —
// free/guided practice (metronome step-through) has no ground truth to
// grade, so it isn't faked here; it only contributes bestTempo/practiceMs.
export function useScalesProgress() {
  const [progress, setProgress] = useState(getInitialProgress);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  function entryFor(lessonId) {
    return progress[lessonId] ?? { completed: false, bestTempo: 0, practiceMs: 0, earTrainingCorrect: 0, earTrainingTotal: 0 };
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

  function recordPracticeSession(lessonId, { tempo, durationMs }) {
    updateEntry(lessonId, (e) => ({
      ...e,
      bestTempo: Math.max(e.bestTempo, tempo ?? 0),
      practiceMs: e.practiceMs + (durationMs ?? 0),
    }));
  }

  function recordEarTrainingResult(lessonId, correct) {
    updateEntry(lessonId, (e) => ({
      ...e,
      earTrainingCorrect: e.earTrainingCorrect + (correct ? 1 : 0),
      earTrainingTotal: e.earTrainingTotal + 1,
    }));
  }

  // A handful of simple derived rules, not a full badge-authoring system.
  function badgesFor(lessonId) {
    const e = entryFor(lessonId);
    const badges = [];
    if (e.completed) badges.push('completed');
    if (e.bestTempo >= 100) badges.push('tempo100');
    if (e.bestTempo >= 140) badges.push('tempo140');
    if (e.earTrainingTotal >= 10 && e.earTrainingCorrect / e.earTrainingTotal >= 0.8) badges.push('earTrainingSharp');
    return badges;
  }

  function resetProgress() {
    setProgress({});
  }

  return {
    entryFor,
    isComplete,
    markComplete,
    recordPracticeSession,
    recordEarTrainingResult,
    badgesFor,
    resetProgress,
  };
}
