import { useEffect, useRef, useState } from 'react';
import { startMetronome } from '../audio/metronome';

const MIN_BPM = 30;
const MAX_BPM = 300;

export function useMetronome() {
  const [bpm, setBpm] = useState(120);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [soundKey, setSoundKey] = useState('click');
  const [isRunning, setIsRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(null);
  const [volume, setVolume] = useState(70); // 0-100
  const [isMuted, setIsMuted] = useState(false);
  // Lets a caller force the click to 0 volume (e.g. a "Drum Machine only"
  // sound-source mode elsewhere) without touching the user's own
  // volume/mute state, so switching back restores exactly what they had
  // set. Exposed as a setter rather than a constructor arg since the thing
  // that decides this (useDrumEngine) itself needs this hook's live
  // bpm/beatsPerMeasure/isRunning, and hooks can't depend on each other.
  const [silenced, setSilenced] = useState(false);

  const engineRef = useRef(null);
  const tapTimesRef = useRef([]);
  // Read live by the scheduler on every click, so dragging the volume
  // slider (or toggling mute) while running doesn't need to restart the
  // engine — that would risk an audible glitch mid-beat.
  const volumeRef = useRef(0.7);

  useEffect(() => {
    volumeRef.current = isMuted || silenced ? 0 : volume / 100;
  }, [volume, isMuted, silenced]);

  // Restart the running engine whenever bpm/time-signature/sound change, so
  // adjusting them mid-playback takes effect immediately instead of waiting
  // for a manual stop/start.
  useEffect(() => {
    if (!isRunning) return undefined;

    engineRef.current = startMetronome({
      bpm,
      beatsPerMeasure,
      soundKey,
      onBeat: setCurrentBeat,
      getVolume: () => volumeRef.current,
    });

    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, bpm, beatsPerMeasure, soundKey]);

  function start() {
    setIsRunning(true);
  }

  function stop() {
    setIsRunning(false);
    setCurrentBeat(null);
  }

  function toggle() {
    if (isRunning) stop();
    else start();
  }

  function setBpmClamped(value) {
    const n = Math.round(Number(value));
    if (Number.isNaN(n)) return;
    setBpm(Math.max(MIN_BPM, Math.min(MAX_BPM, n)));
  }

  function setVolumeClamped(value) {
    const n = Math.round(Number(value));
    if (Number.isNaN(n)) return;
    setVolume(Math.max(0, Math.min(100, n)));
    if (n > 0) setIsMuted(false);
  }

  function toggleMute() {
    setIsMuted((m) => !m);
  }

  // Tap tempo: keep the last few taps within 2s of each other, average the
  // interval between them, convert to BPM.
  function tapTempo() {
    const now = performance.now();
    const taps = tapTimesRef.current.filter((t) => now - t < 2000);
    taps.push(now);
    tapTimesRef.current = taps.slice(-6);

    if (taps.length < 2) return;

    const intervals = [];
    for (let i = 1; i < taps.length; i += 1) intervals.push(taps[i] - taps[i - 1]);
    const avgMs = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
    setBpmClamped(60000 / avgMs);
  }

  return {
    bpm,
    setBpm: setBpmClamped,
    beatsPerMeasure,
    setBeatsPerMeasure,
    soundKey,
    setSoundKey,
    isRunning,
    currentBeat,
    start,
    stop,
    toggle,
    tapTempo,
    minBpm: MIN_BPM,
    maxBpm: MAX_BPM,
    volume,
    setVolume: setVolumeClamped,
    isMuted,
    setSilenced,
    toggleMute,
  };
}
