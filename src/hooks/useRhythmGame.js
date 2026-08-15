import { useEffect, useRef, useState } from 'react';
import { STANDARD_TUNING } from '../music/notes';
import { useMicAnswerDetector } from './useMicAnswerDetector';

// Generous on purpose — this has to absorb useMicAnswerDetector's own
// ~120ms onset-stability debounce plus ordinary human timing variance. It's
// a practice aid judging "did you play the right note roughly on the beat,"
// not a sample-accurate rhythm-game judge. At fast tempos the window is
// self-limiting anyway: the next beat's miss-judgment closes it early (see
// judgeCurrentStep's judgedRef guard), so it never actually overruns into
// the following note's window.
const HIT_WINDOW_MS = 600;
const FEEDBACK_FLASH_MS = 500;

function midiForStep(step) {
  return STANDARD_TUNING[step.string].baseMidi + step.fret;
}

// "Guitar Hero"-style rhythm practice: one note per metronome beat, played
// on a real guitar (mic input, reusing the exact same onset-detection
// pipeline as Ear Training's mic-answer mode) and judged by timing — a hit
// if the right pitch arrives within HIT_WINDOW_MS of its beat, a miss once
// the next beat arrives without one. Shares the SAME metronome instance the
// rest of the app already uses (passed in, not created here) and the same
// music/drills.js sequence shape Practice Drills already plays through — no
// new content format, no new audio engine.
export function useRhythmGame(metronome) {
  const [exercise, setExercise] = useState(null);
  const [stepIndex, setStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [score, setScore] = useState({ hits: 0, misses: 0 });
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  // { cell: {stringIndex, fret}, correct } | null — fed straight into the
  // shared Fretboard's existing quizFeedbackCell prop (the same green/red
  // pulse-ring Ear Training's fret-click quizzes already use), so no change
  // to Fretboard.jsx is needed for the hit/miss flash.
  const [feedbackCell, setFeedbackCell] = useState(null);

  const stepIndexRef = useRef(-1);
  const firstBeatRef = useRef(true);
  const windowOpenRef = useRef(null); // performance.now() the current step's window opened, or null once judged
  const judgedRef = useRef(true);
  const feedbackTimeoutRef = useRef(null);
  const exerciseRef = useRef(null);

  function judgeCurrentStep(isCorrect) {
    if (judgedRef.current || !exerciseRef.current) return;
    judgedRef.current = true;
    windowOpenRef.current = null;
    const step = exerciseRef.current.sequence[stepIndexRef.current];
    setFeedbackCell({ cell: { stringIndex: step.string, fret: step.fret }, correct: isCorrect });
    setScore((s) => (isCorrect ? { ...s, hits: s.hits + 1 } : { ...s, misses: s.misses + 1 }));
    setCombo((c) => {
      const next = isCorrect ? c + 1 : 0;
      setMaxCombo((m) => Math.max(m, next));
      return next;
    });
    clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => setFeedbackCell(null), FEEDBACK_FLASH_MS);
  }

  function handleNoteDetected(midi) {
    if (!exerciseRef.current || windowOpenRef.current === null || judgedRef.current) return;
    if (performance.now() - windowOpenRef.current > HIT_WINDOW_MS) return;
    const step = exerciseRef.current.sequence[stepIndexRef.current];
    if (midi === midiForStep(step)) judgeCurrentStep(true);
  }

  const mic = useMicAnswerDetector(handleNoteDetected);

  function endSession() {
    metronome.stop();
    setIsPlaying(false);
    setEnded(true);
    windowOpenRef.current = null;
  }

  // Advances exactly one note per metronome beat, judging whichever note
  // was current (as a miss, unless the mic already judged it a hit) once
  // its beat has passed — the same "advance on metronome.currentBeat"
  // pattern usePracticeDrill.js uses, but driving hit/miss judgment instead
  // of just moving a highlight along.
  useEffect(() => {
    if (!isPlaying || !exercise || metronome.currentBeat === null) return undefined;

    if (!firstBeatRef.current) judgeCurrentStep(false);
    firstBeatRef.current = false;

    const next = stepIndexRef.current + 1; // starts at -1, so the first beat lands on index 0
    if (next >= exercise.sequence.length) {
      endSession();
      return undefined;
    }
    stepIndexRef.current = next;
    setStepIndex(next);
    windowOpenRef.current = performance.now();
    judgedRef.current = false;
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metronome.currentBeat]);

  function loadExercise(ex) {
    exerciseRef.current = ex;
    setExercise(ex);
    setEnded(false);
    setScore({ hits: 0, misses: 0 });
    setCombo(0);
    setMaxCombo(0);
    setFeedbackCell(null);
    stepIndexRef.current = -1;
    setStepIndex(-1);
    firstBeatRef.current = true;
    windowOpenRef.current = null;
    judgedRef.current = true;
    metronome.setBpm(ex.bpmSuggested);
  }

  function play() {
    if (!exercise) return;
    setEnded(false);
    setIsPlaying(true);
    mic.startListening();
    metronome.start();
  }

  // "Try Again" (after a session ends) needs a fresh run, not a resume —
  // play() alone deliberately does NOT reset step/score state, since it's
  // also what the Play button uses to resume after a manual Pause mid-song.
  // Without this, stepIndexRef was still sitting at the last note from the
  // finished attempt, so the very first beat after "Try Again" immediately
  // saw "already past the last note" and ended the session again before a
  // single note could be judged.
  function restart() {
    if (!exercise) return;
    stepIndexRef.current = -1;
    setStepIndex(-1);
    firstBeatRef.current = true;
    windowOpenRef.current = null;
    judgedRef.current = true;
    setScore({ hits: 0, misses: 0 });
    setCombo(0);
    setMaxCombo(0);
    setFeedbackCell(null);
    play();
  }

  function stop() {
    metronome.stop();
    mic.stopListening();
    setIsPlaying(false);
  }

  function exit() {
    stop();
    exerciseRef.current = null;
    setExercise(null);
    setStepIndex(-1);
    setEnded(false);
  }

  // The mic should only ever be listening while a session is actually
  // running — leaving this tab (or reaching the end of the exercise, which
  // calls endSession -> setIsPlaying(false)) must not leave it open.
  useEffect(() => {
    if (!isPlaying && mic.isListening) mic.stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => () => clearTimeout(feedbackTimeoutRef.current), []);

  const accuracyPct = score.hits + score.misses > 0 ? Math.round((score.hits / (score.hits + score.misses)) * 100) : null;

  return {
    exercise,
    loadExercise,
    stepIndex,
    isPlaying,
    ended,
    play,
    restart,
    stop,
    exit,
    score,
    combo,
    maxCombo,
    accuracyPct,
    feedbackCell,
    micIsListening: mic.isListening,
    micError: mic.error,
    micCurrentNote: mic.currentNote,
  };
}
