import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext } from '../audio/audioContext';
import { computeChroma, matchChordFromChroma } from '../music/chromaChordDetector';

const FFT_SIZE = 4096; // finer frequency resolution than pitch detection needs — chroma binning benefits from it
const GUESS_INTERVAL_MS = 400; // fast enough to feel live, slow enough that a guess isn't just noise from one frame

// Real-time chord *suggestion* from whatever audio the user explicitly
// shares via the browser's own tab/screen-share picker (getDisplayMedia) —
// NOT the YouTube iframe's audio directly (browsers block that; see
// SongVideoPlayer.jsx's own comment), and NOT a network fetch/scrape of
// anything. This only ever sees audio the user actively chose to share for
// this session, analyzed locally, discarded on stopListening — nothing is
// recorded or sent anywhere. Chrome/Edge only in practice; Firefox/Safari
// don't reliably support capturing a shared tab's audio track.
export function useTabAudioChordGuesser() {
  const [isListening, setIsListening] = useState(false);
  const [guess, setGuess] = useState(null); // { chord, confidence } | null
  const [error, setError] = useState(null);

  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const bufferRef = useRef(null);
  const intervalRef = useRef(null);

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
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    try {
      // video: true is required by the spec for getDisplayMedia even though
      // only the audio track is used below — the captured video track is
      // stopped immediately, nothing from it is ever shown or read.
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const audioTracks = stream.getAudioTracks();
      stream.getVideoTracks().forEach((track) => track.stop());
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((track) => track.stop());
        setError('No audio was shared — pick "This Tab" and check "Share tab audio".');
        return;
      }

      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.6; // a little temporal smoothing — raw per-frame chroma is jittery
      source.connect(analyser); // analysis only, never connected to ctx.destination

      streamRef.current = stream;
      sourceRef.current = source;
      analyserRef.current = analyser;
      bufferRef.current = new Float32Array(analyser.frequencyBinCount);

      // If the user revokes sharing from the browser's own UI (rather than
      // this app's Stop button), the track ends on its own — clean up the
      // same way stopListening() would.
      audioTracks[0].addEventListener('ended', stopListening);

      setIsListening(true);
      intervalRef.current = setInterval(() => {
        const a = analyserRef.current;
        const buf = bufferRef.current;
        if (!a || !buf) return;
        a.getFloatFrequencyData(buf);
        const chroma = computeChroma(buf, ctx.sampleRate, FFT_SIZE);
        setGuess(matchChordFromChroma(chroma));
      }, GUESS_INTERVAL_MS);
    } catch (err) {
      setError(err.message ?? String(err));
      setIsListening(false);
    }
  }, [stopListening]);

  useEffect(() => stopListening, [stopListening]);

  return { isListening, startListening, stopListening, guess, error };
}
