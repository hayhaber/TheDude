import { useCallback, useEffect, useRef, useState } from 'react';
import { createSongRecorder } from '../../audio/songwriter/songRecorder';
import { getAudio, saveAudio } from '../../audio/songwriter/songAudioStore';
import { playSong, preparePiano } from '../../audio/songwriter/songPlayer';
import { uid } from '../../music/songwriter/song';

/**
 * The Songwriter's sound: recording a take (count-in on the capture's own
 * clock), playing takes back, playing the song / a section / a line.
 * Only one thing at a time — starting one stops the others.
 */
export function useSongAudio() {
  const recRef = useRef(null);
  const [rec, setRec] = useState(null); // { target, phase: 'count'|'rec'|'saving', begin, spb, bpb, downbeatAt }
  const [tick, setTick] = useState({ beat: -1, level: 0, elapsed: 0 });
  const [playingTake, setPlayingTake] = useState(null);
  const [playing, setPlaying] = useState(null); // { scope, handle }
  const [pos, setPos] = useState(null); // seconds into the playing timeline
  const audioEl = useRef(null);
  const urlRef = useRef(null);
  const raf = useRef(0);

  const recorder = () => {
    if (!recRef.current) recRef.current = createSongRecorder();
    return recRef.current;
  };

  useEffect(() => {
    preparePiano();
    return () => {
      cancelAnimationFrame(raf.current);
      recRef.current?.dispose();
      audioEl.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const stopTake = useCallback(() => {
    audioEl.current?.pause();
    audioEl.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setPlayingTake(null);
  }, []);

  const stopSong = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setPlaying((p) => {
      p?.handle.stop();
      return null;
    });
    setPos(null);
  }, []);

  // ---- recording ----
  const startRec = useCallback(
    async (target, { bpm, beatsPerBar, click }) => {
      stopTake();
      stopSong();
      const r = recorder();
      setRec({ target, phase: 'opening' });
      try {
        const { downbeatAt, begin } = await r.start({ bpm, beatsPerBar, click });
        const spb = 60 / bpm;
        const state = { target, phase: click === 'off' ? 'rec' : 'count', begin, spb, bpb: beatsPerBar, downbeatAt };
        setRec(state);
        const loop = () => {
          const now = r.now();
          const beat = Math.floor((now - begin) / spb);
          setTick({ beat, level: r.level(), elapsed: Math.max(0, now - (downbeatAt ?? begin)) });
          if (downbeatAt != null && now >= downbeatAt) setRec((s) => (s && s.phase === 'count' ? { ...s, phase: 'rec' } : s));
          raf.current = requestAnimationFrame(loop);
        };
        cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(loop);
        return true;
      } catch (e) {
        setRec({ target, phase: 'error', error: e?.name === 'NotAllowedError' ? 'denied' : 'failed' });
        setTimeout(() => setRec((s) => (s?.phase === 'error' ? null : s)), 6000);
        return false;
      }
    },
    [stopTake, stopSong]
  );

  /** Ends the take; resolves to { take (for the song), audio (samples, downbeat, clicks…) } or null. */
  const stopRec = useCallback(async ({ bpm, time }) => {
    cancelAnimationFrame(raf.current);
    const r = recRef.current;
    if (!r) return null;
    setRec((s) => (s ? { ...s, phase: 'saving' } : s));
    const res = await r.stop();
    if (!res || res.duration < 0.3) {
      setRec(null);
      return null;
    }
    const id = uid('t');
    await saveAudio(id, res.blob, { duration: res.duration });
    const take = { id, at: Date.now(), dur: Math.round(res.duration * 10) / 10, peaks: res.peaks, bpm, time, downbeat: res.downbeat };
    setRec(null);
    return { take, audio: res };
  }, []);

  const cancelRec = useCallback(() => {
    cancelAnimationFrame(raf.current);
    recRef.current?.cancel();
    setRec(null);
  }, []);

  const clearRecError = useCallback(() => setRec(null), []);

  // ---- takes ----
  const playTake = useCallback(
    async (id) => {
      stopSong();
      if (playingTake === id) {
        stopTake();
        return;
      }
      stopTake();
      const blob = await getAudio(id);
      if (!blob) {
        setPlayingTake({ id, missing: true });
        return;
      }
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const a = new Audio(url);
      audioEl.current = a;
      a.onended = () => stopTake();
      setPlayingTake(id);
      a.play().catch(() => stopTake());
    },
    [playingTake, stopTake, stopSong]
  );

  /** Decoded samples of a stored take (for finding its notes again). */
  const loadTakeSamples = useCallback(async (id) => {
    const blob = await getAudio(id);
    if (!blob) return null;
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new Ctx(1, 1, 48000);
    const buf = await new Promise((res, rej) => {
      blob.arrayBuffer().then((ab) => {
        const p = ctx.decodeAudioData(ab, res, rej);
        if (p && p.then) p.then(res, rej);
      }, rej);
    });
    return { samples: buf.getChannelData(0), sampleRate: buf.sampleRate };
  }, []);

  // ---- song playback ----
  const play = useCallback(
    (song, scope, only = null) => {
      stopTake();
      if (playing) {
        const same = playing.scope === scope;
        stopSong();
        if (same) return;
      }
      const handle = playSong(song, { only });
      if (!handle) return;
      setPlaying({ scope, handle });
      const end = handle.timeline.duration + 0.4;
      const loop = () => {
        const t = handle.now();
        if (t > end) {
          setPlaying(null);
          setPos(null);
          return;
        }
        setPos(t);
        raf.current = requestAnimationFrame(loop);
      };
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(loop);
    },
    [playing, stopSong, stopTake]
  );

  const stopAll = useCallback(() => {
    cancelAnimationFrame(raf.current);
    stopSong();
    stopTake();
  }, [stopSong, stopTake]);

  return {
    rec,
    tick,
    startRec,
    stopRec,
    cancelRec,
    clearRecError,
    playingTake,
    playTake,
    stopTake,
    loadTakeSamples,
    playing,
    pos,
    play,
    stopAll,
  };
}
