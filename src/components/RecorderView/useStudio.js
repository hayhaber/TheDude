import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import * as P from '../../audio/studio/project';
import { createStudioEngine, capturePasses, latencyFromCountIn, renderMix, saveLatency, savedLatency } from '../../audio/studio/studioEngine';
import { encodeMp3, MP3_DEFAULT_KBPS } from '../../audio/studio/mp3';
import { computePeaks, encodeWav, encodeWavBuffer } from '../../audio/recorder';
import {
  currentProfileId,
  deleteProject as dbDeleteProject,
  deleteTake as dbDeleteTake,
  getTakeAudio,
  listProjects,
  listTakes,
  newTakeId,
  renameTake as dbRenameTake,
  saveProject,
  saveTake,
} from '../../audio/recorderStore';

export const MAX_SECONDS = 15 * 60;
const PREFS_KEY = 'dudestar-p-rec-prefs'; // per profile
const CURRENT_KEY = 'dudestar-p-rec-project'; // last open project, per profile
const IMPORT_MAX_BYTES = 200 * 1024 * 1024;
export const PEAKS_PER_SEC = 100;

// iPhone/iPad (incl. iPadOS posing as a Mac): the mic must close after each
// take, or everything plays from the earpiece. Elsewhere it stays open while
// the Recorder is on screen — one input path, one latency for the session.
const IS_IOS =
  typeof navigator !== 'undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
    return {
      sound: p.sound === 'amp' ? 'amp' : 'dry',
      // Count-in by default: the mic hearing it lets each take align itself.
      click: ['off', 'count', 'all'].includes(p.click) ? p.click : 'count',
      snap: p.snap !== false,
    };
  } catch {
    return { sound: 'dry', click: 'count', snap: true };
  }
}

// iOS sends ALL sound to the earpiece while the microphone is open: the mic
// is closed as soon as a recording ends and the page's audio session is set
// back to plain playback (Safari 16.4+; other browsers ignore it).
function setAudioSession(type) {
  try {
    if (navigator.audioSession) navigator.audioSession.type = type;
  } catch {
    /* not supported */
  }
}

/** Max-abs envelope of an AudioBuffer, PEAKS_PER_SEC values a second (0..1). */
function envelope(buf) {
  const per = Math.max(1, Math.round(buf.sampleRate / PEAKS_PER_SEC));
  const n = Math.ceil(buf.length / per);
  const out = new Float32Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) {
      let m = out[i];
      const e = Math.min(d.length, (i + 1) * per);
      for (let k = i * per; k < e; k++) {
        const a = d[k] < 0 ? -d[k] : d[k];
        if (a > m) m = a;
      }
      out[i] = m;
    }
  }
  return out;
}

function safeName(s) {
  return (s || 'take').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'take';
}

/**
 * Everything behind the Recorder: the open project (with undo), the engine
 * (play / record / loop / punch), the library of takes, import and export.
 */
export function useStudio({ t, initialBpm = 100 }) {
  const profileId = useRef(currentProfileId()).current;
  const engine = useMemo(() => createStudioEngine(), []);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [projects, setProjects] = useState([]);
  const [project, setProjectState] = useState(null);
  const [takes, setTakes] = useState([]);
  const [phase, setPhase] = useState('idle'); // idle | opening | playing | recording | saving
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [selection, setSelection] = useState(null); // region id
  const [busyTask, setBusyTask] = useState(null); // 'export' | 'import' | 'calibrate'
  const [bufVersion, setBufVersion] = useState(0);
  const [latencyMs, setLatencyMs] = useState(() => {
    const s = savedLatency();
    return s == null ? null : Math.round(s * 1000);
  });
  const hist = useRef(P.createHistory());
  const [histVersion, setHistVersion] = useState(0);
  const projectRef = useRef(project);
  projectRef.current = project;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const tRef = useRef(t);
  tRef.current = t;
  const recRef = useRef(null); // the running recording
  const peaks = useRef(new Map());

  // ---- position (outside React state: only what shows it re-renders) ----
  const pos = useRef({ position: 0, counting: false, countLeft: 0 });
  const posSubs = useRef(new Set());
  const setPos = useCallback((v) => {
    pos.current = v;
    posSubs.current.forEach((fn) => fn());
  }, []);
  const subscribe = useCallback((fn) => {
    posSubs.current.add(fn);
    return () => posSubs.current.delete(fn);
  }, []);
  const positionStore = useMemo(() => ({ subscribe, get: () => pos.current }), [subscribe]);

  // ---- persistence ----
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const saveTimer = useRef(0);
  useEffect(() => {
    if (!project) return undefined;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveProject(project)
        .then(() => setProjects((list) => [project, ...list.filter((x) => x.id !== project.id)]))
        .catch((e) => setError(tRef.current('rec.errSave', { msg: e?.message || String(e) })));
      try {
        localStorage.setItem(CURRENT_KEY, project.id);
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [project]);

  const refreshTakes = useCallback(async () => {
    try {
      setTakes(await listTakes(profileId));
    } catch (e) {
      setError(tRef.current('rec.errSave', { msg: e?.message || String(e) }));
    }
  }, [profileId]);

  // Decode a project's takes, then redraw (waveforms appear).
  const loadAudio = useCallback(
    async (p) => {
      if (!p) return;
      await engine.loadTakes(P.usedTakeIds(p));
      let added = false;
      for (const [id, buf] of engine.buffers) {
        if (!peaks.current.has(id)) {
          peaks.current.set(id, envelope(buf));
          added = true;
        }
      }
      if (added) setBufVersion((v) => v + 1);
    },
    [engine]
  );

  const openProject = useCallback(
    (p) => {
      hist.current.clear();
      setHistVersion((v) => v + 1);
      setSelection(null);
      setProjectState(p);
      setPos({ position: p.playhead || 0, counting: false });
      loadAudio(p);
    },
    [loadAudio, setPos]
  );

  // First load: the projects, the takes; open the last project (or a new one).
  useEffect(() => {
    let alive = true;
    (async () => {
      const [list] = await Promise.all([listProjects(profileId).catch(() => []), refreshTakes()]);
      if (!alive) return;
      setProjects(list);
      let last = null;
      try {
        last = localStorage.getItem(CURRENT_KEY);
      } catch {
        /* ignore */
      }
      const p = list.find((x) => x.id === last) || list[0] || P.newProject({ name: tRef.current('rec.songN', { n: 1 }), profileId, bpm: Math.round(initialBpm) || 100 });
      openProject(p);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- edits (with undo) ----
  const restartIfPlaying = useRef(null);
  const update = useCallback((fn, { history = true } = {}) => {
    const prev = projectRef.current;
    if (!prev) return;
    const next = fn(prev);
    if (!next || next === prev) return;
    if (history) {
      hist.current.push(prev);
      setHistVersion((v) => v + 1);
    }
    projectRef.current = next;
    setProjectState(next);
    restartIfPlaying.current?.(next);
  }, []);

  /** Mix-only change (no undo step, no restart). */
  const updateMix = useCallback(
    (fn) => {
      const prev = projectRef.current;
      if (!prev) return;
      const next = fn(prev);
      projectRef.current = next;
      setProjectState(next);
      engine.setMix(next);
    },
    [engine]
  );

  const undo = useCallback(() => {
    const cur = projectRef.current;
    const prev = hist.current.undo(cur);
    if (!prev) return;
    setHistVersion((v) => v + 1);
    projectRef.current = prev;
    setProjectState(prev);
    restartIfPlaying.current?.(prev);
  }, []);
  const redo = useCallback(() => {
    const cur = projectRef.current;
    const next = hist.current.redo(cur);
    if (!next) return;
    setHistVersion((v) => v + 1);
    projectRef.current = next;
    setProjectState(next);
    restartIfPlaying.current?.(next);
  }, []);

  // ---- transport ----
  const rafRef = useRef(0);
  const meterIn = useRef(null); // VuMeter binds
  const meterOut = useRef(null);
  const runLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const tick = () => {
      const p = engine.position();
      if (p) setPos(p);
      meterIn.current?.(engine.inputLevel());
      meterOut.current?.(engine.outputLevel());
      const rec = recRef.current;
      if (rec && engine.ctx && engine.ctx.currentTime - rec.startedAt > MAX_SECONDS) {
        setNotice(tRef.current('rec.maxLen'));
        stopRef.current?.();
      }
      if (engine.playing || engine.inputOpen) rafRef.current = requestAnimationFrame(tick);
      else {
        meterIn.current?.(null);
        meterOut.current?.(null);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [engine, setPos]);

  const loopOf = (p) => (p.loop && p.range && p.range.out - p.range.in > 0.05 ? p.range : null);

  const startPlay = useCallback(
    (p, from) => {
      engine.play(p, { from, loop: loopOf(p), click: prefsRef.current.click === 'all' });
      setPhase('playing');
      runLoop();
    },
    [engine, runLoop]
  );

  const play = useCallback(async () => {
    const p = projectRef.current;
    if (!p || phaseRef.current !== 'idle') return;
    engine.ensureContext(); // in the tap (iOS)
    setAudioSession('playback');
    setError(null);
    window.dispatchEvent(new CustomEvent('dudestar-rec-preview-stop'));
    await loadAudio(p);
    let from = pos.current.position;
    const len = P.projectLength(p);
    const lp = loopOf(p);
    if (!lp && !p.drums?.on && len > 0 && from >= len - 0.05) from = 0; // at the end: from the top
    startPlay(projectRef.current, from);
  }, [engine, loadAudio, startPlay]);

  // An edit while playing: carry on from where we are with the new project.
  restartIfPlaying.current = (next) => {
    if (phaseRef.current !== 'playing') return;
    const at = engine.position()?.position ?? pos.current.position;
    startPlay(next, at);
  };

  const pause = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const r = engine.stop();
    const at = r?.position ?? pos.current.position;
    setPos({ position: at, counting: false });
    setPhase('idle');
    update((p) => ({ ...p, playhead: at }), { history: false });
  }, [engine, setPos, update]);

  const seek = useCallback(
    (time) => {
      const t0 = Math.max(0, time);
      if (phaseRef.current === 'recording' || phaseRef.current === 'saving') return;
      setPos({ position: t0, counting: false });
      if (phaseRef.current === 'playing') startPlay(projectRef.current, t0);
      else update((p) => ({ ...p, playhead: t0 }), { history: false });
    },
    [setPos, startPlay, update]
  );

  useEffect(
    () =>
      engine.on((e) => {
        if (e.type !== 'end') return;
        if (phaseRef.current === 'recording') stopRef.current?.();
        else if (phaseRef.current === 'playing') {
          engine.stop();
          setPos({ position: e.position, counting: false });
          setPhase('idle');
        }
      }),
    [engine, setPos]
  );

  // ---- recording ----
  const record = useCallback(async () => {
    const p = projectRef.current;
    if (!p || (phaseRef.current !== 'idle' && phaseRef.current !== 'playing')) return;
    engine.ensureContext(); // in the tap (iOS unlock)
    if (phaseRef.current === 'playing') engine.stop();
    window.dispatchEvent(new CustomEvent('dudestar-rec-preview-stop'));
    setError(null);
    setNotice(null);
    setSelection(null);
    setAudioSession('auto');
    setPhase('opening');
    try {
      await Promise.all([engine.openInput(prefsRef.current.sound), loadAudio(p)]);
    } catch (e) {
      engine.closeInput();
      setAudioSession('playback');
      setPhase('idle');
      setError(tRef.current('rec.errMic', { msg: e?.message || String(e) }));
      return;
    }
    const q = projectRef.current;
    const armed = q.tracks.find((x) => x.id === q.armed) ? q.armed : q.tracks[0].id;
    const bar = P.barSeconds(q);
    const pre = (q.preRoll || 0) * bar;
    const post = (q.postRoll || 0) * bar;
    const range = q.range && q.range.out - q.range.in > 0.05 ? q.range : null;
    const head = pos.current.position;
    let keep;
    let from;
    let loop = null;
    let stopAt = null;
    if (range && (q.punch || q.loop)) {
      keep = { from: range.in, to: range.out };
      from = Math.max(0, range.in - pre);
      if (q.loop) loop = range;
      // A little past the punch-out (and any post-roll): the take is shifted
      // back by the latency, so it must run that much longer to reach it.
      else stopAt = range.out + post + 0.3;
    } else {
      keep = { from: head, to: Infinity };
      from = Math.max(0, head - pre);
    }
    const countIn = prefsRef.current.click === 'off' ? 0 : q.beats;
    engine.capture.start();
    const { startAt, countInClicks } = engine.play(q, {
      from,
      loop,
      stopAt,
      untilEnd: false,
      countIn,
      click: prefsRef.current.click === 'all',
      mutedRanges: { [armed]: [[keep.from, keep.to]] },
    });
    recRef.current = { armed, keep, startedAt: startAt, sound: prefsRef.current.sound, countInClicks };
    setPhase('recording');
    runLoop();
  }, [engine, loadAudio, runLoop]);

  const stopRecording = useCallback(async () => {
    const rec = recRef.current;
    if (!rec || phaseRef.current !== 'recording') return;
    recRef.current = null;
    setPhase('saving');
    const tr = engine.stop();
    const cap = engine.capture;
    const res = cap ? await cap.stop() : null;
    if (IS_IOS) {
      engine.closeInput();
      setAudioSession('playback');
    }
    // The take's own round trip from the count-in clicks the mic heard
    // (speakers, no headphones) — exact; otherwise the calibration.
    const expected = engine.latency();
    const own = res ? latencyFromCountIn(res.samples, res.sampleRate, res.startTime, rec.countInClicks, expected) : null;
    const latency = own ?? expected;
    if (own != null) {
      saveLatency(own);
      setLatencyMs(Math.round(own * 1000));
    }
    const at = tr?.position ?? pos.current.position;
    setPos({ position: at, counting: false });
    if (!res || res.samples.length < res.sampleRate * 0.3 || res.startTime == null) {
      setPhase('idle');
      return;
    }
    const duration = res.samples.length / res.sampleRate;
    const passes = capturePasses({ segments: tr.segments, startTime: res.startTime, latency, duration, keep: rec.keep });
    if (!passes.length) {
      setNotice(tRef.current('rec.nothingInRange'));
      setPhase('idle');
      return;
    }
    const existing = await listTakes(profileId).catch(() => []);
    const take = {
      id: newTakeId(),
      profileId,
      name: tRef.current('rec.take', { n: existing.length + 1 }),
      createdAt: Date.now(),
      duration,
      sampleRate: res.sampleRate,
      sound: rec.sound,
      kind: 'rec',
      channels: 1,
      peaks: computePeaks(res.samples),
    };
    try {
      await saveTake(take, encodeWav(res.samples, res.sampleRate));
    } catch (e) {
      setError(tRef.current('rec.errSave', { msg: e?.message || String(e) }));
      setPhase('idle');
      return;
    }
    const buf = new AudioBuffer({ length: res.samples.length, sampleRate: res.sampleRate, numberOfChannels: 1 });
    buf.copyToChannel(res.samples, 0);
    engine.putBuffer(take.id, buf);
    peaks.current.set(take.id, envelope(buf));
    update((p) => ({ ...P.addRecording(p, rec.armed, take, passes, take.name), playhead: at }));
    setPhase('idle');
    refreshTakes();
  }, [engine, profileId, refreshTakes, setPos, update]);
  const stopRef = useRef(stopRecording);
  stopRef.current = stopRecording;

  /** Stop key: stop recording / playing; pressed again when stopped = back to the start. */
  const stop = useCallback(() => {
    if (phaseRef.current === 'recording') stopRecording();
    else if (phaseRef.current === 'playing') pause();
    else if (phaseRef.current === 'idle') seek(projectRef.current?.range && projectRef.current.loop ? projectRef.current.range.in : 0);
  }, [pause, seek, stopRecording]);

  // Leaving the screen: keep a recording that was running, close everything.
  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      const done = phaseRef.current === 'recording' ? stopRef.current() : Promise.resolve();
      Promise.resolve(done)
        .catch(() => {})
        .finally(() => engine.dispose());
    },
    [engine]
  );

  // ---- projects ----
  const newSong = useCallback(() => {
    if (phaseRef.current !== 'idle') return;
    const names = new Set(projects.map((x) => x.name));
    let n = projects.length + 1;
    while (names.has(tRef.current('rec.songN', { n }))) n += 1;
    const p = P.newProject({ name: tRef.current('rec.songN', { n }), profileId, bpm: projectRef.current?.bpm || 100, beats: projectRef.current?.beats || 4 });
    openProject(p);
  }, [openProject, profileId, projects]);

  const selectSong = useCallback(
    (id) => {
      if (phaseRef.current !== 'idle') return;
      const p = projects.find((x) => x.id === id);
      if (p) openProject(p);
    },
    [openProject, projects]
  );

  const renameSong = useCallback((name) => update((p) => ({ ...p, name: name.trim() || p.name }), { history: false }), [update]);

  const deleteSong = useCallback(async () => {
    const p = projectRef.current;
    if (!p || phaseRef.current !== 'idle') return;
    clearTimeout(saveTimer.current);
    await dbDeleteProject(p.id).catch(() => {});
    const rest = projects.filter((x) => x.id !== p.id);
    setProjects(rest);
    openProject(rest[0] || P.newProject({ name: tRef.current('rec.songN', { n: 1 }), profileId, bpm: p.bpm, beats: p.beats }));
  }, [openProject, profileId, projects]);

  // ---- library ----
  const addTakeToTrack = useCallback(
    async (take) => {
      const p = projectRef.current;
      if (!p) return;
      await engine.loadTakes([take.id]);
      const buf = engine.buffers.get(take.id);
      if (buf && !peaks.current.has(take.id)) {
        peaks.current.set(take.id, envelope(buf));
        setBufVersion((v) => v + 1);
      }
      const dur = buf?.duration ?? take.duration;
      update((q) => P.appendTake(q, q.armed || q.tracks[0].id, { ...take, duration: dur }));
    },
    [engine, update]
  );

  const renameTake = useCallback(
    async (id, name) => {
      await dbRenameTake(id, name).catch((e) => setError(e?.message || String(e)));
      refreshTakes();
    },
    [refreshTakes]
  );

  /** Delete a take — and its uses in this profile's songs. */
  const deleteTake = useCallback(
    async (take) => {
      const all = await listProjects(profileId).catch(() => []);
      for (const p of all) {
        if (p.id === projectRef.current?.id) continue;
        const q = P.removeTake(p, take.id);
        if (q !== p) await saveProject(q).catch(() => {});
      }
      if (projectRef.current && P.usedTakeIds(projectRef.current).has(take.id)) {
        hist.current.clear();
        setHistVersion((v) => v + 1);
        update((p) => P.removeTake(p, take.id), { history: false });
      }
      await dbDeleteTake(take.id).catch((e) => setError(e?.message || String(e)));
      engine.dropBuffer(take.id);
      peaks.current.delete(take.id);
      refreshTakes();
      setProjects(await listProjects(profileId).catch(() => projects));
    },
    [engine, profileId, projects, refreshTakes, update]
  );

  const takeUsed = useCallback(async (takeId) => {
    const all = await listProjects(profileId).catch(() => []);
    return all.some((p) => P.usedTakeIds(p.id === projectRef.current?.id ? projectRef.current : p).has(takeId));
  }, [profileId]);

  // ---- import / export ----
  const importFile = useCallback(
    async (file) => {
      if (!file) return;
      if (file.size > IMPORT_MAX_BYTES) {
        setError(tRef.current('rec.errImportSize'));
        return;
      }
      setBusyTask('import');
      setError(null);
      try {
        const buf = await engine.decodeBlob(file);
        const mono = buf.getChannelData(0);
        const take = {
          id: newTakeId(),
          profileId,
          name: file.name.replace(/\.[^.]+$/, '') || tRef.current('rec.imported'),
          createdAt: Date.now(),
          duration: buf.duration,
          sampleRate: buf.sampleRate,
          sound: 'import',
          kind: 'import',
          channels: buf.numberOfChannels,
          peaks: computePeaks(mono),
          mime: file.type || '',
          fileName: file.name,
        };
        await saveTake(take, file);
        engine.putBuffer(take.id, buf);
        peaks.current.set(take.id, envelope(buf));
        setBufVersion((v) => v + 1);
        const at = pos.current.position;
        update((p) => P.placeRegion(p, p.armed || p.tracks[0].id, P.makeRegion(take.id, at, 0, buf.duration)));
        refreshTakes();
      } catch (e) {
        setError(tRef.current('rec.errImport', { msg: e?.message || String(e) }));
      } finally {
        setBusyTask(null);
      }
    },
    [engine, profileId, refreshTakes, update]
  );

  /**
   * Render and deliver.
   *  what: 'mix' | trackId;  span: 'all' | 'range';  format: 'wav' | 'mp3';
   *  to: 'download' | 'share' | 'library'
   */
  const exportAudio = useCallback(
    async ({ what = 'mix', span = 'all', format = 'wav', kbps = MP3_DEFAULT_KBPS, to = 'download' }) => {
      const p = projectRef.current;
      if (!p) return;
      setBusyTask('export');
      setError(null);
      try {
        await loadAudio(p);
        const range = span === 'range' && p.range ? p.range : null;
        const from = range ? range.in : 0;
        const end = range ? range.out : Math.max(P.projectLength(p), p.drums?.on ? P.barSeconds(p) : 0.5);
        const track = what === 'mix' ? null : p.tracks.find((x) => x.id === what);
        const buf = await renderMix(p, engine.buffers, { from, to: end, trackIds: track ? [track.id] : null, drums: !track && p.drums?.on });
        const base = `${safeName(p.name)}${track ? ` - ${safeName(track.name)}` : ''}`;
        if (to === 'library') {
          const take = {
            id: newTakeId(),
            profileId,
            name: base,
            createdAt: Date.now(),
            duration: buf.duration,
            sampleRate: buf.sampleRate,
            sound: 'bounce',
            kind: 'bounce',
            channels: 2,
            peaks: computePeaks(buf.getChannelData(0)),
          };
          await saveTake(take, encodeWavBuffer(buf));
          engine.putBuffer(take.id, buf);
          peaks.current.set(take.id, envelope(buf));
          refreshTakes();
          setNotice(tRef.current('rec.bounced', { name: base }));
          return;
        }
        const blob = format === 'mp3' ? await encodeMp3(buf, kbps) : encodeWavBuffer(buf);
        const fileName = `${base}.${format}`;
        if (to === 'share' && navigator.canShare) {
          const f = new File([blob], fileName, { type: blob.type });
          if (navigator.canShare({ files: [f] })) {
            await navigator.share({ files: [f], title: base });
            return;
          }
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 30000);
      } catch (e) {
        if (e?.name !== 'AbortError') setError(tRef.current('rec.errExport', { msg: e?.message || String(e) }));
      } finally {
        setBusyTask(null);
      }
    },
    [engine, loadAudio, profileId, refreshTakes]
  );

  /** A single take as a file (library Download), in its own format or MP3. */
  const downloadTake = useCallback(async (take, format = 'orig') => {
    try {
      const blob = await getTakeAudio(take.id);
      if (!blob) throw new Error('missing audio');
      let out = blob;
      let ext = take.kind === 'import' ? (take.fileName?.split('.').pop() || 'audio') : 'wav';
      if (format === 'mp3') {
        setBusyTask('export');
        const buf = await engine.decodeBlob(blob);
        out = await encodeMp3(buf);
        ext = 'mp3';
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(out);
      a.download = `${safeName(take.name)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setBusyTask(null);
    }
  }, [engine]);

  // ---- latency ----
  const calibrate = useCallback(async () => {
    if (phaseRef.current !== 'idle') return;
    engine.ensureContext();
    setBusyTask('calibrate');
    setError(null);
    try {
      const s = await engine.measureLatency();
      if (IS_IOS) engine.closeInput();
      saveLatency(s);
      setLatencyMs(Math.round(s * 1000));
      setNotice(tRef.current('rec.calibrated', { ms: Math.round(s * 1000) }));
    } catch {
      if (IS_IOS) engine.closeInput();
      setError(tRef.current('rec.errCalibrate'));
    } finally {
      setAudioSession('playback');
      setBusyTask(null);
      runLoop();
    }
  }, [engine, runLoop]);

  const resetLatency = useCallback(() => {
    saveLatency(null);
    setLatencyMs(null);
  }, []);

  return {
    engine,
    prefs,
    setPrefs,
    projects,
    project,
    takes,
    phase,
    error,
    setError,
    notice,
    setNotice,
    selection,
    setSelection,
    busyTask,
    bufVersion,
    peaks: peaks.current,
    positionStore,
    meterIn,
    meterOut,
    canUndo: hist.current.canUndo(),
    canRedo: hist.current.canRedo(),
    histVersion,
    latencyMs,
    update,
    updateMix,
    undo,
    redo,
    play,
    pause,
    stop,
    record,
    seek,
    newSong,
    selectSong,
    renameSong,
    deleteSong,
    addTakeToTrack,
    renameTake,
    deleteTake,
    takeUsed,
    importFile,
    exportAudio,
    downloadTake,
    calibrate,
    resetLatency,
    recording: recRef,
  };
}

/** The playhead (and count-in) from the studio's position store. */
export function usePlayhead(store) {
  return useSyncExternalStore(store.subscribe, store.get);
}
