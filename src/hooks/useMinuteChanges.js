import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext } from '../audio/audioContext';
import { getAudioInputSettings } from '../audio/audioInputSettingsStore';
import { computeChroma, matchChordFromChroma } from '../music/chromaChordDetector';
import { activeCalibration, createGate, subtractNoiseProfile } from '../audio/noiseCalibration';
import { parseGuitarChordProgressionText } from '../music/guitarChordRhythmContent';
import { logPerf } from '../coach/perfLog';

// One-Minute Changes (the guitar-teacher benchmark, JustinGuitar style):
// alternate between two chords for 60 s, one strum per chord, and count the
// clean changes. Here the mic counts them.
//
// Mic: the SAME analysis as useMicChordDetector.js (computeChroma +
// matchChordFromChroma, same shared Settings -> Audio Input device/gain/
// mode), run here in the hook's own small pipeline for two reasons: a
// level meter needs the time-domain signal (the shared detector doesn't
// expose its stream/analyser), and a change every ~second needs a faster
// tick than its 250 ms (here 125 ms) for the "held briefly" rule below.

const FFT_SIZE = 4096;
const TICK_MS = 125;
const COUNTDOWN_S = 3;
export const DEFAULT_DURATION_S = 60;

// ---------------------------------------------------------------------------
// Pure counting logic (tested in isolation).
//
// Rule: a detection is a chord {root, qualityKey} or null (silence/noise).
// A chord is CONFIRMED once the same root+quality is seen in `minFrames`
// consecutive detections spanning at least `minHoldMs` (null or another
// chord in between restarts it) — this filters the flicker/garbage while
// the hand is moving. Each confirmed run acts once:
//   - first confirmed A or B: the starting chord (no count);
//   - the OTHER chord of the pair: +1 change (A>B or B>A), time recorded;
//   - the same chord again: nothing (re-strum);
//   - a third chord: +1 wrong (once per run; the same wrong chord again
//     without a valid chord between is not counted twice).
// ---------------------------------------------------------------------------

export const CHANGE_RULE = { minFrames: 2, minHoldMs: 100 };

const keyOf = (c) => (c ? `${c.root}:${c.qualityKey}` : null);

export function initialChangeState() {
  return {
    current: null, // index 0/1 of the confirmed pair chord, null = not started
    candKey: null,
    candFrames: 0,
    candSince: 0,
    confirmedKey: null, // last confirmed run's key (any chord)
    count: 0,
    aToB: 0,
    bToA: 0,
    wrong: 0,
    changeTimes: [],
    changeDirs: [], // 1 = A>B, 0 = B>A, per change
    lastChord: null, // last confirmed chord (any)
  };
}

/** chords: [{root, qualityKey}, {root, qualityKey}]; event: {t (ms), chord|null}. */
export function stepChanges(state, event, chords, rule = CHANGE_RULE) {
  const k = keyOf(event.chord);
  if (!k) return state.candKey == null ? state : { ...state, candKey: null, candFrames: 0 };
  let s = state;
  if (k === s.candKey) s = { ...s, candFrames: s.candFrames + 1 };
  else s = { ...s, candKey: k, candFrames: 1, candSince: event.t };
  if (s.candFrames < rule.minFrames || event.t - s.candSince < rule.minHoldMs) return s;
  if (k === s.confirmedKey) return s; // this run already acted (or a re-strum)

  s = { ...s, confirmedKey: k, lastChord: event.chord };
  const idx = chords.findIndex((c) => keyOf(c) === k);
  if (idx === -1) return { ...s, wrong: s.wrong + 1 };
  if (s.current == null) return { ...s, current: idx };
  if (idx === s.current) return s;
  return {
    ...s,
    current: idx,
    count: s.count + 1,
    aToB: s.aToB + (idx === 1 ? 1 : 0),
    bToA: s.bToA + (idx === 0 ? 1 : 0),
    changeTimes: [...s.changeTimes, event.t],
    changeDirs: [...s.changeDirs, idx],
  };
}

/** Runs a whole detection sequence (handy for tests). */
export function countChanges(events, chords, rule = CHANGE_RULE) {
  return events.reduce((s, e) => stepChanges(s, e, chords, rule), initialChangeState());
}

/**
 * Gaps = start -> 1st change -> 2nd change …; the mean is over those; the
 * longest also considers the stall from the last change to the end.
 */
export function summarize(state, startT, endT) {
  const durationMs = Math.max(1, endT - startT);
  const marks = [startT, ...state.changeTimes];
  const gaps = [];
  for (let i = 1; i < marks.length; i += 1) gaps.push(marks[i] - marks[i - 1]);
  const tail = endT - marks[marks.length - 1];
  const longestGapMs = Math.round(Math.max(tail, ...gaps, 0));
  const mean = (arr) => (arr.length ? Math.round(arr.reduce((x, y) => x + y, 0) / arr.length) : 0);
  const meanGapMs = mean(gaps);
  // Per direction: the time between two changes belongs to the change that
  // ends it (the first gap, from the start, is left out — it includes
  // finding the first chord).
  const dirGaps = [[], []];
  for (let i = 1; i < state.changeTimes.length; i += 1) {
    dirGaps[state.changeDirs[i]].push(state.changeTimes[i] - state.changeTimes[i - 1]);
  }
  return {
    count: state.count,
    aToB: state.aToB,
    bToA: state.bToA,
    wrong: state.wrong,
    longestGapMs,
    meanGapMs,
    meanAToBMs: mean(dirGaps[1]),
    meanBToAMs: mean(dirGaps[0]),
    nAToB: dirGaps[1].length,
    nBToA: dirGaps[0].length,
    durationMs: Math.round(durationMs),
    perMinute: Math.round((state.count * 60000) / durationMs),
  };
}

export function parseChord(text) {
  const p = parseGuitarChordProgressionText(text || '')[0];
  return p ? { root: p.rootPitchClass, qualityKey: p.qualityKey, name: text } : null;
}

/** Index (0/1) of the pair chord a detector guess {root, qualityKey} is, or -1. */
export function pairIndexOf(guess, pairNames) {
  if (!guess) return -1;
  const k = keyOf(guess);
  return pairNames.findIndex((n) => keyOf(parseChord(n)) === k);
}

function click(high) {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime + 0.01;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = high ? 1760 : 1100;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  } catch {
    /* no audio — the countdown is visual too */
  }
}

/**
 * phase: 'idle' | 'countdown' | 'running' | 'done'
 * Returns { phase, countdown, remainingMs, durationMs, count, aToB, bToA,
 *   wrong, current (0|1|null), heard ({chord,root,qualityKey}|null),
 *   lastChord, level (0..1), error, result, start, stop, reset }.
 */
export function useMinuteChanges({ chords = [], duration = DEFAULT_DURATION_S, onResult } = {}) {
  const [a, b] = chords;
  const durationMs = duration * 1000;
  const [phase, setPhase] = useState('idle');
  const [countdown, setCountdown] = useState(0);
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [live, setLive] = useState(initialChangeState);
  const [heard, setHeard] = useState(null);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const micRef = useRef(null); // { stream, source, gain, analyser, freq, time }
  const tickRef = useRef(null);
  const timersRef = useRef([]);
  const stateRef = useRef(initialChangeState());
  const phaseRef = useRef('idle');
  const startTRef = useRef(0);
  const pairRef = useRef([]);
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const setP = (p) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const closeMic = useCallback(() => {
    if (tickRef.current != null) clearInterval(tickRef.current);
    tickRef.current = null;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const m = micRef.current;
    if (m) {
      m.source.disconnect();
      m.gain.disconnect();
      m.stream.getTracks().forEach((tr) => tr.stop());
    }
    micRef.current = null;
    setLevel(0);
    setHeard(null);
  }, []);

  const finish = useCallback(() => {
    const endT = performance.now();
    const s = stateRef.current;
    closeMic();
    const res = summarize(s, startTRef.current, endT);
    setRemainingMs(0);
    setResult(res);
    setP('done');
    const [ca, cb] = pairRef.current;
    try {
      logPerf({
        tool: 'minuteChanges',
        item: `${ca.name}>${cb.name}`,
        durationMs: res.durationMs,
        metrics: {
          count: res.count,
          aToB: res.aToB,
          bToA: res.bToA,
          longestGapMs: res.longestGapMs,
          meanGapMs: res.meanGapMs,
          wrong: res.wrong,
          perMinute: res.perMinute,
        },
      });
    } catch {
      /* logging must never break the test */
    }
    onResultRef.current?.(res);
  }, [closeMic]);

  const tick = useCallback(() => {
    const m = micRef.current;
    if (!m) return;
    m.gain.gain.value = getAudioInputSettings().gain;
    m.analyser.getFloatTimeDomainData(m.time);
    let sum = 0;
    for (let i = 0; i < m.time.length; i += 1) sum += m.time[i] * m.time[i];
    const rms = Math.sqrt(sum / m.time.length);
    const db = 20 * Math.log10(rms || 1e-8);
    setLevel(Math.min(1, Math.max(0, (db + 60) / 54)));

    m.analyser.getFloatFrequencyData(m.freq);
    // Room calibration (null = none -> unchanged): gate + noise subtraction.
    if (m.cal) subtractNoiseProfile(m.freq, m.cal, m.gain.gain.value, FFT_SIZE, m.ctx.sampleRate);
    const gateOpen = !m.cal || m.gate(rms, m.cal, m.gain.gain.value);
    const guess = gateOpen ? matchChordFromChroma(computeChroma(m.freq, m.ctx.sampleRate, FFT_SIZE)) : null;
    setHeard(guess);
    if (phaseRef.current !== 'running') return;
    const now = performance.now();
    const elapsed = now - startTRef.current;
    if (elapsed >= durationMs) {
      finish();
      return;
    }
    const chord = guess ? { root: guess.root, qualityKey: guess.qualityKey } : null;
    const next = stepChanges(stateRef.current, { t: now, chord }, pairRef.current);
    if (next !== stateRef.current) {
      stateRef.current = next;
      setLive(next);
    }
    setRemainingMs(Math.max(0, durationMs - elapsed));
  }, [durationMs, finish]);

  const start = useCallback(async () => {
    const pa = parseChord(a);
    const pb = parseChord(b);
    if (!pa || !pb || keyOf(pa) === keyOf(pb)) return;
    if (phaseRef.current === 'countdown' || phaseRef.current === 'running') return;
    pairRef.current = [pa, pb];
    setError(null);
    setResult(null);
    stateRef.current = initialChangeState();
    setLive(stateRef.current);
    setRemainingMs(durationMs);
    setP('countdown');
    setCountdown(COUNTDOWN_S);
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume?.();
      const { deviceId, inputMode, gain } = getAudioInputSettings();
      const processing = inputMode === 'microphone';
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: processing,
          noiseSuppression: processing,
          autoGainControl: processing,
        },
      });
      if (phaseRef.current !== 'countdown') {
        stream.getTracks().forEach((tr) => tr.stop());
        return;
      }
      const source = ctx.createMediaStreamSource(stream);
      const gainNode = ctx.createGain();
      gainNode.gain.value = gain;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(gainNode).connect(analyser); // analysis only, never to the speakers
      micRef.current = {
        ctx,
        stream,
        source,
        gain: gainNode,
        analyser,
        freq: new Float32Array(analyser.frequencyBinCount),
        time: new Float32Array(analyser.fftSize),
        cal: activeCalibration(),
        gate: createGate({ soft: true }),
      };
      stream.getAudioTracks()[0]?.addEventListener('ended', () => {
        if (phaseRef.current === 'running' || phaseRef.current === 'countdown') {
          closeMic();
          setP('idle');
        }
      });
      tickRef.current = setInterval(tick, TICK_MS);
    } catch (err) {
      setError(err?.message ?? String(err));
      closeMic();
      setP('idle');
      return;
    }
    // 3-2-1 (mic already open, so the level meter works during it).
    click(false);
    for (let i = 1; i <= COUNTDOWN_S; i += 1) {
      timersRef.current.push(
        setTimeout(() => {
          if (phaseRef.current !== 'countdown') return;
          if (i < COUNTDOWN_S) {
            setCountdown(COUNTDOWN_S - i);
            click(false);
          } else {
            click(true);
            setCountdown(0);
            startTRef.current = performance.now();
            stateRef.current = initialChangeState();
            setLive(stateRef.current);
            setP('running');
          }
        }, i * 1000)
      );
    }
  }, [a, b, durationMs, tick, closeMic]);

  /** Abort (nothing logged). */
  const stop = useCallback(() => {
    closeMic();
    setP('idle');
    setCountdown(0);
    setRemainingMs(durationMs);
  }, [closeMic, durationMs]);

  const reset = useCallback(() => {
    stop();
    stateRef.current = initialChangeState();
    setLive(stateRef.current);
    setResult(null);
    setError(null);
  }, [stop]);

  useEffect(() => closeMic, [closeMic]);

  // Changing the pair mid-run makes the run meaningless — abort it.
  useEffect(() => {
    if (phaseRef.current === 'countdown' || phaseRef.current === 'running') stop();
    else if (phaseRef.current === 'done') {
      setP('idle');
      setResult(null);
      setRemainingMs(durationMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, b]);

  return {
    phase,
    countdown,
    remainingMs,
    durationMs,
    count: live.count,
    aToB: live.aToB,
    bToA: live.bToA,
    wrong: live.wrong,
    current: live.current,
    lastChord: live.lastChord,
    heard,
    level,
    error,
    result,
    start,
    stop,
    reset,
  };
}
