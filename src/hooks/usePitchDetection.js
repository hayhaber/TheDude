import { useCallback, useEffect, useRef, useState } from 'react';
import { PitchDetector } from 'pitchy';
import { getAudioContext, prepareAudioOutput, reviveAudioOutput } from '../audio/audioContext';
import { createLiveContext } from '../audio/amp/liveInput';
import { frequencyToNote, refineFundamental } from '../music/pitchUtils';
import { getAudioInputSettings } from '../audio/audioInputSettingsStore';
import { activeCalibration, createGate, frameRms } from '../audio/noiseCalibration';

// A resume() that iOS refuses can stay pending forever: wait at most 400 ms.
const settle = (p) => Promise.race([p.catch(() => {}), new Promise((r) => setTimeout(r, 400))]);

const MIN_CLARITY = 0.9; // pitchy's clarity is 0-1; below this, treat as noise/no pitch
// Defaults = guitar: floor below the lowest open string (E2 ~= 82Hz) with
// headroom, ceiling well above the practical fretted range.
const DEFAULT_RANGE = { fftSize: 2048, minHz: 60, maxHz: 1500 };
// Bass: low E1 is ~41Hz (a 24ms period) — a longer window (4096 samples,
// ~85ms) holds enough periods for a steady reading; the ceiling cuts off
// stray upper harmonics.
export const BASS_PITCH_RANGE = { fftSize: 4096, minHz: 35, maxHz: 500, refine: true, ownContext: true };
// The tuner (guitar): same window and range as the default, plus reading the
// FUNDAMENTAL (refineFundamental) — inharmonic partials (piano!) otherwise
// pull the reading sharp. Other mic features keep the default unchanged.
// ownContext: the tuner analyses on an AudioContext of its own, created and
// resumed IN the Start tap (the Recorder's pattern, which works on iPhone):
// on iOS the shared context stayed paused after the mic opened and the
// tuner got pure digital silence.
export const TUNER_PITCH_RANGE = { ...DEFAULT_RANGE, refine: true, ownContext: true };

// Real-time mic pitch detection, built on an AnalyserNode + requestAnimationFrame
// polling loop rather than a custom AudioWorkletProcessor. Pitchy's own analysis
// (McLeod Pitch Method) is a per-buffer main-thread computation either way, and an
// AnalyserNode read is what pitchy's own docs demonstrate — a worklet would add a
// separate module file, Vite worklet-loading config, and a postMessage hop for no
// latency win a tuner would notice (musical response time, not sample-accurate DSP).
// Reuses the app's single shared AudioContext (audio/audioContext.js) so mic
// analysis and note/chord playback never fight over separate contexts.
export function usePitchDetection(range = DEFAULT_RANGE) {
  // Read at analysis time (a new window size applies on the next start).
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const [isListening, setIsListening] = useState(false);
  const [frequency, setFrequency] = useState(null);
  const [currentNote, setCurrentNote] = useState(null); // { midi, name, centsOff }
  const [clarity, setClarity] = useState(0);
  const [inputLevel, setInputLevel] = useState(0); // 0-1 peak amplitude, post-gain — drives a VU meter
  const [error, setError] = useState(null);
  // true while listening but the mic delivers exact digital silence (a dead
  // pipeline — e.g. an iOS audio session / context that never woke up), not
  // just a quiet room (which always has some noise).
  const [deadInput, setDeadInput] = useState(false);
  const lastSignalAt = useRef(0);
  const trackRef = useRef(null);
  // Shown with the no-signal message: context state + rate, mic track state —
  // a screenshot then says where the sound stops.
  const [diag, setDiag] = useState('');

  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const gainNodeRef = useRef(null);
  const analyserRef = useRef(null);
  const detectorRef = useRef(null);
  const bufferRef = useRef(null);
  const resumeAt = useRef(0);
  const ctxRef = useRef(null); // the context in use
  const ownCtxRef = useRef(null); // our own (ownContext), closed on stop
  const rafRef = useRef(null);
  // Room calibration (Settings -> Audio Input -> Calibrate) for this mic +
  // mode, read when the mic opens. null = none: no gate, exactly as before.
  const calRef = useRef(null);
  const gateRef = useRef(null);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    const detector = detectorRef.current;
    const buffer = bufferRef.current;
    const gainNode = gainNodeRef.current;
    if (!analyser || !detector || !buffer) return;

    // Read live rather than only at startListening() time, so dragging the
    // gain slider in Settings while a session is already running takes
    // effect immediately — same pattern useMetronome's volumeRef uses for
    // the click volume slider.
    if (gainNode) gainNode.gain.value = getAudioInputSettings().gain;

    // Backstop: a context that stopped running (iOS interruption) is woken
    // again, at most every ~0.5 s.
    const actx = ctxRef.current || getAudioContext();
    if (actx.state !== 'running') {
      const now = performance.now();
      if (!resumeAt.current || now - resumeAt.current > 500) {
        resumeAt.current = now;
        actx.resume().catch(() => {});
      }
    }

    analyser.getFloatTimeDomainData(buffer);

    let peak = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const abs = Math.abs(buffer[i]);
      if (abs > peak) peak = abs;
    }
    setInputLevel(Math.min(1, peak));
    const nowMs = performance.now();
    if (peak > 0) lastSignalAt.current = nowMs;
    const dead = nowMs - lastSignalAt.current > 1500;
    setDeadInput((d) => (d === dead ? d : dead));
    if (dead) {
      const tr = trackRef.current;
      const info = `ctx ${actx.state} · ${actx.sampleRate} Hz · mic ${tr ? tr.readyState + (tr.muted ? ' muted' : '') + (tr.enabled ? '' : ' disabled') : 'none'}${navigator.audioSession ? ' · session ' + navigator.audioSession.type : ''}`;
      setDiag((d) => (d === info ? d : info));
    }

    const sr = (ctxRef.current || getAudioContext()).sampleRate;
    let [pitch, detectedClarity] = detector.findPitch(buffer, sr);
    if (rangeRef.current.refine && detectedClarity >= MIN_CLARITY && pitch > 0) pitch = refineFundamental(buffer, sr, pitch);

    setClarity(detectedClarity);
    const { minHz, maxHz } = rangeRef.current;
    // Calibrated noise gate: room noise below it (hum, fan) never becomes a
    // note. Always open when uncalibrated.
    const cal = calRef.current;
    const gateOpen = !cal || gateRef.current(frameRms(buffer), cal, gainNode ? gainNode.gain.value : 1);
    if (gateOpen && detectedClarity >= MIN_CLARITY && pitch >= minHz && pitch <= maxHz) {
      setFrequency(pitch);
      setCurrentNote(frequencyToNote(pitch));
    } else {
      setFrequency(null);
      setCurrentNote(null);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopListening = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    sourceRef.current?.disconnect();
    gainNodeRef.current?.disconnect();
    sourceRef.current = null;
    gainNodeRef.current = null;
    analyserRef.current = null;
    detectorRef.current = null;
    bufferRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    // Our own context stays (idle) for a restart — e.g. Guitar <-> Bass —
    // which happens outside a tap; it's closed when the tuner goes away.
    ctxRef.current = null;
    trackRef.current = null;
    streamRef.current = null;
    setIsListening(false);
    setFrequency(null);
    setCurrentNote(null);
    setClarity(0);
    setInputLevel(0);
    setDeadInput(false);
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    // iOS: everything audio must start IN the tap (before the await below).
    let own = null;
    if (rangeRef.current.ownContext) {
      own = ownCtxRef.current && ownCtxRef.current.state !== 'closed' ? ownCtxRef.current : createLiveContext();
      own.resume().catch(() => {});
      ownCtxRef.current = own;
    } else {
      // The same as the Vocal mic, which works on iPhone.
      prepareAudioOutput();
    }
    try {
      // deviceId/inputMode come from Settings (audioInputSettingsStore.js) —
      // 'direct' keeps processing off (a clean instrument signal, e.g. an
      // audio interface/DI box), 'microphone' turns it on (better for a
      // room mic picking up an acoustic guitar, which benefits from the
      // browser's own noise/echo handling the same way voice chat does).
      const { deviceId, inputMode } = getAudioInputSettings();
      const processingEnabled = inputMode === 'microphone';
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: processingEnabled,
          noiseSuppression: processingEnabled,
          autoGainControl: processingEnabled,
        },
      });
      // iOS: the permission prompt / the switch to play-and-record can leave
      // the context created in the tap stuck (suspended / interrupted), and
      // a resume outside the tap is refused. While the page is capturing,
      // WebKit lets a NEW context start without a gesture — so if ours isn't
      // running now, replace it.
      if (own && own.state !== 'running') {
        await settle(own.resume());
        if (own.state !== 'running') {
          own.close().catch(() => {});
          own = createLiveContext();
          ownCtxRef.current = own;
          await settle(own.resume());
        }
      }
      const ctx = own || getAudioContext();
      ctxRef.current = ctx;
      trackRef.current = stream.getAudioTracks()[0] || null;
      // iOS: opening the mic interrupts/suspends a context — while it isn't
      // running the analyser gets no audio. Wake it again.
      if (!own) reviveAudioOutput();
      if (ctx.state !== 'running') await settle(ctx.resume());
      const source = ctx.createMediaStreamSource(stream);
      const gainNode = ctx.createGain();
      gainNode.gain.value = getAudioInputSettings().gain;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = rangeRef.current.fftSize;
      // source -> gain -> analyser; never connected to ctx.destination —
      // analysis only, no feedback loop through the speakers.
      source.connect(gainNode).connect(analyser);
      // Our own context: keep the graph pulled by the output, silently
      // (WebKit can leave a graph with no path to the speakers idle).
      if (own) {
        const mute = own.createGain();
        mute.gain.value = 0;
        analyser.connect(mute).connect(own.destination);
      }

      streamRef.current = stream;
      sourceRef.current = source;
      gainNodeRef.current = gainNode;
      analyserRef.current = analyser;
      detectorRef.current = PitchDetector.forFloat32Array(analyser.fftSize);
      bufferRef.current = new Float32Array(analyser.fftSize);

      calRef.current = activeCalibration();
      gateRef.current = createGate();

      lastSignalAt.current = performance.now();
      setDeadInput(false);
      setIsListening(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setError(err.message ?? String(err));
      setIsListening(false);
    }
  }, [tick]);

  // Any tap while listening wakes a context that isn't running (a resume
  // inside a gesture is always allowed on iOS).
  useEffect(() => {
    if (!isListening) return undefined;
    const wake = () => {
      const c = ctxRef.current;
      if (c && c.state !== 'running' && c.state !== 'closed') c.resume().catch(() => {});
    };
    window.addEventListener('touchend', wake, true);
    window.addEventListener('click', wake, true);
    return () => {
      window.removeEventListener('touchend', wake, true);
      window.removeEventListener('click', wake, true);
    };
  }, [isListening]);

  // Cleanup on unmount — stop the mic stream and analysis loop even if the
  // caller forgets to, same guarantee useMetronome/useDrumEngine give.
  useEffect(
    () => () => {
      stopListening();
      if (ownCtxRef.current) {
        ownCtxRef.current.close().catch(() => {});
        ownCtxRef.current = null;
      }
    },
    [stopListening]
  );

  return { isListening, startListening, stopListening, currentNote, frequency, clarity, inputLevel, error, deadInput, diag };
}
