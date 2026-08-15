import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext } from '../audio/audioContext';
import { computeChroma, matchChordFromChroma } from '../music/chromaChordDetector';

const FFT_SIZE = 4096; // matches useTabAudioChordGuesser.js's own choice — chroma binning wants the finer resolution
const GUESS_INTERVAL_MS = 250; // faster than the tab-audio guesser's 400ms — Chord Rhythm needs to catch a strum landing close to a beat, not just eventually notice a sustained chord

// Same real-time chord-guessing core as useTabAudioChordGuesser.js
// (computeChroma + matchChordFromChroma over an AnalyserNode), sourced
// from the actual MICROPHONE (getUserMedia) instead of a shared tab/screen
// — this is what makes Practice -> Chord Rhythm possible for guitar: it's
// the only mic-based chord (not single-note) detector in the app. Local
// analysis only, nothing recorded or sent anywhere; the stream is torn
// down on stopListening/unmount exactly like every other mic feature here.
export function useMicChordDetector() {
  const [isListening, setIsListening] = useState(false);
  const [guess, setGuess] = useState(null); // { chord, confidence, root, qualityKey } | null
  const [error, setError] = useState(null);

  const streamRef = useRef(null);
  const sourceRef = useRef(null);
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
    sourceRef.current = null;
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser); // analysis only, never connected to ctx.destination

      streamRef.current = stream;
      sourceRef.current = source;
      analyserRef.current = analyser;
      bufferRef.current = new Float32Array(analyser.frequencyBinCount);

      stream.getAudioTracks()[0]?.addEventListener('ended', stopListening);

      setIsListening(true);
      intervalRef.current = setInterval(() => {
        const a = analyserRef.current;
        const buf = bufferRef.current;
        if (!a || !buf) return;
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
