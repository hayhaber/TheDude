// Rehearsal recordings per song (v1.0.244). Record a rehearsal and each take
// lands on its song: in the Performer, moving to the next song closes the take
// on the song that was playing and opens the next one at once (the mic stays
// open between them, so nothing is lost but a few milliseconds).
// Takes are MP3 (lamejs, 96 kbps mono — a 4-minute song ≈ 3 MB; WAV would be
// 23 MB). Every take goes to the cloud (v1.0.291): a BAND song's take to the
// band (migration 009) so every member can listen; a take of my own song to
// my account (migration 018). IndexedDB only holds a take until it is up —
// then the copy here is deleted (nothing sits on the phone); offline / signed
// out it waits here and is sent with the next sync (retryUploads). Listening
// streams from the cloud.
import { createLiveContext, openLiveInput } from './amp/liveInput';
import { createCapture, computePeaks, encodeWav } from './recorder';
import { encodeMp3 } from './studio/mp3';
import { activeProfile } from '../profile/profileStorage';
import { getSheet } from '../music/sheets/sheetStore';
import { signedIn, uploadTake } from '../music/sheets/chartCloud';

const IS_IOS =
  typeof navigator !== 'undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const MAX_TAKE = 12 * 60; // s — a take left running is split here (memory)

// ---- store --------------------------------------------------------------------------

const DB = 'dudestar-rehearsals';
let dbp = null;
function db() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const s = req.result.createObjectStore('takes', { keyPath: 'id' });
        s.createIndex('song', 'song');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbp = null;
        reject(req.error);
      };
    });
  }
  return dbp;
}
const done = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const takeSubs = new Set();
export function onTakesChange(fn) {
  takeSubs.add(fn);
  return () => takeSubs.delete(fn);
}
const told = () => takeSubs.forEach((fn) => fn());

/** A song's takes, newest first, without the audio. */
export async function listTakes(song) {
  try {
    const d = await db();
    const all = await done(d.transaction('takes').objectStore('takes').index('song').getAll(song));
    const me = profileId();
    return all
      .filter((x) => !x.profileId || x.profileId === me)
      .map(({ blob, ...rest }) => ({ ...rest, size: blob?.size ?? 0 }))
      .sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}
export async function takeAudio(id) {
  const d = await db();
  return (await done(d.transaction('takes').objectStore('takes').get(id)))?.blob ?? null;
}
export async function deleteTake(id) {
  const d = await db();
  await done(d.transaction('takes', 'readwrite').objectStore('takes').delete(id));
  told();
}
async function putTake(rec) {
  const d = await db();
  await done(d.transaction('takes', 'readwrite').objectStore('takes').put(rec));
  told();
}
function profileId() {
  try {
    return activeProfile()?.id ?? '';
  } catch {
    return '';
  }
}

// ---- recorder ------------------------------------------------------------------------

let ctx = null;
let rig = null;
let cap = null;
let st = { on: false, song: null, name: '', since: 0, saving: 0, error: null };
const subs = new Set();
function setSt(p) {
  st = { ...st, ...p };
  subs.forEach((fn) => fn());
}
export const rehearsalState = () => st;
export function onRehearsal(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

function setSession(type) {
  try {
    if (navigator.audioSession) navigator.audioSession.type = type;
  } catch {
    /* not supported */
  }
}

async function openInput() {
  setSession('auto');
  ctx = createLiveContext();
  const settle = (p) => Promise.race([p.catch(() => {}), new Promise((r) => setTimeout(r, 400))]);
  await settle(ctx.resume());
  rig = await openLiveInput(ctx);
  if (ctx.state !== 'running') {
    // iOS: a context still paused after the mic opened — a new one works
    rig.close();
    ctx.close().catch(() => {});
    ctx = createLiveContext();
    await settle(ctx.resume());
    rig = await openLiveInput(ctx);
  }
  cap = await createCapture(ctx, rig.input);
}
function closeInput() {
  cap?.dispose();
  cap = null;
  rig?.close();
  rig = null;
  ctx?.close().catch(() => {});
  ctx = null;
  if (IS_IOS) setSession('playback'); // play back from the loudspeaker
}

let guard = null;
/** Start recording on `song` ({id, name}). Call from a tap (it opens the mic). */
export async function startRehearsal(song) {
  if (st.on) return;
  setSt({ on: true, song: song.id, name: song.name, since: Date.now(), error: null });
  try {
    await openInput();
    cap.start();
    setSt({ since: Date.now() });
    clearInterval(guard);
    guard = setInterval(() => {
      if (st.on && cap && cap.elapsed() > MAX_TAKE) switchRehearsal({ id: st.song, name: st.name });
    }, 5000);
  } catch (e) {
    closeInput();
    setSt({ on: false, song: null, error: e?.name === 'NotAllowedError' ? 'denied' : 'failed' });
  }
}

let switching = Promise.resolve();
/** The song changed while recording: close this take, open one on `song`. */
export function switchRehearsal(song) {
  if (!st.on || !cap || song.id === st.song) return switching;
  switching = switching.then(async () => {
    if (!st.on || !cap) return;
    const prev = { id: st.song, name: st.name, since: st.since };
    const res = await cap.stop();
    cap.start();
    setSt({ song: song.id, name: song.name, since: Date.now() });
    save(prev, res);
  });
  return switching;
}

/** Stop recording; the last take is saved on its song. */
export function stopRehearsal() {
  if (!st.on) return switching;
  clearInterval(guard);
  switching = switching.then(async () => {
    if (!cap) {
      setSt({ on: false, song: null });
      return;
    }
    const prev = { id: st.song, name: st.name, since: st.since };
    const res = await cap.stop();
    closeInput();
    setSt({ on: false, song: null });
    save(prev, res);
  });
  return switching;
}

/** Seconds into the current take (for the counter). */
export const rehearsalElapsed = () => (cap && st.on ? cap.elapsed() : 0);

async function save(song, res) {
  if (!res || res.samples.length < res.sampleRate * 3) return; // < 3 s = a slip
  setSt({ saving: st.saving + 1 });
  try {
    // a quiet phone mic is brought up to a normal level (never turned down)
    let peak = 0;
    for (let i = 0; i < res.samples.length; i += 1) peak = Math.max(peak, Math.abs(res.samples[i]));
    const gain = peak > 1e-5 ? Math.min(16, 0.89 / peak) : 1;
    if (gain > 1.12) for (let i = 0; i < res.samples.length; i += 1) res.samples[i] *= gain;
    let blob;
    try {
      blob = await encodeMp3({ numberOfChannels: 1, sampleRate: res.sampleRate, getChannelData: () => res.samples }, 96);
    } catch {
      blob = encodeWav(res.samples, res.sampleRate);
    }
    const band = (await getSheet(song.id))?.band ?? null;
    const rec = {
      id: 'rh-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      song: song.id,
      name: song.name,
      at: song.since || Date.now(),
      duration: res.samples.length / res.sampleRate,
      peaks: computePeaks(res.samples, 60).map((v) => Math.round(v * 100) / 100),
      blob,
      band,
      cloud: false,
      profileId: profileId(),
    };
    await putTake(rec);
    sendUp(rec);
  } catch {
    setSt({ error: 'save' });
  } finally {
    setSt({ saving: Math.max(0, st.saving - 1) });
  }
}

// ---- up to the cloud; the copy here goes once it is up ---------------------------

const sending = new Set();
async function sendUp(rec) {
  if (sending.has(rec.id) || !signedIn()) return;
  sending.add(rec.id);
  told();
  try {
    if (await uploadTake(rec, rec.band || null)) await deleteTake(rec.id);
  } catch {
    /* offline / not set up / its song not up yet: the next sync tries again */
  } finally {
    sending.delete(rec.id);
    told();
  }
}
export const isSending = (id) => sending.has(id);

/** Takes still on this device: send them up now; drop copies already in the cloud. */
export async function retryUploads() {
  if (!signedIn()) return;
  try {
    const d = await db();
    const all = await done(d.transaction('takes').objectStore('takes').getAll());
    const me = profileId();
    for (const rec of all) {
      if (rec.profileId && rec.profileId !== me) continue; // another profile's account
      if (rec.cloud) await deleteTake(rec.id); // an older version kept a copy of what is up
      else if (rec.blob) await sendUp(rec);
    }
  } catch {
    /* next time */
  }
}
