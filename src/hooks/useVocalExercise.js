import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext } from '../audio/audioContext';
import { schedulePianoNotes, preparePiano } from '../audio/pianoPlayer';
import { buildReps } from '../music/vocal/exercises';
import { analyzeRep, diagnose } from '../music/vocal/vocalAnalysis';
import { recordResult } from '../music/vocal/vocalProgress';

const BREATH = 0.35; // seconds between the cue ending and singing
const TAIL = 0.45; // keep listening a little after the last note
const GAP = 0.6; // pause between rounds

/**
 * Runs one exercise as rounds of call-and-response: the piano cue, then the
 * singer, then the analysis of that round. `mic` is useVocalMic().
 * The drawing reads `viewRef` every frame (no re-render per frame).
 */
export function useVocalExercise({ ex, range, level, tempo, guide, mic }) {
  const [phase, setPhase] = useState('ready'); // ready | cue | sing | done
  const [repIndex, setRepIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [repCount, setRepCount] = useState(0);
  const viewRef = useRef({ rep: null, phase: 'ready', cueStart: 0, singStart: 0, singEnd: 0, last: null });
  const run = useRef({ reps: [], index: 0, results: [], stopCue: null, raf: null, started: 0, alive: false });
  const settings = useRef({ guide, level, ex });
  settings.current = { guide, level, ex };

  const cancel = useCallback(() => {
    const r = run.current;
    r.alive = false;
    if (r.raf) cancelAnimationFrame(r.raf);
    r.raf = null;
    r.stopCue?.();
    r.stopCue = null;
  }, []);

  const startRep = useCallback((index) => {
    const r = run.current;
    const rep = r.reps[index];
    const ctx = getAudioContext();
    const cueStart = ctx.currentTime + 0.12;
    const singStart = cueStart + rep.cueLength + BREATH;
    const singEnd = singStart + rep.length + TAIL;
    r.stopCue?.();
    const notes = [...rep.cue];
    const stops = [schedulePianoNotes(notes, cueStart)];
    if (settings.current.guide) {
      // Soft guide while singing: the target notes (a slide: its turning points).
      const guideNotes = rep.targets.flatMap((n) =>
        n.glide ? n.glide.slice(0, -1).map(([t, m], i) => ({ midi: m, start: n.start + t, dur: n.glide[i + 1][0] - t })) : [{ midi: n.midi, start: n.start, dur: n.dur }]
      );
      stops.push(schedulePianoNotes(guideNotes, singStart, { velocity: 42 }));
    }
    r.stopCue = () => stops.forEach((s) => s());
    r.index = index;
    viewRef.current = { ...viewRef.current, rep, phase: 'cue', cueStart, singStart, singEnd, last: null };
    setRepIndex(index);
    setPhase('cue');
  }, []);

  const finish = useCallback(() => {
    const r = run.current;
    cancel();
    const { ex: e, level: lv } = settings.current;
    const tips = diagnose(r.results, e, lv);
    const score = Math.round(r.results.reduce((a, x) => a + x.score, 0) / Math.max(1, r.results.length));
    const seconds = (getAudioContext().currentTime - r.started) || 0;
    if (r.results.length) recordResult(e.id, score, seconds); // an all-skipped run isn't practice
    mic.stop(); // release the microphone between exercises
    setSummary({ score, tips });
    viewRef.current = { ...viewRef.current, phase: 'done' };
    setPhase('done');
  }, [cancel, mic]);

  const loop = useCallback(() => {
    const r = run.current;
    if (!r.alive) return;
    const v = viewRef.current;
    const now = getAudioContext().currentTime;
    if (v.phase === 'cue' && now >= v.singStart) {
      viewRef.current = { ...v, phase: 'sing' };
      setPhase('sing');
    } else if (v.phase === 'sing' && now >= v.singEnd) {
      const frames = mic.framesRef.current
        .filter((f) => f.ct >= v.singStart - 0.05 && f.ct <= v.singEnd)
        .map((f) => ({ t: f.ct - v.singStart, midi: f.midi }));
      const result = analyzeRep(frames, v.rep, settings.current.ex, settings.current.level);
      r.results = [...r.results.slice(0, r.index), result];
      setResults(r.results);
      viewRef.current = { ...v, phase: 'gap', last: { frames, result }, gapEnd: now + GAP };
    } else if (v.phase === 'gap' && now >= v.gapEnd) {
      if (r.index + 1 < r.reps.length) startRep(r.index + 1);
      else {
        finish();
        return;
      }
    }
    r.raf = requestAnimationFrame(loop);
  }, [mic, startRep, finish]);

  const start = useCallback(async () => {
    cancel();
    const ok = await mic.start();
    if (!ok) return;
    preparePiano();
    const reps = buildReps(ex, range, { level, tempo });
    run.current = { ...run.current, reps, index: 0, results: [], alive: true, started: getAudioContext().currentTime };
    setRepCount(reps.length);
    setResults([]);
    setSummary(null);
    startRep(0);
    run.current.raf = requestAnimationFrame(loop);
  }, [cancel, mic, ex, range, level, tempo, startRep, loop]);

  const stop = useCallback(() => {
    cancel();
    mic.stop();
    viewRef.current = { ...viewRef.current, phase: 'ready' };
    setPhase('ready');
  }, [cancel, mic]);

  /** Sing the current round again. */
  const repeat = useCallback(() => {
    const r = run.current;
    if (!r.reps.length) return;
    cancel();
    r.alive = true;
    r.results = r.results.slice(0, r.index);
    setResults(r.results);
    startRep(r.index);
    r.raf = requestAnimationFrame(loop);
  }, [cancel, startRep, loop]);

  /** Skip to the next round (or finish). */
  const skip = useCallback(() => {
    const r = run.current;
    if (!r.reps.length) return;
    cancel();
    r.alive = true;
    if (r.index + 1 < r.reps.length) {
      startRep(r.index + 1);
      r.raf = requestAnimationFrame(loop);
    } else finish();
  }, [cancel, startRep, loop, finish]);

  // A different exercise (or leaving): stop everything.
  useEffect(() => {
    viewRef.current = { rep: null, phase: 'ready', cueStart: 0, singStart: 0, singEnd: 0, last: null };
    setPhase('ready');
    setResults([]);
    setSummary(null);
    setRepIndex(0);
    return cancel;
  }, [ex, cancel]);

  return { phase, repIndex, repCount, results, summary, viewRef, start, stop, repeat, skip };
}
