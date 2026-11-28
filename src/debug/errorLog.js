// Error log (v1.0.288): the last errors on THIS device — a script error, a
// promise nobody caught, a screen that failed to draw. Nothing leaves the
// device; Settings › Advanced shows them and can share them as text (so a
// problem on the phone can be sent instead of described). No tracking.
/* global __APP_VERSION__ */
const KEY = 'dudestar-error-log'; // device
const MAX = 40;
const subs = new Set();

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

const clip = (s, n) => (s && s.length > n ? s.slice(0, n) + '…' : s || '');

/** Record one error ({message, stack?, kind}). Repeats within a minute fold into one with a count. */
export function logError(err, kind = 'error') {
  try {
    const message = clip(String(err?.message || err || 'unknown'), 300);
    // benign noise the browser itself throws
    if (/ResizeObserver loop|Script error\.?$|AbortError|The play\(\) request was interrupted/i.test(message)) return;
    const stack = clip(String(err?.stack || '').split('\n').slice(0, 4).join('\n'), 600);
    const list = read();
    const now = Date.now();
    const last = list[list.length - 1];
    if (last && last.message === message && now - last.at < 60000) {
      last.count = (last.count || 1) + 1;
      last.at = now;
    } else {
      list.push({
        at: now,
        kind,
        message,
        stack,
        where: location.pathname,
        v: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '',
      });
    }
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
    subs.forEach((fn) => fn());
  } catch {
    /* never let the log itself break anything */
  }
}

export const errorLog = () => read();

export function clearErrorLog() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
  subs.forEach((fn) => fn());
}

export function onErrorLog(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/** The log as plain text, for sharing. */
export function errorLogText() {
  const ua = navigator.userAgent;
  const lines = read().map((e) => {
    const when = new Date(e.at).toISOString().replace('T', ' ').slice(0, 19);
    return `[${when}] v${e.v} ${e.kind}${e.count > 1 ? ' x' + e.count : ''} ${e.where}\n${e.message}${e.stack ? '\n' + e.stack : ''}`;
  });
  return `DudeStar error log\n${ua}\n\n${lines.join('\n\n')}`;
}

let installed = false;
/** Catch what nobody else caught (main.jsx, once). */
export function installErrorLog() {
  if (installed) return;
  installed = true;
  window.addEventListener('error', (e) => logError(e.error || e.message, 'error'));
  window.addEventListener('unhandledrejection', (e) => logError(e.reason, 'promise'));
}
