// Personal profiles on one device ("who's practising?").
//
// Everything personal (progress, history, vocal range, saved progressions…)
// lives in localStorage. Rather than touching every hook, the Storage
// methods are patched once, before the app renders (src/profile/install.js
// is main.jsx's first import): a PERSONAL key K is read/written as
// `p:<activeId>:K`. Every other key (audio, language, theme, sound profiles,
// sync key, latency…) is device-level and passes through untouched.
//
// Switching / creating / deleting the active profile reloads the page, so
// every hook simply re-reads its state from the new namespace.
//
// localStorage.key(i) / .length are NOT virtualised: they list the raw keys
// (including `p:<id>:…`). Reading a raw key back through getItem() still
// works (a `p:` key is never personal itself, so it passes through). The app
// doesn't iterate localStorage today; code that needs "my personal keys"
// should use personalKeys() below.

import { useSyncExternalStore } from 'react';

export const REGISTRY_KEY = 'dudestar-profiles';
const NS = 'p:';

/** Exact keys that belong to a person. Extend freely. */
export const PERSONAL_KEYS = [
  'practice-history',
  'lick-trainer-history',
  'caged-progress',
  'scales-progress',
  'circle-of-fifths-progress',
  'harmony-progress',
  'chordsByEar-progress',
  'piano-curriculum-progress',
  'dudestar-vocal-progress',
  'dudestar-vocal-level',
  'dudestar-vocal-range',
  'saved-progressions',
  'recent-progressions',
  'dudestar-freeplay-recording',
  'dudestar-perf-log',
];

/** Key prefixes that belong to a person. Extend freely. */
export const PERSONAL_PREFIXES = [
  'earTrainingBestStreak:',
  'earTrainingLifetime:',
  'pianoPracticeBestStreak:',
  'songChordTimeline:',
  'dudestar-coach',
];

const personalSet = new Set(PERSONAL_KEYS);

export function isPersonalKey(key) {
  if (typeof key !== 'string') return false;
  if (key.startsWith(NS)) return false; // already namespaced
  if (personalSet.has(key)) return true;
  return PERSONAL_PREFIXES.some((p) => key.startsWith(p));
}

const nsKey = (id, key) => `${NS}${id}:${key}`;

// ---------------------------------------------------------------------------

let installed = false;
let store = null; // window.localStorage
let raw = null; // the original Storage methods
let activeId = null; // the profile THIS page uses (fixed until a reload)
let registry = null; // cached { profiles, activeId, migrated }
const listeners = new Set();

function rawGet(k) {
  return raw.get.call(store, k);
}
function rawSet(k, v) {
  raw.set.call(store, k, v);
}
function rawRemove(k) {
  raw.remove.call(store, k);
}
function rawKeys() {
  const out = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k != null) out.push(k);
  }
  return out;
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function readRegistry() {
  try {
    const v = JSON.parse(rawGet(REGISTRY_KEY));
    if (!v || !Array.isArray(v.profiles)) return null;
    const profiles = v.profiles
      .filter((p) => p && typeof p.id === 'string' && p.id && !p.id.includes(':'))
      .map((p) => ({ id: p.id, name: typeof p.name === 'string' ? p.name : '', createdAt: p.createdAt || 0 }));
    if (!profiles.length) return null;
    const active = profiles.some((p) => p.id === v.activeId) ? v.activeId : profiles[0].id;
    return { profiles, activeId: active, migrated: !!v.migrated };
  } catch {
    return null;
  }
}

function writeRegistry(next) {
  rawSet(REGISTRY_KEY, JSON.stringify(next));
  registry = { ...next, profiles: next.profiles.map((p) => ({ ...p })) };
  listeners.forEach((fn) => fn());
}

// Raw (un-namespaced) personal keys -> the given profile. Never overwrites a
// value the profile already has; the raw key is removed only after its copy
// is safely written. Safe to run again (it just finds nothing to move).
function migrateRawInto(id) {
  for (const k of rawKeys()) {
    if (!isPersonalKey(k)) continue;
    try {
      const target = nsKey(id, k);
      if (rawGet(target) == null) rawSet(target, rawGet(k));
      rawRemove(k);
    } catch {
      /* quota etc. — leave the raw key for the next start */
    }
  }
}

/**
 * Patch localStorage so personal keys are per profile. Call once, before
 * anything reads storage. If storage is unavailable or the registry can't be
 * saved, nothing is patched (the app behaves exactly as before).
 */
export function installProfileStorage() {
  if (installed) return;
  if (typeof window === 'undefined' || typeof Storage === 'undefined') return;
  try {
    store = window.localStorage;
    if (!store) return;
  } catch {
    return;
  }
  raw = {
    get: Storage.prototype.getItem,
    set: Storage.prototype.setItem,
    remove: Storage.prototype.removeItem,
  };

  try {
    let reg = readRegistry();
    if (!reg) {
      // First run on this device: one profile, holding everything so far.
      const id = newId();
      reg = { profiles: [{ id, name: '', createdAt: Date.now() }], activeId: id, migrated: false };
      writeRegistry(reg); // first, so a crash mid-migration resumes into the same id
    }
    if (!reg.migrated) {
      migrateRawInto(reg.profiles[0].id);
      writeRegistry({ ...reg, migrated: true });
    }
    registry = registry || reg;
    activeId = registry.activeId;
  } catch {
    // Can't persist a registry: don't namespace at all (data stays reachable).
    raw = null;
    store = null;
    registry = null;
    return;
  }

  const map = (self, key) => (self === store && activeId && isPersonalKey(key) ? nsKey(activeId, key) : key);
  const { get, set, remove } = raw;
  Storage.prototype.getItem = function getItem(key) {
    return get.call(this, map(this, key));
  };
  Storage.prototype.setItem = function setItem(key, value) {
    return set.call(this, map(this, key), value);
  };
  Storage.prototype.removeItem = function removeItem(key) {
    return remove.call(this, map(this, key));
  };
  installed = true;
}

export function isProfileStorageInstalled() {
  return installed;
}

// ---------------------------------------------------------------------------
// API

export function listProfiles() {
  return registry ? registry.profiles.map((p) => ({ ...p })) : [];
}

export function activeProfile() {
  if (!registry) return null;
  const p = registry.profiles.find((x) => x.id === activeId);
  return p ? { ...p } : null;
}

/** Raw keys (as stored) of a profile's personal data. */
export function personalKeys(id = activeId) {
  if (!installed || !id) return [];
  const pre = `${NS}${id}:`;
  return rawKeys().filter((k) => k.startsWith(pre));
}

function fresh() {
  // Another tab may have changed the list; build on the stored one.
  return readRegistry() || registry;
}

function reload() {
  try {
    window.location.reload();
  } catch {
    /* tests */
  }
}

/** A new, empty profile — and switch to it (reloads). */
export function createProfile(name = '') {
  if (!installed) return null;
  const reg = fresh();
  const id = newId();
  const profiles = [...reg.profiles, { id, name: String(name).trim().slice(0, 40), createdAt: Date.now() }];
  writeRegistry({ ...reg, profiles, activeId: id });
  activeId = id;
  reload();
  return id;
}

export function renameProfile(id, name) {
  if (!installed) return;
  const reg = fresh();
  const profiles = reg.profiles.map((p) => (p.id === id ? { ...p, name: String(name).trim().slice(0, 40) } : p));
  writeRegistry({ ...reg, profiles });
}

/** Removes the profile and all its data. The last profile can't be deleted. */
export function deleteProfile(id) {
  if (!installed) return false;
  const reg = fresh();
  if (reg.profiles.length <= 1 || !reg.profiles.some((p) => p.id === id)) return false;
  const profiles = reg.profiles.filter((p) => p.id !== id);
  const wasActive = id === activeId;
  const nextActive = wasActive ? profiles[0].id : reg.activeId === id ? activeId : reg.activeId;
  writeRegistry({ ...reg, profiles, activeId: nextActive });
  for (const k of personalKeys(id)) {
    try {
      rawRemove(k);
    } catch {
      /* ignore */
    }
  }
  if (wasActive) {
    activeId = nextActive;
    reload();
  }
  return true;
}

export function switchProfile(id) {
  if (!installed || id === activeId) return;
  const reg = fresh();
  if (!reg.profiles.some((p) => p.id === id)) return;
  writeRegistry({ ...reg, activeId: id });
  activeId = id;
  reload();
}

// ---------------------------------------------------------------------------
// React

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const getSnapshot = () => registry;

/**
 * { ready, profiles, activeId, active, create, rename, remove, switchTo }.
 * `ready` is false when storage couldn't be namespaced (then the UI hides).
 */
export function useProfiles() {
  const reg = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const profiles = reg?.profiles ?? [];
  return {
    ready: installed && !!reg,
    profiles,
    activeId,
    active: profiles.find((p) => p.id === activeId) ?? null,
    create: createProfile,
    rename: renameProfile,
    remove: deleteProfile,
    switchTo: switchProfile,
  };
}
