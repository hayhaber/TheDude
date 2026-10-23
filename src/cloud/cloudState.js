// Cloud sync between a user's devices (Supabase), the light part: config,
// which keys sync, per-profile link info, change tracking and the "apply
// what was pulled" step that runs at start-up BEFORE the app reads storage.
// The heavy part (supabase-js, sign-in, push / pull) is cloudSync.js, loaded
// only when this profile is linked to an account or the user signs in.
//
// Model: every synced key of the linked profile is one row in the
// `user_kv` table (supabase/migrations/001_user_kv.sql), value = the exact
// localStorage string. A local change marks the key DIRTY (pushed a few
// seconds later); a pull never overwrites a dirty key (the local change is
// newer and will be pushed). Rows pulled while the app is in use are kept
// in a PENDING list and written at the next start, before any hook reads
// its state — writing them under a running app would be overwritten by the
// hooks' in-memory state anyway.

import { activeProfileId, isPersonalKey, onStorageChange, writeSilently } from '../profile/profileStorage';

export const SUPABASE_URL = 'https://fcisgnpdpjgayptiurkc.supabase.co';
// Publishable key: safe in the browser (Row Level Security guards the data).
export const SUPABASE_KEY = 'sb_publishable_TTarlNoOKBeFrNtXCc3vOg_stxjawpg';

/** Device-level settings that follow the person (the rest stay per device). */
export const SYNCED_SETTINGS = [
  'left-handed',
  'audio-settings',
  'piano-audio-settings',
  'bass-audio-settings',
  'piano-volume',
  'infoTooltipsEnabled',
  'tuner-tuning',
  'piano-show-all-labels',
];
const SETTINGS = new Set(SYNCED_SETTINGS);

/** Personal keys that only make sense on this device. */
const NOT_SYNCED = new Set(['dudestar-p-rec-project']);

export const MAX_VALUE_CHARS = 1_900_000; // the table allows 2,000,000

export function isSyncedKey(key) {
  if (typeof key !== 'string' || !key || key.length > 200 || NOT_SYNCED.has(key)) return false;
  return SETTINGS.has(key) || isPersonalKey(key);
}

// ---- small JSON records in raw (device) keys ------------------------------

const read = (k, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return v ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (k, v) => {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* quota: sync is best-effort */
  }
};

const pid = () => activeProfileId() || 'default';
export const linkKey = (id = pid()) => `dudestar-cloud:${id}`;
const dirtyKey = (id = pid()) => `dudestar-cloud-dirty:${id}`;
const pendingKey = (id = pid()) => `dudestar-cloud-pending:${id}`;
export const authStorageKey = (id = pid()) => `dudestar-cloud-auth:${id}`;
export const signingKey = (id = pid()) => `dudestar-cloud-signing:${id}`;

/** { userId, email, lastPull, lastSync } or null. */
export const getLink = () => read(linkKey(), null);
export const setLink = (v) => write(linkKey(), v);
export const clearLinkData = () => {
  write(linkKey(), null);
  write(dirtyKey(), null);
  write(pendingKey(), null);
};

/** { key: true } — local changes not yet uploaded. */
export const getDirty = () => read(dirtyKey(), {});
export const setDirty = (d) => write(dirtyKey(), Object.keys(d).length ? d : null);

export const getPending = () => read(pendingKey(), []);
export const setPending = (rows) => write(pendingKey(), rows.length ? rows : null);

/** Write pulled rows into storage (skipping keys changed here meanwhile). Returns how many changed. */
export function applyRows(rows) {
  const dirty = getDirty();
  let changed = 0;
  for (const r of rows) {
    if (!r || !isSyncedKey(r.key) || dirty[r.key]) continue;
    const value = r.deleted ? null : r.value;
    if (localStorage.getItem(r.key) === value) continue;
    try {
      writeSilently(r.key, value);
      changed++;
    } catch {
      /* quota */
    }
  }
  return changed;
}

/** Start-up (profile/install.js): rows pulled last session take effect now, before the app renders. */
export function applyPendingAtBoot() {
  try {
    const rows = getPending();
    if (!rows.length) return;
    setPending([]);
    applyRows(rows);
  } catch {
    /* never block start-up */
  }
}

// ---- change tracking --------------------------------------------------------

let pushHandler = null;
/** cloudSync.js registers its debounced push here. */
export function setPushHandler(fn) {
  pushHandler = fn;
}

export function trackChanges() {
  onStorageChange((key) => {
    if (!isSyncedKey(key) || !getLink()) return;
    const d = getDirty();
    if (!d[key]) {
      d[key] = true;
      setDirty(d);
    }
    pushHandler?.();
  });
}

// ---- UI state (a tiny store; cloudSync.js updates it) ----------------------

let state = { status: 'idle', email: getLinkSafe()?.email ?? null, lastSync: getLinkSafe()?.lastSync ?? null, error: null, choice: null };
const listeners = new Set();
function getLinkSafe() {
  try {
    return getLink();
  } catch {
    return null;
  }
}
export const getCloudState = () => state;
export function setCloudState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}
export function subscribeCloud(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Load the sync module (separate chunk) — only when it's needed. */
let modP = null;
export function loadCloud() {
  if (!modP) modP = import('./cloudSync.js');
  return modP;
}

/** main.jsx: resume the sync if this profile is linked, or finish a Google sign-in. */
export function startCloud() {
  try {
    const url = new URL(window.location.href);
    const returning = localStorage.getItem(signingKey()) && (url.searchParams.has('code') || url.searchParams.has('error'));
    if (!getLink() && !returning) return;
    loadCloud()
      .then((m) => m.boot())
      .catch(() => setCloudState({ status: 'error', error: 'load' }));
  } catch {
    /* ignore */
  }
}
