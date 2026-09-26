// Client side of the shared library (api/library.js): imported Guitar Pro
// files are kept in the cloud so every device sees them, with this device's
// IndexedDB (userLickStore.js) as the local copy that also works offline.
//
// A record that came from / went to the cloud is marked `cloud: true`, so a
// sync can tell "deleted on another device" (cloud record gone remotely ->
// drop it here) from "imported here while offline / before connecting"
// (never uploaded -> upload it now).
import { saveUserLicks, deleteUserLicks } from './userLickStore';

const KEY_STORAGE = 'dudestar.libraryKey';
const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024; // the function's request limit is 4.5 MB

export function getLibraryKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setLibraryKey(key) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    // storage blocked — the key just won't be remembered
  }
}

class LibraryError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.code = code; // 'not-configured' | 'bad-key' | 'offline' | 'too-big' | 'storage'
  }
}

async function call(method, group, body) {
  const key = getLibraryKey();
  if (!key) throw new LibraryError('no-key');
  let res;
  try {
    res = await fetch(`/api/library${group ? `?group=${encodeURIComponent(group)}` : ''}`, {
      method,
      headers: { 'x-dudestar-key': key, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new LibraryError('offline', err?.message);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON (e.g. the API doesn't exist on this host)
  }
  if (!res.ok) {
    const code = data?.error === 'bad-key' ? 'bad-key' : data?.error === 'not-configured' || res.status === 404 ? 'not-configured' : 'storage';
    throw new LibraryError(code, data?.message);
  }
  return data;
}

// ArrayBuffer <-> base64 (the file travels inside the JSON document).
function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromBase64(b64) {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
}

const encode = (records) =>
  records.map(({ gpBytes, cloud, ...r }) => ({ ...r, ...(gpBytes ? { gpBytes64: toBase64(gpBytes) } : {}) })); // eslint-disable-line no-unused-vars
const decode = (records) =>
  records.map(({ gpBytes64, ...r }) => ({ ...r, ...(gpBytes64 ? { gpBytes: fromBase64(gpBytes64) } : {}), cloud: true }));

/** Checks the key; resolves with the number of files in the library. */
export async function checkLibrary() {
  const { groups } = await call('GET');
  return groups.length;
}

/** Uploads one imported file's records; resolves with them marked `cloud`. */
export async function uploadGroup(group, records) {
  const body = { records: encode(records) };
  if (JSON.stringify(body).length > MAX_UPLOAD_BYTES) throw new LibraryError('too-big');
  await call('PUT', group, body);
  const marked = records.map((r) => ({ ...r, cloud: true }));
  await saveUserLicks(marked);
  return marked;
}

export function deleteGroup(group) {
  return call('DELETE', group);
}

/**
 * Brings this device's copy in line with the cloud. `local` = raw records
 * from IndexedDB. Resolves with the new raw list (already saved locally).
 */
export async function syncLibrary(local) {
  const { groups } = await call('GET');
  const remote = new Set(groups.map((g) => g.group));
  const byGroup = new Map();
  for (const r of local) {
    const g = r.importGroup ?? r.id;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(r);
  }
  let result = [...local];

  // Deleted on another device.
  for (const [g, recs] of byGroup) {
    if (!remote.has(g) && recs.every((r) => r.cloud)) {
      await deleteUserLicks(recs.map((r) => r.id));
      result = result.filter((r) => (r.importGroup ?? r.id) !== g);
    }
  }
  // Imported here but never uploaded.
  for (const [g, recs] of byGroup) {
    if (!remote.has(g) && !recs.every((r) => r.cloud)) {
      try {
        const marked = await uploadGroup(g, recs);
        const ids = new Set(marked.map((r) => r.id));
        result = [...result.filter((r) => !ids.has(r.id)), ...marked];
      } catch (err) {
        if (err.code !== 'too-big') throw err;
      }
    }
  }
  // Imported on another device.
  for (const g of remote) {
    if (byGroup.has(g)) continue;
    const doc = await call('GET', g);
    const recs = decode(doc.records ?? []);
    if (recs.length === 0) continue;
    await saveUserLicks(recs);
    result.push(...recs);
  }
  return result.sort((a, b) => (a.importedAt ?? 0) - (b.importedAt ?? 0));
}
