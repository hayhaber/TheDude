// The Stage's charts in the cloud (v1.0.177): every chart of a signed-in
// user lives in Supabase too (table `charts` + Storage bucket "charts",
// supabase/migrations/002_stage_charts.sql), so it reaches all their
// devices; a BAND's charts and setlists reach all its members. IndexedDB
// (sheetStore) stays the working copy — the stage opens offline.
//
// sync():  1) upload local charts that aren't in the cloud yet,
//          2) read every chart row this user may see: download the new
//             ones, apply names / song length / key, drop deleted ones and
//             cloud charts that are no longer visible (a band left),
//          3) read the bands (+ members) and the bands' setlists.
// The state (bands, band setlists, status) is a small store for React,
// cached per user so the screen shows the last known bands offline.
import { getLink, loadCloud } from '../../cloud/cloudState';
import { deleteSheet, getSheet, listSheets, onSheetLyrics, onSheetPrefs, patchSheet, putSheet, saveSheet, saveTextSheet, setSheetLyrics, setSheetPrefs, sheetPrefs } from './sheetStore';

const BUCKET = 'charts';
const CACHE = (uid) => `dudestar-stage-cloud:${uid}`; // device

// ---- store -----------------------------------------------------------------

let state = { status: 'off', error: null, bands: [], setlists: [], suggestions: [], suggestReady: true, ready: [], readyOk: true, notes: [], notesOk: true, takes: [], takesOk: true, lastSync: null };
const subs = new Set();
function set(patch) {
  state = { ...state, ...patch };
  for (const fn of subs) fn();
  const uid = getLink()?.userId;
  if (uid && (patch.bands || patch.setlists || patch.suggestions || patch.ready || patch.notes || patch.takes || patch.lastSync)) {
    try {
      localStorage.setItem(CACHE(uid), JSON.stringify({ bands: state.bands, setlists: state.setlists, suggestions: state.suggestions, ready: state.ready, notes: state.notes, takes: state.takes, lastSync: state.lastSync }));
    } catch {
      /* quota */
    }
  }
}
export const getChartCloud = () => state;
export function subscribeChartCloud(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/** Signed in (this profile is linked to an account)? */
export const signedIn = () => !!getLink()?.userId;

function restoreCache() {
  const uid = getLink()?.userId;
  if (!uid) return;
  try {
    const c = JSON.parse(localStorage.getItem(CACHE(uid)));
    if (c) state = { ...state, bands: c.bands ?? [], setlists: c.setlists ?? [], suggestions: c.suggestions ?? [], ready: c.ready ?? [], notes: c.notes ?? [], takes: c.takes ?? [], lastSync: c.lastSync ?? null };
  } catch {
    /* none */
  }
}
restoreCache();

async function client() {
  const m = await loadCloud();
  return m.cloudClient();
}

// bpm / notes columns come with migration 003; until the user has run it the
// sync keeps working without them (a missing column = Postgres 42703).
let hasMeta = true;
const META = (p) => (hasMeta ? { bpm: p.bpm ?? null, notes: p.note ?? null } : {});
const missingColumn = (e) => e && (e.code === '42703' || e.code === 'PGRST204' || /column .*(bpm|notes)/i.test(e.message || ''));

// lyrics / start_note come with migration 004 (v1.0.206): before it, words-only
// songs stay on this device and the words don't travel.
let hasSong = true;
const SONG = (rec, p) => (hasSong ? { lyrics: rec.lyrics || null, start_note: p.start ?? null } : {});
const missingSongCol = (e) => e && (e.code === '42703' || e.code === 'PGRST204') && /lyrics|start_note/i.test(e.message || '');

// the listening link comes with migration 006 (v1.0.227); before it the link
// stays on this device / my own devices (sheet prefs sync with the profile).
let hasLink = true;
const LINK = (p) => (hasLink ? { link: p.link || null } : {});
const missingLinkCol = (e) => e && (e.code === '42703' || e.code === 'PGRST204') && /\blink\b/i.test(e.message || '');

// the pause between a band setlist's songs comes with migration 007 (v1.0.233)
let hasGap = true;
const missingGapCol = (e) => e && (e.code === '42703' || e.code === 'PGRST204') && /\bgap\b/i.test(e.message || '');

const missingTable = (e) => e && (e.code === '42P01' || e.code === 'PGRST205' || /band_suggestions|band_ready|song_notes|song_takes/i.test(e.message || '') && /does not exist|schema cache/i.test(e.message || ''));
const suggestionOf = (x) => ({
  id: x.id,
  band: x.band_id,
  title: x.title,
  artist: x.artist || '',
  link: x.link || '',
  note: x.note || '',
  status: x.status || 'open',
  song: x.song_id || null,
  votes: Array.isArray(x.votes) ? x.votes : [],
  by: x.by_user || null,
  byName: x.by_name || '',
  at: x.created_at || null,
});

const noteOf = (x) => ({
  id: x.id,
  band: x.band_id,
  chart: x.chart_id,
  by: x.by_user || null,
  byName: x.by_name || '',
  kind: x.kind || 'note',
  body: x.body || '',
  data: x.data || null,
  done: !!x.done,
  at: x.created_at || null,
});

const takeOf = (x) => ({
  id: x.id,
  band: x.band_id,
  chart: x.chart_id,
  by: x.by_user || null,
  byName: x.by_name || '',
  path: x.path,
  duration: x.duration ?? 0,
  peaks: Array.isArray(x.peaks) ? x.peaks : null,
  size: x.size ?? 0,
  at: Date.parse(x.created_at) || Date.now(),
});

const pathFor = (uid, rec) => (rec.band ? `b/${rec.band}/${rec.id}.pdf` : `u/${uid}/${rec.id}.pdf`);

// ---- sync (pure enough to test with a fake client) ----------------------------

/**
 * One full sync. `sb` = a Supabase client, `uid` = the user's id, `local` =
 * the sheetStore functions (injected for tests). Returns {bands, setlists}.
 */
export async function syncWith(sb, uid, local) {
  // 1) upload what only this device has
  const mine = await local.listSheets();
  for (const meta of mine.filter((m) => !m.cloud)) {
    const rec = await local.getSheet(meta.id);
    if (!rec) continue;
    // a words-only song has no file; it needs migration 004's columns
    if (!rec.blob && !hasSong) continue;
    const path = rec.blob ? pathFor(uid, rec) : '';
    if (rec.blob) {
      const up = await sb.storage.from(BUCKET).upload(path, rec.blob, { upsert: true, contentType: 'application/pdf' });
      if (up.error) throw up.error;
    }
    const p = local.sheetPrefs(rec.id);
    const row = { id: rec.id, band_id: rec.band ?? null, name: rec.name, size: rec.size ?? null, path, dur: p.dur ?? null, tr: p.tr ?? null, deleted: false };
    let { error } = await sb.from('charts').upsert({ ...row, ...META(p), ...SONG(rec, p), ...LINK(p) });
    if (error && hasLink && missingLinkCol(error)) {
      hasLink = false;
      ({ error } = await sb.from('charts').upsert({ ...row, ...META(p), ...SONG(rec, p) }));
    }
    if (error && hasSong && missingSongCol(error)) {
      hasSong = false;
      if (!rec.blob) continue;
      ({ error } = await sb.from('charts').upsert({ ...row, ...META(p) }));
    }
    if (error && hasMeta && missingColumn(error)) {
      hasMeta = false;
      ({ error } = await sb.from('charts').upsert({ ...row, ...SONG(rec, p) }));
    }
    if (error) throw error;
    await local.patchSheet(rec.id, { cloud: true, path });
  }

  // 2) every chart this user may see
  const cols = 'id,band_id,name,size,path,dur,tr,deleted,updated_at';
  const pick = () => cols + (hasMeta ? ',bpm,notes' : '') + (hasSong ? ',lyrics,start_note' : '') + (hasLink ? ',link' : '');
  let { data: rows, error } = await sb.from('charts').select(pick());
  if (error && hasLink && missingLinkCol(error)) {
    hasLink = false;
    ({ data: rows, error } = await sb.from('charts').select(pick()));
  }
  if (error && hasSong && missingSongCol(error)) {
    hasSong = false;
    ({ data: rows, error } = await sb.from('charts').select(pick()));
  }
  if (error && hasMeta && missingColumn(error)) {
    hasMeta = false;
    ({ data: rows, error } = await sb.from('charts').select(pick()));
  }
  if (error) throw error;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const now = await local.listSheets();
  const have = new Map(now.map((m) => [m.id, m]));
  for (const r of rows) {
    const h = have.get(r.id);
    if (r.deleted) {
      if (h) await local.deleteSheet(r.id);
      continue;
    }
    if (!h) {
      const base = { id: r.id, name: r.name, at: Date.parse(r.updated_at) || Date.now(), band: r.band_id ?? null, cloud: true, path: r.path, lyrics: r.lyrics ?? '' };
      if (!r.path) {
        await local.putSheet({ ...base, size: 0 }); // words only
      } else {
        const dl = await sb.storage.from(BUCKET).download(r.path);
        if (dl.error || !dl.data) continue; // try again next time
        await local.putSheet({ ...base, size: r.size ?? dl.data.size, blob: dl.data });
      }
    } else {
      const patch = {};
      if (h.name !== r.name || (h.band ?? null) !== (r.band_id ?? null) || !h.cloud) Object.assign(patch, { name: r.name, band: r.band_id ?? null, cloud: true, path: r.path });
      if (hasSong && 'lyrics' in r && (r.lyrics ?? '') !== (h.lyrics ?? '') && !pendingLyrics.has(r.id)) patch.lyrics = r.lyrics ?? '';
      if (Object.keys(patch).length) await local.patchSheet(r.id, patch);
    }
    const p = local.sheetPrefs(r.id);
    const patch = {};
    if (r.dur != null && r.dur !== p.dur) patch.dur = r.dur;
    if (r.tr != null && r.tr !== p.tr) patch.tr = r.tr;
    if (r.bpm != null && r.bpm !== p.bpm) patch.bpm = r.bpm;
    if (r.notes != null && r.notes !== (p.note ?? '')) patch.note = r.notes;
    if (r.start_note != null && r.start_note !== p.start) patch.start = r.start_note;
    if (hasLink && 'link' in r && (r.link ?? '') !== (p.link ?? '') && !pendingMeta.has(r.id) && !sendingLink.has(r.id)) patch.link = r.link ?? '';
    if (Object.keys(patch).length) local.setSheetPrefs(r.id, patch, { quiet: true });
  }
  // cloud charts nobody shows us any more (a band left / removed us)
  for (const m of now) if (m.cloud && !byId.has(m.id)) await local.deleteSheet(m.id);

  // 3) bands, members, band setlists
  const [b, mem, sl] = await Promise.all([
    sb.from('bands').select('id,name,owner,invite_code'),
    sb.from('band_members').select('band_id,user_id,display_name'),
    sb.from('band_setlists').select('id,band_id,name,items,deleted,updated_at' + (hasGap ? ',gap' : '')),
  ]);
  let sets = sl;
  if (sets.error && hasGap && missingGapCol(sets.error)) {
    hasGap = false;
    sets = await sb.from('band_setlists').select('id,band_id,name,items,deleted,updated_at');
  }
  for (const x of [b, mem, sets]) if (x.error) throw x.error;
  const bands = b.data
    .map((band) => ({ id: band.id, name: band.name, owner: band.owner, code: band.invite_code, members: mem.data.filter((m) => m.band_id === band.id).map((m) => ({ id: m.user_id, name: m.display_name })) }))
    .sort((x, y) => x.name.localeCompare(y.name));
  const setlists = sets.data.filter((s) => !s.deleted).map((s) => ({ id: s.id, band: s.band_id, name: s.name, items: Array.isArray(s.items) ? s.items : [], gap: s.gap ?? 0 }));

  // 4) the bands' song suggestions (migration 005; before it: not ready)
  const sg = await sb.from('band_suggestions').select('id,band_id,title,artist,link,note,status,song_id,votes,by_user,by_name,deleted,created_at');
  if (sg.error && !missingTable(sg.error)) throw sg.error;
  const suggestions = sg.error ? null : sg.data.filter((x) => !x.deleted).map(suggestionOf);

  // 5) who is ready for which band song (migration 007; before it: not ready)
  const rd = await sb.from('band_ready').select('chart_id,user_id,band_id,state');
  if (rd.error && !missingTable(rd.error)) throw rd.error;
  const ready = rd.error ? [] : rd.data.map((x) => ({ chart: x.chart_id, user: x.user_id, band: x.band_id, state: x.state }));
  // 6) rehearsal notes on band songs (migration 008; before it: not ready)
  const sn = await sb.from('song_notes').select('id,band_id,chart_id,by_user,by_name,kind,body,data,done,deleted,created_at');
  if (sn.error && !missingTable(sn.error)) throw sn.error;
  const notes = sn.error ? [] : sn.data.filter((x) => !x.deleted).map(noteOf);
  // 7) the band songs' rehearsal recordings (migration 009; before it: not ready)
  const tk = await sb.from('song_takes').select('id,band_id,chart_id,by_user,by_name,path,duration,peaks,size,deleted,created_at');
  if (tk.error && !missingTable(tk.error)) throw tk.error;
  const takes = tk.error ? [] : tk.data.filter((x) => !x.deleted).map(takeOf);
  return { bands, setlists, suggestions: suggestions ?? [], suggestReady: !sg.error, ready, readyOk: !rd.error, notes, notesOk: !sn.error, takes, takesOk: !tk.error };
}

const LOCAL = { listSheets, getSheet, patchSheet, putSheet, deleteSheet, sheetPrefs, setSheetPrefs };

let running = null;
export function syncCharts() {
  if (!signedIn()) {
    set({ status: 'off' });
    return Promise.resolve();
  }
  if (running) return running;
  set({ status: 'syncing', error: null });
  running = (async () => {
    try {
      const sb = await client();
      const out = await syncWith(sb, getLink().userId, LOCAL);
      set({ ...out, status: 'idle', lastSync: new Date().toISOString() });
    } catch (e) {
      set({ status: navigator.onLine === false ? 'offline' : 'error', error: e?.message || String(e) });
    } finally {
      running = null;
    }
  })();
  return running;
}

// A chart's song length / key changed (the Performer): send it, so the band
// and my other devices get it.
const pendingMeta = new Map();
const sendingLink = new Set();
let metaTimer = null;
onSheetPrefs((id, patch) => {
  if (!signedIn() || !('dur' in patch || 'tr' in patch || 'bpm' in patch || 'note' in patch || 'start' in patch || 'link' in patch)) return;
  pendingMeta.set(id, { ...(pendingMeta.get(id) ?? {}), ...patch });
  clearTimeout(metaTimer);
  metaTimer = setTimeout(async () => {
    const all = [...pendingMeta.entries()];
    pendingMeta.clear();
    for (const [cid, p] of all) if ('link' in p) sendingLink.add(cid);
    try {
      const sb = await client();
      for (const [cid, p] of all) {
        const rec = await getSheet(cid);
        if (!rec?.cloud) continue;
        const row = {};
        if ('dur' in p) row.dur = p.dur;
        if ('tr' in p) row.tr = p.tr;
        if (hasMeta && 'bpm' in p) row.bpm = p.bpm ?? null;
        if (hasMeta && 'note' in p) row.notes = p.note || null;
        if (hasSong && 'start' in p) row.start_note = p.start ?? null;
        if (hasLink && 'link' in p) row.link = p.link || null;
        if (!Object.keys(row).length) continue;
        let { error } = await sb.from('charts').update(row).eq('id', cid);
        if (error && missingLinkCol(error)) {
          hasLink = false;
          delete row.link;
          if (!Object.keys(row).length) continue;
          ({ error } = await sb.from('charts').update(row).eq('id', cid));
        }
        if (error && missingSongCol(error)) {
          hasSong = false;
          delete row.start_note;
          if (Object.keys(row).length) await sb.from('charts').update(row).eq('id', cid);
        } else if (error && missingColumn(error)) {
          hasMeta = false;
          delete row.bpm;
          delete row.notes;
          if (Object.keys(row).length) await sb.from('charts').update(row).eq('id', cid);
        }
      }
    } catch {
      /* next sync uploads nothing for meta — the local value stays */
    }
    for (const [cid] of all) sendingLink.delete(cid);
  }, 1500);
});

// A song's words changed: send them (a words-only song that isn't in the
// cloud yet goes up with the next sync).
const pendingLyrics = new Set();
let lyricTimer = null;
onSheetLyrics((id) => {
  if (!signedIn()) return;
  pendingLyrics.add(id);
  clearTimeout(lyricTimer);
  lyricTimer = setTimeout(async () => {
    const ids = [...pendingLyrics];
    try {
      const sb = await client();
      for (const cid of ids) {
        const rec = await getSheet(cid);
        if (!rec) continue;
        if (!rec.cloud) continue;
        if (!hasSong) continue;
        const { error } = await sb.from('charts').update({ lyrics: rec.lyrics || null }).eq('id', cid);
        if (error && missingSongCol(error)) hasSong = false;
      }
    } catch {
      /* the local copy stays; the next edit sends again */
    }
    ids.forEach((x) => pendingLyrics.delete(x));
    syncCharts();
  }, 1200);
});

// ---- chart actions --------------------------------------------------------------

/** Add PDFs (to my charts, or a band's) and send them up. */
export async function addCharts(files, band = null) {
  const ids = [];
  for (const f of files) {
    try {
      ids.push((await saveSheet(f, { band })).id);
    } catch {
      /* storage full */
    }
  }
  if (signedIn()) syncCharts();
  return ids;
}

/** Delete everywhere (my devices / the band) — or just here when signed out. */
export async function removeChart(id) {
  const rec = await getSheet(id);
  if (rec?.cloud && signedIn()) {
    const sb = await client();
    const { error } = await sb.from('charts').update({ deleted: true }).eq('id', id);
    if (error) throw error;
    if (rec.path) await sb.storage.from(BUCKET).remove([rec.path]);
  }
  await deleteSheet(id);
}

export async function renameChart(id, name) {
  const rec = await getSheet(id);
  if (!rec || !name?.trim()) return;
  await patchSheet(id, { name: name.trim() });
  if (rec.cloud && signedIn()) {
    const sb = await client();
    const { error } = await sb.from('charts').update({ name: name.trim() }).eq('id', id);
    if (error) throw error;
  }
}

/** A new song with words only (v1.0.206), to my songs or a band's. */
export async function addTextSong({ name, lyrics, band = null, start = null, link = null }) {
  const rec = await saveTextSheet({ name, lyrics, band });
  if (start != null || link) setSheetPrefs(rec.id, { ...(start != null ? { start } : {}), ...(link ? { link } : {}) }, { quiet: true });
  if (signedIn()) syncCharts();
  return rec.id;
}

/** Give a band its own copy of one of my charts / songs. */
export async function shareChart(id, band) {
  const rec = await getSheet(id);
  if (!rec) return null;
  let copy;
  if (rec.blob) {
    const file = new File([rec.blob], `${rec.name}.pdf`, { type: 'application/pdf' });
    [copy] = await addCharts([file], band);
    if (copy && rec.lyrics) await setSheetLyrics(copy, rec.lyrics);
  } else {
    copy = (await saveTextSheet({ name: rec.name, lyrics: rec.lyrics, band })).id;
  }
  const p = sheetPrefs(id);
  if (copy && (p.dur || p.tr || p.bpm || p.note || p.start != null || p.link)) setSheetPrefs(copy, { dur: p.dur, tr: p.tr, bpm: p.bpm, note: p.note, start: p.start, link: p.link }, { quiet: true });
  if (signedIn()) syncCharts();
  return copy;
}

// ---- bands ------------------------------------------------------------------------

function myName() {
  try {
    const n = localStorage.getItem('dudestar-p-profile-name');
    if (n && n.trim()) return n.trim().slice(0, 60);
  } catch {
    /* ignore */
  }
  return (getLink()?.email || '').split('@')[0].slice(0, 60) || null;
}

async function rpc(name, args) {
  const sb = await client();
  const { data, error } = await sb.rpc(name, args);
  if (error) throw error;
  return data;
}

export async function createBand(name) {
  const b = await rpc('create_band', { band_name: name, member_name: myName() });
  await syncCharts();
  return b;
}

/** Join with an invite code. Throws {code:'P0002'} for a wrong code. */
export async function joinBand(code) {
  const b = await rpc('join_band', { code, member_name: myName() });
  await syncCharts();
  return b;
}

export async function leaveBand(id) {
  await rpc('leave_band', { b: id });
  await syncCharts();
}

export async function newInviteCode(id) {
  const code = await rpc('new_invite_code', { b: id });
  set({ bands: state.bands.map((b) => (b.id === id ? { ...b, code } : b)) });
  return code;
}

export async function renameBand(id, name) {
  const sb = await client();
  const { error } = await sb.from('bands').update({ name }).eq('id', id);
  if (error) throw error;
  set({ bands: state.bands.map((b) => (b.id === id ? { ...b, name } : b)) });
}

export async function removeMember(band, user) {
  const sb = await client();
  const { error } = await sb.from('band_members').delete().eq('band_id', band).eq('user_id', user);
  if (error) throw error;
  set({ bands: state.bands.map((b) => (b.id === band ? { ...b, members: b.members.filter((m) => m.id !== user) } : b)) });
}

/** The owner deletes the band: its files, then the band (rows cascade). */
export async function deleteBand(id) {
  const sb = await client();
  const { data: files } = await sb.storage.from(BUCKET).list(`b/${id}`, { limit: 1000 });
  if (files?.length) await sb.storage.from(BUCKET).remove(files.map((f) => `b/${id}/${f.name}`));
  const { error } = await sb.from('bands').delete().eq('id', id);
  if (error) throw error;
  await syncCharts();
}

// ---- band setlists (optimistic: shown at once, sent right after) --------------------

function newId() {
  return 'set-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function saveSetlist(list) {
  const sb = await client();
  const row = { id: list.id, band_id: list.band, name: list.name, items: list.items, deleted: !!list.deleted };
  if (hasGap) row.gap = list.gap || 0;
  let { error } = await sb.from('band_setlists').upsert(row);
  if (error && hasGap && missingGapCol(error)) {
    hasGap = false;
    delete row.gap;
    ({ error } = await sb.from('band_setlists').upsert(row));
  }
  if (error) {
    set({ error: error.message });
    syncCharts(); // back to what the band really has
  }
}

export function bandSetlistApi(band) {
  const lists = state.setlists.filter((l) => l.band === band);
  const put = (list) => {
    set({ setlists: [...state.setlists.filter((l) => l.id !== list.id), ...(list.deleted ? [] : [list])] });
    saveSetlist(list);
  };
  const find = (id) => state.setlists.find((l) => l.id === id);
  return {
    lists,
    create: (name) => {
      const list = { id: newId(), band, name, items: [] };
      put(list);
      return list;
    },
    rename: (id, name) => find(id) && put({ ...find(id), name }),
    remove: (id) => find(id) && put({ ...find(id), deleted: true }),
    setItems: (id, items) => find(id) && put({ ...find(id), items }),
    setGap: (id, gap) => find(id) && put({ ...find(id), gap }),
    dropSheet: (sheetId) => {
      for (const l of state.setlists.filter((x) => x.band === band && x.items.includes(sheetId))) put({ ...l, items: l.items.filter((x) => x !== sheetId) });
    },
  };
}

// ---- a band's song suggestions (v1.0.212; migration 005) -----------------------
// Building a cover band's repertoire: every member suggests songs, the band
// sees one list, votes (one per member), and picks the songs to rehearse.
// Optimistic like the setlists: shown at once, sent right after; a refused
// write re-syncs to what the band really has.

function sid() {
  return 'sg-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function putLocal(x) {
  set({ suggestions: [...state.suggestions.filter((s) => s.id !== x.id), ...(x.deleted ? [] : [x])] });
}
async function sent(p) {
  try {
    const { error } = await p;
    if (error) throw error;
  } catch (e) {
    set({ error: e?.message || String(e) });
    syncCharts();
    throw e;
  }
}

export async function addSuggestion(band, { title, artist = '', link = '', note = '' }) {
  const uid = getLink()?.userId;
  const x = { id: sid(), band, title: title.trim().slice(0, 120), artist: artist.trim().slice(0, 120), link: link.trim().slice(0, 500), note: note.trim().slice(0, 500), status: 'open', song: null, votes: uid ? [uid] : [], by: uid, byName: myName() || '', at: new Date().toISOString() };
  putLocal(x);
  const sb = await client();
  await sent(sb.from('band_suggestions').insert({ id: x.id, band_id: band, title: x.title, artist: x.artist || null, link: x.link || null, note: x.note || null, by_name: x.byName || null }));
  return x;
}

/** Change title / artist / link / note / status / song (who suggested it and the votes stay). */
export async function updateSuggestion(id, patch) {
  const cur = state.suggestions.find((s) => s.id === id);
  if (!cur) return;
  putLocal({ ...cur, ...patch });
  const row = {};
  if ('title' in patch) row.title = patch.title.trim().slice(0, 120);
  if ('artist' in patch) row.artist = patch.artist.trim() || null;
  if ('link' in patch) row.link = patch.link.trim() || null;
  if ('note' in patch) row.note = patch.note.trim() || null;
  if ('status' in patch) row.status = patch.status;
  if ('song' in patch) row.song_id = patch.song;
  const sb = await client();
  await sent(sb.from('band_suggestions').update(row).eq('id', id));
}

export async function removeSuggestion(id) {
  const cur = state.suggestions.find((s) => s.id === id);
  if (!cur) return;
  putLocal({ ...cur, deleted: true });
  const sb = await client();
  await sent(sb.from('band_suggestions').update({ deleted: true }).eq('id', id));
}

export async function voteSuggestion(id) {
  const uid = getLink()?.userId;
  const cur = state.suggestions.find((s) => s.id === id);
  if (!cur || !uid) return;
  putLocal({ ...cur, votes: cur.votes.includes(uid) ? cur.votes.filter((v) => v !== uid) : [...cur.votes, uid] });
  try {
    const votes = await rpc('toggle_suggestion_vote', { s: id });
    const now = state.suggestions.find((s) => s.id === id);
    if (now && Array.isArray(votes)) putLocal({ ...now, votes });
  } catch (e) {
    set({ error: e?.message || String(e) });
    syncCharts();
  }
}

// ---- who is ready for a band song (v1.0.233; migration 007) ---------------------
// One mark per member per song: know | learning | not (null = clear mine).
// Optimistic like the rest; a refused write re-syncs.
export async function setReady(chart, band, value) {
  const uid = getLink()?.userId;
  if (!uid) return;
  const others = state.ready.filter((r) => !(r.chart === chart && r.user === uid));
  set({ ready: value ? [...others, { chart, user: uid, band, state: value }] : others });
  const sb = await client();
  if (value) await sent(sb.from('band_ready').upsert({ chart_id: chart, band_id: band, state: value }, { onConflict: 'chart_id,user_id' }));
  else await sent(sb.from('band_ready').delete().eq('chart_id', chart).eq('user_id', uid));
}

// ---- rehearsal notes on a band song (v1.0.244; migration 008) --------------------
// Anyone in the band writes a note on a song, marks a note done; a change of
// key / tempo / length is logged there by itself (songNotes.js). Optimistic
// like the rest; a refused write re-syncs.
function putNote(x) {
  set({ notes: [...state.notes.filter((n) => n.id !== x.id), ...(x.deleted ? [] : [x])] });
}

export async function addBandNote(chart, band, { kind = 'note', body = '', data = null }) {
  const x = { id: 'sn-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), band, chart, by: getLink()?.userId ?? null, byName: myName() || '', kind, body: body.slice(0, 1000), data, done: false, at: new Date().toISOString() };
  putNote(x);
  const sb = await client();
  await sent(sb.from('song_notes').insert({ id: x.id, band_id: band, chart_id: chart, by_name: x.byName || null, kind, body: x.body || null, data }));
  return x;
}

export async function updateBandNote(id, patch) {
  const cur = state.notes.find((n) => n.id === id);
  if (!cur) return;
  putNote({ ...cur, ...patch });
  const row = {};
  if ('done' in patch) row.done = !!patch.done;
  if ('body' in patch) row.body = patch.body.slice(0, 1000) || null;
  if ('deleted' in patch) row.deleted = !!patch.deleted;
  const sb = await client();
  await sent(sb.from('song_notes').update(row).eq('id', id));
}

// ---- a band song's rehearsal recordings (v1.0.245; migration 009) ---------------
// The audio goes to the private bucket "takes" (b/<band>/<song>/<take>.mp3),
// a row to song_takes; every member lists and plays them.
const TAKES = 'takes';

/** Send one take up. rec = {id, song, at, duration, peaks, blob}. */
export async function uploadBandTake(rec, band) {
  if (!signedIn() || !state.takesOk) return false;
  const sb = await client();
  const ext = rec.blob.type === 'audio/mpeg' ? 'mp3' : 'wav';
  const path = `b/${band}/${rec.song}/${rec.id}.${ext}`;
  const up = await sb.storage.from(TAKES).upload(path, rec.blob, { upsert: true, contentType: rec.blob.type || 'audio/mpeg' });
  if (up.error) {
    if (/bucket not found/i.test(up.error.message || '')) set({ takesOk: false });
    throw up.error;
  }
  const row = { id: rec.id, band_id: band, chart_id: rec.song, by_name: myName() || null, path, duration: Math.round(rec.duration * 10) / 10, peaks: rec.peaks ?? null, size: rec.blob.size };
  const { error } = await sb.from('song_takes').upsert(row);
  if (error) {
    if (missingTable(error)) set({ takesOk: false });
    throw error;
  }
  const x = takeOf({ ...row, by_user: getLink()?.userId ?? null, created_at: new Date(rec.at).toISOString() });
  set({ takes: [...state.takes.filter((t) => t.id !== x.id), x] });
  return true;
}

export async function downloadBandTake(path) {
  const sb = await client();
  const { data, error } = await sb.storage.from(TAKES).download(path);
  if (error || !data) throw error || new Error('no file');
  return data;
}

export async function deleteBandTake(take) {
  set({ takes: state.takes.filter((t) => t.id !== take.id) });
  const sb = await client();
  await sent(sb.from('song_takes').update({ deleted: true }).eq('id', take.id));
  await sb.storage.from(TAKES).remove([take.path]).catch(() => {});
}
