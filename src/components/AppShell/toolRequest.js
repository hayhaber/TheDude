// A tool (metronome / tuner) asked for from the home screen. The app pages
// mount after the home screen closes, so the request waits here and the
// visible pill of that tool opens its drawer on mount (each pill is mounted
// twice — desktop corner + tablet/phone bottom bar — only the visible one
// may take it, or two drawers would open).
let pending = null;

export function requestTool(name) {
  pending = name;
}

export function takeToolRequest(name, buttonEl) {
  if (pending !== name || !buttonEl || buttonEl.getClientRects().length === 0) return false;
  pending = null;
  return true;
}
