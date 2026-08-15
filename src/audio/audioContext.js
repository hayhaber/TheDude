let audioContext = null;

// Shared across chord playback and the metronome so they don't fight over
// separate AudioContexts (and so one user gesture unlocks both).
export function getAudioContext() {
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    audioContext = new Ctor();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
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
    if (ctx.state === 'suspended') ctx.resume();
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
