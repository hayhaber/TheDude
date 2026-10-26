import { useCallback, useEffect, useRef, useState } from 'react';
import { newSong } from '../../music/songwriter/song';

// The profile's songs (text, chords, melodies, take list) — a personal key,
// so it is per profile and syncs between devices with the account. Audio
// lives in IndexedDB on this device (audio/songwriter/songAudioStore.js).
export const SONGS_KEY = 'dudestar-p-songwriter';

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(SONGS_KEY));
    return { songs: Array.isArray(v?.songs) ? v.songs : [], ideas: Array.isArray(v?.ideas) ? v.ideas : [] };
  } catch {
    return { songs: [], ideas: [] };
  }
}

export function useSongs() {
  const [initial] = useState(load);
  const [songs, setSongs] = useState(initial.songs);
  // Quick ideas: recordings not (yet) part of a song.
  const [ideas, setIdeas] = useState(initial.ideas);
  const timer = useRef(null);
  const latest = useRef({ songs, ideas });
  latest.current = { songs, ideas };

  const dirty = useRef(false);
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    try {
      localStorage.setItem(SONGS_KEY, JSON.stringify({ v: 1, ...latest.current }));
    } catch {
      /* storage full: the song stays in memory for this visit */
    }
  }, []);

  // Typing saves a moment later (not on every key); leaving saves at once.
  useEffect(() => {
    if (songs === initial.songs && ideas === initial.ideas) return; // nothing changed yet
    dirty.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  }, [songs, ideas, flush, initial]);
  useEffect(() => {
    const onHide = () => flush();
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, [flush]);

  const create = useCallback((title = '') => {
    const s = newSong(title);
    setSongs((list) => [s, ...list]);
    return s;
  }, []);

  const update = useCallback((id, fn) => {
    setSongs((list) => list.map((s) => (s.id === id ? { ...fn(s), updatedAt: Date.now() } : s)));
  }, []);

  const remove = useCallback((id) => {
    setSongs((list) => list.filter((s) => s.id !== id));
  }, []);

  const add = useCallback((song) => {
    setSongs((list) => [song, ...list]);
  }, []);

  return { songs, ideas, setIdeas, create, update, remove, add, flush };
}
