import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext, prepareAudioOutput, reviveAudioOutput } from '../audio/audioContext';
import { schedulePianoNotes, preparePiano } from '../audio/pianoPlayer';
import { buildReps } from '../music/vocal/exercises';
import { analyzeRep, diagnose } from '../music/vocal/vocalAnalysis';
import { recordResult } from '../music/vocal/vocalProgress';

const BREATH = 0.35; // seconds between the cue ending and singing
const TAIL = 0.45; // keep listening a little after the last note
const GAP = 0.6; // pause between rounds
// iPhone/iPad: while the microphone is open iOS plays everything through the
// small earpiece speaker (a "call" route), not the loudspeaker. So there the
// mic is closed while the piano plays and reopened right after the cue —
// a slightly longer breath leaves time for it to open.
const IS_IOS =
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const IOS_BREATH = 0.75;

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
  const micRef = useRef(mic);
  micRef.current = mic;
  const settings = useRef({ guide, level, ex });
  settings.current = { guide, level, ex };

  const cancel = useCallback(() => {
    const r = run.current;
    r.alive = false;
    if (r.raf) cancelAnimationFrame(r.raf);
    r.raf = null;
    r.stopCue?.();
    r.stopCue = null;
    clearTimeout(r.micTimer);
  }, []);

  const startRep = useCallback((index) => {
    const r = run.current;
    const rep = r.reps[index];
    const ctx = getAudioContext();
    // The first round waits a moment longer: on iPhone the audio session
    // is still settling right after the mic opened.
    const cueStart = ctx.currentTime + (index === 0 ? 0.45 : 0.12);
    const singStart = cueStart + rep.cueLength + (IS_IOS ? IOS_BREATH : BREATH);
    if (IS_IOS) {
      // Loudspeaker for the cue: no capture while it plays; reopen the mic
      // as the cue ends (permission was already given on Start).
      micRef.current.stop();
      clearTimeout(r.micTimer);
      r.micTimer = setTimeout(() => {
        if (!r.alive) return;
        micRef.current.start().then(() => reviveAudioOutput());
      }, Math.max(0, (cueStart + rep.cueLength - ctx.currentTime) * 1000));
    }
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
    // The mic stays open between exercises (closed when leaving the Vocal
    // section): on iPhone every open/close switches the audio session,
    // which could cut the piano.
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
    // Still inside the tap: unlock playback BEFORE the mic takes the
    // audio session (iPhone), then wake it again once the mic is open.
    prepareAudioOutput();
    const ok = await mic.start();
    reviveAudioOutput();
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
    viewRef.current = { ...viewRef.current, phase: 'ready' };
    setPhase('ready');
  }, [cancel]);

  /** Play the current round's cue again (or the first one) — a tap, so it
   *  always sounds, and a quick way to check the sound is on. */
  const hear = useCallback(() => {
    // iPhone: close the mic first so the notes come out of the loudspeaker.
    if (IS_IOS && !run.current.alive) micRef.current.stop();
    prepareAudioOutput();
    const rep = viewRef.current.rep ?? buildReps(ex, range, { level, tempo })[0];
    if (rep) schedulePianoNotes(rep.cue, getAudioContext().currentTime + 0.05);
  }, [ex, range, level, tempo]);

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

  return { phase, repIndex, repCount, results, summary, viewRef, start, stop, repeat, skip, hear };
}
