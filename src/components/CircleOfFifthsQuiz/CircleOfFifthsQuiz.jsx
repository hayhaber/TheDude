import { useState } from 'react';
import { KEY_CIRCLE, accidentalCountFor } from '../../music/circleOfFifthsCurriculum';
import { useLanguage } from '../../i18n/LanguageContext';
import './CircleOfFifthsQuiz.css';

function shuffledOptions(correct, pool, count) {
  const others = pool.filter((v) => v !== correct);
  const picked = [];
  const copy = [...others];
  while (picked.length < count - 1 && copy.length > 0) {
    picked.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return [...picked, correct].sort(() => Math.random() - 0.5);
}

function accidentalLabel(t, acc) {
  if (acc.count === 0) return t('circleOfFifths.quiz.noAccidentals');
  return t(acc.kind === 'sharps' ? 'circleOfFifths.quiz.sharpsCount' : 'circleOfFifths.quiz.flatsCount', { count: acc.count });
}

// Classic flashcard drill (key -> accidental count, or the reverse) — the
// same low-stakes repeated-recall method certified theory teachers use for
// key-signature memorization, not a new exercise paradigm. Question
// direction alternates randomly so neither skill goes unpracticed.
function nextQuestion() {
  const k = KEY_CIRCLE[Math.floor(Math.random() * KEY_CIRCLE.length)];
  const direction = Math.random() < 0.5 ? 'keyToCount' : 'countToKey';
  return { key: k, direction };
}

export function CircleOfFifthsQuiz({ progress, lessonId }) {
  const { t } = useLanguage();
  const [question, setQuestion] = useState(nextQuestion);
  const [answered, setAnswered] = useState(null); // { choice, correct } | null

  const acc = accidentalCountFor(question.key);

  const options =
    question.direction === 'keyToCount'
      ? shuffledOptions(
          accidentalLabel(t, acc),
          [0, 1, 2, 3, 4, 5, 6, 7].flatMap((n) => (n === 0 ? [accidentalLabel(t, { count: 0, kind: 'none' })] : [accidentalLabel(t, { count: n, kind: 'sharps' }), accidentalLabel(t, { count: n, kind: 'flats' })])),
          4
        )
      : shuffledOptions(
          question.key.majorName,
          KEY_CIRCLE.map((k) => k.majorName),
          4
        );

  const correctAnswer = question.direction === 'keyToCount' ? accidentalLabel(t, acc) : question.key.majorName;

  function choose(option) {
    if (answered) return;
    const correct = option === correctAnswer;
    setAnswered({ choice: option, correct });
    if (progress && lessonId) progress.recordQuizResult(lessonId, correct);
  }

  function next() {
    setQuestion(nextQuestion());
    setAnswered(null);
  }

  return (
    <div className="circle-quiz">
      <p className="circle-quiz-prompt" dir="auto">
        {question.direction === 'keyToCount'
          ? t('circleOfFifths.quiz.promptKeyToCount', { key: question.key.majorName })
          : t('circleOfFifths.quiz.promptCountToKey', { count: accidentalLabel(t, acc) })}
      </p>

      <div className="circle-quiz-options">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={
              'circle-quiz-choice' +
              (answered && opt === correctAnswer ? ' correct' : '') +
              (answered && answered.choice === opt && !answered.correct ? ' incorrect' : '')
            }
            onClick={() => choose(opt)}
            disabled={!!answered}
          >
            {opt}
          </button>
        ))}
      </div>

      {answered && (
        <div className="circle-quiz-feedback">
          <span className={answered.correct ? 'circle-quiz-result correct' : 'circle-quiz-result incorrect'}>
            {answered.correct ? t('circleOfFifths.quiz.correct') : t('circleOfFifths.quiz.incorrect')}
          </span>
          <button type="button" className="circle-quiz-next" onClick={next}>
            {t('circleOfFifths.quiz.next')}
          </button>
        </div>
      )}
    </div>
  );
}
