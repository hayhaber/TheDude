// Cloud sync, the heavy part (own chunk, loaded by cloudState.loadCloud()).
// Sign in with Google (Supabase Auth, PKCE redirect), link the active
// profile to the account, push dirty keys, pull newer rows.
import { createClient } from '@supabase/supabase-js';
import { personalLogicalKeys } from '../profile/profileStorage';
import {
  SUPABASE_KEY,
  SUPABASE_URL,
  SYNCED_SETTINGS,
  MAX_VALUE_CHARS,
  applyRows,
  authStorageKey,
  clearLinkData,
  getDirty,
  getLink,
  getPending,
  isSyncedKey,
  setCloudState,
  setDirty,
  setLink,
  setPending,
  setPushHandler,
  signingKey,
} from './cloudState';

const TABLE = 'user_kv';
const PAGE = 1000;
const CHUNK = 200;
const PUSH_DELAY_MS = 4000;
const POLL_MS = 5 * 60 * 1000;
const LOADED_AT = performance.now();

let client = null;
function sb() {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storageKey: authStorageKey(), // one session per profile on this device
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}

// The user hasn't touched the app yet since it opened: a pull can be applied
// with a quick reload instead of waiting for the next start.
let interacted = false;
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => (interacted = true), { once: true, capture: true });
const fresh = () => !interacted && performance.now() - LOADED_AT < 6000;

// A screen saves its empty default ([] / {}) the first time it opens: that is
// not data, and must never win over the account's real progress.
const EMPTY = new Set(['', '[]', '{}', 'null']);
const hasData = (k) => {
  const v = localStorage.getItem(k);
  return v != null && !EMPTY.has(v.trim());
};
/** This device's synced keys that hold real data. */
const localSyncedKeys = () => [...new Set([...personalLogicalKeys(), ...SYNCED_SETTINGS])].filter((k) => isSyncedKey(k) && hasData(k));
const localPersonalData = () => personalLogicalKeys().filter((k) => isSyncedKey(k) && hasData(k));

function rowFor(key) {
  const value = localStorage.getItem(key);
  if (value != null && value.length > MAX_VALUE_CHARS) return null; // too big to sync: stays on this device
  return { key, value, deleted: value == null };
}

// ---- push / pull ------------------------------------------------------------

let pushing = null;
async function push(keys = Object.keys(getDirty())) {
  if (!keys.length) return 0;
  const rows = keys.map(rowFor).filter(Boolean);
  for (let i = 0; i < rows.length; i += CHUNK) {
    const part = rows.slice(i, i + CHUNK);
    const { error } = await sb().from(TABLE).upsert(part, { onConflict: 'user_id,key', defaultToNull: false });
    if (error) throw error;
  }
  // only what was sent; a key changed again meanwhile stays dirty
  const d = getDirty();
  for (const r of rows) if (localStorage.getItem(r.key) === r.value || (r.deleted && localStorage.getItem(r.key) == null)) delete d[r.key];
  for (const k of keys) if (!rows.some((r) => r.key === k)) delete d[k]; // too big: give up on it
  setDirty(d);
  return rows.length;
}

async function pullSince(since) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    let q = sb().from(TABLE).select('key,value,deleted,updated_at').order('updated_at', { ascending: true }).range(from, from + PAGE - 1);
    if (since) q = q.gt('updated_at', since);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

const newest = (rows, prev) => rows.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), prev || '');

function stamp(extra = {}) {
  const link = { ...getLink(), ...extra, lastSync: new Date().toISOString() };
  setLink(link);
  setCloudState({ status: 'idle', error: null, lastSync: link.lastSync, email: link.email });
}

/** Push what changed here, then pull what changed elsewhere. */
async function syncNow({ reloadIfFresh = false } = {}) {
  if (!getLink()) return;
  if (pushing) return pushing;
  setCloudState({ status: 'syncing' });
  pushing = (async () => {
    try {
      await push();
      const link = getLink();
      const rows = (await pullSince(link.lastPull)).filter((r) => isSyncedKey(r.key));
      const lastPull = newest(rows, link.lastPull);
      if (rows.length) {
        if (reloadIfFresh && fresh()) {
          setLink({ ...link, lastPull });
          if (applyRows(rows)) {
            stamp();
            window.location.reload();
            return;
          }
        } else {
          // keep for the next start (newest row per key wins)
          const byKey = new Map(getPending().map((r) => [r.key, r]));
          for (const r of rows) byKey.set(r.key, r);
          setPending([...byKey.values()]);
        }
      }
      stamp({ lastPull });
    } catch (e) {
      setCloudState({ status: 'error', error: e?.message || 'sync' });
    } finally {
      pushing = null;
    }
  })();
  return pushing;
}

let pushTimer = 0;
function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    if (!getLink()) return;
    push()
      .then((n) => n && stamp())
      .catch((e) => setCloudState({ status: 'error', error: e?.message || 'push' }));
  }, PUSH_DELAY_MS);
}

// ---- linking ----------------------------------------------------------------

/** After the Google sign-in: connect this profile to the account. */
async function link(session) {
  const user = session.user;
  setLink({ userId: user.id, email: user.email, lastPull: null, linkedAt: new Date().toISOString() });
  setCloudState({ status: 'syncing', email: user.email });
  const remote = (await pullSince(null)).filter((r) => isSyncedKey(r.key));
  const local = localSyncedKeys();
  if (!remote.length) {
    // first device: upload everything
    await push(local);
    stamp({ lastPull: newest(remote) });
    setCloudState({ status: 'idle', notice: 'uploaded' });
    return;
  }
  if (!localPersonalData().length) {
    await adopt('cloud', remote);
    return;
  }
  // both sides have data: the person chooses which wins where both have a key
  setCloudState({ status: 'choose', choice: { remoteCount: remote.length, localCount: localPersonalData().length } });
  pendingRemote = remote;
}

let pendingRemote = null;

/** 'cloud' = the account's data wins where both have a key; 'device' = this device's. Nothing else is lost either way. */
export async function choose(winner) {
  const remote = pendingRemote || (await pullSince(null)).filter((r) => isSyncedKey(r.key));
  pendingRemote = null;
  await adopt(winner, remote);
}

async function adopt(winner, remote) {
  setCloudState({ status: 'syncing', choice: null });
  try {
    const remoteKeys = new Set(remote.map((r) => r.key));
    const local = localSyncedKeys();
    if (winner === 'cloud') {
      setDirty({});
      applyRows(remote);
      await push(local.filter((k) => !remoteKeys.has(k)));
    } else {
      await push(local);
      const localSet = new Set(local);
      applyRows(remote.filter((r) => !localSet.has(r.key)));
    }
    stamp({ lastPull: newest(remote) });
    window.location.reload(); // every screen re-reads the merged data
  } catch (e) {
    setCloudState({ status: 'error', error: e?.message || 'link' });
  }
}

// ---- public -----------------------------------------------------------------

export async function signIn() {
  localStorage.setItem(signingKey(), '1');
  const { error } = await sb().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/`, queryParams: { prompt: 'select_account' } },
  });
  if (error) {
    localStorage.removeItem(signingKey());
    setCloudState({ status: 'error', error: error.message });
  }
}

export async function signOut() {
  try {
    await sb().auth.signOut({ scope: 'local' });
  } catch {
    /* offline: the local session is dropped below anyway */
  }
  try {
    localStorage.removeItem(authStorageKey());
  } catch {
    /* ignore */
  }
  clearLinkData();
  setCloudState({ status: 'idle', email: null, lastSync: null, error: null, choice: null });
}

/** Deletes the account and everything stored in the cloud; this device keeps its data. */
export async function deleteAccount() {
  const { error } = await sb().rpc('delete_my_account');
  if (error) {
    setCloudState({ status: 'error', error: error.message });
    return false;
  }
  await signOut();
  return true;
}

export const syncNowFromUi = () => syncNow();

let attached = false;
function attach() {
  if (attached) return;
  attached = true;
  setPushHandler(schedulePush);
  document.addEventListener('visibilitychange', () => {
    if (!getLink()) return;
    if (document.visibilityState === 'visible') syncNow();
    else if (Object.keys(getDirty()).length) push().catch(() => {});
  });
  setInterval(() => {
    if (getLink() && document.visibilityState === 'visible') syncNow();
  }, POLL_MS);
}

/** A session is in hand (Google redirect, password, email code): link or sync. */
async function onSession(session, { fresh: isFresh = false } = {}) {
  attach();
  const linked = getLink();
  if (!linked || linked.userId !== session.user.id) {
    if (linked) clearLinkData(); // a different account than before
    await link(session);
  } else {
    await syncNow({ reloadIfFresh: isFresh });
  }
}

let booted = false;
/** Called once (cloudState.startCloud) when this profile is linked or a sign-in is returning. */
export async function boot() {
  if (booted) return;
  booted = true;
  attach();
  const returning = localStorage.getItem(signingKey());
  try {
    const { data } = await sb().auth.getSession(); // also exchanges ?code= after the Google redirect
    if (returning) {
      localStorage.removeItem(signingKey());
      const url = new URL(window.location.href);
      if (url.searchParams.has('code') || url.searchParams.has('error')) {
        for (const p of ['code', 'error', 'error_code', 'error_description', 'state']) url.searchParams.delete(p);
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      }
    }
    const session = data?.session;
    if (!session) {
      if (getLink()) setCloudState({ status: 'signedOut' }); // session expired / revoked: ask to sign in again
      else if (returning) setCloudState({ status: 'error', error: 'signin' });
      return;
    }
    await onSession(session, { fresh: true });
  } catch (e) {
    setCloudState({ status: 'error', error: e?.message || 'boot' });
  }
}

// ---- email + password -------------------------------------------------------
// Emails carry a CODE (the templates use {{ .Token }}), not a link: a link
// opened in another browser (the Gmail app, the installed app on iPhone)
// couldn't finish a PKCE sign-in. Each function resolves to
// { ok } | { next: 'code' | 'newPassword' } | { error: <cloud.err.* key> }.

function errKey(error) {
  const m = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  if (/invalid_credentials|invalid login/.test(m)) return 'cloud.err.credentials';
  if (/email_not_confirmed|not confirmed/.test(m)) return 'cloud.err.unconfirmed';
  if (/user_already_exists|already registered/.test(m)) return 'cloud.err.exists';
  if (/weak_password|password should|at least/.test(m)) return 'cloud.err.weak';
  if (/otp_expired|token has expired|invalid.*(otp|token)|expired/.test(m)) return 'cloud.err.code';
  if (/rate|too many|security purposes/.test(m)) return 'cloud.err.rate';
  if (/email_address_invalid|invalid email|unable to validate email/.test(m)) return 'cloud.err.email';
  if (/fetch|network|failed to/.test(m)) return 'cloud.err.network';
  return 'cloud.err.generic';
}

async function finish(session) {
  try {
    await onSession(session);
    return { ok: true };
  } catch (e) {
    return { error: errKey(e) };
  }
}

export async function emailSignIn(email, password) {
  const { data, error } = await sb().auth.signInWithPassword({ email, password });
  if (error) {
    if (errKey(error) === 'cloud.err.unconfirmed') {
      await sb().auth.resend({ type: 'signup', email });
      return { next: 'code', type: 'signup' };
    }
    return { error: errKey(error) };
  }
  return finish(data.session);
}

export async function emailSignUp(email, password) {
  const { data, error } = await sb().auth.signUp({ email, password });
  if (error) return { error: errKey(error) };
  if (data.session) return finish(data.session); // confirmation turned off in the project
  // An existing, confirmed address comes back with no identities (no email is sent).
  if (data.user && Array.isArray(data.user.identities) && !data.user.identities.length) return { error: 'cloud.err.exists' };
  return { next: 'code', type: 'signup' };
}

export async function emailVerify(email, code, type) {
  const { data, error } = await sb().auth.verifyOtp({ email, token: code.trim(), type });
  if (error) return { error: errKey(error) };
  if (type === 'recovery') return { next: 'newPassword' }; // signed in; now choose a new password
  return finish(data.session);
}

export async function emailForgot(email) {
  const { error } = await sb().auth.resetPasswordForEmail(email);
  if (error) return { error: errKey(error) };
  return { next: 'code', type: 'recovery' };
}

export async function emailNewPassword(password) {
  const { error } = await sb().auth.updateUser({ password });
  if (error) return { error: errKey(error) };
  const { data } = await sb().auth.getSession();
  return data?.session ? finish(data.session) : { error: 'cloud.err.generic' };
}

export async function emailResend(email, type) {
  const { error } = type === 'recovery' ? await sb().auth.resetPasswordForEmail(email) : await sb().auth.resend({ type: 'signup', email });
  return error ? { error: errKey(error) } : { ok: true };
}
