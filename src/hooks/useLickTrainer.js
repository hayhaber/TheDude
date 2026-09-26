import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as alphaTab from '@coderline/alphatab';
import { LICKS, SOLOS, withDerived, soloSection } from '../music/lickTrainer/library';
import { scoreToLicks, scoreToSolo, describeScore } from '../music/lickTrainer/gpImport';
import { loadUserLicks, saveUserLicks, deleteUserLicks } from '../music/lickTrainer/userLickStore';
import { analyzeTake, estimateLatency } from '../music/lickTrainer/analysis';
import { scheduleLick, openInput, defaultLatency, preloadTrainerSamples } from '../audio/lickTrainerAudio';
import { getAudioContext } from '../audio/audioContext';
import { playReference, stopReference, preloadReference } from '../audio/gpReferencePlayer';
import { getAudioInputSettings } from '../audio/audioInputSettingsStore';
import { getLibraryKey, setLibraryKey, syncLibrary, uploadGroup, deleteGroup } from '../music/lickTrainer/cloudLibrary';

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

const TICKS_PER_BEAT = 960;

// Where to play a lick/solo/section from in its Guitar Pro file, or null.
function gpSourceOf(lick) {
  if (!lick?.gpRef || !(lick.gpUrl || lick.gpBytes)) return null;
  const startTick = lick.gpRef.tickStart + (lick.view?.fromBeat ?? 0) * TICKS_PER_BEAT;
  return {
    source: { key: lick.gpUrl ?? lick.importGroup ?? lick.id, url: lick.gpUrl, bytes: lick.gpBytes },
    trackIndex: lick.gpRef.track,
    startTick,
    endTick: startTick + lick.lengthBeats * TICKS_PER_BEAT,
  };
}

export function useLickTrainer() {
  // 'licks' = the lick library; 'solos' = full solos with practice sections.
  const [mode, setModeState] = useState('licks');
  const [soloId, setSoloId] = useState(SOLOS[0]?.id ?? null);
  const [sectionIndex, setSectionIndexState] = useState(-1); // -1 = whole solo
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

  // Licks imported in the app from Guitar Pro files (this device).
  const [userLicks, setUserLicks] = useState([]);
  const [pendingImport, setPendingImport] = useState(null); // { fileName, info, score }
  // Shared library (all devices): 'off' (no key on this device) | 'syncing' |
  // 'ok' | 'bad-key' | 'not-configured' | 'offline' | 'error'.
  const [library, setLibrary] = useState(() => ({ status: getLibraryKey() ? 'syncing' : 'off' }));
  const syncingRef = useRef(false);
  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    const local = await loadUserLicks();
    setUserLicks(local.map(withDerived));
    if (!getLibraryKey()) {
      setLibrary({ status: 'off' });
      syncingRef.current = false;
      return;
    }
    setLibrary((l) => ({ ...l, status: 'syncing' }));
    try {
      const merged = await syncLibrary(local);
      setUserLicks(merged.map(withDerived));
      setLibrary({ status: 'ok', count: new Set(merged.map((r) => r.importGroup ?? r.id)).size });
    } catch (err) {
      if (err.code === 'bad-key') setLibraryKey('');
      setLibrary({ status: err.code === 'bad-key' ? 'bad-key' : ['not-configured', 'offline'].includes(err.code) ? err.code : 'error' });
    } finally {
      syncingRef.current = false;
    }
  }, []);
  useEffect(() => {
    sync();
    // Pick up what was added/deleted on another device when coming back.
    const onVisible = () => document.visibilityState === 'visible' && sync();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [sync]);
  const connectLibrary = useCallback(
    (key) => {
      setLibraryKey(key.trim());
      sync();
    },
    [sync]
  );
  const disconnectLibrary = useCallback(() => {
    setLibraryKey('');
    setLibrary({ status: 'off' });
  }, []);
  const allLicks = useMemo(() => [...LICKS, ...userLicks.filter((l) => l.kind !== 'solo')], [userLicks]);
  const allSolos = useMemo(() => [...SOLOS, ...userLicks.filter((l) => l.kind === 'solo')], [userLicks]);

  const baseLick = allLicks.find((l) => l.id === lickId) ?? LICKS[0];
  const activeSolo = allSolos.find((l) => l.id === soloId) ?? allSolos[0] ?? null;
  const sectionLick = useMemo(() => (activeSolo ? soloSection(activeSolo, sectionIndex) : null), [activeSolo, sectionIndex]);
  // What's being practiced right now: a lick, a whole solo, or one section.
  const lick = mode === 'solos' && sectionLick ? sectionLick : baseLick;

  // Load the file (and alphaTab's soundfont) as soon as a file-based
  // solo/lick is on screen, so Listen starts immediately.
  const gpKey = lick.gpUrl ?? lick.importGroup ?? null;
  useEffect(() => {
    const gp = gpSourceOf(lick);
    if (gp) preloadReference(gp.source, gp.trackIndex);
  }, [gpKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const bpm = Math.round((lick.bpm * tempoPct) / 100);

  const visibleLicks = useMemo(
    () =>
      allLicks.filter(
        (l) =>
          (genre === 'all' || (genre === 'mine' ? l.source === 'import' : l.genre === genre)) &&
          (level === 'all' || l.level === level)
      ),
    [allLicks, genre, level]
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
    stopReference();
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

  const setMode = useCallback(
    (m) => {
      stop();
      setModeState(m);
      setResult(null);
      setPhase('idle');
    },
    [stop]
  );

  const selectSolo = useCallback(
    (id) => {
      stop();
      setSoloId(id);
      setSectionIndexState(-1);
      setResult(null);
      setPhase('idle');
    },
    [stop]
  );

  const setSectionIndex = useCallback(
    (k) => {
      stop();
      setSectionIndexState(k);
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

  const listen = useCallback(async () => {
    stop();
    const runId0 = runIdRef.current;
    // Anything that came from a Guitar Pro file is played from the file
    // itself by alphaTab's synth, exactly as the file sounds.
    const gp = gpSourceOf(lick);
    if (gp) {
      setPhase('listening');
      try {
        await playReference({
          ...gp,
          speed: tempoPct / 100,
          onTick: (tick) => {
            if (runIdRef.current === runId0) setPlayheadBeat((tick - gp.startTick) / TICKS_PER_BEAT);
          },
          onEnd: () => {
            if (runIdRef.current !== runId0) return;
            setPlayheadBeat(null);
            setPhase((p) => (p === 'listening' ? (result ? 'results' : 'idle') : p));
          },
        });
      } catch (err) {
        if (runIdRef.current === runId0) {
          setError({ key: 'import', message: err?.message ?? String(err) });
          setPhase('idle');
        }
      }
      return;
    }
    // Guitar samples (usually cached already); give them a moment on the
    // very first listen, otherwise fall back to the synth voice.
    await Promise.race([preloadTrainerSamples(), new Promise((r) => setTimeout(r, 4000))]);
    if (runIdRef.current !== runId0) return;
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
  }, [bpm, lick, stop, result, tempoPct]);

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

  // ---- Guitar Pro import ----
  const readFile = useCallback(async (file) => {
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(buffer), new alphaTab.Settings());
      setPendingImport({ fileName: file.name, info: describeScore(score), score, buffer });
    } catch (err) {
      setError({ key: 'import', message: err?.message ?? String(err) });
    }
  }, []);

  const cancelImport = useCallback(() => setPendingImport(null), []);

  const commitImport = useCallback(
    async ({ title, trackIndex, saveAs, barsPerSection, genre: g, level: lv }) => {
      if (!pendingImport) return;
      const stamp = Date.now();
      const base = { idPrefix: `import-${stamp}`, title, genre: g, level: lv, source: 'import', credit: pendingImport.fileName };
      const made =
        saveAs === 'solo'
          ? [scoreToSolo(pendingImport.score, { trackIndex, barsPerSection, base })].filter(Boolean)
          : scoreToLicks(pendingImport.score, { trackIndex, barsPerPhrase: 0, base });
      // Keep the original file with the import so its reference plays from it.
      const raw = made.map((l, i) => ({ ...l, importedAt: stamp + i, importGroup: `import-${stamp}`, gpBytes: pendingImport.buffer }));
      if (raw.length === 0) {
        setError({ key: 'importEmpty' });
        return;
      }
      await saveUserLicks(raw);
      const derived = raw.map(withDerived);
      setUserLicks((u) => [...u, ...derived]);
      setPendingImport(null);
      // Into the shared library, so it's on every device.
      if (getLibraryKey()) {
        uploadGroup(raw[0].importGroup, raw)
          .then(() => sync())
          .catch((err) => setLibrary({ status: err.code === 'too-big' ? 'too-big' : err.code === 'offline' ? 'offline' : 'error' }));
      }
      if (saveAs === 'solo') {
        setMode('solos');
        selectSolo(derived[0].id);
      } else {
        setMode('licks');
        setGenre('mine');
        setLevel('all');
        selectLick(derived[0].id);
      }
    },
    [pendingImport, selectLick, selectSolo, setMode, sync]
  );

  // Deletes every lick that came from the same imported file.
  const deleteImport = useCallback(
    async (id) => {
      const target = userLicks.find((l) => l.id === id);
      if (!target) return;
      const group = userLicks.filter((l) => l.importGroup === target.importGroup);
      const ids = group.map((l) => l.id);
      // Remove it from the shared library first — otherwise the next sync
      // would bring it back from the cloud.
      if (group.some((l) => l.cloud)) {
        try {
          await deleteGroup(target.importGroup);
        } catch (err) {
          // Can't reach the library right now: keep it, or it would return.
          if (err.code === 'offline' || err.code === 'storage') {
            setLibrary({ status: err.code === 'offline' ? 'offline' : 'error' });
            return;
          }
        }
      }
      await deleteUserLicks(ids);
      setUserLicks((u) => u.filter((l) => !ids.includes(l.id)));
      if (getLibraryKey()) sync();
      if (target.kind === 'solo') selectSolo(SOLOS[0]?.id ?? null);
      else selectLick(LICKS[0].id);
    },
    [userLicks, selectLick, selectSolo, sync]
  );

  return {
    mode,
    setMode,
    solos: allSolos,
    activeSolo,
    selectSolo,
    sectionIndex,
    setSectionIndex,
    preloadSamples: preloadTrainerSamples,
    pendingImport,
    readFile,
    cancelImport,
    commitImport,
    deleteImport,
    library,
    connectLibrary,
    disconnectLibrary,
    syncLibrary: sync,
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
