// The song playing in the in-app listening player (v1.0.229): one at a
// time, shown by <ListenDock> (mounted by the Band screen), over the lists
// AND over the Performer so the song plays on while the chart / words show.
//
// Play-along (v1.0.257): a YouTube player reports its time / state here
// (`ytInfo`, `onYt`), and the Performer drives it (`ytCommand`): the chart
// follows the recording, and the next song is loaded into the SAME player
// (`openListen(…, {reuse: true})`) so iOS plays it on without a new tap.
let cur = null; // {link, name, n, along}
// every player ever opened gets a new number — never reset by a close
// (v1.0.276: after a close `n` started again at 1, the dock saw "the same
// player" and opened the PREVIOUS song's address)
let seq = 0;
let hosts = 0;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());

export const listenNow = () => cur;
export const hasListenHost = () => hosts > 0;
export function subscribeListen(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
export function openListen(link, name, opts = {}) {
  const reuse = opts.reuse && cur && sender;
  cur = { link, name, n: reuse ? cur.n : ++seq, along: !!opts.along };
  resetYt();
  emit();
}
export function closeListen() {
  cur = null;
  resetYt();
  emit();
}
export function addListenHost() {
  hosts += 1;
  emit();
  return () => {
    hosts -= 1;
    if (!hosts) {
      cur = null;
      resetYt();
    }
    emit();
  };
}

// --- YouTube player state (time in seconds, state = YT.PlayerState:
// -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued) ---
let yt = { time: 0, dur: 0, state: -1, at: 0, ready: false };
const ytSubs = new Set();
function resetYt() {
  yt = { time: 0, dur: 0, state: -1, at: 0, ready: false };
  ytSubs.forEach((fn) => fn(yt));
}
export const ytInfo = () => yt;
/** The player's time now, run on from its last report while it plays. */
export function ytTime(now = performance.now()) {
  if (yt.state !== 1) return yt.time;
  return yt.time + Math.min(2, (now - yt.at) / 1000);
}
export function onYt(fn) {
  ytSubs.add(fn);
  return () => ytSubs.delete(fn);
}
export function reportYt(patch) {
  const prev = yt;
  yt = { ...yt, ...patch, at: 'time' in patch ? performance.now() : yt.at };
  if (yt.state !== prev.state || yt.dur !== prev.dur || yt.ready !== prev.ready || 'time' in patch) ytSubs.forEach((fn) => fn(yt, prev));
}
let sender = null; // set by the dock: (func, args) => posts to the iframe
export function setYtSender(fn) {
  sender = fn;
}
export function ytCommand(func, args = []) {
  sender?.(func, args);
}
