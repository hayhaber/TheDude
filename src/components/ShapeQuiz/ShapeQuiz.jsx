import { useLanguage } from '../../i18n/LanguageContext';
import { cagedKeyLabel, shapeLabel } from '../../music/cagedCurriculum';
import { QUIZ_SHAPES } from '../../hooks/useShapeQuiz';
// Same visual language as the Circle of Fifths flashcard quiz.
import '../CircleOfFifthsQuiz/CircleOfFifthsQuiz.css';
import './ShapeQuiz.css';

// Studies -> CAGED -> "Name That Shape". The chord itself is drawn on the
// shared Stage Fretboard (App.jsx resolves it from quiz.question); this is
// just the prompt, the 5 answers and the score.
export function ShapeQuiz({ quiz }) {
  const { t, lang } = useLanguage();
  const { question, answered, score, choose, next } = quiz;
  if (!question) return null;

  const key = cagedKeyLabel(question.keyValue);
  const where =
    question.position.baseFret === 0 ? t('studies.whereOpen') : t('studies.whereFret', { fret: question.position.baseFret });

  return (
    <div className="circle-quiz shape-quiz" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <div className="shape-quiz-header">
        <p className="circle-quiz-prompt">{t('shapeQuiz.prompt', { key })}</p>
        <span className="shape-quiz-score">{t('shapeQuiz.score', { correct: score.correct, total: score.total })}</span>
      </div>

      <div className="circle-quiz-options" dir="ltr">
        {QUIZ_SHAPES.map((shape) => (
          <button
            key={shape}
            type="button"
            disabled={!!answered}
            aria-label={t('shapeQuiz.optionLabel', { shape })}
            className={
              'circle-quiz-choice shape-quiz-choice' +
              (answered && shape === question.answer ? ' correct' : '') +
              (answered && !answered.correct && shape === answered.choice ? ' incorrect' : '')
            }
            onClick={() => choose(shape)}
          >
            {shape}
          </button>
        ))}
      </div>

      {answered && (
        <div className="circle-quiz-feedback">
          <span className={'circle-quiz-result ' + (answered.correct ? 'correct' : 'incorrect')}>
            {answered.correct
              ? t('shapeQuiz.correct', { key, shape: shapeLabel(question.position.shapeName, lang), where })
              : t('shapeQuiz.incorrect', { shape: shapeLabel(question.position.shapeName, lang), where })}
          </span>
          <button type="button" className="circle-quiz-next" onClick={next}>
            {t('shapeShift.next')}
          </button>
        </div>
      )}
    </div>
  );
}
