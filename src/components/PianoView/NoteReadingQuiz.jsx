import { useEffect, useState } from 'react';
import { StaffNotation } from '../StaffNotation/StaffNotation';
import { useLanguage } from '../../i18n/LanguageContext';

// C3..C5 — a comfortable 2-octave range around Middle C, split down the
// middle by clef exactly the way the "Staff Basics" lesson describes: at or
// above Middle C reads treble, below reads bass.
const MIN_MIDI = 48;
const MAX_MIDI = 72;

function randomQuestion() {
  const midi = MIN_MIDI + Math.floor(Math.random() * (MAX_MIDI - MIN_MIDI + 1));
  return { midi, clef: midi >= 60 ? 'treble' : 'bass' };
}

// Note reading, answered by actually clicking the matching key on the
// shared PianoKeyboard — not a 4-option multiple choice — the same
// "answer by actually playing it" principle Chords by Ear's Sing-the-Root
// drill uses (see its own comment on why that's a stronger test than
// picking from a list). Wires into the shared keyboard via
// setOnKeyClick/setQuizFeedbackKey (usePianoCurriculumLesson.js) rather
// than owning its own keyboard instance.
export function NoteReadingQuiz({ progress, lessonId, onPreviewNotes, setQuizFeedbackKey, setOnKeyClick }) {
  const { t } = useLanguage();
  const [question, setQuestion] = useState(randomQuestion);
  const [answered, setAnswered] = useState(null);

  function fresh() {
    setQuestion(randomQuestion());
    setAnswered(null);
    setQuizFeedbackKey(null);
    onPreviewNotes([]);
  }

  useEffect(() => {
    setOnKeyClick((clickedMidi) => {
      setAnswered((prev) => {
        if (prev) return prev;
        const correct = clickedMidi === question.midi;
        setQuizFeedbackKey({ midi: clickedMidi, correct });
        progress?.recordQuizResult(lessonId, correct);
        if (!correct) onPreviewNotes([{ midi: question.midi, isRoot: true }]);
        return { correct, clickedMidi };
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question]);
  // No unmount-cleanup effect here for the click router or preview notes —
  // usePianoCurriculumLesson's own setLessonId already clears both
  // (onKeyClickRef.current, previewNotes) the moment the user navigates to
  // a different lesson, so clearing them again here on unmount was pure
  // redundancy, not a real requirement.

  return (
    <div className="cbe-drill">
      <p className="cbe-hint">{t('piano.noteReading.prompt')}</p>
      <StaffNotation notes={[{ midi: question.midi }]} clef={question.clef} />
      {answered && (
        <div className="circle-quiz-feedback">
          <span className={answered.correct ? 'circle-quiz-result correct' : 'circle-quiz-result incorrect'}>
            {answered.correct ? t('circleOfFifths.quiz.correct') : t('circleOfFifths.quiz.incorrect')}
          </span>
          <button type="button" className="circle-quiz-next" onClick={fresh}>
            {t('circleOfFifths.quiz.next')}
          </button>
        </div>
      )}
    </div>
  );
}
