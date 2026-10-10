// The live input for the Amp and the Recorder: the device chosen in
// Settings (audioInputSettingsStore), on an AudioContext of its own.
//
// Why not the app's shared AudioContext (audio/audioContext.js):
//  - the amp is a live, always-running DSP chain (oversampled waveshapers,
//    two convolvers). On its own context it can be CLOSED when you leave the
//    tool — the audio device, its buffers and the CPU are released at once;
//    the shared context lives as long as the page;
//  - it never shares a render thread with the metronome/piano/alphaTab
//    scheduling, and a hiccup in either can't glitch the other;
//  - it's created inside the tap that turns it on (iOS unlock) with
//    latencyHint 'interactive' (the smallest buffer the browser allows),
//    whatever the shared one was created with.
// The metronome (count-in / click) keeps playing on the shared context —
// both mix in the OS.
//
// Processing (echo cancellation, noise suppression, auto gain) is always
// OFF here: they are voice-call tools that mangle a guitar's attack and
// sustain, and echo cancellation alone adds latency.

import { getAudioInputSettings } from '../audioInputSettingsStore';

export function createLiveContext() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  return new Ctor({ latencyHint: 'interactive' });
}

/**
 * Opens the input on `ctx`. Returns { stream, source, input, inputLatency,
 * close() } — `input` is a GainNode carrying the Settings input gain.
 */
export async function openLiveInput(ctx) {
  const { deviceId, gain } = getAudioInputSettings();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
      latency: 0,
    },
  });
  const source = ctx.createMediaStreamSource(stream);
  const input = ctx.createGain();
  input.gain.value = Number.isFinite(gain) ? gain : 1;
  source.connect(input);
  const track = stream.getAudioTracks()[0];
  let inputLatency = 0;
  try {
    const l = track?.getSettings?.().latency;
    if (Number.isFinite(l)) inputLatency = l;
  } catch {
    /* not reported */
  }
  return {
    stream,
    source,
    input,
    inputLatency,
    label: track?.label || '',
    close() {
      try {
        source.disconnect();
        input.disconnect();
      } catch {
        /* already gone */
      }
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

/** Round-trip estimate in seconds: input + processing buffer + output. */
export function estimateLatency(ctx, inputLatency = 0) {
  const base = Number.isFinite(ctx.baseLatency) ? ctx.baseLatency : 128 / ctx.sampleRate;
  const out = Number.isFinite(ctx.outputLatency) ? ctx.outputLatency : 0;
  return { input: inputLatency, base, output: out, total: inputLatency + base + out };
}

/** Peak and RMS (linear) of an AnalyserNode's current window. */
export function readLevel(analyser, buf) {
  analyser.getFloatTimeDomainData(buf);
  let peak = 0;
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i];
    const a = v < 0 ? -v : v;
    if (a > peak) peak = a;
    sum += v * v;
  }
  return { peak, rms: Math.sqrt(sum / buf.length) };
}
