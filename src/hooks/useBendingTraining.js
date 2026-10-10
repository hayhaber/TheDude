import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePitchDetection } from './usePitchDetection';
import { getAudioContext } from '../audio/audioContext';
import {
  BEND_STATES,
  SUSTAIN_MS,
  TOLERANCE_CENTS,
  centsFromTarget,
  classifyBendState,
  generateBendProgression,
  resolveBendStep,
} from '../music/bendingTraining';
import { logPerf } from '../coach/perfLog';

const SUSTAIN_TICK_MS = 60;
const RECENT_CENTS_MAX = 12;
// Performance log (coach/perfLog.js): one entry per round — when it's
// complete, or when stopped/restarted after at least this many steps.
const MIN_STEPS_TO_LOG = 3;

function emptyRun() {
  return { steps: [], startedAt: null };
}

function centsStats(list) {
  const vals = list.filter((v) => Number.isFinite(v));
  if (!vals.length) return { meanCents: null, meanAbsCents: null };
  return {
    meanCents: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    meanAbsCents: Math.round(vals.reduce((a, b) => a + Math.abs(b), 0) / vals.length),
  };
}

// Demo playback timing: hold the start pitch briefly, glide up to the
// target, hold that briefly too, then release — the same shape a real
// bend's sound has, so the demo is actually what the player is meant to
// reproduce rather than an abstract sound.
const DEMO_HOLD_S = 0.35;
const DEMO_BEND_S = 0.45;
const DEMO_RELEASE_S = 0.35;

// Session orchestration for String Bending Accuracy. Wraps usePitchDetection
// unmodified (same hook the Tuner and Vocal Training use) — this module only
// adds "how far is the live pitch from this specific fretted target" and the
// sustain/state-machine logic on top of the same real-time mic stream.
export function useBendingTraining() {
  const pitch = usePitchDetection();

  const progression = useMemo(() => generateBendProgression(), []);
  const [stepIndex, setStepIndex] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [score, setScore] = useState({ hits: 0, misses: 0 });
  const [isComplete, setIsComplete] = useState(false);

  const holdStartRef = useRef(null);
  const recentCentsRef = useRef([]);

  const step = useMemo(() => resolveBendStep(progression[stepIndex]), [progression, stepIndex]);

  const centsToTarget = pitch.frequency != null ? centsFromTarget(pitch.frequency, step.targetFrequency) : null;
  const centsFromStart = pitch.frequency != null ? centsFromTarget(pitch.frequency, step.startFrequency) : null;
  const bendProgress = centsFromStart == null ? 0 : centsFromStart / (step.bendType.semitones * 100);

  // Track a short rolling window of cents-to-target readings so the state
  // machine can tell a steady hold apart from a shaky one drifting in and
  // out of the tolerance window (UNSTABLE_SUSTAIN).
  useEffect(() => {
    if (centsToTarget == null) {
      recentCentsRef.current = [];
      return;
    }
    recentCentsRef.current = [...recentCentsRef.current, centsToTarget].slice(-RECENT_CENTS_MAX);
  }, [centsToTarget]);

  const bendState = classifyBendState(centsToTarget, recentCentsRef.current);

  // For the performance log: each decided step (hit/miss, its bend type and
  // how far off the target the pitch was at that moment, signed cents).
  const runRef = useRef(emptyRun());
  const centsNowRef = useRef(null);
  centsNowRef.current = centsToTarget;
  const stepNowRef = useRef(step);
  stepNowRef.current = step;

  const flushPerf = useCallback((minSteps = MIN_STEPS_TO_LOG) => {
    const run = runRef.current;
    runRef.current = emptyRun();
    if (!run.steps.length || run.steps.length < minSteps) return;
    const hits = run.steps.filter((x) => x.hit).length;
    const byType = {};
    for (const x of run.steps) {
      const b = byType[x.type] ?? (byType[x.type] = { hits: 0, misses: 0, cents: [] });
      if (x.hit) b.hits += 1;
      else b.misses += 1;
      if (x.cents != null) b.cents.push(x.cents);
    }
    const types = {};
    for (const [k, b] of Object.entries(byType)) types[k] = { hits: b.hits, misses: b.misses, ...centsStats(b.cents) };
    logPerf({
      tool: 'bending',
      item: 'progression',
      durationMs: run.startedAt != null ? Date.now() - run.startedAt : undefined,
      metrics: {
        hits,
        misses: run.steps.length - hits,
        steps: run.steps.length,
        accuracyPct: Math.round((hits / run.steps.length) * 100),
        ...centsStats(run.steps.map((x) => x.cents)),
        byType: types,
        completed: minSteps <= 1,
      },
    });
  }, []);

  const advance = useCallback((wasHit) => {
    const run = runRef.current;
    if (run.startedAt == null) run.startedAt = Date.now();
    const cents = centsNowRef.current;
    run.steps.push({
      hit: !!wasHit,
      type: stepNowRef.current?.bendType?.key ?? 'unknown',
      cents: Number.isFinite(cents) ? Math.round(cents) : null,
    });
    setScore((s) => (wasHit ? { ...s, hits: s.hits + 1 } : { ...s, misses: s.misses + 1 }));
    setStepIndex((i) => {
      const next = i + 1;
      if (next >= progression.length) {
        setIsComplete(true);
        return i;
      }
      return next;
    });
    setHoldProgress(0);
    holdStartRef.current = null;
    recentCentsRef.current = [];
  }, [progression.length]);

  const skip = useCallback(() => advance(false), [advance]);

  // Sustain requirement: the bend must sit inside the tolerance window,
  // steadily (not jittering), for SUSTAIN_MS continuously before it counts
  // as a hit — a single instantaneous correct reading isn't enough.
  useEffect(() => {
    const holding = pitch.isListening && !isComplete && bendState === BEND_STATES.TARGET_REACHED;
    if (!holding) {
      holdStartRef.current = null;
      setHoldProgress(0);
      return undefined;
    }
    if (holdStartRef.current == null) holdStartRef.current = performance.now();
    const id = setInterval(() => {
      const elapsed = performance.now() - holdStartRef.current;
      const progress = Math.min(1, elapsed / SUSTAIN_MS);
      setHoldProgress(progress);
      if (progress >= 1) advance(true);
    }, SUSTAIN_TICK_MS);
    return () => clearInterval(id);
  }, [bendState, pitch.isListening, isComplete, advance]);

  // The round is over: record it.
  useEffect(() => {
    if (isComplete) flushPerf(1);
  }, [isComplete, flushPerf]);

  const restart = useCallback(() => {
    flushPerf();
    setStepIndex(0);
    setHoldProgress(0);
    setScore({ hits: 0, misses: 0 });
    setIsComplete(false);
    holdStartRef.current = null;
    recentCentsRef.current = [];
  }, [flushPerf]);

  const start = useCallback(async () => {
    restart();
    runRef.current.startedAt = Date.now();
    await pitch.startListening();
  }, [pitch, restart]);

  const stop = useCallback(() => {
    pitch.stopListening();
    flushPerf();
  }, [pitch, flushPerf]);

  // Plays what the bend is supposed to sound like — the start pitch, then a
  // glide up to the target — so the player has an actual reference to
  // reproduce instead of having to infer it purely from the fretboard/TAB
  // display. A raw oscillator + frequency ramp (no such glide/portamento
  // helper exists in audio/chordPlayer.js, which only plays fixed-pitch
  // notes), reusing the app's one shared AudioContext.
  const playDemo = useCallback(() => {
    const ctx = getAudioContext();
    const t0 = ctx.currentTime;
    const bendStart = t0 + DEMO_HOLD_S;
    const bendEnd = bendStart + DEMO_BEND_S;
    const stopTime = bendEnd + DEMO_RELEASE_S;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(step.startFrequency, t0);
    osc.frequency.setValueAtTime(step.startFrequency, bendStart);
    osc.frequency.linearRampToValueAtTime(step.targetFrequency, bendEnd);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.22, t0 + 0.02);
    gain.gain.setValueAtTime(0.22, stopTime - 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(stopTime + 0.05);
  }, [step]);

  return {
    ...pitch,
    start,
    stop,
    playDemo,
    step,
    stepIndex,
    totalSteps: progression.length,
    centsToTarget,
    bendProgress,
    bendState,
    toleranceCents: TOLERANCE_CENTS,
    holdProgress,
    score,
    isComplete,
    skip,
    restart,
  };
}
