import { useState } from 'react';
import { buildDiatonicChords, FUNCTION_LABELS } from '../../music/harmonyCurriculum';
import { KEY_NAMES } from '../../music/scaleAnalyzer';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';

const FUNCTIONS = ['tonic', 'subdominant', 'dominant'];

function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// The other classic theory-class drill: given a key and one of its diatonic
// chords, name either its Roman numeral or its function (tonic/subdominant/
// dominant) — alternated randomly so both skills get practiced. This is
// what trains "hearing the logic" of a progression rather than memorizing
// individual chord names.
function nextQuestion() {
  const rootPitchClass = Math.floor(Math.random() * 12);
  const degreeIndex = Math.floor(Math.random() * 7);
  const askType = Math.random() < 0.5 ? 'roman' : 'function';
  return { rootPitchClass, degreeIndex, askType };
}

export function HarmonyFunctionQuiz({ progress, lessonId }) {
  const { t, lang } = useLanguage();
  const [question, setQuestion] = useState(nextQuestion);
  const [answered, setAnswered] = useState(null); // { choice, correct } | null

  const chords = buildDiatonicChords(question.rootPitchClass, 'major', false);
  const chord = chords[question.degreeIndex];
  const keyName = KEY_NAMES[question.rootPitchClass];

  const correctAnswer = question.askType === 'roman' ? chord.roman : localize(FUNCTION_LABELS[chord.function], lang);
  const options =
    question.askType === 'roman'
      ? shuffled(chords.map((c) => c.roman))
      : shuffled(FUNCTIONS.map((f) => localize(FUNCTION_LABELS[f], lang)));

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
        {question.askType === 'roman'
          ? t('harmony.quiz.romanPrompt', { key: keyName, notes: chord.noteNames.join('-') })
          : t('harmony.quiz.functionPrompt', { key: keyName, roman: chord.roman })}
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
