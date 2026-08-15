import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePitchDetection } from './usePitchDetection';
import {
  VOCAL_DIFFICULTIES,
  generateVocalSequence,
  centsFromTargetPitchClass,
  pitchClassAndOctaveToMidi,
} from '../music/vocalTraining';

const HOLD_DURATION_MS = 1500;
const HOLD_TICK_MS = 80;

// Session/exercise orchestration for Vocal Training. Wraps usePitchDetection
// (unmodified, same hook the Tuner uses) rather than forking it — this
// module only adds "what note should the singer be aiming for right now"
// and "did they hold it long enough" on top of the same real-time mic pitch
// stream every other pitch-detection feature already shares.
export function useVocalTraining() {
  const pitch = usePitchDetection();

  const [mode, setMode] = useState('hold');
  const [scaleKey, setScaleKey] = useState('major');
  const [intervalSemitones, setIntervalSemitones] = useState(4);
  const [pitchClass, setPitchClass] = useState(0); // C
  const [octave, setOctave] = useState(4);
  const [difficultyKey, setDifficultyKey] = useState(VOCAL_DIFFICULTIES[0].key);

  const [targetIndex, setTargetIndex] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [score, setScore] = useState({ hits: 0, misses: 0 });
  const [isComplete, setIsComplete] = useState(false);

  const holdStartRef = useRef(null);

  const rootMidi = pitchClassAndOctaveToMidi(pitchClass, octave);
  const difficulty = VOCAL_DIFFICULTIES.find((d) => d.key === difficultyKey) ?? VOCAL_DIFFICULTIES[0];

  const sequence = useMemo(
    () => generateVocalSequence({ mode, rootMidi, scaleKey, intervalSemitones }),
    [mode, rootMidi, scaleKey, intervalSemitones]
  );

  // Any change to the exercise shape starts a fresh run rather than leaving
  // targetIndex pointing past the end of a just-changed sequence.
  useEffect(() => {
    setTargetIndex(0);
    setHoldProgress(0);
    setIsComplete(false);
    holdStartRef.current = null;
  }, [sequence]);

  const target = sequence[targetIndex] ?? null;

  const cents = target && pitch.frequency != null ? centsFromTargetPitchClass(pitch.frequency, target.midi) : null;
  const isMatched = cents != null && Math.abs(cents) <= difficulty.toleranceCents;

  const advance = useCallback((wasHit) => {
    setScore((s) => (wasHit ? { ...s, hits: s.hits + 1 } : { ...s, misses: s.misses + 1 }));
    setTargetIndex((i) => {
      const next = i + 1;
      if (next >= sequence.length) {
        setIsComplete(true);
        return i;
      }
      return next;
    });
    setHoldProgress(0);
    holdStartRef.current = null;
  }, [sequence.length]);

  const skip = useCallback(() => advance(false), [advance]);

  // Sustained-match tracking: the target must stay within tolerance for
  // HOLD_DURATION_MS continuously, not just for one instantaneous reading —
  // a stray correct frame while sliding through a pitch shouldn't count as
  // a hit.
  useEffect(() => {
    if (!pitch.isListening || isComplete || !isMatched) {
      holdStartRef.current = null;
      setHoldProgress(0);
      return undefined;
    }
    if (holdStartRef.current == null) holdStartRef.current = performance.now();
    const id = setInterval(() => {
      const elapsed = performance.now() - holdStartRef.current;
      const progress = Math.min(1, elapsed / HOLD_DURATION_MS);
      setHoldProgress(progress);
      if (progress >= 1) advance(true);
    }, HOLD_TICK_MS);
    return () => clearInterval(id);
  }, [isMatched, pitch.isListening, isComplete, advance]);

  const restart = useCallback(() => {
    setTargetIndex(0);
    setHoldProgress(0);
    setScore({ hits: 0, misses: 0 });
    setIsComplete(false);
    holdStartRef.current = null;
  }, []);

  const start = useCallback(async () => {
    restart();
    await pitch.startListening();
  }, [pitch, restart]);

  const stop = useCallback(() => {
    pitch.stopListening();
  }, [pitch]);

  return {
    ...pitch,
    start,
    stop,
    mode,
    setMode,
    scaleKey,
    setScaleKey,
    intervalSemitones,
    setIntervalSemitones,
    pitchClass,
    setPitchClass,
    octave,
    setOctave,
    difficultyKey,
    setDifficultyKey,
    difficulty,
    sequence,
    targetIndex,
    target,
    cents,
    isMatched,
    holdProgress,
    score,
    isComplete,
    skip,
    restart,
  };
}
