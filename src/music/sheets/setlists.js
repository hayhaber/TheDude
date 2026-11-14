import { useCallback, useEffect, useState } from 'react';

// The Stage's setlists (v1.0.176): [{id, name, items: [sheetId]}] in a
// personal key, so they follow the profile (and its cloud sync). The charts
// themselves stay in this device's IndexedDB (sheetStore) — a setlist made
// on another device lists its missing charts as "not on this device".
const KEY = 'dudestar-p-setlists';
const EVT = 'dudestar-setlists';

export function readSetlists() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v.filter((l) => l && l.id && Array.isArray(l.items)) : [];
  } catch {
    return [];
  }
}

function write(lists) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lists));
  } catch {
    /* storage full / private mode */
  }
  window.dispatchEvent(new Event(EVT));
}

export function newId() {
  return 'set-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function useSetlists() {
  const [lists, setLists] = useState(readSetlists);
  useEffect(() => {
    const on = () => setLists(readSetlists());
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  const update = useCallback((fn) => write(fn(readSetlists())), []);
  return {
    lists,
    create: (name) => {
      const list = { id: newId(), name, items: [] };
      update((all) => [...all, list]);
      return list;
    },
    rename: (id, name) => update((all) => all.map((l) => (l.id === id ? { ...l, name } : l))),
    remove: (id) => update((all) => all.filter((l) => l.id !== id)),
    setItems: (id, items) => update((all) => all.map((l) => (l.id === id ? { ...l, items } : l))),
    // a deleted chart leaves every setlist
    dropSheet: (sheetId) => update((all) => all.map((l) => ({ ...l, items: l.items.filter((x) => x !== sheetId) }))),
  };
}

/** Move one item of an array (up / down). */
export function moveItem(arr, from, to) {
  if (to < 0 || to >= arr.length || from === to) return arr;
  const next = [...arr];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

/** "3:40" */
export function fmtDur(s) {
  const n = Math.max(0, Math.round(s));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}
