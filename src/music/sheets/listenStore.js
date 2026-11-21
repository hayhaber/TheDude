// The song playing in the in-app listening player (v1.0.229): one at a
// time, shown by <ListenDock> (mounted by the Band screen), over the lists
// AND over the Performer so the song plays on while the chart / words show.
let cur = null; // {link, name}
let hosts = 0;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());

export const listenNow = () => cur;
export const hasListenHost = () => hosts > 0;
export function subscribeListen(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
export function openListen(link, name) {
  cur = { link, name, n: (cur?.n ?? 0) + 1 };
  emit();
}
export function closeListen() {
  cur = null;
  emit();
}
export function addListenHost() {
  hosts += 1;
  emit();
  return () => {
    hosts -= 1;
    if (!hosts) cur = null;
    emit();
  };
}
