// Which home cards show, and in what order (v1.0.206; user: "someone who
// doesn't want some cards can take them off"). Per profile (a personal key,
// synced): {hidden: [key], order: [key]}. A card missing from `order` (a
// new one) takes its place in the default order. At least one card shows.
import { useSyncExternalStore } from 'react';

export const HOME_CARD_KEYS = ['guitar', 'piano', 'bass', 'vocal', 'stage', 'songwriter', 'tools'];
const KEY = 'dudestar-p-home-cards';
const EVT = 'dudestar-home-cards';

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { hidden: Array.isArray(v.hidden) ? v.hidden : [], order: Array.isArray(v.order) ? v.order : [] };
  } catch {
    return { hidden: [], order: [] };
  }
}

/** Every card key in the chosen order (new cards in their default place). */
export function orderedKeys(prefs = read()) {
  const known = prefs.order.filter((k) => HOME_CARD_KEYS.includes(k));
  const out = [...known];
  HOME_CARD_KEYS.forEach((k, i) => {
    if (out.includes(k)) return;
    // after the card that comes before it by default
    const before = HOME_CARD_KEYS.slice(0, i).reverse().find((b) => out.includes(b));
    out.splice(before ? out.indexOf(before) + 1 : 0, 0, k);
  });
  return out;
}

/** The cards that show, in order (never none). */
export function visibleKeys(prefs = read()) {
  const v = orderedKeys(prefs).filter((k) => !prefs.hidden.includes(k));
  return v.length ? v : [orderedKeys(prefs)[0]];
}

let cache = null;
let cacheRaw = null;
function snapshot() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* private mode */
  }
  if (raw !== cacheRaw || !cache) {
    cacheRaw = raw;
    const p = read();
    cache = { ...p, ordered: orderedKeys(p), visible: visibleKeys(p) };
  }
  return cache;
}

function write(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(EVT));
}

export function setCardShown(key, shown) {
  const p = read();
  const hidden = shown ? p.hidden.filter((k) => k !== key) : [...new Set([...p.hidden, key])];
  if (!visibleKeys({ ...p, hidden }).length || orderedKeys(p).every((k) => hidden.includes(k))) return;
  write({ ...p, hidden });
}

export function setCardOrder(order) {
  write({ ...read(), order });
}

export function resetCardOrder() {
  write({ ...read(), order: [] });
}

function subscribe(fn) {
  window.addEventListener(EVT, fn);
  window.addEventListener('storage', fn);
  return () => {
    window.removeEventListener(EVT, fn);
    window.removeEventListener('storage', fn);
  };
}

/** {hidden, order, ordered, visible} — live. */
export function useHomeCards() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
