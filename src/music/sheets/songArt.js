// Song artwork (v1.0.251): the album cover of a cover song beside its name,
// wherever the song appears (Band songs, setlists, suggestions, the song's
// page) — as Apple Music does. No server column: every device finds the
// cover itself from the song's name "Title – Artist" through Apple's
// catalogue (/api/song-search), and keeps it in a device cache. A song
// picked from the search seeds the cache at once. A song without an artist
// (an original) gets no cover — never a guess.
import { useSyncExternalStore } from 'react';
import { searchSongs } from './songSearch';

const KEY = 'dudestar-song-art'; // device: {"title|artist": url | ""}
let cache = null;
const subs = new Set();
function read() {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    cache = {};
  }
  return cache;
}
function write(k, v) {
  cache = { ...read(), [k]: v };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* quota */
  }
  subs.forEach((fn) => fn());
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[֑-ׇ̀-ͯ]/g, '')
    .replace(/\s*[([].*?[)\]]\s*/g, ' ') // (Remastered 2011), [Live]
    .replace(/^the\s+/, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** "Zombie – The Cranberries" -> {title, artist}; no dash = no artist. */
export function splitName(name) {
  const m = String(name || '').match(/^(.+?)\s+[–—-]\s+(.+)$/);
  return m ? { title: m[1].trim(), artist: m[2].trim() } : { title: String(name || '').trim(), artist: '' };
}

const keyOf = (title, artist) => norm(title) + '|' + norm(artist);

/** A song chosen from the search: remember its cover. */
export function rememberArt(title, artist, url) {
  if (title && artist && url) write(keyOf(title, artist), url);
}

// one lookup at a time, gently
const queue = [];
const asked = new Set();
let busy = false;
async function pump() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const { title, artist, k } = queue.shift();
    try {
      const he = /[֐-׿]/.test(title + artist);
      const list = await searchSongs(`${title} ${artist}`, he ? 'he' : 'en');
      const hit = list.find((x) => norm(x.title) === norm(title) && (norm(x.artist) === norm(artist) || norm(x.artist).includes(norm(artist)) || norm(artist).includes(norm(x.artist))));
      write(k, hit?.art || '');
    } catch {
      asked.delete(k); // offline: try again next time
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  busy = false;
}

/** The cover for a song (by its name, or title + artist); null = none / not yet. */
export function artFor(title, artist) {
  if (!title || !artist) return null;
  const k = keyOf(title, artist);
  const c = read();
  if (k in c) return c[k] || null;
  if (!asked.has(k) && typeof navigator !== 'undefined' && navigator.onLine !== false) {
    asked.add(k);
    queue.push({ title, artist, k });
    pump();
  }
  return null;
}

let version = 0;
subs.add(() => {
  version += 1;
});
const subscribe = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};
/** Re-renders when a cover arrives. */
export const useArtVersion = () => useSyncExternalStore(subscribe, () => version, () => version);

/** Apple's artwork URL at another size: ".../120x120bb.jpg" -> 300x300. */
export const artAt = (url, px) => (url ? url.replace(/\d+x\d+bb/, `${px}x${px}bb`) : null);
