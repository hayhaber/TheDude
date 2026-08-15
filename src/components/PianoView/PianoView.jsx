import { PIANO_STAGES, PIANO_STAGE_LABELS } from '../../music/pianoCurriculum';
import {
  KeyboardGeographyDemo,
  HandPositionDemo,
  FiveFingerDemo,
  StaffBasicsDemo,
  GrandStaffDemo,
  LinesSpacesDemo,
  LedgerLinesDemo,
} from './PianoCurriculumDemos';
import { NoteReadingQuiz } from './NoteReadingQuiz';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import '../ChordsByEarView/ChordsByEarView.css';
import './PianoView.css';

const STAGE_ORDER = [PIANO_STAGES.FOUNDATION, PIANO_STAGES.NOTATION, PIANO_STAGES.PRACTICE];

// Level 1 ("Absolute Beginner") of the piano curriculum — same rail+detail
// shell every Studies course uses. Piano-native (not a reworded guitar
// course): keyboard geography, hand position/finger numbers, five-finger
// patterns, staff reading, and a note-reading quiz answered by actually
// clicking the shared keyboard, not multiple choice.
export function PianoView({ lessons, pianoLesson, progress }) {
  const { t, lang } = useLanguage();
  const { lessonId, setLessonId, setPreviewNotes, setPreviewFingers, setQuizFeedbackKey, setOnKeyClick } = pianoLesson;

  const activeIndex = lessons.findIndex((l) => l.id === lessonId);
  const lesson = lessons[activeIndex] ?? lessons[0];
  const completeCount = lessons.filter((l) => progress.isComplete(l.id)).length;

  function goTo(index) {
    const clamped = Math.max(0, Math.min(lessons.length - 1, index));
    setLessonId(lessons[clamped].id);
  }

  return (
    <div className="chords-by-ear-view piano-view">
      <div className="studies-layout">
        <nav className="studies-rail" aria-label={t('studies.lessonsLabel')}>
          <p className="studies-progress">{t('studies.progress', { done: completeCount, total: lessons.length })}</p>
          {STAGE_ORDER.filter((stage) => lessons.some((l) => l.stage === stage)).map((stage) => (
            <div key={stage} className="studies-stage-group">
              <p className="studies-stage-label">{localize(PIANO_STAGE_LABELS[stage], lang)}</p>
              {lessons
                .filter((l) => l.stage === stage)
                .map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className={'studies-lesson-btn' + (l.id === lesson.id ? ' active' : '')}
                    onClick={() => setLessonId(l.id)}
                  >
                    <span className={'studies-lesson-check' + (progress.isComplete(l.id) ? ' done' : '')} aria-hidden="true">
                      {progress.isComplete(l.id) ? '✓' : ''}
                    </span>
                    <span dir="auto">{localize(l.title, lang)}</span>
                  </button>
                ))}
            </div>
          ))}
        </nav>

        <div className="studies-lesson">
          <div className="studies-lesson-header">
            <h2 dir="auto">{localize(lesson.title, lang)}</h2>
            <button
              type="button"
              className={'studies-complete-btn' + (progress.isComplete(lesson.id) ? ' done' : '')}
              onClick={() => progress.markComplete(lesson.id)}
            >
              {progress.isComplete(lesson.id) ? t('studies.complete') : t('studies.markComplete')}
            </button>
          </div>

          <p className="studies-lesson-description" dir="auto">
            {localize(lesson.description, lang)}
          </p>

          {lesson.demo?.type === 'keyboardGeography' && <KeyboardGeographyDemo onPreviewNotes={setPreviewNotes} />}
          {lesson.demo?.type === 'handPosition' && (
            <HandPositionDemo onPreviewNotes={setPreviewNotes} onPreviewFingers={setPreviewFingers} />
          )}
          {lesson.demo?.type === 'fiveFinger' && (
            <FiveFingerDemo onPreviewNotes={setPreviewNotes} onPreviewFingers={setPreviewFingers} />
          )}
          {lesson.demo?.type === 'staffBasics' && <StaffBasicsDemo onPreviewNotes={setPreviewNotes} />}
          {lesson.demo?.type === 'grandStaff' && <GrandStaffDemo onPreviewNotes={setPreviewNotes} />}
          {lesson.demo?.type === 'linesSpaces' && <LinesSpacesDemo onPreviewNotes={setPreviewNotes} />}
          {lesson.demo?.type === 'ledgerLines' && <LedgerLinesDemo onPreviewNotes={setPreviewNotes} />}

          {lesson.kind === 'quiz' && lesson.quizType === 'noteReading' && (
            <NoteReadingQuiz
              progress={progress}
              lessonId={lesson.id}
              onPreviewNotes={setPreviewNotes}
              setQuizFeedbackKey={setQuizFeedbackKey}
              setOnKeyClick={setOnKeyClick}
            />
          )}

          <div className="studies-nav" dir={lang === 'he' ? 'rtl' : 'ltr'}>
            <button type="button" onClick={() => goTo(activeIndex - 1)} disabled={activeIndex <= 0}>
              {t('studies.previous')}
            </button>
            <button type="button" onClick={() => goTo(activeIndex + 1)} disabled={activeIndex >= lessons.length - 1}>
              {t('studies.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
