// GuitarPro / lick-trainer imports in the user's ACCOUNT (v1.0.289) — the
// same sign-in as everything else, no separate code: a file added on one
// device appears on every device signed in to the account. IndexedDB
// (userLickStore.js) stays the local, offline copy.
//
// One row per imported file in `gp_imports` (supabase/migrations/017):
// the records without the file bytes, plus the file itself in the private
// bucket `gp` (<user id>/<group>.bin). Local records that are in the
// account carry `acct: true` — so a sync can tell "deleted on another
// device" from "added here and not uploaded yet". (`cloud` belongs to the
// old shared library, cloudLibrary.js, which is only read once to move
// its files over.)
import { saveUserLicks, deleteUserLicks } from './userLickStore';

const TABLE = 'gp_imports';
const BUCKET = 'gp';

export class AccountLibraryError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.code = code; // 'signed-out' | 'offline' | 'setup' | 'error'
  }
}

const isSetup = (e) => ['42P01', 'PGRST205', 'PGRST204', '42703'].includes(e?.code) || /bucket not found/i.test(e?.message || '');
const isOffline = (e) => /fetch|network|load failed/i.test(e?.message || '');
const fail = (e) => new AccountLibraryError(isSetup(e) ? 'setup' : isOffline(e) ? 'offline' : 'error', e?.message);

/** The signed-in client + user id, or throws 'signed-out' / 'offline'. */
export async function accountClient() {
  const { getLink } = await import('../../cloud/cloudState');
  if (!getLink()) throw new AccountLibraryError('signed-out');
  const { cloudClient } = await import('../../cloud/cloudSync');
  const sb = cloudClient();
  const session = (await sb.auth.getSession()).data?.session;
  if (!session?.user?.id) throw new AccountLibraryError('offline');
  return { sb, uid: session.user.id };
}

const groupOf = (r) => r.importGroup ?? r.id;
// the records without the file (it travels as its own object) or local flags
const encode = (records) =>
  records.map(({ gpBytes, cloud, acct, ...r }) => ({ ...r, ...(gpBytes ? { _file: true } : {}) })); // eslint-disable-line no-unused-vars

async function upload(sb, uid, group, records) {
  const withFile = records.find((r) => r.gpBytes);
  let path = '';
  let size = null;
  if (withFile) {
    path = `${uid}/${group}.bin`;
    const blob = new Blob([withFile.gpBytes], { type: 'application/octet-stream' });
    size = blob.size;
    const up = await sb.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: 'application/octet-stream' });
    if (up.error) throw fail(up.error);
  }
  const t = records[0]?.title ?? records[0]?.name;
  const name = typeof t === 'string' ? t : t?.en || t?.he || null;
  const { error } = await sb.from(TABLE).upsert({ grp: group, name: name ? String(name).slice(0, 300) : null, records: encode(records), path, size, deleted: false }, { onConflict: 'user_id,grp' });
  if (error) throw fail(error);
  const marked = records.map((r) => ({ ...r, acct: true }));
  await saveUserLicks(marked);
  return marked;
}

/** Uploads one imported file's records; resolves with them marked `acct`. */
export async function uploadToAccount(group, records) {
  const { sb, uid } = await accountClient();
  return upload(sb, uid, group, records);
}

/** Deletes an import everywhere (a tombstone, so other devices drop it too). */
export async function deleteFromAccount(group) {
  const { sb, uid } = await accountClient();
  const { error } = await sb.from(TABLE).update({ deleted: true }).eq('grp', group);
  if (error) throw fail(error);
  await sb.storage.from(BUCKET).remove([`${uid}/${group}.bin`]).catch(() => {});
}

/**
 * Brings this device's copy in line with the account. `local` = raw records
 * from IndexedDB. Resolves with the new raw list (already saved locally).
 */
export async function syncAccountLibrary(local) {
  const { sb, uid } = await accountClient();
  let rows;
  {
    const { data, error } = await sb.from(TABLE).select('grp,path,deleted,updated_at');
    if (error) throw fail(error);
    rows = data || [];
  }
  const remote = new Map(rows.map((r) => [r.grp, r]));
  const byGroup = new Map();
  for (const r of local) {
    const g = groupOf(r);
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(r);
  }
  let result = [...local];
  const drop = async (g, recs) => {
    await deleteUserLicks(recs.map((r) => r.id));
    result = result.filter((r) => groupOf(r) !== g);
  };

  for (const [g, recs] of byGroup) {
    const row = remote.get(g);
    const inAccount = recs.every((r) => r.acct);
    if (row?.deleted || (!row && inAccount)) {
      // deleted on another device
      await drop(g, recs);
    } else if (!row) {
      // added here (or came from the old shared library): up it goes
      try {
        const marked = await upload(sb, uid, g, recs);
        const ids = new Set(marked.map((r) => r.id));
        result = [...result.filter((r) => !ids.has(r.id)), ...marked];
      } catch (e) {
        if (e.code === 'setup' || e.code === 'offline') throw e;
        // one file that can't go up (too big…) must not stop the rest
      }
    } else if (!inAccount) {
      // already in the account (uploaded from here before the mark was saved)
      const marked = recs.map((r) => ({ ...r, acct: true }));
      await saveUserLicks(marked);
      const ids = new Set(marked.map((r) => r.id));
      result = [...result.filter((r) => !ids.has(r.id)), ...marked];
    }
  }

  // added on another device
  for (const row of rows) {
    if (row.deleted || byGroup.has(row.grp)) continue;
    const { data, error } = await sb.from(TABLE).select('records').eq('grp', row.grp).maybeSingle();
    if (error) throw fail(error);
    const recs = Array.isArray(data?.records) ? data.records : [];
    if (!recs.length) continue;
    let bytes = null;
    if (row.path) {
      const dl = await sb.storage.from(BUCKET).download(row.path);
      if (dl.error || !dl.data) continue; // try again next time
      bytes = await dl.data.arrayBuffer();
    }
    const full = recs.map(({ _file, ...r }) => ({ ...r, ...(_file && bytes ? { gpBytes: bytes } : {}), acct: true }));
    await saveUserLicks(full);
    result.push(...full);
  }
  return result.sort((a, b) => (a.importedAt ?? 0) - (b.importedAt ?? 0));
}
