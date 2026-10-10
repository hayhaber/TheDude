import { useSyncExternalStore } from 'react';

// Left-handed mode (Settings -> "Left-handed"): every Fretboard is drawn
// mirrored — nut on the right, frets rising to the left. A device-level
// choice in localStorage 'left-handed' ('1' = on). Changing it notifies
// every mounted neck at once (no reload) via a window event; other tabs
// follow through the 'storage' event.
const STORAGE_KEY = 'left-handed';
const EVENT = 'dudestar:left-handed';

function read() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

let current = read();

function subscribe(callback) {
  const onStorage = (e) => {
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    current = read();
    callback();
  };
  window.addEventListener(EVENT, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener('storage', onStorage);
  };
}

export function isLeftHanded() {
  return current;
}

export function setLeftHanded(on) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    // storage blocked — still applies for this visit
  }
  current = !!on;
  window.dispatchEvent(new Event(EVENT));
}

/** [leftHanded, setLeftHanded] — live across every component using it. */
export function useLeftHanded() {
  const value = useSyncExternalStore(subscribe, isLeftHanded, () => false);
  return [value, setLeftHanded];
}
