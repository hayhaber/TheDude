import { CHORDS_BY_EAR_STAGES, CHORDS_BY_EAR_STAGE_LABELS } from '../../music/chordsByEarCurriculum';
import { QualityToggleDemo, HomeReferenceDemo, ProgressionDemo } from './ChordsByEarDemos';
import { QualityDrill, FunctionalDrill, ProgressionDrill, ChangeDrill, BassMotionDrill } from './ChordsByEarDrills';
import { SequenceDrill } from './SequenceDrill';
import { SingRootDrill } from './SingRootDrill';
import { MixedReviewDrill } from './MixedReviewDrill';
import { RealSongPractice } from './RealSongPractice';
import { MovableScaleShapeDemo } from './MovableScaleShapeDemo';
import { ChordRoadMapDemo } from './ChordRoadMapDemo';
import { FindKeyDrill } from './FindKeyDrill';
import { NoteNamesDemo } from './NoteNamesDemo';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import './ChordsByEarView.css';

const STAGE_ORDER = [
  CHORDS_BY_EAR_STAGES.FOUNDATION,
  CHORDS_BY_EAR_STAGES.QUALITY,
  CHORDS_BY_EAR_STAGES.FUNCTION,
  CHORDS_BY_EAR_STAGES.FRETBOARD_MAP,
  CHORDS_BY_EAR_STAGES.CHANGES,
  CHORDS_BY_EAR_STAGES.PATTERNS,
  CHORDS_BY_EAR_STAGES.STRATEGY,
  CHORDS_BY_EAR_STAGES.PRACTICE,
];

const FUNCTIONAL_BASIC_DEGREES = [0, 3, 4]; // I, IV, V

// Structured "Chords by Ear" course — same rail+detail shell as every other
// Studies course. Its own twist: most lessons are pure text (the
// methodology itself — relative pitch, the Nashville Number System, the
// listening process — is the actual content, not a chord-shape demo), and
// its interactive widgets are either a one-off teaching demo
// (ChordsByEarDemos.jsx) or one of this course's own graded drills
// (ChordsByEarDrills.jsx) — never the generic Ear Training quiz in Practice,
// which trains a genuinely different (absolute-pitch) skill.
export function ChordsByEarView({ lessons, chordsByEarLesson, progress }) {
  const { t, lang } = useLanguage();
  const { lessonId, setLessonId, setPreviewChordText, setPreviewScaleContext, setPreviewPosition } = chordsByEarLesson;

  const activeIndex = lessons.findIndex((l) => l.id === lessonId);
  const lesson = lessons[activeIndex] ?? lessons[0];
  const completeCount = lessons.filter((l) => progress.isComplete(l.id)).length;

  function goTo(index) {
    const clamped = Math.max(0, Math.min(lessons.length - 1, index));
    setLessonId(lessons[clamped].id);
  }

  return (
    <div className="chords-by-ear-view">
      <div className="studies-layout">
        <nav className="studies-rail" aria-label={t('studies.lessonsLabel')}>
          <p className="studies-progress">{t('studies.progress', { done: completeCount, total: lessons.length })}</p>
          {STAGE_ORDER.filter((stage) => lessons.some((l) => l.stage === stage)).map((stage) => (
            <div key={stage} className="studies-stage-group">
              <p className="studies-stage-label">{localize(CHORDS_BY_EAR_STAGE_LABELS[stage], lang)}</p>
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

          <p className="studies-lesson-description cbe-strategy-text" dir="auto">
            {localize(lesson.description, lang)}
          </p>

          {lesson.demo?.type === 'qualityToggle' && (
            <QualityToggleDemo options={lesson.demo.options} onPreviewChord={setPreviewChordText} />
          )}
          {lesson.demo?.type === 'homeReference' && <HomeReferenceDemo onPreviewChord={setPreviewChordText} />}
          {lesson.demo?.type === 'progressionDemo' && (
            <ProgressionDemo progressionId={lesson.demo.progressionId} onPreviewChord={setPreviewChordText} />
          )}
          {lesson.demo?.type === 'noteNames' && <NoteNamesDemo onPreviewScale={setPreviewScaleContext} />}
          {lesson.demo?.type === 'scaleShape' && <MovableScaleShapeDemo onPreviewScale={setPreviewScaleContext} />}
          {lesson.demo?.type === 'chordRoadMap' && (
            <ChordRoadMapDemo onPreviewPosition={setPreviewPosition} onPreviewChord={setPreviewChordText} />
          )}

          {lesson.kind === 'quiz' && lesson.quizType === 'quality' && (
            <QualityDrill progress={progress} lessonId={lesson.id} onPreviewChord={setPreviewChordText} />
          )}
          {lesson.kind === 'quiz' && lesson.quizType === 'functionBasic' && (
            <FunctionalDrill
              progress={progress}
              lessonId={lesson.id}
              allowedDegrees={FUNCTIONAL_BASIC_DEGREES}
              onPreviewChord={setPreviewChordText}
            />
          )}
          {lesson.kind === 'quiz' && lesson.quizType === 'functionFull' && (
            <FunctionalDrill
              progress={progress}
              lessonId={lesson.id}
              allowedDegrees={[0, 1, 2, 3, 4, 5, 6]}
              onPreviewChord={setPreviewChordText}
            />
          )}
          {lesson.kind === 'quiz' && lesson.quizType === 'pattern' && (
            <ProgressionDrill progress={progress} lessonId={lesson.id} onPreviewChord={setPreviewChordText} />
          )}
          {lesson.kind === 'quiz' && lesson.quizType === 'sequence' && (
            <SequenceDrill progress={progress} lessonId={lesson.id} onPreviewChord={setPreviewChordText} />
          )}
          {lesson.kind === 'quiz' && lesson.quizType === 'change' && (
            <ChangeDrill progress={progress} lessonId={lesson.id} onPreviewChord={setPreviewChordText} />
          )}
          {lesson.kind === 'quiz' && lesson.quizType === 'bassMotion' && (
            <BassMotionDrill progress={progress} lessonId={lesson.id} onPreviewChord={setPreviewChordText} />
          )}
          {lesson.kind === 'quiz' && lesson.quizType === 'singRoot' && <SingRootDrill progress={progress} lessonId={lesson.id} />}
          {lesson.kind === 'quiz' && lesson.quizType === 'mixed' && (
            <MixedReviewDrill progress={progress} lessonId={lesson.id} onPreviewChord={setPreviewChordText} />
          )}
          {lesson.kind === 'quiz' && lesson.quizType === 'findKey' && (
            <FindKeyDrill progress={progress} lessonId={lesson.id} onPreviewScale={setPreviewScaleContext} />
          )}

          {lesson.kind === 'practice' && <RealSongPractice onActiveChordChange={setPreviewChordText} />}

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
