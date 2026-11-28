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

let state = { status: 'off', error: null, bands: [], setlists: [], suggestions: [], suggestReady: true, ready: [], readyOk: true, notes: [], notesOk: true, takes: [], takesOk: true, myTakesOk: null, ledger: [], kitties: [], kittyOk: true, lastSync: null };
const subs = new Set();
function set(patch) {
  state = { ...state, ...patch };
  for (const fn of subs) fn();
  const uid = getLink()?.userId;
  if (uid && (patch.bands || patch.setlists || patch.suggestions || patch.ready || patch.notes || patch.takes || patch.lastSync)) {
    try {
      localStorage.setItem(CACHE(uid), JSON.stringify({ bands: state.bands, setlists: state.setlists, suggestions: state.suggestions, ready: state.ready, notes: state.notes, takes: state.takes, ledger: state.ledger, kitties: state.kitties, lastSync: state.lastSync }));
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
    if (c) state = { ...state, bands: c.bands ?? [], setlists: c.setlists ?? [], suggestions: c.suggestions ?? [], ready: c.ready ?? [], notes: c.notes ?? [], takes: c.takes ?? [], ledger: c.ledger ?? [], kitties: c.kitties ?? [], lastSync: c.lastSync ?? null };
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
// the lyrics timing (v1.0.260) comes with migration 013 — its own column, its
// own queries, so nothing else waits for it
let hasSync = true;
const missingSyncCol = (e) => e && (e.code === '42703' || e.code === 'PGRST204' || e.code === '42P01') && /\bsync\b/i.test(e.message || '');
// '' on the server = cleared on purpose; null = never sent (e.g. a timing
// saved before migration 013 ran) -> this device uploads its own
const syncText = (v) => (v ? JSON.stringify(v).slice(0, 20000) : '');
const sendingSync = new Set();
let hasLink = true;
const LINK = (p) => (hasLink ? { link: p.link || null } : {});
const missingLinkCol = (e) => e && (e.code === '42703' || e.code === 'PGRST204') && /\blink\b/i.test(e.message || '');

// the pause between a band setlist's songs comes with migration 007 (v1.0.233)
let hasGap = true;
const missingGapCol = (e) => e && (e.code === '42703' || e.code === 'PGRST204') && /\bgap\b/i.test(e.message || '');

// each member's avatar (colour / emoji) comes with migration 010 (v1.0.247)
let hasAvatar = true;
const missingAvatarCol = (e) => e && (e.code === '42703' || e.code === 'PGRST204') && /\bavatar\b/i.test(e.message || '');
// each member's part in the band (vocals, guitar…) comes with migration 011 (v1.0.249)
let hasRole = true;
const missingRoleCol = (e) => e && (e.code === '42703' || e.code === 'PGRST204') && /\brole\b/i.test(e.message || '');
// A member's parts (v1.0.249; v1.0.279 = more parts + the member's own words):
// the base list always shows; EXTRA_ROLES are offered under "Add Part";
// a part in your own words is stored as "~Words" (no commas).
export const MEMBER_ROLES = ['vocals', 'guitar', 'bass', 'drums', 'keys'];
export const EXTRA_ROLES = ['backing', 'lead', 'acoustic', 'percussion', 'sax', 'trumpet', 'trombone', 'winds', 'violin', 'cello', 'flute', 'harmonica', 'accordion', 'ukulele', 'mandolin', 'dj', 'sound', 'other'];
const KNOWN_ROLES = [...MEMBER_ROLES, ...EXTRA_ROLES];
export const customRole = (text) => {
  const v = String(text ?? '').replace(/[,~]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 30);
  return v ? '~' + v : null;
};
const okRole = (r) => KNOWN_ROLES.includes(r) || (typeof r === 'string' && r.length > 1 && r.length <= 31 && r[0] === '~' && !r.includes(','));
/** Clean, no repeats (a custom part in any case once), at most 300 chars. */
export function cleanRoles(roles) {
  const out = [];
  const seen = new Set();
  for (const r of roles ?? []) {
    if (!okRole(r)) continue;
    const k = r.toLowerCase();
    if (seen.has(k)) continue;
    if ([...out, r].join(',').length > 300) break;
    seen.add(k);
    out.push(r);
  }
  return out;
}
const rolesOf = (text) => (text ? cleanRoles(String(text).split(',')) : []);
export const rolesReady = () => hasRole;

function myAvatar() {
  try {
    const v = localStorage.getItem('dudestar-p-profile-avatar');
    if (!v) return null;
    const a = JSON.parse(v);
    return a && typeof a === 'object' ? JSON.stringify(a).slice(0, 300) : null;
  } catch {
    return null;
  }
}
function avatarOf(text) {
  if (!text) return null;
  try {
    const a = JSON.parse(text);
    return a && typeof a === 'object' ? a : null;
  } catch {
    return null;
  }
}

const missingTable = (e) => e && (e.code === '42P01' || e.code === 'PGRST205' || /band_suggestions|band_ready|song_notes|song_takes|band_ledger|band_kitty/i.test(e.message || '') && /does not exist|schema cache/i.test(e.message || ''));
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

const ledgerOf = (x) => ({
  id: x.id,
  band: x.band_id,
  kind: x.kind,
  amount: x.amount,
  member: x.member || null,
  round: x.round_id || null,
  note: x.note || '',
  who: Array.isArray(x.who) && x.who.length ? x.who : null,
  at: x.at,
  by: x.by_user || null,
  byName: x.by_name || '',
  deleted: !!x.deleted,
  created: Date.parse(x.created_at) || 0,
});

// a replaced chart (v1.0.285) gets a new file name, so the other devices
// see the path change and download the new one
const pathFor = (uid, rec) => {
  const file = rec.ver ? `${rec.id}.${rec.ver}.pdf` : `${rec.id}.pdf`;
  return rec.band ? `b/${rec.band}/${file}` : `u/${uid}/${file}`;
};

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
    if (hasSync && p.sync) {
      const r2 = await sb.from('charts').update({ sync: syncText(p.sync) }).eq('id', rec.id);
      if (r2.error && missingSyncCol(r2.error)) hasSync = false;
    }
    // the file a replaced chart had before (best effort)
    if (rec.oldPath && rec.oldPath !== path) await sb.storage.from(BUCKET).remove([rec.oldPath]).catch(() => {});
    await local.patchSheet(rec.id, { cloud: true, path, oldPath: null });
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
      // a words-only song here that got its chart on another device
      // …or whose chart was replaced there (a new file name)
      if (r.path && (!h.pdf || (h.path && h.path !== r.path && h.cloud))) {
        const dl = await sb.storage.from(BUCKET).download(r.path);
        if (!dl.error && dl.data) Object.assign(patch, { blob: dl.data, size: r.size ?? dl.data.size, path: r.path });
      }
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
  // the lyrics timings (shared with the band)
  if (hasSync) {
    const sy = await sb.from('charts').select('id,sync');
    if (sy.error) {
      if (missingSyncCol(sy.error)) hasSync = false;
    } else
      for (const r of sy.data || []) {
        if (!have.has(r.id) && !byId.has(r.id)) continue;
        if (pendingMeta.has(r.id) || sendingSync.has(r.id)) continue;
        const own = local.sheetPrefs(r.id).sync;
        const mine = syncText(own);
        if (r.sync == null) {
          // never sent: upload this device's timing, don't erase it
          if (own) {
            const up = await sb.from('charts').update({ sync: mine }).eq('id', r.id);
            if (up.error && missingSyncCol(up.error)) hasSync = false;
          }
          continue;
        }
        if (r.sync === mine) continue;
        let v = null;
        try {
          v = r.sync ? JSON.parse(r.sync) : null;
        } catch {
          continue;
        }
        local.setSheetPrefs(r.id, { sync: v }, { quiet: true });
      }
  }
  // cloud charts nobody shows us any more (a band left / removed us)
  for (const m of now) if (m.cloud && !byId.has(m.id)) await local.deleteSheet(m.id);

  // 3) bands, members, band setlists
  const memberCols = () => 'band_id,user_id,display_name' + (hasAvatar ? ',avatar' : '') + (hasRole ? ',role' : '');
  const [b, mem, sl] = await Promise.all([
    sb.from('bands').select('id,name,owner,invite_code'),
    sb.from('band_members').select(memberCols()),
    sb.from('band_setlists').select('id,band_id,name,items,deleted,updated_at' + (hasGap ? ',gap' : '')),
  ]);
  let members = mem;
  for (let i = 0; i < 2 && members.error; i += 1) {
    if (hasRole && missingRoleCol(members.error)) hasRole = false;
    else if (hasAvatar && missingAvatarCol(members.error)) hasAvatar = false;
    else break;
    members = await sb.from('band_members').select(memberCols());
  }
  // my own rows carry my CURRENT name + avatar, so the band sees them (v1.0.247)
  if (!members.error && uid) {
    const name = myName();
    const av = myAvatar();
    const mine = members.data.filter((m) => m.user_id === uid);
    const stale = mine.some((m) => (name && m.display_name !== name) || (hasAvatar && (m.avatar ?? null) !== av));
    if (stale) {
      const patch = { ...(name ? { display_name: name } : {}), ...(hasAvatar ? { avatar: av } : {}) };
      const up = await sb.from('band_members').update(patch).eq('user_id', uid);
      if (!up.error) for (const m of mine) Object.assign(m, patch);
    }
  }
  let sets = sl;
  if (sets.error && hasGap && missingGapCol(sets.error)) {
    hasGap = false;
    sets = await sb.from('band_setlists').select('id,band_id,name,items,deleted,updated_at');
  }
  for (const x of [b, members, sets]) if (x.error) throw x.error;
  const bands = b.data
    .map((band) => ({ id: band.id, name: band.name, owner: band.owner, code: band.invite_code, members: members.data.filter((m) => m.band_id === band.id).map((m) => ({ id: m.user_id, name: m.display_name, avatar: avatarOf(m.avatar), roles: rolesOf(m.role) })) }))
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
  // takes of my own songs in the cloud need 018 (the server says its version)
  const ver = await sb.rpc('dudestar_schema');
  const myTakesOk = !ver.error && Number(ver.data) >= 18;
  // 8) the bands' kitty (migration 012; before it: not ready)
  const [lg, kt] = await Promise.all([
    sb.from('band_ledger').select('id,band_id,kind,amount,member,round_id,note,who,at,by_user,by_name,deleted,created_at'),
    sb.from('band_kitty').select('band_id,treasurer,currency'),
  ]);
  if (lg.error && !missingTable(lg.error)) throw lg.error;
  const ledger = lg.error ? [] : lg.data.map(ledgerOf);
  const kitties = kt.error ? [] : kt.data.map((x) => ({ band: x.band_id, treasurer: x.treasurer || null, currency: x.currency || 'ILS' }));
  return { bands, setlists, suggestions: suggestions ?? [], suggestReady: !sg.error, ready, readyOk: !rd.error, notes, notesOk: !sn.error, takes, takesOk: !tk.error, myTakesOk, ledger, kitties, kittyOk: !lg.error };
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
  if (!signedIn() || !('dur' in patch || 'tr' in patch || 'bpm' in patch || 'note' in patch || 'start' in patch || 'link' in patch || 'sync' in patch)) return;
  pendingMeta.set(id, { ...(pendingMeta.get(id) ?? {}), ...patch });
  clearTimeout(metaTimer);
  metaTimer = setTimeout(async () => {
    const all = [...pendingMeta.entries()];
    pendingMeta.clear();
    for (const [cid, p] of all) {
      if ('link' in p) sendingLink.add(cid);
      if ('sync' in p) sendingSync.add(cid);
    }
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
        if (hasSync && 'sync' in p) {
          const r2 = await sb.from('charts').update({ sync: syncText(p.sync) }).eq('id', cid);
          if (r2.error && missingSyncCol(r2.error)) hasSync = false;
        }
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
    for (const [cid] of all) {
      sendingLink.delete(cid);
      sendingSync.delete(cid);
    }
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
/** The words + chords of a text PDF -> the song's words (v1.0.283), unless it
    has words already; a scan / photo / a PDF that isn't a song = nothing. */
async function takeWords(id, file) {
  try {
    const rec = await getSheet(id);
    if (!rec || (rec.lyrics || '').trim()) return;
    const { pdfWords } = await import('./pdfWords');
    const text = await pdfWords(file, { song: true });
    if (text) await setSheetLyrics(id, text);
  } catch {
    /* a PDF pdf.js can't read: the chart alone */
  }
}

export async function addCharts(files, band = null, { words = true } = {}) {
  const ids = [];
  for (const f of files) {
    try {
      const { id } = await saveSheet(f, { band });
      ids.push(id);
      if (words) await takeWords(id, f);
    } catch {
      /* storage full */
    }
  }
  if (signedIn()) syncCharts();
  return ids;
}

/**
 * Give a words-only song its chart (v1.0.255; user: "adding a song lets me
 * paste words but not attach a file"): the SAME song gets the PDF (its id,
 * name, words, setlists, notes and prefs stay), and goes up again — sync
 * step 1 uploads the file and fills the row's path; the other devices fetch
 * it in step 2.
 */
export async function attachChart(id, file) {
  const rec = await getSheet(id);
  if (!rec) return;
  const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' });
  // replacing a chart: a new file name (the other devices then fetch it);
  // the old file is removed once the new one is up
  const replace = rec.blob ? { ver: Date.now().toString(36), oldPath: rec.oldPath || rec.path || null } : {};
  await patchSheet(id, { blob, size: blob.size, cloud: false, ...replace });
  if (rec.blob) setSheetPrefs(id, { panX: null }, { quiet: true }); // the old sideways place doesn't fit the new pages
  await takeWords(id, blob);
  if (signedIn()) syncCharts();
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
    [copy] = await addCharts([file], band, { words: !rec.lyrics });
    if (copy && rec.lyrics) await setSheetLyrics(copy, rec.lyrics);
  } else {
    copy = (await saveTextSheet({ name: rec.name, lyrics: rec.lyrics, band })).id;
  }
  const p = sheetPrefs(id);
  if (copy && (p.dur || p.tr || p.bpm || p.note || p.start != null || p.link || p.art)) setSheetPrefs(copy, { dur: p.dur, tr: p.tr, bpm: p.bpm, note: p.note, start: p.start, link: p.link, art: p.art }, { quiet: true });
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

/** My part in one band (v1.0.249): ['vocals', 'guitar'] … — every member sees it. */
export async function setMyRoles(band, roles) {
  const uid = getLink()?.userId;
  const clean = cleanRoles(roles);
  const before = state.bands;
  set({ bands: state.bands.map((b) => (b.id === band ? { ...b, members: b.members.map((m) => (m.id === uid ? { ...m, roles: clean } : m)) } : b)) });
  const sb = await client();
  const { error } = await sb.from('band_members').update({ role: clean.join(',') || null }).eq('band_id', band).eq('user_id', uid);
  if (error) {
    set({ bands: before });
    if (missingRoleCol(error)) hasRole = false;
    else if (error.code === '23514') hasMoreRoles = false;
    throw error;
  }
}

/** The band's manager sets another member's part (v1.0.277; rpc in
    014_member_role_by_manager.sql — until it runs: `managerRolesReady()`
    turns false and the page says so). */
let hasRoleRpc = true;
export const managerRolesReady = () => hasRoleRpc;
/** False once the server refused a new part (015_more_member_roles.sql not run). */
let hasMoreRoles = true;
export const moreRolesReady = () => hasMoreRoles;
export async function setMemberRoles(band, user, roles) {
  if (user === getLink()?.userId) return setMyRoles(band, roles);
  const clean = cleanRoles(roles);
  const before = state.bands;
  set({ bands: state.bands.map((b) => (b.id === band ? { ...b, members: b.members.map((m) => (m.id === user ? { ...m, roles: clean } : m)) } : b)) });
  try {
    await rpc('set_member_role', { b: band, u: user, r: clean.join(',') });
  } catch (error) {
    set({ bands: before });
    if (error && (error.code === 'PGRST202' || error.code === '42883' || /could not find the function/i.test(error.message || ''))) hasRoleRpc = false;
    // before 015: the server knows only the first seven parts
    else if (error && (error.code === '22023' || error.code === '22001' || error.code === '23514')) hasMoreRoles = false;
    throw error;
  }
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
// ---- the band's kitty (v1.0.250, migration 012) --------------------------------------

/** Add an entry: {kind, amount, member?, round?, note?, who?, at}. Optimistic. */
export async function addLedger(band, e) {
  const x = { id: 'lg-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), band, kind: e.kind, amount: e.amount, member: e.member ?? null, round: e.round ?? null, note: (e.note || '').slice(0, 200), who: e.who?.length ? e.who : null, at: e.at, by: getLink()?.userId ?? null, byName: myName() || '', deleted: false, created: Date.now() };
  set({ ledger: [...state.ledger, x] });
  const sb = await client();
  const { error } = await sb.from('band_ledger').insert({ id: x.id, band_id: band, kind: x.kind, amount: x.amount, member: x.member, round_id: x.round, note: x.note || null, who: x.who, at: x.at, by_name: x.byName || null });
  if (error) {
    set({ ledger: state.ledger.filter((y) => y.id !== x.id) });
    throw error;
  }
  return x;
}

export async function removeLedger(id) {
  const before = state.ledger;
  set({ ledger: state.ledger.map((y) => (y.id === id ? { ...y, deleted: true } : y)) });
  const sb = await client();
  const { error } = await sb.from('band_ledger').update({ deleted: true }).eq('id', id);
  if (error) {
    set({ ledger: before });
    throw error;
  }
}

/** The manager names the treasurer (a member, or null). */
export async function setTreasurer(band, user) {
  const sb = await client();
  const { error } = await sb.rpc('set_treasurer', { b: band, u: user });
  if (error) throw error;
  set({ kitties: [...state.kitties.filter((k) => k.band !== band), { band, treasurer: user, currency: 'ILS' }] });
}

const TAKES = 'takes';

/**
 * Send one take up. rec = {id, song, at, duration, peaks, blob}. A band song's
 * take goes to the band (b/<band>/…, migration 009); a take of my own song to
 * my own folder (u/<me>/…, migration 018) — only I see it, on every device.
 */
export async function uploadTake(rec, band) {
  if (!signedIn() || !state.takesOk || (!band && state.myTakesOk === false)) return false;
  const uid = getLink()?.userId;
  if (!band && !uid) return false;
  const sb = await client();
  const ext = rec.blob.type === 'audio/mpeg' ? 'mp3' : 'wav';
  const path = band ? `b/${band}/${rec.song}/${rec.id}.${ext}` : `u/${uid}/${rec.song}/${rec.id}.${ext}`;
  const row = { id: rec.id, band_id: band || null, chart_id: rec.song, by_name: myName() || null, path, duration: Math.round(rec.duration * 10) / 10, peaks: rec.peaks ?? null, size: rec.blob.size };
  // the audio first (upsert: a retry overwrites it); before 018 my own folder
  // is refused here
  const up = await sb.storage.from(TAKES).upload(path, rec.blob, { upsert: true, contentType: rec.blob.type || 'audio/mpeg' });
  if (up.error) {
    if (/bucket not found/i.test(up.error.message || '')) set({ takesOk: false });
    throw up.error;
  }
  // a take of my own song whose song isn't in the cloud yet is refused here —
  // the next sync (after the song goes up) tries again
  const { error } = await sb.from('song_takes').upsert(row);
  if (error) {
    if (missingTable(error)) set({ takesOk: false });
    else if (!band && (error.code === '23502' || /band_id/.test(error.message || ''))) set({ myTakesOk: false });
    throw error;
  }
  if (!band) set({ myTakesOk: true });
  const x = takeOf({ ...row, by_user: uid ?? null, created_at: new Date(rec.at).toISOString() });
  set({ takes: [...state.takes.filter((t) => t.id !== x.id), x] });
  return true;
}

/** A short-lived address to play a take straight from the cloud (nothing kept here). */
export async function takeUrl(path) {
  const sb = await client();
  const { data, error } = await sb.storage.from(TAKES).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw error || new Error('no url');
  return data.signedUrl;
}

/** The audio itself, in memory only (to share it). */
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
