import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext } from '../audio/audioContext';
import { computeChroma, matchChordFromChroma } from '../music/chromaChordDetector';
import { getAudioInputSettings } from '../audio/audioInputSettingsStore';

const FFT_SIZE = 4096; // matches useTabAudioChordGuesser.js's own choice — chroma binning wants the finer resolution
const GUESS_INTERVAL_MS = 250; // faster than the tab-audio guesser's 400ms — Chord Rhythm needs to catch a strum landing close to a beat, not just eventually notice a sustained chord

// Same real-time chord-guessing core as useTabAudioChordGuesser.js
// (computeChroma + matchChordFromChroma over an AnalyserNode), sourced
// from the actual MICROPHONE (getUserMedia) instead of a shared tab/screen
// — this is what makes Practice -> Chord Rhythm possible for guitar: it's
// the only mic-based chord (not single-note) detector in the app. Local
// analysis only, nothing recorded or sent anywhere; the stream is torn
// down on stopListening/unmount exactly like every other mic feature here.
//
// Reads the SAME shared input settings (device/gain/direct-vs-microphone
// processing) usePitchDetection.js does — Settings -> Audio Input is meant
// to apply everywhere a mic gets opened, including an audio interface
// selected there for a guitar plugged in directly, not just the tuner/
// single-note features. Before this, this hook always called
// getUserMedia({ audio: true }) with no deviceId and processing left on,
// silently ignoring whatever device/mode the user had actually chosen.
export function useMicChordDetector() {
  const [isListening, setIsListening] = useState(false);
  const [guess, setGuess] = useState(null); // { chord, confidence, root, qualityKey } | null
  const [error, setError] = useState(null);

  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const gainNodeRef = useRef(null);
  const analyserRef = useRef(null);
  const bufferRef = useRef(null);
  const intervalRef = useRef(null);
  // Mirrors `guess` state without waiting for a re-render — the rhythm
  // engine's own tick loop (useGuitarChordRhythm.js) reads this every
  // frame to judge against the active chord, and needs the latest value
  // synchronously rather than however many ticks behind a React state
  // update would be.
  const guessRef = useRef(null);

  const stopListening = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    sourceRef.current?.disconnect();
    gainNodeRef.current?.disconnect();
    sourceRef.current = null;
    gainNodeRef.current = null;
    analyserRef.current = null;
    bufferRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsListening(false);
    setGuess(null);
    guessRef.current = null;
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    try {
      // Same device/gain/processing settings usePitchDetection.js reads —
      // see this file's header comment.
      const { deviceId, inputMode, gain } = getAudioInputSettings();
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
      gainNode.gain.value = gain;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.6;
      // source -> gain -> analyser; never connected to ctx.destination —
      // analysis only, no feedback loop through the speakers.
      source.connect(gainNode).connect(analyser);

      streamRef.current = stream;
      sourceRef.current = source;
      gainNodeRef.current = gainNode;
      analyserRef.current = analyser;
      bufferRef.current = new Float32Array(analyser.frequencyBinCount);

      stream.getAudioTracks()[0]?.addEventListener('ended', stopListening);

      setIsListening(true);
      intervalRef.current = setInterval(() => {
        const a = analyserRef.current;
        const buf = bufferRef.current;
        if (!a || !buf) return;
        // Read live, not just at startListening() time, so dragging the
        // gain slider in Settings mid-session takes effect immediately —
        // same pattern usePitchDetection.js's tick() uses.
        const g = gainNodeRef.current;
        if (g) g.gain.value = getAudioInputSettings().gain;
        a.getFloatFrequencyData(buf);
        const chroma = computeChroma(buf, ctx.sampleRate, FFT_SIZE);
        const next = matchChordFromChroma(chroma);
        guessRef.current = next;
        setGuess(next);
      }, GUESS_INTERVAL_MS);
    } catch (err) {
      setError(err.message ?? String(err));
      setIsListening(false);
    }
  }, [stopListening]);

  useEffect(() => stopListening, [stopListening]);

  return { isListening, startListening, stopListening, guess, guessRef, error };
}
