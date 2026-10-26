// Bass Practice engine (Bass card -> Practice). One built exercise
// (music/bass/bassPractice.js buildExercise) in one of three modes:
//   'listen' — the app plays it on the bass sound with the click; the neck
//              marker moves with it (no mic).
//   'play'   — one bar of count-in, then the student plays along with the
//              SHARED metronome (so the drum machine can play the groove);
//              the mic judges every note: right pitch within its time window
//              = hit (+ how early / late), else a miss.
//   'wait'   — no clock: the next note waits until the mic hears it (the
//              Lick Trainer's / Teacher's "Wait" idea).
// Mic = usePitchDetection(BASS_PITCH_RANGE) turned into note ONSETS:
// a new stable pitch, or the level jumping back up on the same pitch (a
// re-plucked note — roots on every beat), so repeated notes count.
// Runs go to the performance log as tool 'bass', item '<id>@<key>:<string>'.
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePitchDetection, BASS_PITCH_RANGE } from './usePitchDetection';
import { playBassNote, preloadBassSamples } from '../audio/bassPlayer';
import { logPerf, perfFor } from '../coach/perfLog';

const COUNT_IN = 4; // beats
// The mic reads a bass note ~70 ms after the pluck (an 85 ms analysis window
// plus two stable frames): subtracted before timing is judged. An estimate —
// compare your runs with each other rather than trusting the absolute ms.
const DETECT_LAG_MS = 70;
const EARLY_MS = 180;
const lateMs = (beatMs, beats) => Math.max(150, Math.min(350, beatMs * beats * 0.6));
const FLASH_MS = 450;
const MIN_TO_LOG = 4;

// ---- note onsets from the continuous pitch stream ---------------------------
export function useBassOnsets(onNote) {
  const pitch = usePitchDetection(BASS_PITCH_RANGE);
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
    // Same pitch plucked again: the level jumps back up.
    if (!s.armed && level > s.minLevel * 1.6 && level - s.minLevel > 0.03) {
      s.armed = true;
      s.frames = 0;
      s.since = now;
    }
    if (n.midi !== s.midi) {
      s.midi = n.midi;
      s.since = now;
      s.frames = 0;
      s.armed = true; // a new pitch (also hammer-ons / slides) is a new note
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

const sameNote = (a, b) => a === b || Math.abs(a - b) === 12; // octave slips of the detector count

export function useBassPractice(metronome) {
  const [built, setBuilt] = useState(null); // { id, item, steps, totalBeats, bpm }
  const [mode, setMode] = useState('play');
  const [loop, setLoop] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | countin | run | done
  const [countIn, setCountIn] = useState(0);
  const [stepIndex, setStepIndex] = useState(-1);
  const [feedback, setFeedback] = useState(null); // { cell: {stringIndex, fret}, correct }
  const [result, setResult] = useState(null);
  const [live, setLive] = useState({ hits: 0, misses: 0 });
  const [labels, setLabels] = useState('degree'); // what the neck dots show: note | degree | finger

  const r = useRef({});
  const flashT = useRef(null);
  const builtRef = useRef(built);
  builtRef.current = built;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const metro = useRef(metronome);
  metro.current = metronome;
  const finishRef = useRef(null);

  const flash = (step, correct) => {
    setFeedback({ cell: { stringIndex: step.string, fret: step.fret }, correct });
    clearTimeout(flashT.current);
    flashT.current = setTimeout(() => setFeedback(null), FLASH_MS);
  };

  // --- judging -----------------------------------------------------------------
  const onNote = useCallback((midi, at) => {
    const ex = builtRef.current;
    const R = r.current;
    if (!ex || !R.running) return;
    if (modeRef.current === 'wait') {
      const target = ex.steps[R.at];
      if (!target) return;
      if (sameNote(midi, target.midi)) {
        flash(target, true);
        R.hits += 1;
        const next = R.at + 1;
        if (next >= ex.steps.length) {
          if (loopRef.current) {
            R.at = 0;
            R.passes += 1;
            setStepIndex(0);
          } else finishRef.current();
        } else {
          R.at = next;
          setStepIndex(next);
        }
      } else if (Math.abs(midi - target.midi) <= 7) flash(target, false);
      return;
    }
    if (modeRef.current !== 'play' || R.beatBase == null) return;
    const t = at - DETECT_LAG_MS;
    let best = null;
    const total = ex.totalBeats;
    const pos = (t - R.beatBase) / R.beatMs - COUNT_IN;
    const pass0 = Math.max(0, Math.floor(pos / total) - 1);
    for (let pass = pass0; pass <= pass0 + 2; pass += 1) {
      if (!loopRef.current && pass > 0) break;
      ex.steps.forEach((s, i) => {
        const key = pass * 10000 + i;
        if (R.judged.has(key)) return;
        const exp = R.beatBase + (COUNT_IN + pass * total + s.beat) * R.beatMs;
        const off = t - exp;
        if (off < -EARLY_MS || off > lateMs(R.beatMs, s.beats)) return;
        if (!sameNote(midi, s.midi)) return;
        if (!best || Math.abs(off) < Math.abs(best.off)) best = { key, off, s };
      });
    }
    if (best) {
      R.judged.add(best.key);
      R.hits += 1;
      R.offsets.push(best.off);
      setLive({ hits: R.hits, misses: R.misses });
      flash(best.s, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pitch = useBassOnsets(onNote);

  // --- the clock (shared metronome) -------------------------------------------------
  useEffect(() => {
    const R = r.current;
    if (!R.running || modeRef.current === 'wait' || metronome.currentBeat == null) return;
    const now = performance.now();
    R.beatCount = (R.beatCount ?? -1) + 1;
    R.beatMs = 60000 / metronome.bpm;
    R.beatBase = now - R.beatCount * R.beatMs;
    if (R.beatCount < COUNT_IN) {
      setPhase('countin');
      setCountIn(COUNT_IN - R.beatCount);
    } else if (R.beatCount === COUNT_IN) {
      setPhase('run');
      setCountIn(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metronome.currentBeat]);

  // Poll: moves the marker, plays (listen), times out misses (play), ends the run.
  useEffect(() => {
    if (phase !== 'run' && phase !== 'countin') return undefined;
    if (modeRef.current === 'wait') return undefined;
    const id = setInterval(() => {
      const ex = builtRef.current;
      const R = r.current;
      if (!ex || !R.running || R.beatBase == null) return;
      const now = performance.now();
      const total = ex.totalBeats;
      const pos = (now - R.beatBase) / R.beatMs - COUNT_IN;
      if (pos < 0) return;
      const pass = Math.floor(pos / total);
      if (pass > 0 && !loopRef.current) {
        // let the last note's window close, then end
        if (pos > total + 0.6) finishRef.current();
        return;
      }
      const local = pos - pass * total;
      let i = 0;
      while (i + 1 < ex.steps.length && ex.steps[i + 1].beat <= local) i += 1;
      const k = pass * 10000 + i;
      if (k !== R.shown) {
        R.shown = k;
        setStepIndex(i);
        if (modeRef.current === 'listen') playBassNote(ex.steps[i].midi);
        if (pass > R.passes) R.passes = pass;
      }
      if (modeRef.current === 'play') {
        // misses: every step of this / the previous pass whose window has closed
        for (let ps = Math.max(0, pass - 1); ps <= pass; ps += 1) {
          ex.steps.forEach((s, j) => {
            const key = ps * 10000 + j;
            if (R.judged.has(key)) return;
            const exp = R.beatBase + (COUNT_IN + ps * total + s.beat) * R.beatMs;
            if (now - DETECT_LAG_MS - exp > lateMs(R.beatMs, s.beats)) {
              R.judged.add(key);
              R.misses += 1;
              setLive({ hits: R.hits, misses: R.misses });
              flash(s, false);
            }
          });
        }
      }
    }, 12);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // The metronome stopped from outside (its pill): the run stops too.
  useEffect(() => {
    const R = r.current;
    if (R.running && modeRef.current !== 'wait' && !metronome.isRunning && R.clockStarted) finishRef.current();
    if (metronome.isRunning && R.running) R.clockStarted = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metronome.isRunning]);

  // --- control ------------------------------------------------------------------
  function report() {
    const R = r.current;
    const ex = builtRef.current;
    const judged = R.hits + R.misses;
    const offs = R.offsets;
    const mean = offs.length ? offs.reduce((a, b) => a + b, 0) / offs.length : null;
    const spread = offs.length >= 2 ? Math.sqrt(offs.reduce((a, b) => a + (b - mean) ** 2, 0) / offs.length) : null;
    const durationMs = Date.now() - (R.startedAt ?? Date.now());
    if (modeRef.current === 'play') {
      const res = {
        mode: 'play',
        hits: R.hits,
        misses: R.misses,
        accuracyPct: judged ? Math.round((R.hits / judged) * 100) : null,
        meanOffsetMs: mean == null ? null : Math.round(mean),
        spreadMs: spread == null ? null : Math.round(spread),
        bpm: metro.current.bpm,
      };
      if (ex && judged >= MIN_TO_LOG) {
        logPerf({ tool: 'bass', item: ex.item, bpm: metro.current.bpm, durationMs, metrics: { ...res, total: ex.steps.length } });
      }
      return res;
    }
    if (modeRef.current === 'wait') {
      const res = { mode: 'wait', notes: R.hits, seconds: Math.round(durationMs / 1000) };
      if (ex && R.hits >= MIN_TO_LOG) logPerf({ tool: 'bass', item: ex.item, durationMs, metrics: res });
      return res;
    }
    return null;
  }

  function finish() {
    const R = r.current;
    if (!R.running) return;
    R.running = false;
    if (modeRef.current !== 'wait') metro.current.stop();
    pitch.stopListening();
    setResult(report());
    setPhase('done');
    setCountIn(0);
  }

  finishRef.current = finish;

  function start() {
    const ex = builtRef.current;
    if (!ex) return;
    setResult(null);
    setFeedback(null);
    setLive({ hits: 0, misses: 0 });
    r.current = {
      running: true,
      hits: 0,
      misses: 0,
      offsets: [],
      judged: new Set(),
      beatCount: -1,
      beatBase: null,
      beatMs: 60000 / metronome.bpm,
      shown: -1,
      passes: 0,
      at: 0,
      startedAt: Date.now(),
      clockStarted: false,
    };
    setStepIndex(modeRef.current === 'wait' ? 0 : -1);
    preloadBassSamples();
    if (modeRef.current !== 'listen') pitch.startListening();
    if (modeRef.current === 'wait') {
      setPhase('run');
      return;
    }
    if (metronome.beatsPerMeasure !== 4) metronome.setBeatsPerMeasure(4);
    if (metronome.isRunning) metronome.stop();
    setPhase('countin');
    setCountIn(COUNT_IN);
    // a fresh start of the shared clock (the beat counter starts at its first click)
    setTimeout(() => metronome.start(), 30);
  }

  function stop() {
    if (r.current.running) finish();
  }

  /** Loads an exercise (or null). Stops a running one first. */
  const load = useCallback((next) => {
    const R = r.current;
    if (R.running) {
      R.running = false;
      metro.current.stop();
      pitch.stopListening();
    }
    setPhase('idle');
    setResult(null);
    setFeedback(null);
    setStepIndex(-1);
    setBuilt(next);
    if (next?.bpm) metro.current.setBpm(next.bpm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving the screen stops everything.
  useEffect(
    () => () => {
      if (r.current.running) {
        r.current.running = false;
        metro.current.stop();
      }
      clearTimeout(flashT.current);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const best = built ? bestFor(built.item) : null;

  return {
    built,
    load,
    mode,
    setMode: (m) => {
      if (r.current.running) stop();
      setMode(m);
    },
    loop,
    setLoop,
    labels,
    setLabels,
    phase,
    running: phase === 'run' || phase === 'countin',
    countIn,
    stepIndex,
    feedback,
    result,
    live,
    best,
    start,
    stop,
    micError: pitch.error,
    micListening: pitch.isListening,
    heard: pitch.currentNote,
    deadInput: pitch.deadInput,
  };
}

/** Best accuracy (play mode) logged for an item, or null. */
export function bestFor(item) {
  try {
    const runs = perfFor({ tool: 'bass', item }).filter((e) => e.metrics?.mode === 'play' && e.metrics.accuracyPct != null);
    if (!runs.length) return null;
    return Math.max(...runs.map((e) => e.metrics.accuracyPct));
  } catch {
    return null;
  }
}
