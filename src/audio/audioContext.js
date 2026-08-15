let audioContext = null;

// TEMPORARY — tiny pub/sub so the on-page DebugPanel (see its own comment)
// can show real note-play attempts (piano taps, guitar taps), not just its
// own isolated test button — the fastest way to tell "the tap never even
// reached the audio layer" apart from "it reached the audio layer but the
// device produced no sound anyway". Remove alongside DebugPanel.jsx once
// root-caused.
const audioEventListeners = new Set();
export function logAudioEvent(message) {
  audioEventListeners.forEach((fn) => fn(message));
}
export function onAudioEvent(fn) {
  audioEventListeners.add(fn);
  return () => audioEventListeners.delete(fn);
}

// Any state other than 'running' means no sound will actually be heard —
// crucially this includes WebKit's own 'interrupted' state (not in the
// base Web Audio spec, only on iOS/Safari), which 'suspended' alone
// doesn't cover. See getAudioContext's own comment for when this fires.
function resumeIfNotRunning(ctx) {
  if (ctx.state !== 'running') ctx.resume();
}

// Shared across chord playback and the metronome so they don't fight over
// separate AudioContexts (and so one user gesture unlocks both).
export function getAudioContext() {
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    audioContext = new Ctor();
    // On iOS/Safari specifically, the audio session can drop to a WebKit-
    // only 'interrupted' state at any time after it was already happily
    // 'running' — backgrounding an installed home-screen PWA (which is
    // exactly what "close and reopen the app" during testing does), the
    // screen locking, a phone call, Control Center, even a brief system
    // sound, can all trigger it. Nothing else in the Web Audio spec
    // recovers from this automatically; only an explicit resume() does,
    // and it has to be re-issued every time it happens, not just once at
    // startup — hence listening for the context's own statechange event
    // rather than a single check. (Confirmed via the on-page debug panel:
    // ctx.state read 'interrupted' with ctx.currentTime frozen at 0 on a
    // real iPad, which is what made piano/metronome go silent there even
    // though the desktop-only 'suspended' handling below looked correct.)
    audioContext.addEventListener('statechange', () => resumeIfNotRunning(audioContext));
    // Covers the same "PWA was backgrounded, audio session dropped"
    // scenario from the other direction — the moment the app becomes
    // visible again, not only reacting to the context's own event (belt
    // and suspenders, since iOS's exact sequencing of statechange vs.
    // visibilitychange isn't guaranteed).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') resumeIfNotRunning(audioContext);
    });
    window.addEventListener('pageshow', () => resumeIfNotRunning(audioContext));
  }
  resumeIfNotRunning(audioContext);
  return audioContext;
}

// iOS Safari is stricter than desktop about what counts as "unlocking"
// audio: creating the AudioContext outside a real tap (this app's own
// InstrumentContext.jsx pre-creates it on mount/instrument-switch, no user
// gesture involved) leaves it permanently `suspended` there — a plain
// `.resume()` call later, even from inside a tap handler, isn't reliably
// enough on iOS by itself; the well-established fix is to also start and
// immediately stop a truly silent buffer synchronously within the FIRST
// real touch/click the page ever receives. Wired up once, globally, from
// main.jsx — every other note-playing code path is untouched, this only
// adds an extra one-time nudge the very first time a user actually touches
// the page, which is a no-op (already unlocked) on desktop browsers.
export function unlockAudioContextOnFirstGesture() {
  function unlock() {
    const ctx = getAudioContext();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('mousedown', unlock);
    window.removeEventListener('keydown', unlock);
  }
  window.addEventListener('touchstart', unlock, { once: true });
  window.addEventListener('mousedown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}
