import { useState } from 'react';
import { CHORD_QUALITIES } from '../../music/chordQualities';
import { chordTextFor, QUALITY_LABELS } from '../../music/harmonyCurriculum';
import { noteNameForPitchClass } from '../../music/scaleShapes';
import { mod } from '../../music/notes';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';

// The classic theory-class "spell the chord" drill: shown a chord symbol,
// build it note by note out of all 12 pitch classes, then check. Distinct
// from Circle of Fifths' pick-one-of-4 flashcard — this is a construction
// task (pick every correct note, and only the correct notes), the standard
// method for internalizing chord formulas rather than key-signature counts.
const QUALITY_POOL = ['major', 'minor', 'dim', 'aug', 'dominant7', 'major7', 'minor7', 'dim7'];

function nextQuestion() {
  const rootPitchClass = Math.floor(Math.random() * 12);
  const qualityKey = QUALITY_POOL[Math.floor(Math.random() * QUALITY_POOL.length)];
  return { rootPitchClass, qualityKey };
}

export function HarmonySpellingQuiz({ progress, lessonId }) {
  const { t, lang } = useLanguage();
  const [question, setQuestion] = useState(nextQuestion);
  const [selected, setSelected] = useState(new Set());
  const [checked, setChecked] = useState(null); // { correct } | null

  const quality = CHORD_QUALITIES[question.qualityKey];
  const correctPitchClasses = new Set(quality.tones.map((tone) => mod(question.rootPitchClass + tone.semitones, 12)));
  const chordText = chordTextFor(question.rootPitchClass, question.qualityKey);

  function toggle(pc) {
    if (checked) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(pc) ? next.delete(pc) : next.add(pc);
      return next;
    });
  }

  function submit() {
    if (checked) return;
    const correct = selected.size === correctPitchClasses.size && [...selected].every((pc) => correctPitchClasses.has(pc));
    setChecked({ correct });
    if (progress && lessonId) progress.recordQuizResult(lessonId, correct);
  }

  function next() {
    setQuestion(nextQuestion());
    setSelected(new Set());
    setChecked(null);
  }

  function classFor(pc) {
    if (!checked) return selected.has(pc) ? 'picked' : '';
    const isCorrectNote = correctPitchClasses.has(pc);
    const wasPicked = selected.has(pc);
    if (isCorrectNote && wasPicked) return 'correct';
    if (isCorrectNote && !wasPicked) return 'missed';
    if (!isCorrectNote && wasPicked) return 'incorrect';
    return '';
  }

  return (
    <div className="harmony-quiz">
      <p className="harmony-quiz-prompt" dir="ltr">
        {t('harmony.quiz.spellPrompt', { chord: chordText, quality: localize(QUALITY_LABELS[question.qualityKey], lang) })}
      </p>

      <div className="harmony-quiz-notes">
        {Array.from({ length: 12 }, (_, pc) => (
          <button key={pc} type="button" className={'harmony-quiz-note ' + classFor(pc)} onClick={() => toggle(pc)} disabled={!!checked}>
            {noteNameForPitchClass(pc)}
          </button>
        ))}
      </div>

      {!checked ? (
        <button type="button" className="harmony-quiz-submit" onClick={submit} disabled={selected.size === 0}>
          {t('harmony.quiz.check')}
        </button>
      ) : (
        <div className="circle-quiz-feedback">
          <span className={checked.correct ? 'circle-quiz-result correct' : 'circle-quiz-result incorrect'}>
            {checked.correct ? t('circleOfFifths.quiz.correct') : t('circleOfFifths.quiz.incorrect')}
          </span>
          <button type="button" className="circle-quiz-next" onClick={next}>
            {t('circleOfFifths.quiz.next')}
          </button>
        </div>
      )}
    </div>
  );
}
