import { useEffect, useRef, useState } from 'react';
import { GUITAR_CHORD_RHYTHM_MODES, generateGuitarChordRhythmProgression } from '../music/guitarChordRhythmContent';
import { useMicChordDetector } from './useMicChordDetector';

// Same "how long before its window opens the block/chip is already
// visible" convention as the piano version, and the same reasoning: a
// fixed reaction-time budget in real seconds, not a beat count, so it
// never gets uncomfortably short at fast tempos.
export const LEAD_TIME_S = 2.5;
const TAIL_S = 0.6;
const DEFAULT_MODE = GUITAR_CHORD_RHYTHM_MODES[0].key;

// Guitar's own "Guitar Hero for chords" — architecturally the exact same
// continuous-tick-loop engine as useChordRhythm.js (piano), rebuilt here
// rather than shared because judging is fundamentally different: piano
// judges discrete key clicks against exact MIDI notes; this judges a
// continuously-updating microphone chord GUESS (see useMicChordDetector.js)
// against a target {rootPitchClass, qualityKey} — there's no click to
// gate on, so the tick loop itself checks "does the mic's current best
// guess match the active chord" every frame instead of waiting for a
// discrete input event.
export function useGuitarChordRhythm(metronome) {
  const [mode, setMode] = useState(DEFAULT_MODE);
  const [beatsPerChord, setBeatsPerChord] = useState(4);
  const [viewMode, setViewMode] = useState('falling'); // 'falling' | 'timeline'

  const [sequence, setSequence] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [now, setNow] = useState(0);
  const [results, setResults] = useState({}); // { [index]: 'hit' | 'miss' }
  const [score, setScore] = useState({ hits: 0, misses: 0 });
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  const mic = useMicChordDetector();

  const sequenceRef = useRef([]);
  const resultsRef = useRef({});
  const activeIndexRef = useRef(-1);
  const secondsPerBeatRef = useRef(0.75);
  const nowRef = useRef(0);
  const startPerfTimeRef = useRef(0);
  const rafIdRef = useRef(null);

  function judgeChord(index, isCorrect) {
    if (resultsRef.current[index] != null) return;
    resultsRef.current = { ...resultsRef.current, [index]: isCorrect ? 'hit' : 'miss' };
    setResults(resultsRef.current);
    setScore((s) => (isCorrect ? { ...s, hits: s.hits + 1 } : { ...s, misses: s.misses + 1 }));
    setCombo((c) => {
      const next = isCorrect ? c + 1 : 0;
      setMaxCombo((m) => Math.max(m, next));
      return next;
    });
  }

  function endSession() {
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
    metronome.stop();
    mic.stopListening();
    setIsPlaying(false);
    setEnded(true);
  }

  function activeIndexAt(t) {
    const seq = sequenceRef.current;
    for (let i = 0; i < seq.length; i += 1) {
      if (t >= seq[i].startTime && t < seq[i].endTime) return i;
    }
    return -1;
  }

  // rAF-driven, exactly like useChordRhythm.js's own tick — see that
  // hook's comment on why a timer-based loop reads as stuttery compared to
  // one scheduled right before the browser's next actual paint.
  function tick() {
    const elapsed = (performance.now() - startPerfTimeRef.current) / 1000;
    nowRef.current = elapsed;
    setNow(elapsed);

    const seq = sequenceRef.current;
    activeIndexRef.current = activeIndexAt(elapsed);

    // The mic's current best guess, checked against whichever chord is
    // active RIGHT NOW — a match ends that chord's window early as a hit,
    // the same "early satisfying answer" pattern the piano version's click
    // handler gives, just driven by a continuous signal instead of a
    // discrete event.
    const activeIndex = activeIndexRef.current;
    if (activeIndex >= 0 && resultsRef.current[activeIndex] == null) {
      const target = seq[activeIndex];
      const g = mic.guessRef.current;
      if (g && g.root === target.rootPitchClass && g.qualityKey === target.qualityKey) {
        judgeChord(activeIndex, true);
      }
    }

    for (let i = 0; i < seq.length; i += 1) {
      if (resultsRef.current[i] == null && elapsed >= seq[i].endTime) {
        judgeChord(i, false);
      }
    }

    const last = seq[seq.length - 1];
    if (last && elapsed >= last.endTime + TAIL_S) {
      endSession();
      return;
    }
    rafIdRef.current = requestAnimationFrame(tick);
  }

  function loadSequence() {
    const generated = generateGuitarChordRhythmProgression(mode);
    const bpm = generated.bpmSuggested;
    const nextBeatsPerChord = generated.beatsPerChord;
    metronome.setBpm(bpm);
    setBeatsPerChord(nextBeatsPerChord);
    secondsPerBeatRef.current = 60 / bpm;

    const built = generated.sequence.map((chord, i) => {
      const startTime = LEAD_TIME_S + i * nextBeatsPerChord * secondsPerBeatRef.current;
      const endTime = startTime + nextBeatsPerChord * secondsPerBeatRef.current;
      return { ...chord, startTime, endTime };
    });
    sequenceRef.current = built;
    setSequence(built);
    setEnded(false);
    setScore({ hits: 0, misses: 0 });
    setCombo(0);
    setMaxCombo(0);
    resultsRef.current = {};
    setResults({});
    activeIndexRef.current = -1;
    return built;
  }

  async function play() {
    const built = loadSequence();
    if (built.length === 0) return;
    setEnded(false);
    setIsPlaying(true);
    nowRef.current = 0;
    setNow(0);
    await mic.startListening();
    startPerfTimeRef.current = performance.now();
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(tick);
    metronome.start();
  }

  function restart() {
    play();
  }

  function stop() {
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
    metronome.stop();
    mic.stopListening();
    setIsPlaying(false);
  }

  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const accuracyPct = score.hits + score.misses > 0 ? Math.round((score.hits / (score.hits + score.misses)) * 100) : null;

  return {
    mode,
    setMode,
    beatsPerChord,
    viewMode,
    setViewMode,
    sequence,
    now,
    results,
    isPlaying,
    ended,
    play,
    restart,
    stop,
    score,
    combo,
    maxCombo,
    accuracyPct,
    micIsListening: mic.isListening,
    micError: mic.error,
    micGuess: mic.guess,
  };
}
