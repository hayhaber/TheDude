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

// A short, silent, looping WAV — its only job is to exist as a real
// HTMLMediaElement. On iOS/Safari specifically (confirmed via the debug
// panel: a raw Web Audio oscillator reported ctx.state 'running' and
// "fired OK" with zero JS errors, yet produced no audible sound at all,
// while a YouTube video on the very same device played fine), a pure Web
// Audio API graph with no real <audio>/<video> element anywhere on the
// page can fail to claim iOS's "playback" audio session category — the
// AudioContext keeps processing internally exactly as if everything were
// fine, but the output never actually reaches the speaker. Playing this
// silent element is the standard, widely-documented workaround: it forces
// WebKit to establish a real playback session, which the rest of the Web
// Audio graph (oscillators, smplr's sample playback) then correctly
// routes through. 16-bit PCM (0 = true silence) rather than 8-bit
// (silence is 128 there, or a 0 sample is a jarring DC click).
function buildSilentWavDataUri(durationSeconds) {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  function writeString(offset, str) {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
  }
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  // Sample bytes are already zero-initialized by ArrayBuffer — true silence.
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

let silentAudioEl = null;
function ensureSilentAudioPlaying() {
  if (!silentAudioEl) {
    silentAudioEl = new Audio(buildSilentWavDataUri(1));
    silentAudioEl.loop = true;
    silentAudioEl.setAttribute('playsinline', 'true');
    silentAudioEl.volume = 0.01;
  }
  // A rejected play() Promise here (autoplay policy, not-yet-a-gesture)
  // is expected and harmless — the real call is the one made from inside
  // unlockAudioContextOnFirstGesture's handler below, which IS a gesture.
  // Logged either way (TEMPORARY, see DebugPanel.jsx) since whether this
  // silent element actually plays is itself a live open question, not a
  // known-working assumption.
  silentAudioEl
    .play()
    .then(() => logAudioEvent(`silent keep-alive <audio> play() resolved OK, paused=${silentAudioEl.paused}`))
    .catch((e) => logAudioEvent(`silent keep-alive <audio> play() REJECTED: ${e.message}`));
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
      if (document.visibilityState === 'visible') {
        resumeIfNotRunning(audioContext);
        ensureSilentAudioPlaying();
      }
    });
    window.addEventListener('pageshow', () => {
      resumeIfNotRunning(audioContext);
      ensureSilentAudioPlaying();
    });
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
    ensureSilentAudioPlaying();
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('mousedown', unlock);
    window.removeEventListener('keydown', unlock);
  }
  window.addEventListener('touchstart', unlock, { once: true });
  window.addEventListener('mousedown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}
