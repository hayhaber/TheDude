import { useCallback, useEffect, useRef, useState } from 'react';
import { PitchDetector } from 'pitchy';
import { getAudioContext, reviveAudioOutput } from '../audio/audioContext';
import { getAudioInputSettings } from '../audio/audioInputSettingsStore';
import { hzToMidi } from '../music/vocal/voiceRange';
import { activeCalibration, gateFor } from '../audio/noiseCalibration';
import { createMicTap } from '../audio/micTap';
import { createLiveContext } from '../audio/amp/liveInput';

// iPhone / iPad: the mic is analysed on an AudioContext of its OWN (the
// tuner's fix, the Recorder's pattern) — the shared one, which plays the
// piano cues, can be left paused by iOS once capture starts. Frames are
// still stamped on the shared clock (the cue's), see tick().
const IS_IOS =
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

// The Vocal section's microphone: a continuous, timestamped pitch track (not
// just "the current note" like usePitchDetection) — the exercises draw the
// voice as a line over the target notes and analyse the whole take.
//
// Tuned for the singing voice: 70–1300 Hz (a low bass E2 up to a soprano's
// top), a slightly lower clarity bar than the guitar tuner (a breathy or
// soft voice is still a pitch), a loudness gate against room noise, and a
// 3-frame median that removes single-frame octave slips.
const FFT_SIZE = 2048;
const MIN_HZ = 70;
const MAX_HZ = 1300;
const MIN_CLARITY = 0.86;
const MIN_RMS = 0.006;
const ENV_RELEASE_S = 0.004;
// A refused resume() can stay pending forever on iOS — never wait on it long.
const settle = (p) => Promise.race([Promise.resolve(p).catch(() => {}), new Promise((r) => setTimeout(r, 400))]);

/**
 * A copy of `buf` with its loudness envelope flattened (fast peak follower,
 * 4 ms release). A lip trill / tongue trill chops the voice 20–35 times a
 * second; on a low voice (below ~200 Hz) the analyser then finds the period
 * of the whole chopped pattern (27–33 Hz) instead of the note, so most frames
 * came back empty. With the envelope flattened the note's own period is the
 * strongest again. Synthetic test (2026-11-06): 98–196 Hz, 90 % modulation at
 * 22–34 Hz -> 0–86 % of frames read before, 96–100 % after, 0 wrong notes,
 * noise still unread.
 */
function flattenEnvelope(buf, out, sampleRate) {
  const a = Math.exp(-1 / (sampleRate * ENV_RELEASE_S));
  let e = 0;
  const warm = Math.min(buf.length, Math.round(sampleRate * 0.01));
  for (let i = 0; i < warm; i += 1) e = Math.max(Math.abs(buf[i]), e * a);
  for (let i = 0; i < buf.length; i += 1) {
    e = Math.max(Math.abs(buf[i]), e * a);
    out[i] = buf[i] / Math.max(e, 1e-4);
  }
  return out;
}

export function useVocalMic() {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const [live, setLive] = useState({ midi: null, level: 0 });
  // Every frame: { ct: AudioContext time of the analysed sound, midi | null }
  const framesRef = useRef([]);
  const nodes = useRef({});
  const rafRef = useRef(null);
  const recent = useRef([]);
  const tickCount = useRef(0);
  const lastSignalAt = useRef(0);
  const resumeAt = useRef(0);
  const [deadInput, setDeadInput] = useState(false);
  const [diag, setDiag] = useState('');
  // No pitch heard for 3 s while listening (shown with the diag line on iOS).
  const [quiet, setQuiet] = useState(false);
  const heardAt = useRef(0);
  const ownCtx = useRef(null);
  const stat = useRef('');

  const tick = useCallback(() => {
    const { analyser, detector, buffer, gain } = nodes.current;
    if (!analyser) return;
    const ctx = nodes.current.ctx || getAudioContext();
    gain.gain.value = getAudioInputSettings().gain;
    // Backstop: a context that stopped (iOS interruption) is woken again.
    if (ctx.state !== 'running') {
      const now = performance.now();
      if (now - resumeAt.current > 500) {
        resumeAt.current = now;
        ctx.resume().catch(() => {});
      }
    }
    analyser.getFloatTimeDomainData(buffer);
    // iPhone / iPad: WebKit's AnalyserNode can read pure zeros from a live
    // mic while an AudioWorklet on the same node gets the sound (the tuner,
    // 2026-10-16). Prefer the worklet's frames whenever they carry sound.
    const peakOf = (b) => {
      let m = 0;
      for (let i = 0; i < b.length; i += 1) {
        const a = Math.abs(b[i]);
        if (a > m) m = a;
      }
      return m;
    };
    const anPeak = peakOf(buffer);
    let peak = anPeak;
    const { tap, tapBuf } = nodes.current;
    let tapPeak = null;
    if (tap && tapBuf && tap.read(tapBuf)) {
      tapPeak = peakOf(tapBuf);
      if (tapPeak > 0 || anPeak === 0) {
        buffer.set(tapBuf);
        peak = tapPeak;
      }
    }
    const nowMs = performance.now();
    if (peak > 0) lastSignalAt.current = nowMs;
    const dead = nowMs - lastSignalAt.current > 1500;
    setDeadInput((d) => (d === dead ? d : dead));
    if (dead || (IS_IOS && tickCount.current % 20 === 0)) {
      const tr = nodes.current.stream?.getAudioTracks()[0];
      const info = `${nodes.current.own ? 'own' : 'shared'} · an ${anPeak.toFixed(4)} wk ${tap ? tap.blocks + '/' + (tapPeak == null ? '-' : tapPeak.toFixed(4)) : 'off'} · ctx ${ctx.state} · ${ctx.sampleRate} Hz · mic ${tr ? tr.readyState + (tr.muted ? ' muted' : '') : 'none'}${navigator.audioSession ? ' · session ' + navigator.audioSession.type : ''} · ${stat.current}`;
      setDiag((d) => (d === info ? d : info));
    }
    let sum = 0;
    for (let i = 0; i < buffer.length; i += 1) sum += buffer[i] * buffer[i];
    const rms = Math.sqrt(sum / buffer.length);
    let midi = null;
    // Fixed gate, raised to the room calibration's gate when there is one
    // (the vocal mic always opens with processing off -> 'direct' mode).
    const minRms = Math.max(MIN_RMS, gateFor(nodes.current.cal, gain.gain.value));
    if (rms >= minRms) {
      const valid = (hz, clarity) => clarity >= MIN_CLARITY && hz >= MIN_HZ && hz <= MAX_HZ;
      let [hz, clarity] = detector.findPitch(buffer, ctx.sampleRate);
      // Only when the plain read fails (frames that read today are untouched).
      if (!valid(hz, clarity)) [hz, clarity] = detector.findPitch(flattenEnvelope(buffer, nodes.current.flat, ctx.sampleRate), ctx.sampleRate);
      if (valid(hz, clarity)) midi = hzToMidi(hz);
      stat.current = `rms ${rms.toFixed(4)} hz ${Math.round(hz)} cl ${clarity.toFixed(2)}`;
    } else {
      stat.current = `rms ${rms.toFixed(4)} < gate ${minRms.toFixed(4)}`;
    }
    // 3-frame median (null counts as a gap only when most frames are null).
    const r = recent.current;
    r.push(midi);
    if (r.length > 3) r.shift();
    const vals = r.filter((v) => v != null).sort((a, b) => a - b);
    const smooth = midi == null || vals.length < 2 ? midi : vals[vals.length >> 1];
    // The analysed window ends now; its centre is half a window earlier.
    // Stamped on the SHARED clock (the cues'), whichever context analyses.
    const ct = getAudioContext().currentTime - FFT_SIZE / 2 / ctx.sampleRate - (ctx.baseLatency || 0);
    framesRef.current.push({ ct, midi: smooth });
    if (framesRef.current.length > 6000) framesRef.current.splice(0, 2000);
    tickCount.current += 1;
    if (tickCount.current % 2 === 0) setLive({ midi: smooth, level: Math.min(1, rms * 8) });
    if (smooth != null) heardAt.current = nowMs;
    if (tickCount.current % 15 === 0) {
      const q = nowMs - heardAt.current > 3000;
      setQuiet((v) => (v === q ? v : q));
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const gen = useRef(0);
  const stop = useCallback(() => {
    gen.current += 1; // a start still awaiting is cancelled
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const n = nodes.current;
    n.tap?.dispose();
    n.source?.disconnect();
    n.gain?.disconnect();
    n.mute?.disconnect();
    n.stream?.getTracks().forEach((tr) => tr.stop());
    nodes.current = {};
    recent.current = [];
    setDeadInput(false);
    setListening(false);
    setLive({ midi: null, level: 0 });
  }, []);

  const open = useCallback(async () => {
    if (nodes.current.analyser) return true;
    setError(null);
    const my = ++gen.current;
    // iOS: our own context, created / resumed IN the tap (before any await).
    let own = null;
    if (IS_IOS) {
      own = ownCtx.current && ownCtx.current.state !== 'closed' ? ownCtx.current : createLiveContext();
      own.resume().catch(() => {});
      ownCtx.current = own;
    }
    try {
      const { deviceId } = getAudioInputSettings();
      // Processing off: echo cancellation/AGC/noise suppression bend a
      // sustained sung pitch and pump its level.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          // The Recorder's request (works on the iPhone): one channel.
          channelCount: 1,
        },
      });
      // Opening the mic can interrupt playback on iOS; wake it again.
      reviveAudioOutput();
      const shared = getAudioContext();
      if (shared.state !== 'running') await settle(shared.resume());
      // While the page captures, WebKit lets a NEW context start without a
      // gesture: one that isn't running now is replaced.
      if (own && own.state !== 'running') {
        await settle(own.resume());
        if (own.state !== 'running') {
          own.close().catch(() => {});
          own = createLiveContext();
          ownCtx.current = own;
          await settle(own.resume());
        }
      }
      const ctx = own || shared;
      if (my !== gen.current) {
        stream.getTracks().forEach((tr) => tr.stop());
        return false;
      }
      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      source.connect(gain).connect(analyser);
      // Keep the graph pulled by the output, silently (WebKit can leave a
      // graph with no path to the speakers idle).
      const mute = ctx.createGain();
      mute.gain.value = 0;
      analyser.connect(mute).connect(ctx.destination);
      let tap = null;
      try {
        tap = await createMicTap(ctx, gain, FFT_SIZE * 2);
      } catch {
        tap = null; // the analyser alone, as before
      }
      if (my !== gen.current) {
        tap?.dispose();
        source.disconnect();
        gain.disconnect();
        mute.disconnect();
        stream.getTracks().forEach((tr) => tr.stop());
        return false;
      }
      lastSignalAt.current = performance.now();
      heardAt.current = performance.now();
      setQuiet(false);
      nodes.current = {
        ctx: own,
        own: !!own,
        tap,
        tapBuf: tap ? new Float32Array(FFT_SIZE) : null,
        mute,
        stream,
        source,
        gain,
        analyser,
        detector: PitchDetector.forFloat32Array(FFT_SIZE),
        buffer: new Float32Array(FFT_SIZE),
        flat: new Float32Array(FFT_SIZE),
        cal: activeCalibration('direct'),
      };
      setListening(true);
      rafRef.current = requestAnimationFrame(tick);
      return true;
    } catch (err) {
      setError(err?.message ?? String(err));
      setListening(false);
      return false;
    }
  }, [tick]);

  const pending = useRef(null);
  const start = useCallback(() => {
    // A start already on its way is shared, not raced.
    if (!pending.current) {
      pending.current = open().finally(() => {
        pending.current = null;
      });
    }
    return pending.current;
  }, [open]);

  // Any tap while listening wakes a context that isn't running (a resume
  // inside a gesture is always allowed on iOS).
  useEffect(() => {
    if (!listening) return undefined;
    const wake = () => {
      for (const c of [nodes.current.ctx, getAudioContext()]) if (c && c.state !== 'running' && c.state !== 'closed') c.resume().catch(() => {});
    };
    window.addEventListener('touchend', wake, true);
    window.addEventListener('click', wake, true);
    return () => {
      window.removeEventListener('touchend', wake, true);
      window.removeEventListener('click', wake, true);
    };
  }, [listening]);

  useEffect(
    () => () => {
      stop();
      ownCtx.current?.close().catch(() => {});
      ownCtx.current = null;
    },
    [stop]
  );

  return { listening, error, live, framesRef, start, stop, deadInput, diag, quiet };
}
