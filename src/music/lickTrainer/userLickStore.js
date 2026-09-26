// Licks the player imported from Guitar Pro files inside the app, kept in
// this browser's IndexedDB (they survive reloads and app updates, but live
// on this device only). Stored in raw form; library.js's withDerived()
// adds pitches when they're loaded.
const DB_NAME = 'dudestar';
const STORE = 'userLicks';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run(mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const result = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(result?.result ?? result);
        tx.onerror = () => reject(tx.error);
      })
  );
}

export async function loadUserLicks() {
  try {
    const all = await run('readonly', (store) => store.getAll());
    return Array.isArray(all) ? all.sort((a, b) => (a.importedAt ?? 0) - (b.importedAt ?? 0)) : [];
  } catch {
    return [];
  }
}

// Ask the browser to keep this site's storage until the user clears it
// (without this, e.g. Safari may drop it after a few weeks unused).
function requestPersistence() {
  try {
    navigator.storage?.persist?.().catch(() => {});
  } catch {
    // not supported — nothing to do
  }
}

export function saveUserLicks(licks) {
  requestPersistence();
  return run('readwrite', (store) => licks.forEach((l) => store.put(l)));
}

export function deleteUserLicks(ids) {
  return run('readwrite', (store) => ids.forEach((id) => store.delete(id)));
}
