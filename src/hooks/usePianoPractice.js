import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PIANO_DIFFICULTIES,
  PIANO_EXERCISES,
  generatePianoQuestion,
  loadPianoBestStreak,
  savePianoBestStreak,
} from '../music/pianoPractice';
import { playPianoChord, playPianoSequence } from '../audio/pianoPlayer';

// Deliberately simple compared to useEarTraining — every exercise built so
// far is a plain multiple-choice question (ear-recognition, not a
// click-the-right-key quiz), so this doesn't need that hook's fret-cell/
// piano-key click-target machinery at all. If a future exercise (Note ID,
// Two-Hand Coordination) needs click-to-answer, extend this the same way
// useEarTraining grew handleFretClick/handlePianoKeyClick alongside its
// original choice-only questions, not by forking a second engine.
export function usePianoPractice() {
  const [open, setOpen] = useState(false);
  const [difficultyKey, setDifficultyKey] = useState(PIANO_DIFFICULTIES[0].key);
  const [exerciseKey, setExerciseKey] = useState(PIANO_EXERCISES.find((e) => e.difficultyKey === PIANO_DIFFICULTIES[0].key && e.available).key);
  const [question, setQuestion] = useState(null);
  const [answeredChoiceKey, setAnsweredChoiceKey] = useState(null);
  const [feedback, setFeedback] = useState(null); // { correct } | null
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const bestStreakRef = useRef(0);

  const exercise = PIANO_EXERCISES.find((e) => e.key === exerciseKey) ?? PIANO_EXERCISES[0];

  useEffect(() => {
    const best = loadPianoBestStreak(exerciseKey);
    bestStreakRef.current = best;
    setBestStreak(best);
  }, [exerciseKey]);

  const newQuestion = useCallback(() => {
    if (!exercise.available) {
      setQuestion(null);
      return;
    }
    setQuestion(generatePianoQuestion(exercise.key));
    setAnsweredChoiceKey(null);
    setFeedback(null);
  }, [exercise]);

  useEffect(() => {
    if (open) newQuestion();
  }, [open, newQuestion]);

  function start() {
    setOpen(true);
    setScore({ correct: 0, total: 0 });
    setStreak(0);
  }

  function exit() {
    setOpen(false);
    setQuestion(null);
  }

  // Changing tier picks that tier's first *available* exercise, rather than
  // landing on a "coming soon" one by default — the dropdown still lists
  // every exercise so the full planned curriculum is visible, but starting
  // a session should never open straight into an unbuilt one.
  function selectDifficulty(key) {
    setDifficultyKey(key);
    const firstAvailable = PIANO_EXERCISES.find((e) => e.difficultyKey === key && e.available);
    setExerciseKey((firstAvailable ?? PIANO_EXERCISES.find((e) => e.difficultyKey === key)).key);
  }

  function replay() {
    if (!question) return;
    const midiNotes = question.notesToPlay.map((n) => n.midi);
    if (question.playSequential) playPianoSequence(midiNotes);
    else playPianoChord(midiNotes);
  }

  function handleChoice(choiceKey) {
    if (!question || answeredChoiceKey) return;
    const correct = choiceKey === question.correctChoiceKey;
    setAnsweredChoiceKey(choiceKey);
    setFeedback({ correct });
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    setStreak((s) => {
      const next = correct ? s + 1 : 0;
      if (next > bestStreakRef.current) {
        bestStreakRef.current = next;
        setBestStreak(next);
        savePianoBestStreak(exerciseKey, next);
      }
      return next;
    });
  }

  const accuracyPct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : null;

  return {
    open,
    start,
    exit,
    difficultyKey,
    difficulties: PIANO_DIFFICULTIES,
    setDifficultyKey: selectDifficulty,
    exerciseKey,
    setExerciseKey,
    exercises: PIANO_EXERCISES,
    exercise,
    question,
    answeredChoiceKey,
    feedback,
    score,
    accuracyPct,
    streak,
    bestStreak,
    replay,
    handleChoice,
    skip: newQuestion,
  };
}
