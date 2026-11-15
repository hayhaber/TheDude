// Stage band sync (v1.0.189): one member LEADS — every song change, the
// scroll's start / stop / position, a count-in and the setlist's order are
// broadcast over a Supabase Realtime channel of the band; members who FOLLOW
// turn with them. Nothing is stored: a broadcast channel only relays live
// messages between the devices on it, and presence counts who is there.
//
// The channel is named after the band's id (a random uuid only its members
// know); messages carry song ids and numbers only.
//
// v1.0.201: the band's home screen listens too (to show "Dana is playing
// now · Join"), and supabase-js keeps ONE channel per topic — so a band's
// channel is shared by every opener on this device (ref-counted, closed a
// moment after the last one leaves, so Stage -> Performer doesn't drop it).
import { getLink, loadCloud } from '../../cloud/cloudState';
import { activeProfile } from '../../profile/profileStorage';

const myKey = () => (getLink()?.userId ?? 'anon') + ':' + Math.random().toString(36).slice(2, 7);

const shared = new Map(); // bandId -> entry
const CLOSE_DELAY = 1500;
const removing = new Map(); // bandId -> promise of the channel's removal

function peopleOf(e) {
  const st = e.ch.presenceState();
  return Object.entries(st).map(([k, metas]) => ({ ...metas[0], key: k, name: metas[0]?.name ?? '', role: metas[0]?.role ?? 'off', me: k === e.key }));
}

async function entryFor(bandId) {
  let e = shared.get(bandId);
  if (e) {
    clearTimeout(e.closeTimer);
    e.closeTimer = null;
    await e.ready;
    return e;
  }
  e = { key: myKey(), name: activeProfile()?.name || '', meta: null, handles: new Set(), closeTimer: null, ch: null };
  e.meta = { name: e.name, role: 'off' };
  shared.set(bandId, e);
  e.ready = (async () => {
    await removing.get(bandId);
    const m = await loadCloud();
    const sb = m.cloudClient();
    e.sb = sb;
    const ch = sb.channel('stage-' + bandId, { config: { broadcast: { self: false }, presence: { key: e.key } } });
    e.ch = ch;
    ch.on('broadcast', { event: 'state' }, ({ payload }) => {
      if (payload?.from === e.key) return;
      e.handles.forEach((h) => h.on.state?.(payload, payload?.name));
    });
    ch.on('broadcast', { event: 'hello' }, () => e.handles.forEach((h) => h.on.hello?.()));
    ch.on('presence', { event: 'sync' }, () => {
      const people = peopleOf(e);
      e.handles.forEach((h) => h.on.people?.(people));
    });
    await new Promise((resolve) => {
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          ch.track(e.meta);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          e.handles.forEach((h) => h.on.status?.(status));
          resolve();
        }
      });
    });
  })().catch((err) => {
    shared.delete(bandId);
    throw err;
  });
  await e.ready;
  return e;
}

/**
 * Join the band's live channel. `on.state(msg, from)` gets the leader's
 * messages, `on.people(list)` the people on the channel
 * [{key, name, role, me, set?, song?, i?, n?}].
 * Returns {send(msg), hello(), setRole(role, extra), close()}.
 */
export async function openBandLink(bandId, on) {
  const e = await entryFor(bandId);
  const h = { on };
  e.handles.add(h);
  let closed = false;
  try {
    on.people?.(peopleOf(e));
  } catch {
    /* not joined */
  }
  return {
    send(msg) {
      if (closed) return;
      e.ch.send({ type: 'broadcast', event: 'state', payload: { ...msg, from: e.key, name: e.name } });
    },
    hello() {
      if (!closed) e.ch.send({ type: 'broadcast', event: 'hello', payload: {} });
    },
    /** `extra` = what the band's home screens show about this player
     * ({set, song, i, n} — "Dana is playing · song 2 of 8"). */
    setRole(r, extra = {}) {
      if (closed) return;
      e.meta = { name: e.name, role: r, ...extra };
      e.ch.track(e.meta);
    },
    close() {
      if (closed) return;
      closed = true;
      e.handles.delete(h);
      if (e.handles.size) return;
      // nobody playing any more: back to a plain listener, then leave
      if (e.meta.role !== 'off') {
        e.meta = { name: e.name, role: 'off' };
        e.ch.track(e.meta);
      }
      e.closeTimer = setTimeout(() => {
        if (e.handles.size) return;
        shared.delete(bandId);
        const p = e.sb.removeChannel(e.ch).catch(() => {});
        removing.set(bandId, p);
        p.then(() => removing.get(bandId) === p && removing.delete(bandId));
      }, CLOSE_DELAY);
    },
  };
}
