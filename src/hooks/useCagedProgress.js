import { useEffect, useState } from 'react';

const STORAGE_KEY = 'caged-progress';

function getInitialCompletedIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

// Persists which Studies -> CAGED lessons have been marked complete, same
// read-once-then-sync-on-change localStorage pattern as useTheme.js. Pure
// client-side — there's no backend anywhere else in the app to plug into.
export function useCagedProgress() {
  const [completedIds, setCompletedIds] = useState(getInitialCompletedIds);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completedIds));
  }, [completedIds]);

  function isComplete(id) {
    return completedIds.includes(id);
  }

  function markComplete(id) {
    setCompletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function resetProgress() {
    setCompletedIds([]);
  }

  return { completedIds, isComplete, markComplete, resetProgress };
}
