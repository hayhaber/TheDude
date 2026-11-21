// Rehearsal notes on a song (v1.0.244). After a rehearsal anyone leaves a
// note on a song ("the bridge drags", "shorter intro"); a change of the
// song's KEY, TEMPO or LENGTH is written there by itself, with who made it
// and what it was before — so the band always sees why the song changed.
//   band songs: Supabase `song_notes` (migration 008, chartCloud.js) — every
//               member sees them;
//   my own songs: a personal key (syncs between my devices with the profile).
import { useSyncExternalStore } from 'react';
import { addBandNote, getChartCloud, signedIn, subscribeChartCloud, updateBandNote } from './chartCloud';
import { getSheet, onSheetPrefs } from './sheetStore';
import { getLink } from '../../cloud/cloudState';

const KEY = 'dudestar-p-song-notes'; // {chartId: [note]} — my own songs

// ---- my own songs (local) ----------------------------------------------------------

const subs = new Set();
let localCache = null;
function readLocal() {
  if (localCache) return localCache;
  try {
    localCache = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    localCache = {};
  }
  return localCache;
}
function writeLocal(all) {
  localCache = all;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* quota */
  }
  for (const fn of subs) fn();
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key == null || e.key.endsWith(KEY)) {
      localCache = null;
      for (const fn of subs) fn();
    }
  });
}

const newId = () => 'ln-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---- one API for both ----------------------------------------------------------------

/** The notes of one song, oldest first. band = the band's id or null. */
export function notesOf(chart, band) {
  if (band) return getChartCloud().notes.filter((n) => n.chart === chart).sort(byTime);
  return [...(readLocal()[chart] ?? [])].sort(byTime);
}
const byTime = (a, b) => (Date.parse(a.at) || 0) - (Date.parse(b.at) || 0);

/** Open (not done) notes per song — for the small count on a row. */
export function openCount(chart, band) {
  return notesOf(chart, band).filter((n) => !n.done).length;
}

/** Notes can be written here: a band song needs migration 008. */
export const notesReady = (band) => !band || (signedIn() && getChartCloud().notesOk);

export async function addNote(chart, band, { kind = 'note', body = '', data = null }) {
  if (band) return addBandNote(chart, band, { kind, body, data });
  const all = { ...readLocal() };
  const x = { id: newId(), chart, band: null, by: null, byName: '', kind, body: body.slice(0, 1000), data, done: false, at: new Date().toISOString() };
  all[chart] = [...(all[chart] ?? []), x];
  writeLocal(all);
  return x;
}

export async function updateNote(note, patch) {
  if (note.band) return updateBandNote(note.id, patch);
  const all = { ...readLocal() };
  const list = all[note.chart] ?? [];
  all[note.chart] = patch.deleted ? list.filter((n) => n.id !== note.id) : list.map((n) => (n.id === note.id ? { ...n, ...patch } : n));
  if (!all[note.chart].length) delete all[note.chart];
  writeLocal(all);
}

/** Re-renders when any song's notes change (band or mine). */
let version = 0;
const bump = () => {
  version += 1;
};
subs.add(bump);
subscribeChartCloud(bump);
function subscribe(fn) {
  subs.add(fn);
  const off = subscribeChartCloud(fn);
  return () => {
    subs.delete(fn);
    off();
  };
}
export function useNotesVersion() {
  return useSyncExternalStore(subscribe, () => version, () => version);
}

/** Can I delete this note? (mine, or I own the band) */
export function canDelete(note, band) {
  if (!note.band) return true;
  const uid = getLink()?.userId;
  return note.by === uid || (band && band.owner === uid);
}

// ---- changes logged by themselves --------------------------------------------------
// A song's key (tr), tempo (bpm) and length (dur) are changed with steppers —
// many taps. The taps of one go are gathered (4 s quiet) and logged ONCE, from
// the value before the first tap to the value after the last; a change that
// ends where it started is not logged.
const FIELDS = ['tr', 'bpm', 'dur'];
const pending = new Map(); // chart -> {from: {field: v}, to: {field: v}}
let timer = null;
onSheetPrefs((id, patch, prev) => {
  const touched = FIELDS.filter((f) => f in patch);
  if (!touched.length) return;
  const cur = pending.get(id) ?? { from: {}, to: {} };
  for (const f of touched) {
    if (!(f in cur.from)) cur.from[f] = prev?.[f] ?? null;
    cur.to[f] = patch[f] ?? null;
  }
  pending.set(id, cur);
  clearTimeout(timer);
  timer = setTimeout(flushChanges, 4000);
});

const norm = (f, v) => (v == null || v === '' ? (f === 'tr' ? 0 : null) : Number(v));

export async function flushChanges() {
  clearTimeout(timer);
  const all = [...pending.entries()];
  pending.clear();
  for (const [chart, { from, to }] of all) {
    const rec = await getSheet(chart);
    if (!rec) continue;
    const band = rec.band ?? null;
    if (band && !notesReady(band)) continue;
    for (const f of FIELDS) {
      if (!(f in to)) continue;
      const a = norm(f, from[f]);
      const b = norm(f, to[f]);
      if (a === b) continue;
      try {
        await addNote(chart, band, { kind: 'change', data: { field: f, from: a, to: b } });
      } catch {
        /* the change itself is saved; only its note is lost */
      }
    }
  }
}
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => pending.size && flushChanges());
