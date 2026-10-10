// The recorder's takes, in IndexedDB on this device. Each take belongs to
// the profile that recorded it (profile/profileStorage.js), so everyone on
// a shared device sees only their own. Metadata and audio are kept in two
// stores so listing the takes never loads the audio.
//
// take: { id, profileId, name, createdAt, duration, sampleRate, sound:
//         'dry'|'amp', peaks: number[] }   audio: { id, blob }

import { activeProfile } from '../profile/profileStorage';

const DB = 'dudestar-recorder';
const VERSION = 1;

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('takes')) d.createObjectStore('takes', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('audio')) d.createObjectStore('audio', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function currentProfileId() {
  try {
    return activeProfile()?.id ?? '';
  } catch {
    return '';
  }
}

/** This profile's takes, newest first. */
export async function listTakes(profileId = currentProfileId()) {
  const d = await db();
  const all = await request(d.transaction('takes').objectStore('takes').getAll());
  return all.filter((t) => (t.profileId ?? '') === profileId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveTake(meta, blob) {
  const d = await db();
  const tx = d.transaction(['takes', 'audio'], 'readwrite');
  tx.objectStore('takes').put(meta);
  tx.objectStore('audio').put({ id: meta.id, blob });
  await done(tx);
  return meta;
}

export async function getTakeAudio(id) {
  const d = await db();
  const rec = await request(d.transaction('audio').objectStore('audio').get(id));
  return rec?.blob ?? null;
}

export async function renameTake(id, name) {
  const d = await db();
  const tx = d.transaction('takes', 'readwrite');
  const store = tx.objectStore('takes');
  const t = await request(store.get(id));
  if (t) store.put({ ...t, name });
  await done(tx);
}

export async function deleteTake(id) {
  const d = await db();
  const tx = d.transaction(['takes', 'audio'], 'readwrite');
  tx.objectStore('takes').delete(id);
  tx.objectStore('audio').delete(id);
  await done(tx);
}

export function newTakeId() {
  return `take-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
