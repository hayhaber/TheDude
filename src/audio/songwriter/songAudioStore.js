// The Songwriter's recordings (WAV), in IndexedDB on this device — kept
// apart from the Recorder's takes so neither library sees the other's.
// The song itself (text, chords, melody, take list) is in localStorage per
// profile and syncs between devices; the audio stays here (user's choice).

import { activeProfile } from '../../profile/profileStorage';

const DB = 'dudestar-songwriter';
let dbPromise = null;

function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
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

const request = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

function profileId() {
  try {
    return activeProfile()?.id ?? '';
  } catch {
    return '';
  }
}

export async function saveAudio(id, blob, meta = {}) {
  const d = await db();
  const tx = d.transaction('audio', 'readwrite');
  tx.objectStore('audio').put({ id, blob, profileId: profileId(), ...meta });
  await new Promise((res, rej) => {
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
}

export async function getAudio(id) {
  const d = await db();
  const rec = await request(d.transaction('audio').objectStore('audio').get(id));
  return rec?.blob ?? null;
}

export async function deleteAudio(ids) {
  const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  if (!list.length) return;
  const d = await db();
  const tx = d.transaction('audio', 'readwrite');
  for (const id of list) tx.objectStore('audio').delete(id);
  await new Promise((res) => {
    tx.oncomplete = res;
    tx.onerror = res;
  });
}

/** Which of these ids have audio on this device. */
export async function hasAudio(ids) {
  const d = await db();
  const keys = await request(d.transaction('audio').objectStore('audio').getAllKeys());
  const set = new Set(keys);
  return new Set(ids.filter((id) => set.has(id)));
}
