import { useEffect, useState } from 'react';

const STORAGE_KEY = 'practice-history';
const MAX_SESSIONS = 500; // keep the log from growing unbounded over months of use

function getInitialSessions() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, local calendar day is good enough here
}

function daysAgoKey(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// One global log of completed practice sessions, across every exercise
// context (Practice -> Drills, Studies -> CAGED workout, Studies -> Scales
// practice) — all three already load into the one shared usePracticeDrill
// instance, so this is fed from exactly one place (see usePracticeDrill.js)
// rather than duplicated per view. Same localStorage persistence pattern as
// useCagedProgress.js/useScalesProgress.js.
export function usePracticeHistory() {
  const [sessions, setSessions] = useState(getInitialSessions);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  // Zero/negative durations (e.g. a session ended within the same tick it
  // started) aren't meaningful practice time — skip logging those rather
  // than polluting the history with no-op entries.
  function logSession({ exerciseId, context, durationMs, bpm }) {
    if (!durationMs || durationMs <= 0) return;
    const now = new Date();
    setSessions((prev) => {
      const next = [
        ...prev,
        { id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`, exerciseId, context, date: todayKey(), timestamp: now.getTime(), durationMs, bpm: bpm ?? null },
      ];
      return next.length > MAX_SESSIONS ? next.slice(next.length - MAX_SESSIONS) : next;
    });
  }

  function todaySessions() {
    const today = todayKey();
    return sessions.filter((s) => s.date === today);
  }

  function weekSessions() {
    const cutoff = daysAgoKey(6); // today + 6 previous days = a 7-day window
    return sessions.filter((s) => s.date >= cutoff);
  }

  function todayTotalMs() {
    return todaySessions().reduce((sum, s) => sum + s.durationMs, 0);
  }

  function weekTotalMs() {
    return weekSessions().reduce((sum, s) => sum + s.durationMs, 0);
  }

  function todayCompletedCount() {
    return todaySessions().length;
  }

  function averageSessionMs() {
    if (sessions.length === 0) return 0;
    return sessions.reduce((sum, s) => sum + s.durationMs, 0) / sessions.length;
  }

  function highestBpmToday() {
    const bpms = todaySessions().map((s) => s.bpm).filter((b) => b != null);
    return bpms.length > 0 ? Math.max(...bpms) : null;
  }

  // Longest run of consecutive calendar days with at least one session,
  // counting back from today (a streak that isn't still active as of today
  // doesn't count as "current" — it's the longest one on record).
  function longestStreak() {
    const practiceDays = new Set(sessions.map((s) => s.date));
    if (practiceDays.size === 0) return 0;
    let longest = 0;
    let current = 0;
    for (let i = 0; ; i += 1) {
      const key = daysAgoKey(i);
      if (practiceDays.has(key)) {
        current += 1;
        longest = Math.max(longest, current);
      } else if (i === 0) {
        current = 0; // today not practiced yet — doesn't break a streak ending yesterday
      } else {
        break;
      }
    }
    return longest;
  }

  // Given the app's combined catalog of practicable items
  // ({ id, context }[], passed in by the caller — this hook doesn't import
  // every content file itself), suggests the first one not practiced today,
  // falling back to whichever has gone longest without being practiced at
  // all. A simple, transparent heuristic, not a recommendation engine.
  function recommendedExercise(catalog) {
    if (!catalog || catalog.length === 0) return null;
    const practicedToday = new Set(todaySessions().map((s) => s.exerciseId));
    const notToday = catalog.find((item) => !practicedToday.has(item.id));
    if (notToday) return notToday;

    const lastPracticed = new Map();
    sessions.forEach((s) => {
      const prev = lastPracticed.get(s.exerciseId);
      if (!prev || s.timestamp > prev) lastPracticed.set(s.exerciseId, s.timestamp);
    });
    return [...catalog].sort((a, b) => (lastPracticed.get(a.id) ?? 0) - (lastPracticed.get(b.id) ?? 0))[0];
  }

  function resetHistory() {
    setSessions([]);
  }

  return {
    logSession,
    todayTotalMs,
    weekTotalMs,
    todayCompletedCount,
    averageSessionMs,
    highestBpmToday,
    longestStreak,
    recommendedExercise,
    resetHistory,
  };
}
