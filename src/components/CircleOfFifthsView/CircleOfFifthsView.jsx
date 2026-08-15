import {
  CIRCLE_STAGES,
  CIRCLE_STAGE_LABELS,
  CIRCLE_DIFFICULTY_LABELS,
  KEY_CIRCLE,
  keyByPosition,
  accidentalCountFor,
  buildCircleDrillExercise,
} from '../../music/circleOfFifthsCurriculum';
import { CircleOfFifthsDiagram } from '../CircleOfFifthsDiagram/CircleOfFifthsDiagram';
import { CircleOfFifthsQuiz } from '../CircleOfFifthsQuiz/CircleOfFifthsQuiz';
import { PracticeDrillPanel } from '../PracticeDrillPanel/PracticeDrillPanel';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import './CircleOfFifthsView.css';

const STAGE_ORDER = [
  CIRCLE_STAGES.FOUNDATION,
  CIRCLE_STAGES.KEY_SIGNATURES,
  CIRCLE_STAGES.RELATIVE_KEYS,
  CIRCLE_STAGES.HARMONY,
  CIRCLE_STAGES.PRACTICE,
];

const NEIGHBOR_KINDS = new Set(['neighbors', 'progressionMap']);

// Structured Circle of Fifths course — same rail+detail shell as
// StudiesView/ScalesView, with the interactive wheel (CircleOfFifthsDiagram)
// as this course's own visual centerpiece, standing in for CAGED's shape
// diagram / Scales' position browser. Fretboard integration is supplemental
// (via App.jsx's resolveCircleStageProps), not the primary teaching visual,
// since key relationships are inherently a "map," not a fretboard shape.
export function CircleOfFifthsView({ lessons, circleLesson, progress, drill, metronome }) {
  const { t, lang } = useLanguage();
  const { lessonId, setLessonId, keyPosition, setKeyPosition, labelMode, setLabelMode } = circleLesson;

  const activeIndex = lessons.findIndex((l) => l.id === lessonId);
  const lesson = lessons[activeIndex] ?? lessons[0];
  const completeCount = lessons.filter((l) => progress.isComplete(l.id)).length;
  const selectedKey = keyByPosition(keyPosition);
  const acc = accidentalCountFor(selectedKey);

  function goTo(index) {
    const clamped = Math.max(0, Math.min(lessons.length - 1, index));
    setLessonId(lessons[clamped].id);
  }

  function loadPractice() {
    const ex = buildCircleDrillExercise(lesson, selectedKey, metronome.bpm);
    if (!ex || ex.sequence.length === 0) return;
    drill.loadExercise({ ...ex, title: lesson.title, id: lesson.id }, 'circleOfFifths');
  }

  function finishPractice() {
    if (drill.exercise && drill.elapsedMs > 0) {
      progress.recordPracticeSession(lesson.id, { tempo: metronome.bpm, durationMs: drill.elapsedMs });
    }
    drill.exit();
  }

  return (
    <div className="circle-of-fifths-view">
      <div className="studies-layout">
        <nav className="studies-rail" aria-label={t('studies.lessonsLabel')}>
          <p className="studies-progress">{t('studies.progress', { done: completeCount, total: lessons.length })}</p>
          {STAGE_ORDER.map((stage) => (
            <div key={stage} className="studies-stage-group">
              <p className="studies-stage-label">{localize(CIRCLE_STAGE_LABELS[stage], lang)}</p>
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

          {lesson.difficulty && (
            <span className={'circle-difficulty-badge ' + lesson.difficulty}>{localize(CIRCLE_DIFFICULTY_LABELS[lesson.difficulty], lang)}</span>
          )}

          <p className="studies-lesson-description" dir="auto">
            {localize(lesson.description, lang)}
          </p>

          {lesson.kind !== 'quiz' && (
            <div className="circle-diagram-wrap">
              <CircleOfFifthsDiagram
                selectedPosition={keyPosition}
                onSelectPosition={setKeyPosition}
                highlightNeighbors={NEIGHBOR_KINDS.has(lesson.kind)}
              />

              <div className="circle-controls">
                <label className="circle-field">
                  {t('circleOfFifths.key')}
                  <select value={keyPosition} onChange={(e) => setKeyPosition(Number(e.target.value))}>
                    {KEY_CIRCLE.map((k) => (
                      <option key={k.position} value={k.position}>
                        {k.majorName} / {k.relativeMinorName}
                      </option>
                    ))}
                  </select>
                </label>

                <p className="circle-key-summary" dir="auto">
                  {acc.count === 0
                    ? t('circleOfFifths.noAccidentals', { key: selectedKey.majorName })
                    : t(acc.kind === 'sharps' ? 'circleOfFifths.sharpsSummary' : 'circleOfFifths.flatsSummary', {
                        key: selectedKey.majorName,
                        count: acc.count,
                        relative: selectedKey.relativeMinorName,
                      })}
                </p>

                {lesson.fretboard?.type === 'scale' && (
                  <div className="mode-toggle" role="group" aria-label={t('scales.labelMode')}>
                    <button type="button" className={labelMode === 'degree' ? 'active' : ''} onClick={() => setLabelMode('degree')}>
                      {t('scales.degrees')}
                    </button>
                    <button type="button" className={labelMode === 'note' ? 'active' : ''} onClick={() => setLabelMode('note')}>
                      {t('scales.noteNames')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {lesson.kind === 'quiz' && <CircleOfFifthsQuiz progress={progress} lessonId={lesson.id} />}

          {lesson.kind === 'exercise' && (
            <div className="circle-exercise">
              <button type="button" className="studies-load-exercise-btn" onClick={loadPractice}>
                {t('studies.loadExercise')}
              </button>
              <PracticeDrillPanel drill={drill} />
              {drill.exercise && (
                <button type="button" className="circle-finish-btn" onClick={finishPractice}>
                  {t('scales.finishPractice')}
                </button>
              )}
            </div>
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
