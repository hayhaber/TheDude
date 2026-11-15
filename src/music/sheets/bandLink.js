// Stage band sync (v1.0.189): one member LEADS — every song change, the
// scroll's start / stop / position, a count-in and the setlist's order are
// broadcast over a Supabase Realtime channel of the band; members who FOLLOW
// turn with them. Nothing is stored: a broadcast channel only relays live
// messages between the devices on it, and presence counts who is there.
//
// The channel is named after the band's id (a random uuid only its members
// know); messages carry song ids and numbers only.
import { getLink, loadCloud } from '../../cloud/cloudState';
import { activeProfile } from '../../profile/profileStorage';

const myKey = () => (getLink()?.userId ?? 'anon') + ':' + Math.random().toString(36).slice(2, 7);

/**
 * Join the band's live channel. `on.state(msg, from)` gets the leader's
 * messages, `on.people(list)` the people on the channel [{key, name, role}].
 * Returns {send(msg), setRole(role), close()}.
 */
export async function openBandLink(bandId, on) {
  const m = await loadCloud();
  const sb = m.cloudClient();
  const key = myKey();
  const name = activeProfile()?.name || '';
  let role = 'off';
  let closed = false;
  const ch = sb.channel('stage-' + bandId, { config: { broadcast: { self: false }, presence: { key } } });
  ch.on('broadcast', { event: 'state' }, ({ payload }) => {
    if (payload?.from !== key) on.state?.(payload, payload?.name);
  });
  ch.on('broadcast', { event: 'hello' }, () => on.hello?.());
  ch.on('presence', { event: 'sync' }, () => {
    const st = ch.presenceState();
    const people = Object.entries(st).map(([k, metas]) => ({ key: k, name: metas[0]?.name ?? '', role: metas[0]?.role ?? 'off', me: k === key }));
    on.people?.(people);
  });
  await new Promise((resolve) => {
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ch.track({ name, role });
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        on.status?.(status);
        resolve();
      }
    });
  });
  return {
    send(msg) {
      if (closed) return;
      ch.send({ type: 'broadcast', event: 'state', payload: { ...msg, from: key, name } });
    },
    hello() {
      if (!closed) ch.send({ type: 'broadcast', event: 'hello', payload: {} });
    },
    setRole(r) {
      role = r;
      if (!closed) ch.track({ name, role });
    },
    close() {
      closed = true;
      sb.removeChannel(ch);
    },
  };
}
