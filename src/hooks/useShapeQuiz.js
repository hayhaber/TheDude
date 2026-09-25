import { useCallback, useState } from 'react';
import { computeChordPositions } from '../music/computeChordPositions';
import { CAGED_KEYS, namedShapePositions } from '../music/cagedCurriculum';
import { playPosition } from '../audio/chordPlayer';

// Studies -> CAGED -> "Name That Shape": a random major chord, in a random
// key, shape and neck position, shown on the shared Stage Fretboard (hence
// lifted to App level). The player names the shape; the chord is strummed
// on answering, so ear and eye learn the shape together.
export const QUIZ_SHAPES = ['C', 'A', 'G', 'E', 'D'];
const QUIZ_MAX_FRET = 14;

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function makeQuestion(previous) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const keyValue = randomItem(CAGED_KEYS).value;
    const candidates = namedShapePositions(computeChordPositions(keyValue, 'chord').positions, keyValue).filter(
      (p) => p.baseFret <= QUIZ_MAX_FRET && QUIZ_SHAPES.includes(p.shapeName[0]) && p.shapeName.endsWith('-shape')
    );
    if (candidates.length === 0) continue;
    const position = randomItem(candidates);
    const answer = position.shapeName[0];
    // Never the same shape twice in a row — otherwise a lucky streak
    // teaches nothing.
    if (previous && previous.answer === answer) continue;
    return { keyValue, position, answer };
  }
  return null;
}

export function useShapeQuiz() {
  const [question, setQuestion] = useState(() => makeQuestion(null));
  const [answered, setAnswered] = useState(null); // { choice, correct } | null
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const choose = useCallback(
    (choice) => {
      if (answered || !question) return;
      const correct = choice === question.answer;
      setAnswered({ choice, correct });
      setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
      playPosition(question.position.strings);
    },
    [answered, question]
  );

  const next = useCallback(() => {
    setQuestion((q) => makeQuestion(q));
    setAnswered(null);
  }, []);

  const resetScore = useCallback(() => setScore({ correct: 0, total: 0 }), []);

  return { question, answered, score, choose, next, resetScore };
}
