import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FALLING_NOTES_SONGS, FALL_TIME_S, resolveFallingNotesSong, generateFallingNotesSong } from '../music/fallingNotesSongs';
import { playPianoNote } from '../audio/pianoPlayer';
import { logPerf } from '../coach/perfLog';
import { startBpm } from '../coach/skillLevel';
import { runResult, tempoAfter } from '../coach/playRun';

const HIT_WINDOW_S = 0.35; // a note counts within this of its time (the panel colours keys by it too)
const TICK_MS = 16;
// Adaptive practice (v1.0.132 — the guitar's v1.0.131 mechanism on the
// piano, user: "build the new mechanism for the piano too"): a note is "in
// time" when it lands within this of its click.
const ON_TIME_MS = 90;
const MIN_TO_LOG = 4;
export const FLOW_TOOLS = ['fallingNotes'];

/**
 * Practice -> Flow (falling notes onto the keys). Since v1.0.132 a run is
 * played to the SHARED metronome like every judged practice tool:
 * phases idle · demo (listen: the trainer plays the notes) · countin (the
 * lead-in clicks) · run (your turn) · done (result: right notes, in time,
 * the tendency, what the tempo does next). The song is rebuilt at the
 * metronome's tempo with a whole-beat lead-in and the clock starts on the
 * HEARD first click, so every note falls on a click. Adaptive tempo + "find
 * my speed"; the start tempo comes from the player's Flow level (startBpm).
 * Logged as tool 'fallingNotes' (nps = notes / s = bpm / 60).
 */
export function useFallingNotes(metronome) {
  const [songKey, setSongKey] = useState(FALLING_NOTES_SONGS[0].key);
  const [phase, setPhase] = useState('idle'); // idle | demo | countin | run | done
  const [countIn, setCountIn] = useState(0);
  const [demoing, setDemoing] = useState(false);
  const [now, setNow] = useState(0);
  const [results, setResults] = useState({}); // { [noteId]: 'hit' | 'miss' }
  const [live, setLive] = useState({ hits: 0, misses: 0, onTime: 0 });
  const [result, setResult] = useState(null);
  const [autoTempo, setAutoTempo] = useState(true);
  const [findSpeed, setFindSpeed] = useState(false);
  const [startWhy, setStartWhy] = useState(null);
  const [runSong, setRunSong] = useState(null);
  const [midiState, setMidiState] = useState('idle'); // 'idle' | 'unsupported' | 'connecting' | 'connected' | 'denied'

  const def = useMemo(() => resolveFallingNotesSong(songKey), [songKey]);
  const baseSong = useMemo(() => generateFallingNotesSong(def), [def]);
  const song = runSong ?? baseSong;

  const R = useRef({ running: false });
  const songRef = useRef(song);
  songRef.current = song;
  const resultsRef = useRef({});
  const nowRef = useRef(0);
  const intervalRef = useRef(null);
  const waitTimerRef = useRef(null);
  const metro = useRef(metronome);
  metro.current = metronome;
  const findRef = useRef(false);
  findRef.current = findSpeed;
  const autoRef = useRef(autoTempo);
  autoRef.current = autoTempo;
  const finishRef = useRef(null);
  const startRunRef = useRef(null);
  const midiAccessRef = useRef(null);
  const midiInputsRef = useRef([]);

  const elapsedNow = () => (R.current.startAt == null ? 0 : (performance.now() - R.current.startAt) / 1000);

  /** The song at `bpm` with a whole-beat lead-in (so every note is on a click). */
  function buildRunSong(bpm) {
    const g = generateFallingNotesSong({ ...def, bpm });
    const beat = 60 / bpm;
    const leadBeats = Math.max(2, Math.ceil(FALL_TIME_S / beat));
    const shift = leadBeats * beat - FALL_TIME_S;
    const notes = g.notes.map((n) => ({ ...n, time: n.time + shift }));
    return { ...g, notes, totalDuration: g.totalDuration + shift, leadBeats };
  }

  const stopLoop = useCallback(() => {
    if (intervalRef.current != null) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  function setRes(next) {
    resultsRef.current = next;
    setResults(next);
  }

  function tick() {
    const S = R.current;
    if (!S.running) return;
    const elapsed = elapsedNow();
    nowRef.current = elapsed;
    setNow(elapsed);
    const s = songRef.current;
    const first = s.notes[0]?.time ?? 0;
    const beat = s.beatSeconds;
    if (S.startAt != null) {
      if (elapsed < first - 0.02) {
        const n = Math.max(1, Math.ceil((first - elapsed) / beat - 0.02));
        if (n !== S.count) {
          S.count = n;
          setCountIn(n);
        }
      } else if (S.count !== 0) {
        S.count = 0;
        setCountIn(0);
        setPhase(S.mode === 'demo' ? 'demo' : 'run');
      }
    }
    if (S.mode === 'demo') {
      let changed = false;
      const next = { ...resultsRef.current };
      for (const note of s.notes) {
        if (S.played.has(note.id) || elapsed < note.time - 0.03) continue;
        S.played.add(note.id);
        next[note.id] = 'hit'; // the trainer plays it: it lights as played
        changed = true;
        setTimeout(() => {
          if (R.current === S && S.running) playPianoNote(note.midi);
        }, Math.max(0, (note.time - elapsed) * 1000));
      }
      if (changed) setRes(next);
    } else {
      let changed = false;
      const next = { ...resultsRef.current };
      for (const note of s.notes) {
        if (next[note.id] == null && elapsed > note.time + HIT_WINDOW_S) {
          next[note.id] = 'miss';
          S.misses += 1;
          changed = true;
        }
      }
      if (changed) {
        setRes(next);
        setLive({ hits: S.hits, misses: S.misses, onTime: S.onTime });
      }
    }
    if (elapsed >= s.totalDuration) finishRef.current();
  }

  function startRun(mode) {
    if (R.current.running) finishRef.current({ aborted: true });
    const prev = R.current;
    const built = buildRunSong(metro.current.bpm);
    songRef.current = built;
    setRunSong(built);
    R.current = {
      running: true,
      mode,
      startAt: null,
      clockStarted: false,
      count: built.leadBeats,
      played: new Set(),
      hits: 0,
      misses: 0,
      onTime: 0,
      wrong: 0,
      combo: 0,
      maxCombo: 0,
      offsets: [],
      startedAt: Date.now(),
      speedBest: findRef.current ? prev.speedBest ?? null : null,
    };
    setRes({});
    setLive({ hits: 0, misses: 0, onTime: 0 });
    if (mode === 'play') setResult(null);
    setDemoing(mode === 'demo');
    setPhase('countin');
    setCountIn(built.leadBeats);
    nowRef.current = 0;
    setNow(0);
    const S = R.current;
    clearTimeout(waitTimerRef.current);
    waitTimerRef.current = setTimeout(() => {
      if (S.running && S.startAt == null) S.startAt = performance.now();
    }, 800);
    stopLoop();
    intervalRef.current = setInterval(tick, TICK_MS);
    if (metro.current.isRunning) metro.current.stop();
    setTimeout(() => metro.current.start(), 40);
  }
  startRunRef.current = startRun;

  function finish({ aborted = false } = {}) {
    const S = R.current;
    if (!S.running) return;
    S.running = false;
    stopLoop();
    clearTimeout(waitTimerRef.current);
    metro.current.stop();
    setCountIn(0);
    setDemoing(false);
    const judged = S.hits + S.misses;
    if (S.mode === 'demo' || (aborted && judged < MIN_TO_LOG)) {
      setPhase('idle');
      if (S.mode === 'demo') setRes({});
      return;
    }
    const bpm = metro.current.bpm;
    const res = runResult({
      bpm,
      total: songRef.current.notes.length,
      hits: S.hits,
      onTime: S.onTime,
      offsets: S.offsets,
      wrong: S.wrong,
      maxCombo: S.maxCombo,
      judged,
      onTimeMs: ON_TIME_MS,
    });
    logPerf({
      tool: 'fallingNotes',
      item: songKey,
      bpm,
      durationMs: Date.now() - S.startedAt,
      metrics: {
        hits: S.hits,
        misses: res.misses,
        total: res.total,
        accuracyPct: res.notesPct,
        timingPct: res.timingPct,
        meanOffsetMs: res.meanOffsetMs,
        spreadMs: res.spreadMs,
        maxCombo: S.maxCombo,
        completed: res.complete,
        passed: res.passed,
        nps: bpm / 60,
      },
    });
    const next = tempoAfter({ res, bpm, find: findRef.current, best: S.speedBest, auto: autoRef.current });
    res.tempo = next.tempo;
    S.speedBest = next.best;
    if (next.stopFind) setFindSpeed(false);
    if (next.bpm !== bpm) metro.current.setBpm(next.bpm);
    setResult(res);
    setPhase('done');
    if (next.again) setTimeout(() => startRunRef.current('play'), 1200);
  }
  finishRef.current = finish;

  const handleNotePlayed = useCallback((midi) => {
    const S = R.current;
    if (!S.running || S.mode !== 'play' || S.startAt == null) return;
    const elapsed = elapsedNow();
    const s = songRef.current;
    const current = resultsRef.current;
    let best = null;
    let near = false;
    for (const note of s.notes) {
      if (current[note.id] != null) continue;
      const d = elapsed - note.time;
      if (Math.abs(d) > HIT_WINDOW_S) continue;
      near = true;
      if (note.midi !== midi) continue;
      if (!best || Math.abs(d) < Math.abs(best.d)) best = { note, d };
    }
    if (best) {
      const off = best.d * 1000;
      S.hits += 1;
      S.offsets.push(off);
      if (Math.abs(off) <= ON_TIME_MS) S.onTime += 1;
      S.combo += 1;
      S.maxCombo = Math.max(S.maxCombo, S.combo);
      setRes({ ...current, [best.note.id]: 'hit' });
      setLive({ hits: S.hits, misses: S.misses, onTime: S.onTime });
    } else if (near) {
      S.wrong += 1;
      S.combo = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The clock: the HEARD first click of the shared metronome.
  useEffect(
    () =>
      metronome.onBeatTime((_b, heard) => {
        const S = R.current;
        if (!S.running) return;
        S.clockStarted = true;
        if (S.startAt == null) S.startAt = heard;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // The metronome stopped from outside (its pill): the run stops too.
  useEffect(() => {
    const S = R.current;
    if (S.running && S.clockStarted && !metronome.isRunning) finishRef.current({ aborted: true });
  }, [metronome.isRunning]);

  // A new song: back to idle at the player's level for it.
  function prepare() {
    if (R.current.running) return;
    setRunSong(null);
    setRes({});
    setResult(null);
    setPhase('idle');
    const s = startBpm({ tool: 'fallingNotes', item: songKey, suggested: def.bpm ?? 80, tools: FLOW_TOOLS });
    setStartWhy(s.why);
    metro.current.setBpm(s.bpm);
  }

  // --- MIDI keyboard -------------------------------------------------------------
  const handleNotePlayedRef = useRef(handleNotePlayed);
  handleNotePlayedRef.current = handleNotePlayed;
  const onMidiMessage = useCallback((e) => {
    const [status, note, velocity] = e.data;
    const isNoteOn = (status & 0xf0) === 0x90 && velocity > 0;
    if (isNoteOn) handleNotePlayedRef.current(note);
  }, []);

  const attachMidiInputs = useCallback(
    (access) => {
      midiInputsRef.current.forEach((input) => input.removeEventListener('midimessage', onMidiMessage));
      midiInputsRef.current = Array.from(access.inputs.values());
      midiInputsRef.current.forEach((input) => input.addEventListener('midimessage', onMidiMessage));
    },
    [onMidiMessage]
  );

  const enableMidi = useCallback(() => {
    if (!navigator.requestMIDIAccess) {
      setMidiState('unsupported');
      return;
    }
    setMidiState('connecting');
    navigator
      .requestMIDIAccess()
      .then((access) => {
        midiAccessRef.current = access;
        attachMidiInputs(access);
        access.onstatechange = () => attachMidiInputs(access);
        setMidiState('connected');
      })
      .catch(() => setMidiState('denied'));
  }, [attachMidiInputs]);

  useEffect(() => {
    return () => {
      stopLoop();
      clearTimeout(waitTimerRef.current);
      midiInputsRef.current.forEach((input) => input.removeEventListener('midimessage', onMidiMessage));
      if (midiAccessRef.current) midiAccessRef.current.onstatechange = null;
    };
  }, [stopLoop, onMidiMessage]);

  const play = () => startRun('play');
  const demo = () => startRun('demo');
  function stop() {
    if (R.current.running) {
      setFindSpeed(false);
      findRef.current = false;
      finish({ aborted: true });
    }
  }
  function startFindSpeed() {
    setFindSpeed(true);
    findRef.current = true;
    R.current.speedBest = null;
    startRun('play');
  }

  const isPlaying = phase === 'countin' || phase === 'run' || phase === 'demo';
  const score = useMemo(() => {
    const values = Object.values(results);
    return { hits: values.filter((v) => v === 'hit').length, misses: values.filter((v) => v === 'miss').length };
  }, [results]);
  const exercise = useMemo(() => ({ sequence: song.notes }), [song]);

  return {
    songKey,
    setSongKey,
    songs: FALLING_NOTES_SONGS,
    song,
    isPlaying,
    isComplete: phase === 'done',
    now,
    results,
    score,
    midiState,
    enableMidi,
    start: play,
    stop,
    handleNotePlayed,
    // PlayAlong (components/PlayAlong)
    exercise,
    phase,
    countIn,
    demoing,
    play,
    demo,
    live,
    result,
    autoTempo,
    setAutoTempo,
    findSpeed,
    startFindSpeed,
    startWhy,
    prepare,
  };
}
