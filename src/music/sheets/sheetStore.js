// Sheet-music PDFs added in PianoPro / GuitarPro (shown as they are — a PDF
// is a picture of the notes, not playable data). Kept in this browser's
// IndexedDB (this device only, like imported Guitar Pro files); the reading
// place and the scroll speed per sheet live in a personal key.
const DB_NAME = 'dudestar-sheets';
const STORE = 'sheets';
const PREFS_KEY = 'dudestar-p-sheet-prefs';

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
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req?.result);
        tx.onerror = () => reject(tx.error);
      })
  );
}

/** [{id, name, size, at}] — without the file itself, newest last. */
export async function listSheets() {
  try {
    const all = (await run('readonly', (s) => s.getAll())) ?? [];
    return all.map(({ id, name, size, at }) => ({ id, name, size, at })).sort((a, b) => a.at - b.at);
  } catch {
    return [];
  }
}

export async function getSheet(id) {
  try {
    return (await run('readonly', (s) => s.get(id))) ?? null;
  } catch {
    return null;
  }
}

export async function saveSheet(file) {
  try {
    navigator.storage?.persist?.().catch(() => {});
  } catch {
    /* not supported */
  }
  const id = 'sheet-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const name = (file.name || 'Sheet').replace(/\.pdf$/i, '');
  const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' });
  await run('readwrite', (s) => s.put({ id, name, size: blob.size, at: Date.now(), blob }));
  return { id, name, size: blob.size, at: Date.now() };
}

/** Rename a sheet (the Stage's charts). */
export async function renameSheet(id, name) {
  const rec = await getSheet(id);
  if (!rec || !name?.trim()) return;
  await run('readwrite', (s) => s.put({ ...rec, name: name.trim() }));
}

export function deleteSheet(id) {
  setSheetPrefs(id, null);
  return run('readwrite', (s) => s.delete(id));
}

export function isPdf(file) {
  return !!file && (/\.pdf$/i.test(file.name || '') || file.type === 'application/pdf');
}

function readPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
  } catch {
    return {};
  }
}

/** {page (float, the reading place), secs (seconds per page)} */
export function sheetPrefs(id) {
  return readPrefs()[id] ?? {};
}

export function setSheetPrefs(id, patch) {
  const all = readPrefs();
  if (patch === null) delete all[id];
  else all[id] = { ...(all[id] ?? {}), ...patch };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(all));
  } catch {
    /* storage full / private mode */
  }
}
