// Server check (v1.0.288): which of the Supabase setup scripts
// (supabase/migrations/NNN_*.sql, run by hand in the SQL Editor) are in.
// Each one is probed with a harmless read — an empty select of the table /
// column it adds, a listing of its storage bucket, or a call that can only
// fail its permission check — so nothing is written. A feature whose script
// is missing just stays quiet in the app; this list says which and why.

const MISSING = new Set(['42P01', 'PGRST205', '42703', 'PGRST204', 'PGRST202', '42883']);
const NIL = '00000000-0000-0000-0000-000000000000';

function missing(error) {
  if (!error) return false;
  if (MISSING.has(error.code)) return true;
  return /does not exist|could not find|not found/i.test(error.message || '');
}

const col = (table, cols) => (sb) => sb.from(table).select(cols).limit(0);
const bucket = (name) => (sb) => sb.storage.from(name).list('', { limit: 1 });

// what each script adds (keys 'srv.m.<n>' name the feature it opens)
export const SCRIPTS = [
  { n: 1, file: '001_user_kv.sql', probe: col('user_kv', 'key') },
  { n: 2, file: '002_stage_charts.sql', probe: [col('charts', 'id,path'), col('bands', 'id'), col('band_setlists', 'id'), bucket('charts')] },
  { n: 3, file: '003_stage_notes.sql', probe: col('charts', 'bpm,notes') },
  { n: 4, file: '004_stage_lyrics.sql', probe: col('charts', 'lyrics,start_note') },
  { n: 5, file: '005_band_suggestions.sql', probe: col('band_suggestions', 'id') },
  { n: 6, file: '006_stage_link.sql', probe: col('charts', 'link') },
  { n: 7, file: '007_band_ready.sql', probe: [col('band_ready', 'chart_id'), col('band_setlists', 'gap')] },
  { n: 8, file: '008_song_notes.sql', probe: col('song_notes', 'id') },
  { n: 9, file: '009_song_takes.sql', probe: [col('song_takes', 'id'), bucket('takes')] },
  { n: 10, file: '010_member_avatar.sql', probe: col('band_members', 'avatar') },
  { n: 11, file: '011_member_role.sql', probe: col('band_members', 'role') },
  { n: 12, file: '012_band_kitty.sql', probe: [col('band_kitty', 'band_id'), col('band_ledger', 'id')] },
  { n: 13, file: '013_lyrics_sync.sql', probe: col('charts', 'sync') },
  // owner check first: an existing function refuses (42501), a missing one is PGRST202
  { n: 14, file: '014_member_role_by_manager.sql', probe: (sb) => sb.rpc('set_member_role', { b: NIL, u: NIL, r: '' }) },
  // 015 can't be told apart from 014 without writing; 016 repeats it
  { n: 16, file: '016_schema_version.sql', probe: (sb) => sb.rpc('dudestar_schema'), also: [15] },
  { n: 17, file: '017_gp_imports.sql', probe: [col('gp_imports', 'grp,records'), bucket('gp')] },
];

const netError = (e) => e?.name === 'TypeError' || /fetch|network|load failed|timed? ?out/i.test(e?.message || '');

// 'ok' | 'missing' | 'net' (no answer) | 'error' (an answer we can't read)
const one = async (sb, probe) => {
  let res;
  try {
    // the client keeps retrying a lost request: 12 s without an answer = no answer
    res = await Promise.race([probe(sb), new Promise((_, no) => setTimeout(() => no(new TypeError('timed out')), 12000))]);
  } catch (e) {
    return { s: netError(e) ? 'net' : 'error', msg: e?.message };
  }
  const error = res?.error;
  if (missing(error)) return { s: 'missing' };
  // a storage listing answers "Bucket not found" through its own error shape
  if (error && /bucket/i.test(error.message || '') && /not.?found/i.test(error.message || '')) return { s: 'missing' };
  if (error && netError(error)) return { s: 'net', msg: error.message };
  return { s: 'ok' };
};

export class ServerCheckError extends Error {
  constructor(kind, message) {
    super(message || kind);
    this.kind = kind; // 'offline' | 'session' | 'error'
  }
}

/**
 * -> { results: [{n, file, ok, unsure}], missing: [...], unsure: [...] }.
 * Every probe runs at once (one after another took > 10 s on a slow phone
 * line). Throws ServerCheckError when nothing answered.
 */
export async function checkServer(sb) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new ServerCheckError('offline');
  if (!sb) throw new ServerCheckError('session', 'no client');
  // one session read first, so the probes don't all queue on the auth lock
  const session = (await sb.auth.getSession().catch(() => null))?.data?.session;
  if (!session) throw new ServerCheckError('session', 'not signed in');
  const results = await Promise.all(
    SCRIPTS.map(async (s) => {
      const probes = Array.isArray(s.probe) ? s.probe : [s.probe];
      const outs = await Promise.all(probes.map((p) => one(sb, p)));
      const miss = outs.some((o) => o.s === 'missing');
      const bad = outs.find((o) => o.s === 'net' || o.s === 'error');
      return { n: s.n, file: s.file, ok: !miss && !bad, unsure: !miss && !!bad, why: bad?.msg || '', net: bad?.s === 'net', also: s.also || [] };
    }),
  );
  const unsure = results.filter((r) => r.unsure);
  if (unsure.length === results.length) throw new ServerCheckError(unsure.every((r) => r.net) ? 'offline' : 'error', unsure[0]?.why);
  return { results, missing: results.filter((r) => !r.ok && !r.unsure), unsure, at: Date.now() };
}
