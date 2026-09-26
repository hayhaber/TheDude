import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LICKS, findLick } from '../music/lickTrainer/library';
import { analyzeTake, estimateLatency } from '../music/lickTrainer/analysis';
import { scheduleLick, openInput, defaultLatency } from '../audio/lickTrainerAudio';
import { getAudioContext } from '../audio/audioContext';
import { getAudioInputSettings } from '../audio/audioInputSettingsStore';

// Practice -> Lick Trainer: pick a lick, hear it, play it back, get judged.
//
// phases: idle | listening | countIn | recording | analyzing | results | calibrating
// Lifted to App level because the lick (and the note being played) is
// drawn on the shared Stage Fretboard.

export const TEMPO_OPTIONS = [50, 60, 70, 80, 90, 100, 110, 120];
const COUNT_IN_BEATS = 4;
const TAIL_S = 0.8; // keep recording a little past the last note
const LATENCY_KEY = 'lick-trainer-latency';
const HISTORY_KEY = 'lick-trainer-history';
const CALIBRATION_CLICKS = 8;
const CALIBRATION_BPM = 90;

function readJson(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full/blocked — history is a convenience, not critical
  }
}

export function useLickTrainer() {
  const [genre, setGenre] = useState('all');
  const [level, setLevel] = useState('all');
  const [lickId, setLickId] = useState(LICKS[0].id);
  const [tempoPct, setTempoPct] = useState(70);
  // Click through the take by default only on a direct (DI / interface)
  // input — a room mic would hear it from the speakers.
  const [clickDuring, setClickDuring] = useState(() => getAudioInputSettings().inputMode !== 'microphone');
  const [phase, setPhase] = useState('idle');
  const [playheadBeat, setPlayheadBeat] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [inputLevel, setInputLevel] = useState(0);
  const [latency, setLatency] = useState(() => {
    const v = readJson(LATENCY_KEY, null);
    return typeof v === 'number' ? v : null;
  });
  const [history, setHistory] = useState(() => readJson(HISTORY_KEY, {}));

  const lick = findLick(lickId) ?? LICKS[0];
  const bpm = Math.round((lick.bpm * tempoPct) / 100);

  const visibleLicks = useMemo(
    () => LICKS.filter((l) => (genre === 'all' || l.genre === genre) && (level === 'all' || l.level === level)),
    [genre, level]
  );

  const scheduleRef = useRef(null);
  const inputRef = useRef(null);
  const rafRef = useRef(null);
  const timersRef = useRef([]);
  const runIdRef = useRef(0);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const stop = useCallback(() => {
    runIdRef.current += 1;
    clearTimers();
    scheduleRef.current?.stop();
    scheduleRef.current = null;
    setPlayheadBeat(null);
    setInputLevel(0);
    setPhase((p) => (p === 'results' ? 'results' : 'idle'));
  }, []);

  // Release the input device when the trainer goes away.
  useEffect(
    () => () => {
      clearTimers();
      scheduleRef.current?.stop();
      inputRef.current?.close();
      inputRef.current = null;
    },
    []
  );

  const selectLick = useCallback(
    (id) => {
      stop();
      setLickId(id);
      setResult(null);
      setPhase('idle');
    },
    [stop]
  );

  // Moving playhead + (while recording) input meter.
  function startPlayhead(startTime, spb, endTime, withLevel) {
    const ctx = getAudioContext();
    const frame = () => {
      const now = ctx.currentTime;
      setPlayheadBeat((now - startTime) / spb);
      if (withLevel && inputRef.current) setInputLevel(inputRef.current.level());
      if (now < endTime) rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }

  const listen = useCallback(() => {
    stop();
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const spb = 60 / bpm;
    const startTime = ctx.currentTime + 0.15;
    const sched = scheduleLick({ notes: lick.notes, bpm, startTime, countInBeats: 0, playNotes: true, lengthBeats: lick.lengthBeats });
    scheduleRef.current = sched;
    setPhase('listening');
    const runId = runIdRef.current;
    startPlayhead(startTime, spb, sched.endTime + 0.3, false);
    timersRef.current.push(
      setTimeout(() => {
        if (runIdRef.current !== runId) return;
        setPlayheadBeat(null);
        setPhase((p) => (p === 'listening' ? (result ? 'results' : 'idle') : p));
      }, (sched.endTime - ctx.currentTime + 0.4) * 1000)
    );
  }, [bpm, lick, stop, result]);

  const ensureInput = useCallback(async () => {
    if (inputRef.current) return inputRef.current;
    const input = await openInput();
    inputRef.current = input;
    return input;
  }, []);

  const record = useCallback(async () => {
    stop();
    setError(null);
    const runId = runIdRef.current;
    let input;
    try {
      input = await ensureInput();
    } catch (err) {
      setError({ key: 'mic', message: err?.message ?? String(err) });
      setPhase('idle');
      return;
    }
    if (runIdRef.current !== runId) return;
    const ctx = getAudioContext();
    const spb = 60 / bpm;
    const startTime = ctx.currentTime + 0.25 + COUNT_IN_BEATS * spb;
    input.start();
    const sched = scheduleLick({
      notes: lick.notes,
      bpm,
      startTime,
      countInBeats: COUNT_IN_BEATS,
      playNotes: false,
      clickDuring,
      lengthBeats: lick.lengthBeats,
    });
    scheduleRef.current = sched;
    setPhase('countIn');
    setResult(null);
    startPlayhead(startTime, spb, sched.endTime + TAIL_S, true);
    timersRef.current.push(
      setTimeout(() => {
        if (runIdRef.current === runId) setPhase('recording');
      }, (startTime - ctx.currentTime) * 1000)
    );
    timersRef.current.push(
      setTimeout(async () => {
        if (runIdRef.current !== runId) return;
        setPhase('analyzing');
        setPlayheadBeat(null);
        setInputLevel(0);
        const take = await input.stop();
        if (runIdRef.current !== runId) return;
        // Let the "Analyzing" state paint before the (synchronous) analysis.
        setTimeout(() => {
          if (runIdRef.current !== runId) return;
          const expected = lick.notes.map((n, i) => ({
            time: sched.noteTimes[i].time,
            duration: sched.noteTimes[i].duration,
            midi: n.midi,
            technique: n.technique,
            bend: n.bend,
            vibrato: n.vibrato,
          }));
          const res = analyzeTake({
            ...take,
            latency: latency ?? defaultLatency(),
            expected,
            clickTimes: sched.clickTimes,
          });
          const entry = { ...res, lickId: lick.id, tempoPct, bpm, at: Date.now(), calibrated: latency != null };
          setResult(entry);
          setPhase('results');
          if (!res.signal.tooQuiet) {
            setHistory((h) => {
              const prev = h[lick.id] ?? { attempts: 0, best: null };
              const best =
                !prev.best || res.summary.score > prev.best.score || (res.summary.score === prev.best.score && tempoPct > prev.best.tempoPct)
                  ? { score: res.summary.score, tempoPct }
                  : prev.best;
              const next = { ...h, [lick.id]: { attempts: prev.attempts + 1, best, last: { score: res.summary.score, tempoPct } } };
              writeJson(HISTORY_KEY, next);
              return next;
            });
          }
        }, 30);
      }, (sched.endTime + TAIL_S - ctx.currentTime) * 1000)
    );
  }, [bpm, clickDuring, ensureInput, latency, lick, stop, tempoPct]);

  // The player picks any note on each of 8 clicks; the median delay from
  // click to captured attack is this setup's round-trip latency.
  const calibrate = useCallback(async () => {
    stop();
    setError(null);
    const runId = runIdRef.current;
    let input;
    try {
      input = await ensureInput();
    } catch (err) {
      setError({ key: 'mic', message: err?.message ?? String(err) });
      return;
    }
    if (runIdRef.current !== runId) return;
    const ctx = getAudioContext();
    const spb = 60 / CALIBRATION_BPM;
    const startTime = ctx.currentTime + 0.3 + 2 * spb;
    input.start();
    const sched = scheduleLick({ notes: [], bpm: CALIBRATION_BPM, startTime, countInBeats: 0, playNotes: false, clickDuring: true, lengthBeats: CALIBRATION_CLICKS });
    scheduleRef.current = sched;
    setPhase('calibrating');
    startPlayhead(startTime, spb, sched.endTime + 0.5, true);
    timersRef.current.push(
      setTimeout(async () => {
        if (runIdRef.current !== runId) return;
        const take = await input.stop();
        setPlayheadBeat(null);
        setInputLevel(0);
        const est = estimateLatency({ ...take, clickTimes: sched.clickTimes });
        // A few ms below zero is detector resolution, not a real negative
        // delay; anything far outside a plausible range is a failed run.
        if (est == null || est < -0.03 || est > 0.6) {
          setError({ key: 'calibration' });
        } else {
          const value = Math.max(0, est);
          setLatency(value);
          writeJson(LATENCY_KEY, value);
        }
        setPhase(result ? 'results' : 'idle');
      }, (sched.endTime + 0.5 - ctx.currentTime) * 1000)
    );
  }, [ensureInput, result, stop]);

  const raiseTempo = useCallback(() => {
    setTempoPct((p) => TEMPO_OPTIONS.find((v) => v > p) ?? p);
  }, []);

  // Which note the playhead is on — drives the fretboard highlight.
  const playingOrder = useMemo(() => {
    if (playheadBeat == null) return null;
    const note = lick.notes.find((n) => playheadBeat >= n.start && playheadBeat < n.start + n.duration);
    return note ? note.order : null;
  }, [playheadBeat, lick]);

  return {
    genre,
    setGenre,
    level,
    setLevel,
    visibleLicks,
    lick,
    selectLick,
    tempoPct,
    setTempoPct,
    bpm,
    clickDuring,
    setClickDuring,
    phase,
    playheadBeat,
    playingOrder,
    result: result && result.lickId === lick.id ? result : null,
    error,
    inputLevel,
    latency,
    history,
    listen,
    record,
    stop,
    calibrate,
    raiseTempo,
  };
}
