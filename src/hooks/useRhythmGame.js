import { useCallback, useEffect, useRef, useState } from 'react';
import { STANDARD_TUNING } from '../music/notes';
import { usePitchDetection } from './usePitchDetection';
import { logPerf } from '../coach/perfLog';
import { nextBpm, startBpm } from '../coach/skillLevel';
import { playNote } from '../audio/chordPlayer';

// One note per metronome beat, played on a real guitar (Practice -> Rhythm
// and Practice -> Scales). Rebuilt 2026-11-07 (user: "I don't understand
// when to play, when the teacher listens, what the feedback means; with a
// metronome it must judge the TIMING too; let me speed up; adapt to me"):
//   - clear phases: demo (listen only) · count-in (4 clicks) · run (your
//     turn, the mic listens) · done (result);
//   - every note is judged against the HEARD click (metronome.onBeatTime):
//     right note? and early / on time / late (signed ms);
//   - adaptive tempo: after a run the tempo goes up when it was right and in
//     time, down when it wasn't (coach/skillLevel.js nextBpm) — on by
//     default; "find my speed" repeats the exercise faster each pass until
//     it breaks, and settles on the fastest clean pass;
//   - the start tempo comes from the player's level (startBpm): the last
//     tempo this exercise was passed at, else the fluent speed measured in
//     ANY exercise, never slower than the exercise's suggestion.
// Results go to the performance log with nps + passed (the skill level).

const COUNT_IN = 4;
const DETECT_LAG_MS = 40; // pitch frames: the first frame that sees a note ends ~½ window after its attack
const ON_TIME_MS = 75; // |offset| within this = on time
const FLASH_MS = 450;
const MIN_TO_LOG = 4;

const midiOf = (step) => STANDARD_TUNING[step.string].baseMidi + step.fret;
const sameNote = (a, b) => a === b || Math.abs(a - b) === 12; // the detector's octave slips
const earlyMs = (beatMs) => Math.min(200, beatMs * 0.45);
const lateMs = (beatMs) => Math.min(250, beatMs * 0.5);

/** Note onsets from the mic: a new stable pitch, or the same one re-picked. */
function useNoteOnsets(onNote) {
  const pitch = usePitchDetection();
  const cb = useRef(onNote);
  cb.current = onNote;
  const st = useRef({ armed: true, midi: null, since: 0, frames: 0, minLevel: 1 });
  useEffect(() => {
    const s = st.current;
    const n = pitch.currentNote;
    const level = pitch.inputLevel ?? 0;
    const now = performance.now();
    if (!n) {
      s.armed = true;
      s.midi = null;
      s.frames = 0;
      s.minLevel = Math.min(s.minLevel, level);
      return;
    }
    s.minLevel = Math.min(s.minLevel, level);
    if (!s.armed && level > s.minLevel * 1.6 && level - s.minLevel > 0.03) {
      s.armed = true;
      s.frames = 0;
      s.since = now;
    }
    if (n.midi !== s.midi) {
      s.midi = n.midi;
      s.since = now;
      s.frames = 0;
      s.armed = true;
    }
    s.frames += 1;
    if (s.armed && s.frames >= 2) {
      s.armed = false;
      s.minLevel = level;
      cb.current(n.midi, s.since);
    }
  }, [pitch.currentNote, pitch.inputLevel]);
  return pitch;
}

export function useRhythmGame(metronome, { logAs = null } = {}) {
  const [exercise, setExercise] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | demo | countin | run | done
  const [countIn, setCountIn] = useState(0);
  const [stepIndex, setStepIndex] = useState(-1);
  const [live, setLive] = useState({ hits: 0, misses: 0, onTime: 0, combo: 0, maxCombo: 0 });
  const [feedbackCell, setFeedbackCell] = useState(null);
  const [result, setResult] = useState(null);
  const [autoTempo, setAutoTempo] = useState(true);
  const [findSpeed, setFindSpeed] = useState(false);
  const [startWhy, setStartWhy] = useState(null); // why the tempo is what it is when loaded

  const R = useRef({ running: false });
  const exRef = useRef(null);
  exRef.current = exercise;
  const metro = useRef(metronome);
  metro.current = metronome;
  const flashT = useRef(null);
  const findRef = useRef(false);
  findRef.current = findSpeed;
  const autoRef = useRef(autoTempo);
  autoRef.current = autoTempo;
  const finishRef = useRef(null);

  const flash = (step, correct) => {
    setFeedbackCell({ cell: { stringIndex: step.string, fret: step.fret }, correct });
    clearTimeout(flashT.current);
    flashT.current = setTimeout(() => setFeedbackCell(null), FLASH_MS);
  };

  // --- judging ------------------------------------------------------------------
  const onNote = useCallback((midi, at) => {
    const ex = exRef.current;
    const S = R.current;
    if (!ex || !S.running || S.mode !== 'play' || S.beatBase == null) return;
    const t = at - DETECT_LAG_MS;
    let best = null;
    let near = null;
    ex.sequence.forEach((step, i) => {
      if (S.judged.has(i)) return;
      const exp = S.beatBase + (COUNT_IN + i) * S.beatMs;
      const off = t - exp;
      if (off < -earlyMs(S.beatMs) || off > lateMs(S.beatMs)) return;
      if (!near || Math.abs(off) < Math.abs(near.off)) near = { i, off, step };
      if (!sameNote(midi, midiOf(step))) return;
      if (!best || Math.abs(off) < Math.abs(best.off)) best = { i, off, step };
    });
    if (best) {
      S.judged.add(best.i);
      S.hits += 1;
      S.offsets.push(best.off);
      if (Math.abs(best.off) <= ON_TIME_MS) S.onTime += 1;
      S.combo += 1;
      S.maxCombo = Math.max(S.maxCombo, S.combo);
      setLive({ hits: S.hits, misses: S.misses, onTime: S.onTime, combo: S.combo, maxCombo: S.maxCombo });
      flash(best.step, true);
      S.lastOff = best.off;
    } else if (near) {
      S.wrong += 1;
      flash(near.step, false);
    }
  }, []);

  const mic = useNoteOnsets(onNote);

  // --- the clock: the HEARD clicks of the shared metronome -------------------------
  useEffect(
    () =>
      metronome.onBeatTime((_b, heard) => {
        const S = R.current;
        if (!S.running) return;
        S.beatCount += 1;
        S.beatMs = 60000 / metro.current.bpm;
        S.beatBase = heard - S.beatCount * S.beatMs;
        if (S.beatCount < COUNT_IN) {
          setPhase('countin');
          setCountIn(COUNT_IN - S.beatCount);
        } else if (S.beatCount === COUNT_IN) {
          setPhase(S.mode === 'demo' ? 'demo' : 'run');
          setCountIn(0);
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Poll: the marker, the demo's notes, misses, the end.
  useEffect(() => {
    if (phase !== 'run' && phase !== 'countin' && phase !== 'demo') return undefined;
    const id = setInterval(() => {
      const ex = exRef.current;
      const S = R.current;
      if (!ex || !S.running || S.beatBase == null) return;
      const now = performance.now();
      const total = ex.sequence.length;
      const pos = (now - S.beatBase) / S.beatMs - COUNT_IN;
      // the next note shows a little before its click
      const shown = Math.min(total - 1, Math.floor(pos + 0.35));
      if (shown >= 0 && shown !== S.shown) {
        S.shown = shown;
        setStepIndex(shown);
        if (S.mode === 'demo') {
          const exp = S.beatBase + (COUNT_IN + shown) * S.beatMs;
          const step = ex.sequence[shown];
          setTimeout(() => playNote(midiOf(step)), Math.max(0, exp - now));
        }
      }
      if (S.mode === 'play') {
        ex.sequence.forEach((step, i) => {
          if (S.judged.has(i)) return;
          const exp = S.beatBase + (COUNT_IN + i) * S.beatMs;
          if (now - DETECT_LAG_MS - exp > lateMs(S.beatMs)) {
            S.judged.add(i);
            S.misses += 1;
            S.combo = 0;
            setLive({ hits: S.hits, misses: S.misses, onTime: S.onTime, combo: 0, maxCombo: S.maxCombo });
            flash(step, false);
          }
        });
      }
      if (pos > total - 1 + 0.75) finishRef.current();
    }, 12);
    return () => clearInterval(id);
  }, [phase]);

  // The metronome stopped from outside (its pill): the run stops too.
  useEffect(() => {
    const S = R.current;
    if (S.running && S.clockStarted && !metronome.isRunning) finishRef.current({ aborted: true });
    if (metronome.isRunning && S.running) S.clockStarted = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metronome.isRunning]);

  // --- control -------------------------------------------------------------------
  function report() {
    const S = R.current;
    const ex = exRef.current;
    const total = ex.sequence.length;
    const judged = S.hits + S.misses;
    const offs = S.offsets;
    const mean = offs.length ? offs.reduce((a, b) => a + b, 0) / offs.length : null;
    const spread = offs.length >= 2 ? Math.sqrt(offs.reduce((a, b) => a + (b - mean) ** 2, 0) / offs.length) : null;
    const notesPct = total ? Math.round((S.hits / total) * 100) : 0;
    const timingPct = S.hits ? Math.round((S.onTime / S.hits) * 100) : null;
    const bpm = metro.current.bpm;
    const res = {
      bpm,
      total,
      hits: S.hits,
      misses: total - S.hits,
      wrong: S.wrong,
      onTime: S.onTime,
      notesPct,
      timingPct,
      meanOffsetMs: mean == null ? null : Math.round(mean),
      spreadMs: spread == null ? null : Math.round(spread),
      maxCombo: S.maxCombo,
      complete: judged >= total,
    };
    res.passed = res.complete && notesPct >= 90 && (timingPct ?? 0) >= 70;
    if (logAs && judged >= MIN_TO_LOG) {
      logPerf({
        tool: logAs,
        item: ex.id ?? '',
        bpm,
        durationMs: Date.now() - (S.startedAt ?? Date.now()),
        metrics: {
          hits: S.hits,
          misses: total - S.hits,
          total,
          accuracyPct: notesPct,
          timingPct,
          maxCombo: S.maxCombo,
          meanOffsetMs: res.meanOffsetMs,
          spreadMs: res.spreadMs,
          completed: res.complete,
          passed: res.passed,
          nps: bpm / 60,
        },
      });
    }
    return res;
  }

  function finish({ aborted = false } = {}) {
    const S = R.current;
    if (!S.running) return;
    S.running = false;
    const wasDemo = S.mode === 'demo';
    metro.current.stop();
    mic.stopListening();
    setCountIn(0);
    if (wasDemo) {
      setPhase('idle');
      setStepIndex(-1);
      return;
    }
    if (aborted && S.hits + S.misses < MIN_TO_LOG) {
      setPhase('idle');
      setStepIndex(-1);
      return;
    }
    const res = report();
    // What happens to the tempo next.
    const bpm = metro.current.bpm;
    if (findRef.current) {
      if (res.passed) {
        const up = Math.min(220, Math.max(bpm + 4, Math.round(bpm * 1.08)));
        res.tempo = { change: 'speedUp', from: bpm, to: up };
        res.bestBpm = bpm;
        S.speedBest = bpm;
        setResult(res);
        setPhase('done');
        metro.current.setBpm(up);
        setTimeout(() => startRun('play'), 1200);
        return;
      }
      const settle = S.speedBest ?? Math.max(40, Math.round(bpm * 0.92));
      res.tempo = { change: 'speedFound', from: bpm, to: settle, best: S.speedBest ?? null };
      setFindSpeed(false);
      metro.current.setBpm(settle);
    } else if (autoRef.current && res.complete) {
      const nb = nextBpm({ bpm, notesPct: res.notesPct, timingPct: res.timingPct });
      res.tempo = { change: nb.change, from: bpm, to: nb.bpm };
      if (nb.bpm !== bpm) metro.current.setBpm(nb.bpm);
    }
    setResult(res);
    setPhase('done');
  }
  finishRef.current = finish;

  function startRun(mode) {
    const ex = exRef.current;
    if (!ex) return;
    const prev = R.current;
    R.current = {
      running: true,
      mode,
      beatCount: -1,
      beatBase: null,
      beatMs: 60000 / metro.current.bpm,
      judged: new Set(),
      hits: 0,
      misses: 0,
      onTime: 0,
      wrong: 0,
      combo: 0,
      maxCombo: 0,
      offsets: [],
      shown: -1,
      startedAt: Date.now(),
      clockStarted: false,
      speedBest: findRef.current ? prev.speedBest ?? null : null,
    };
    setLive({ hits: 0, misses: 0, onTime: 0, combo: 0, maxCombo: 0 });
    setFeedbackCell(null);
    if (mode === 'play') setResult(null);
    setStepIndex(-1);
    setPhase('countin');
    setCountIn(COUNT_IN);
    if (mode === 'play') mic.startListening();
    if (metro.current.isRunning) metro.current.stop();
    // a fresh start of the shared clock: the beat counter starts at its first click
    setTimeout(() => metro.current.start(), 40);
  }

  function loadExercise(ex) {
    if (R.current.running) finish({ aborted: true });
    setExercise(ex);
    exRef.current = ex;
    setPhase('idle');
    setResult(null);
    setFindSpeed(false);
    setStepIndex(-1);
    setFeedbackCell(null);
    setLive({ hits: 0, misses: 0, onTime: 0, combo: 0, maxCombo: 0 });
    const s = startBpm({ tool: logAs ?? 'rhythm', item: ex.id ?? '', suggested: ex.bpmSuggested ?? 80 });
    setStartWhy(s.why);
    metronome.setBpm(s.bpm);
  }

  const play = () => startRun('play');
  const demo = () => startRun('demo');
  function stop() {
    if (R.current.running) {
      setFindSpeed(false);
      finish({ aborted: true });
    }
  }
  function exit() {
    stop();
    setExercise(null);
    exRef.current = null;
    setPhase('idle');
    setResult(null);
    setStepIndex(-1);
  }
  function startFindSpeed() {
    setFindSpeed(true);
    findRef.current = true;
    R.current.speedBest = null;
    startRun('play');
  }

  useEffect(() => () => clearTimeout(flashT.current), []);
  // Leaving the page mid-run still records a meaningful run.
  useEffect(() => {
    const onHide = () => finishRef.current?.({ aborted: true });
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, []);

  const isPlaying = phase === 'run' || phase === 'countin' || phase === 'demo';
  const judged = live.hits + live.misses;
  return {
    exercise,
    loadExercise,
    flushPerf: () => {
      if (R.current.running) finishRef.current({ aborted: true });
    },
    phase,
    countIn,
    stepIndex,
    isPlaying,
    ended: phase === 'done',
    demoing: R.current.mode === 'demo' && isPlaying,
    play,
    demo,
    restart: play,
    stop,
    exit,
    live,
    result,
    autoTempo,
    setAutoTempo,
    findSpeed,
    startFindSpeed,
    startWhy,
    // older readers
    score: { hits: live.hits, misses: live.misses },
    combo: live.combo,
    maxCombo: live.maxCombo,
    accuracyPct: judged ? Math.round((live.hits / judged) * 100) : null,
    feedbackCell,
    micIsListening: mic.isListening,
    micError: mic.error,
    micCurrentNote: mic.currentNote,
    inputLevel: mic.inputLevel,
  };
}
