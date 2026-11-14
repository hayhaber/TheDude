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
import { deleteSheet, getSheet, listSheets, onSheetPrefs, patchSheet, putSheet, saveSheet, setSheetPrefs, sheetPrefs } from './sheetStore';

const BUCKET = 'charts';
const CACHE = (uid) => `dudestar-stage-cloud:${uid}`; // device

// ---- store -----------------------------------------------------------------

let state = { status: 'off', error: null, bands: [], setlists: [], lastSync: null };
const subs = new Set();
function set(patch) {
  state = { ...state, ...patch };
  for (const fn of subs) fn();
  const uid = getLink()?.userId;
  if (uid && (patch.bands || patch.setlists || patch.lastSync)) {
    try {
      localStorage.setItem(CACHE(uid), JSON.stringify({ bands: state.bands, setlists: state.setlists, lastSync: state.lastSync }));
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
    if (c) state = { ...state, bands: c.bands ?? [], setlists: c.setlists ?? [], lastSync: c.lastSync ?? null };
  } catch {
    /* none */
  }
}
restoreCache();

async function client() {
  const m = await loadCloud();
  return m.cloudClient();
}

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
    if (!rec?.blob) continue;
    const path = pathFor(uid, rec);
    const up = await sb.storage.from(BUCKET).upload(path, rec.blob, { upsert: true, contentType: 'application/pdf' });
    if (up.error) throw up.error;
    const p = local.sheetPrefs(rec.id);
    const { error } = await sb.from('charts').upsert({ id: rec.id, band_id: rec.band ?? null, name: rec.name, size: rec.size ?? null, path, dur: p.dur ?? null, tr: p.tr ?? null, deleted: false });
    if (error) throw error;
    await local.patchSheet(rec.id, { cloud: true, path });
  }

  // 2) every chart this user may see
  const { data: rows, error } = await sb.from('charts').select('id,band_id,name,size,path,dur,tr,deleted,updated_at');
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
      const dl = await sb.storage.from(BUCKET).download(r.path);
      if (dl.error || !dl.data) continue; // try again next time
      await local.putSheet({ id: r.id, name: r.name, size: r.size ?? dl.data.size, at: Date.parse(r.updated_at) || Date.now(), blob: dl.data, band: r.band_id ?? null, cloud: true, path: r.path });
    } else if (h.name !== r.name || (h.band ?? null) !== (r.band_id ?? null) || !h.cloud) {
      await local.patchSheet(r.id, { name: r.name, band: r.band_id ?? null, cloud: true, path: r.path });
    }
    const p = local.sheetPrefs(r.id);
    const patch = {};
    if (r.dur != null && r.dur !== p.dur) patch.dur = r.dur;
    if (r.tr != null && r.tr !== p.tr) patch.tr = r.tr;
    if (Object.keys(patch).length) local.setSheetPrefs(r.id, patch, { quiet: true });
  }
  // cloud charts nobody shows us any more (a band left / removed us)
  for (const m of now) if (m.cloud && !byId.has(m.id)) await local.deleteSheet(m.id);

  // 3) bands, members, band setlists
  const [b, mem, sl] = await Promise.all([
    sb.from('bands').select('id,name,owner,invite_code'),
    sb.from('band_members').select('band_id,user_id,display_name'),
    sb.from('band_setlists').select('id,band_id,name,items,deleted,updated_at'),
  ]);
  for (const x of [b, mem, sl]) if (x.error) throw x.error;
  const bands = b.data
    .map((band) => ({ id: band.id, name: band.name, owner: band.owner, code: band.invite_code, members: mem.data.filter((m) => m.band_id === band.id).map((m) => ({ id: m.user_id, name: m.display_name })) }))
    .sort((x, y) => x.name.localeCompare(y.name));
  const setlists = sl.data.filter((s) => !s.deleted).map((s) => ({ id: s.id, band: s.band_id, name: s.name, items: Array.isArray(s.items) ? s.items : [] }));
  return { bands, setlists };
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
let metaTimer = null;
onSheetPrefs((id, patch) => {
  if (!signedIn() || !('dur' in patch || 'tr' in patch)) return;
  pendingMeta.set(id, { ...(pendingMeta.get(id) ?? {}), ...patch });
  clearTimeout(metaTimer);
  metaTimer = setTimeout(async () => {
    const all = [...pendingMeta.entries()];
    pendingMeta.clear();
    try {
      const sb = await client();
      for (const [cid, p] of all) {
        const rec = await getSheet(cid);
        if (!rec?.cloud) continue;
        const row = {};
        if ('dur' in p) row.dur = p.dur;
        if ('tr' in p) row.tr = p.tr;
        await sb.from('charts').update(row).eq('id', cid);
      }
    } catch {
      /* next sync uploads nothing for meta — the local value stays */
    }
  }, 1500);
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

/** Give a band its own copy of one of my charts. */
export async function shareChart(id, band) {
  const rec = await getSheet(id);
  if (!rec?.blob) return null;
  const file = new File([rec.blob], `${rec.name}.pdf`, { type: 'application/pdf' });
  const [copy] = await addCharts([file], band);
  const p = sheetPrefs(id);
  if (copy && (p.dur || p.tr)) setSheetPrefs(copy, { dur: p.dur, tr: p.tr }, { quiet: true });
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
  const { error } = await sb.from('band_setlists').upsert({ id: list.id, band_id: list.band, name: list.name, items: list.items, deleted: !!list.deleted });
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
    dropSheet: (sheetId) => {
      for (const l of state.setlists.filter((x) => x.band === band && x.items.includes(sheetId))) put({ ...l, items: l.items.filter((x) => x !== sheetId) });
    },
  };
}
