import { useEffect, useRef, useState } from 'react';
import {
  EAR_TRAINING_MODES,
  EAR_TRAINING_DIFFICULTIES,
  EAR_TRAINING_PRACTICE_MODES,
  TIMED_CHALLENGE_DURATION_S,
  generateQuestion,
  midiForCell,
  pianoQuizKeys,
  loadBestStreak,
  saveBestStreak,
} from '../music/earTraining';
import { playQuestionAudio } from '../audio/earTrainingPlayer';

const MISTAKE_FLASH_MS = 700;
// How long Timed mode holds the just-answered question's feedback on screen
// before loading the next one — the score/streak counters already update
// the instant an answer comes in (registerResult runs synchronously before
// this), so only the visible question/fretboard swap is delayed.
const FEEDBACK_HOLD_MS = 2000;

// Owns the whole quiz session (mode/difficulty, current question, click/
// choice progress, feedback flashes, score/streak). Talks to the Fretboard
// only through plain data (quiz cells + a click callback) — see
// components/EarTrainingModal for how it wires into a dedicated Fretboard
// instance, entirely separate from the main chord-progression fretboard.
export function useEarTraining() {
  const [open, setOpen] = useState(false);
  const [modeKey, setModeKey] = useState(EAR_TRAINING_MODES[0].key);
  const [difficultyKey, setDifficultyKey] = useState(EAR_TRAINING_DIFFICULTIES[0].key);
  const [question, setQuestion] = useState(null);
  const [progress, setProgress] = useState([]); // call & response: cells clicked correctly so far
  const [mistakeMade, setMistakeMade] = useState(false);
  const [feedback, setFeedback] = useState(null); // { correct, cell? } | null
  const [answeredChoiceKey, setAnsweredChoiceKey] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [practiceMode, setPracticeMode] = useState(EAR_TRAINING_PRACTICE_MODES[0].key);
  const [timeRemaining, setTimeRemaining] = useState(TIMED_CHALLENGE_DURATION_S);
  const [isTimedOver, setIsTimedOver] = useState(false);
  // True once the current question has a terminal answer — in Standard mode
  // this holds the fretboard/feedback on screen until the player clicks
  // Next (see next() below); in Timed mode it's set and immediately
  // consumed by advance()'s own newQuestion() call in the same render.
  const [answered, setAnswered] = useState(false);

  const mistakeTimeoutRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const timerDeadlineRef = useRef(null); // wall-clock ms timestamp the countdown ends at
  const feedbackHoldTimeoutRef = useRef(null);
  const bestStreakRef = useRef(0);

  const difficulty = EAR_TRAINING_DIFFICULTIES.find((d) => d.key === difficultyKey) ?? EAR_TRAINING_DIFFICULTIES[0];

  useEffect(() => {
    const best = loadBestStreak(modeKey);
    bestStreakRef.current = best;
    setBestStreak(best);
  }, [modeKey]);

  // Any change of pace (including the very first mount) leaves the timer
  // fully reset and paused at the full duration — it only ever starts
  // inside start() itself, never as a side effect of toggling the switch.
  // This is also what makes Timed -> Standard -> Timed a genuinely fresh
  // 60s run instead of the interval quietly continuing in the background:
  // without clearing it here, an interval started under 'timed' kept
  // ticking after switching to 'standard' (invisible, since the countdown
  // UI is hidden outside Timed mode) and would resume mid-count — or even
  // fire isTimedOver — the moment the user switched back.
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    timerDeadlineRef.current = null;
    if (feedbackHoldTimeoutRef.current) {
      clearTimeout(feedbackHoldTimeoutRef.current);
      feedbackHoldTimeoutRef.current = null;
    }
    setTimeRemaining(TIMED_CHALLENGE_DURATION_S);
    setIsTimedOver(false);
    setScore({ correct: 0, total: 0 });
    setStreak(0);
    setAnswered(false);
    setFeedback(null);
    setAnsweredChoiceKey(null);
  }, [practiceMode]);

  useEffect(() => () => clearTimers(), []);

  // A plain "decrement once per tick" counter drifts or outright stalls
  // whenever the browser throttles setInterval — which it aggressively does
  // for backgrounded/inactive tabs — so a player who switches tabs mid-run
  // comes back to a countdown that's frozen or wildly behind real elapsed
  // time. Recomputing from a fixed wall-clock deadline every tick makes the
  // displayed number self-correct regardless of how irregularly the
  // interval actually fires. This listener forces one extra recompute the
  // moment the tab becomes visible again, so the number snaps back in sync
  // immediately rather than waiting for the next (possibly still-delayed)
  // tick.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && timerIntervalRef.current) {
        tickTimer();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearTimers() {
    if (mistakeTimeoutRef.current) clearTimeout(mistakeTimeoutRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (feedbackHoldTimeoutRef.current) clearTimeout(feedbackHoldTimeoutRef.current);
  }

  function newQuestion() {
    if (mistakeTimeoutRef.current) clearTimeout(mistakeTimeoutRef.current);
    const q = generateQuestion(modeKey, difficulty);
    setQuestion(q);
    setProgress([]);
    setMistakeMade(false);
    setFeedback(null);
    setAnsweredChoiceKey(null);
    setAnswered(false);
  }

  // Covers both the initial question on start() and regenerating one
  // whenever mode/difficulty changes mid-session.
  useEffect(() => {
    if (open) newQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modeKey, difficultyKey]);

  // Actually starts the 60s interval — pulled out of start() so any
  // interaction (pressing Play, or answering directly) can trigger it too.
  // Switching to Timed mid-session (the toggle lives inside the controls
  // row, only reachable once a session is already open) leaves the
  // countdown paused at the full duration with no "Start" button on screen
  // to press — without this, the only way to actually begin it was to Exit
  // and re-Start the whole session, which looked exactly like "the timer
  // is broken" since the number just sat there.
  // Recomputes remaining seconds from timerDeadlineRef (wall clock), not by
  // trusting that this tick fired exactly 1000ms after the last one — see
  // the visibilitychange effect above for why that distinction matters.
  function tickTimer() {
    const remaining = Math.max(0, Math.ceil((timerDeadlineRef.current - Date.now()) / 1000));
    setTimeRemaining(remaining);
    if (remaining <= 0) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
      timerDeadlineRef.current = null;
      if (feedbackHoldTimeoutRef.current) {
        clearTimeout(feedbackHoldTimeoutRef.current);
        feedbackHoldTimeoutRef.current = null;
      }
      setIsTimedOver(true);
    }
  }

  function beginTimedCountdown() {
    if (timerIntervalRef.current) return; // already running
    timerDeadlineRef.current = Date.now() + TIMED_CHALLENGE_DURATION_S * 1000;
    // Ticking faster than 1000ms doesn't change what's displayed (still
    // whole seconds, via Math.ceil above) — it just means a throttled tab
    // catches back up to the real deadline sooner once it wakes up.
    timerIntervalRef.current = setInterval(tickTimer, 250);
  }

  // Called from every "the player just engaged with this question" path
  // (Play, or answering directly without pressing Play first) — starts the
  // countdown on first contact rather than requiring a specific button.
  function ensureTimerRunning() {
    if (practiceMode === 'timed' && !isTimedOver && !timerIntervalRef.current) {
      beginTimedCountdown();
    }
  }

  function start() {
    setOpen(true);
    setScore({ correct: 0, total: 0 });
    setStreak(0);
    setIsTimedOver(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    timerDeadlineRef.current = null;

    if (practiceMode === 'timed') {
      setTimeRemaining(TIMED_CHALLENGE_DURATION_S);
      beginTimedCountdown();
    }
  }

  function exit() {
    clearTimers();
    setOpen(false);
    setQuestion(null);
  }

  // Terminal point for every answer path (pitch click, completed
  // call-response phrase, choice pick). Standard mode just marks the
  // question as answered and stops there — the fretboard/feedback stays
  // exactly as-is until next() is called. Timed mode holds the same
  // correct/incorrect feedback on screen for FEEDBACK_HOLD_MS (score/streak
  // are already updated by this point, by the caller) before swapping in
  // the next question, so the player actually sees the result of a fast
  // answer instead of it flashing away instantly.
  function advance() {
    setAnswered(true);
    if (practiceMode === 'timed') {
      if (feedbackHoldTimeoutRef.current) clearTimeout(feedbackHoldTimeoutRef.current);
      feedbackHoldTimeoutRef.current = setTimeout(() => {
        feedbackHoldTimeoutRef.current = null;
        newQuestion();
      }, FEEDBACK_HOLD_MS);
    }
  }

  function next() {
    if (!answered) return;
    newQuestion();
  }

  // Timed mode's version of "next question" while a click/answer arrives
  // during the FEEDBACK_HOLD_MS flash: rather than silently dropping that
  // input (the old behavior — the fretboard/choices give no visual sign
  // they're temporarily inert, so a fast player firing off another answer
  // right away just saw nothing happen), treat it as "I've seen the result,
  // move on now" — cuts the hold short instead of forcing the full wait.
  // Doesn't re-score the still-displayed question a second time; the next
  // question becomes answerable immediately after, so a fast player is
  // never held up by a fixed delay — the effective feedback display time is
  // exactly as long as their own reaction time.
  function skipAheadFromHold() {
    if (feedbackHoldTimeoutRef.current) {
      clearTimeout(feedbackHoldTimeoutRef.current);
      feedbackHoldTimeoutRef.current = null;
    }
    newQuestion();
  }

  function replay() {
    playQuestionAudio(question);
    ensureTimerRunning();
  }

  function registerResult(wasCorrect) {
    setScore((s) => ({ correct: s.correct + (wasCorrect ? 1 : 0), total: s.total + 1 }));
    setStreak((s) => {
      const next = wasCorrect ? s + 1 : 0;
      if (next > bestStreakRef.current) {
        bestStreakRef.current = next;
        setBestStreak(next);
        saveBestStreak(modeKey, next);
      }
      return next;
    });
  }

  // Shared by handleFretClick (guitar: cell -> midi) and handlePianoKeyClick
  // (piano: already a midi) — both fret-question kinds ('pitch',
  // 'callresponse') are answered purely in terms of the clicked MIDI note,
  // the cell/key coordinate is only carried along for the reveal-marker UI.
  function handleAnsweredMidi(midi, cellForFeedback) {
    if (!question || isTimedOver) return;
    if (answered) {
      if (practiceMode === 'timed') skipAheadFromHold();
      return;
    }
    ensureTimerRunning();

    if (question.kind === 'pitch') {
      const correct = question.targetMidiSet.includes(midi);
      setFeedback({ correct, cell: cellForFeedback });
      registerResult(correct);
      advance();
      return;
    }

    if (question.kind === 'callresponse') {
      const expectedMidi = question.targetMidiSequence[progress.length];
      const correct = midi === expectedMidi;
      setFeedback({ correct, cell: cellForFeedback });

      if (correct) {
        const nextProgress = [...progress, { ...cellForFeedback, midi }];
        setProgress(nextProgress);
        if (nextProgress.length === question.targetMidiSequence.length) {
          registerResult(!mistakeMade);
          advance();
        }
      } else {
        setMistakeMade(true);
        if (mistakeTimeoutRef.current) clearTimeout(mistakeTimeoutRef.current);
        mistakeTimeoutRef.current = setTimeout(() => setFeedback(null), MISTAKE_FLASH_MS);
      }
    }
  }

  function handleFretClick(stringIndex, fret) {
    handleAnsweredMidi(midiForCell(stringIndex, fret), { stringIndex, fret });
  }

  // Public alias for handleAnsweredMidi, with no fretboard cell to flash —
  // used by the mic-based "play it on your guitar" answer mode (see
  // hooks/useMicAnswerDetector.js), so a mic-detected note is graded through
  // the exact same pitch/callresponse logic a click already uses, rather
  // than a second, divergent copy of it.
  function submitMidiAnswer(midi) {
    handleAnsweredMidi(midi, null);
  }

  // Piano equivalent of handleFretClick — a key IS a MIDI note already, no
  // cell-to-pitch lookup needed. See PianoKeyboard's quiz props.
  function handlePianoKeyClick(midi) {
    handleAnsweredMidi(midi, { midi });
  }

  function handleChoice(choiceKey) {
    if (!question || !question.choices || isTimedOver) return;
    if (answeredChoiceKey) {
      if (practiceMode === 'timed') skipAheadFromHold();
      return;
    }
    ensureTimerRunning();
    const correct = choiceKey === question.correctChoiceKey;
    setAnsweredChoiceKey(choiceKey);
    setFeedback({ correct });
    registerResult(correct);
    advance();
  }

  const accuracyPct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : null;
  const incorrectCount = score.total - score.correct;

  const isChoiceQuestion = !!question?.choices;
  const isFretQuestion = !!question && !question.choices;

  // Quiz-answerable cells: the current difficulty's full grid for fret
  // questions, nothing for choice questions (those are answered via
  // buttons, not the neck). Single source of truth — consumed by both the
  // shared Stage Fretboard (App.jsx) and EarTrainingModal's own UI.
  const quizCells = isFretQuestion
    ? difficulty.stringIndices.flatMap((stringIndex) =>
        Array.from({ length: difficulty.fretMax - difficulty.fretMin + 1 }, (_, i) => ({
          stringIndex,
          fret: difficulty.fretMin + i,
        }))
      )
    : [];

  // Call & response: show already-correct notes as reveal markers so the
  // player can see how far through the phrase they are (each one only ever
  // lands in `progress` after being answered correctly, so always green).
  // Choice questions (triad/chord/interval/scaleid): once answered, reveal
  // the actual chord/interval/scale that was played — `correct` carries the
  // just-submitted answer's result so Fretboard can color it green (got it)
  // or gold (missed it, here's what it actually was) instead of one fixed
  // color regardless of outcome.
  const quizRevealCells =
    question?.kind === 'callresponse'
      ? progress.map((p) => ({ ...p, correct: true }))
      : isChoiceQuestion && answeredChoiceKey
        ? question.notesToPlay.map((n) => ({ stringIndex: n.stringIndex, fret: n.fret, correct: feedback?.correct }))
        : [];

  // Piano-mode equivalents of quizCells/quizRevealCells above — same
  // question/progress state, just expressed as MIDI keys instead of
  // fretboard cells (see pianoQuizKeys's comment for why the pool is
  // derived from the difficulty's guitar ranges rather than a separate
  // piano-specific range).
  const quizPianoKeys = isFretQuestion ? pianoQuizKeys(difficulty) : [];
  const quizRevealPianoKeys =
    question?.kind === 'callresponse'
      ? progress.map((p) => ({ midi: p.midi }))
      : isChoiceQuestion && answeredChoiceKey
        ? question.notesToPlay.map((n) => ({ midi: n.midi }))
        : [];

  return {
    open,
    start,
    exit,
    modeKey,
    setModeKey,
    modes: EAR_TRAINING_MODES,
    difficultyKey,
    setDifficultyKey,
    difficulties: EAR_TRAINING_DIFFICULTIES,
    difficulty,
    question,
    progress,
    feedback,
    answeredChoiceKey,
    score,
    accuracyPct,
    incorrectCount,
    streak,
    bestStreak,
    practiceMode,
    setPracticeMode,
    practiceModes: EAR_TRAINING_PRACTICE_MODES,
    timeRemaining,
    timedDurationS: TIMED_CHALLENGE_DURATION_S,
    isTimedOver,
    answered,
    next,
    replay,
    handleFretClick,
    handlePianoKeyClick,
    handleChoice,
    submitMidiAnswer,
    isFretQuestion,
    quizCells,
    quizRevealCells,
    quizPianoKeys,
    quizRevealPianoKeys,
    skip: () => {
      if (isTimedOver || answered) return;
      registerResult(false);
      newQuestion();
    },
  };
}
