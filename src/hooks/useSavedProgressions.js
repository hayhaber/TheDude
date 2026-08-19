import { useEffect, useRef, useState } from 'react';

const SAVED_KEY = 'saved-progressions';
const RECENT_KEY = 'recent-progressions';
const MAX_RECENT = 12; // enough to browse a session's worth of typing without becoming a dump
const RECENT_DEBOUNCE_MS = 1500; // only log once typing pauses, not on every keystroke

function readList(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Two related but distinct localStorage-backed lists:
// - `saved`: explicit, named saves the user keeps on purpose (renameable,
//   deletable, favoritable) — never pruned automatically.
// - `recent`: an unnamed, auto-populated "what did I just type" trail,
//   capped at MAX_RECENT and pruned oldest-first — a convenience, not
//   something the user curates.
// Both entries carry enough of the Compose state (capoFret, mode) to fully
// restore what was on the neck, not just the chord text.
export function useSavedProgressions() {
  const [saved, setSaved] = useState(() => readList(SAVED_KEY));
  const [recent, setRecent] = useState(() => readList(RECENT_KEY));
  const debounceRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  }, [saved]);

  useEffect(() => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  }, [recent]);

  function saveCurrent({ name, text, capoFret, mode }) {
    const trimmed = name.trim();
    if (!trimmed || !text.trim()) return;
    setSaved((prev) => [{ id: makeId(), name: trimmed, text, capoFret, mode, favorite: false, createdAt: Date.now() }, ...prev]);
  }

  function renameSaved(id, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaved((prev) => prev.map((entry) => (entry.id === id ? { ...entry, name: trimmed } : entry)));
  }

  function deleteSaved(id) {
    setSaved((prev) => prev.filter((entry) => entry.id !== id));
  }

  function toggleFavorite(id) {
    setSaved((prev) => prev.map((entry) => (entry.id === id ? { ...entry, favorite: !entry.favorite } : entry)));
  }

  function deleteRecent(id) {
    setRecent((prev) => prev.filter((entry) => entry.id !== id));
  }

  // Called on every keystroke from the caller — debounced internally so a
  // "recent" entry only gets logged once the player actually pauses on a
  // multi-chord progression, not on every single character typed.
  function trackRecent({ text, capoFret, mode }) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = text.trim();
    if (trimmed.split(/\s+/).filter(Boolean).length < 2) return; // not worth logging a single chord
    debounceRef.current = setTimeout(() => {
      setRecent((prev) => {
        if (prev[0]?.text === trimmed) return prev; // already the most recent entry
        const deduped = prev.filter((entry) => entry.text !== trimmed);
        const next = [{ id: makeId(), text: trimmed, capoFret, mode, createdAt: Date.now() }, ...deduped];
        return next.slice(0, MAX_RECENT);
      });
    }, RECENT_DEBOUNCE_MS);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { saved, recent, saveCurrent, renameSaved, deleteSaved, toggleFavorite, deleteRecent, trackRecent };
}
