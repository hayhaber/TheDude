import { useCallback, useEffect, useRef, useState } from 'react';
import { PitchDetector } from 'pitchy';
import { getAudioContext } from '../audio/audioContext';
import { frequencyToNote } from '../music/pitchUtils';
import { getAudioInputSettings } from '../audio/audioInputSettingsStore';

const MIN_CLARITY = 0.9; // pitchy's clarity is 0-1; below this, treat as noise/no pitch
// Defaults = guitar: floor below the lowest open string (E2 ~= 82Hz) with
// headroom, ceiling well above the practical fretted range.
const DEFAULT_RANGE = { fftSize: 2048, minHz: 60, maxHz: 1500 };
// Bass: low E1 is ~41Hz (a 24ms period) — a longer window (4096 samples,
// ~85ms) holds enough periods for a steady reading; the ceiling cuts off
// stray upper harmonics.
export const BASS_PITCH_RANGE = { fftSize: 4096, minHz: 35, maxHz: 500 };

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

  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const gainNodeRef = useRef(null);
  const analyserRef = useRef(null);
  const detectorRef = useRef(null);
  const bufferRef = useRef(null);
  const rafRef = useRef(null);

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

    analyser.getFloatTimeDomainData(buffer);

    let peak = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const abs = Math.abs(buffer[i]);
      if (abs > peak) peak = abs;
    }
    setInputLevel(Math.min(1, peak));

    const [pitch, detectedClarity] = detector.findPitch(buffer, getAudioContext().sampleRate);

    setClarity(detectedClarity);
    const { minHz, maxHz } = rangeRef.current;
    if (detectedClarity >= MIN_CLARITY && pitch >= minHz && pitch <= maxHz) {
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
    streamRef.current = null;
    setIsListening(false);
    setFrequency(null);
    setCurrentNote(null);
    setClarity(0);
    setInputLevel(0);
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
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
      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const gainNode = ctx.createGain();
      gainNode.gain.value = getAudioInputSettings().gain;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = rangeRef.current.fftSize;
      // source -> gain -> analyser; never connected to ctx.destination —
      // analysis only, no feedback loop through the speakers.
      source.connect(gainNode).connect(analyser);

      streamRef.current = stream;
      sourceRef.current = source;
      gainNodeRef.current = gainNode;
      analyserRef.current = analyser;
      detectorRef.current = PitchDetector.forFloat32Array(analyser.fftSize);
      bufferRef.current = new Float32Array(analyser.fftSize);

      setIsListening(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setError(err.message ?? String(err));
      setIsListening(false);
    }
  }, [tick]);

  // Cleanup on unmount — stop the mic stream and analysis loop even if the
  // caller forgets to, same guarantee useMetronome/useDrumEngine give.
  useEffect(() => stopListening, [stopListening]);

  return { isListening, startListening, stopListening, currentNote, frequency, clarity, inputLevel, error };
}
