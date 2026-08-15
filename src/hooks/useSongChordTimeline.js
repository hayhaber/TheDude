import { useCallback, useEffect, useState } from 'react';
import { capitalizeChordRoot } from '../music/chordSymbolParser';

const STORAGE_PREFIX = 'songChordTimeline:';

function load(videoId) {
  if (!videoId) return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_PREFIX + videoId));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function save(videoId, entries) {
  if (!videoId) return;
  localStorage.setItem(STORAGE_PREFIX + videoId, JSON.stringify(entries));
}

// A per-video, timestamped chord list built by ear while watching — tap
// "Mark" with a chord typed in at the moment it changes in the song. This
// is the legitimate stand-in for automatic chord detection: the YouTube
// IFrame Player's video plays in a cross-origin iframe, so there is no way
// for this app's Web Audio API to ever see its audio signal (the same
// restriction that blocks reading pixels off a cross-origin canvas) —
// there's no automatic extraction to fall back to. Persisted per videoId in
// localStorage, so re-opening the same video later resumes right where a
// previous session left off; entering a song's chords is a one-time cost.
export function useSongChordTimeline(videoId) {
  const [entries, setEntries] = useState(() => load(videoId));

  useEffect(() => {
    setEntries(load(videoId));
  }, [videoId]);

  const addEntry = useCallback(
    (time, chordText) => {
      const label = capitalizeChordRoot(chordText.trim());
      if (!label) return;
      setEntries((prev) => {
        // Replace anything already marked within 50ms of this time (fixing
        // a mistaken mark) rather than piling up near-duplicate entries.
        const next = [...prev.filter((e) => Math.abs(e.time - time) > 0.05), { time, chord: label }].sort(
          (a, b) => a.time - b.time
        );
        save(videoId, next);
        return next;
      });
    },
    [videoId]
  );

  const removeEntry = useCallback(
    (index) => {
      setEntries((prev) => {
        const next = prev.filter((_, i) => i !== index);
        save(videoId, next);
        return next;
      });
    },
    [videoId]
  );

  const clearAll = useCallback(() => {
    setEntries([]);
    save(videoId, []);
  }, [videoId]);

  // Bulk-replaces the whole timeline — shared by JSON import, MIDI import,
  // and the BPM/tap-sync generator (see chordTimelineSync.js), all of which
  // produce a full { time, chord } array at once rather than one entry at a
  // time like addEntry. Normalizes/sorts/capitalizes the same way addEntry
  // does, so it doesn't matter which path a timeline came from.
  const importEntries = useCallback(
    (newEntries) => {
      const next = newEntries
        .filter((e) => typeof e?.time === 'number' && typeof e?.chord === 'string' && e.chord.trim())
        .map((e) => ({ time: e.time, chord: capitalizeChordRoot(e.chord.trim()) }))
        .sort((a, b) => a.time - b.time);
      setEntries(next);
      save(videoId, next);
    },
    [videoId]
  );

  return { entries, addEntry, removeEntry, clearAll, importEntries };
}

// Plain JSON string of a timeline, for the Export button — same shape
// importEntries/JSON-file-import expect, so a file downloaded from one
// video can be re-imported for another.
export function timelineToJson(entries, meta = {}) {
  return JSON.stringify({ ...meta, chords: entries }, null, 2);
}

// Accepts either the export shape ({ chords: [...] }) or a bare array, so a
// hand-written or third-party-exported file works without needing the exact
// wrapper this app happens to produce.
export function parseTimelineJson(text) {
  const parsed = JSON.parse(text);
  const chords = Array.isArray(parsed) ? parsed : parsed?.chords;
  if (!Array.isArray(chords)) throw new Error('Expected a "chords" array.');
  return chords;
}

// The chord that should be showing at a given playback time — the last
// entry whose own timestamp has already passed. `entries` is kept sorted
// ascending by useSongChordTimeline itself, so a single forward scan works.
export function activeChordEntry(entries, time) {
  let active = null;
  for (const entry of entries) {
    if (entry.time <= time) active = entry;
    else break;
  }
  return active;
}
