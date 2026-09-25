import { CAGED_STAGE_ORDER, CAGED_STAGE_LABELS, CAGED_INVERSION_STRING_SETS } from '../../music/cagedCurriculum';
import { PracticeDrillPanel } from '../PracticeDrillPanel/PracticeDrillPanel';
import { PositionRoadmapPanel } from '../PositionRoadmapPanel/PositionRoadmapPanel';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import './StudiesView.css';


// Structured, step-by-step CAGED course. Like PracticeView, this owns no
// Fretboard of its own — the active lesson feeds the one shared Stage
// Fretboard via App.jsx's stageFretboardProps resolver (see
// music/cagedCurriculum.js's resolveCagedStageProps). Built to expand: a new
// lesson is one entry in CAGED_LESSONS, nothing here needs to change.
export function StudiesView({
  lessons,
  activeLessonId,
  onSelectLesson,
  progress,
  drill,
  roadmap,
  inversionStringSet = 0,
  onInversionStringSetChange,
}) {
  const { t, lang } = useLanguage();
  const activeIndex = lessons.findIndex((l) => l.id === activeLessonId);
  const activeLesson = lessons[activeIndex] ?? lessons[0];
  const completeCount = lessons.filter((l) => progress.isComplete(l.id)).length;

  function goTo(index) {
    const clamped = Math.max(0, Math.min(lessons.length - 1, index));
    onSelectLesson(lessons[clamped].id);
  }

  return (
    <div className="studies-view">
      <div className="studies-layout">
        <nav className="studies-rail" aria-label={t('studies.lessonsLabel')}>
          <p className="studies-progress">{t('studies.progress', { done: completeCount, total: lessons.length })}</p>
          {CAGED_STAGE_ORDER.map((stage) => (
            <div key={stage} className="studies-stage-group">
              <p className="studies-stage-label">{localize(CAGED_STAGE_LABELS[stage], lang)}</p>
              {lessons
                .filter((l) => l.stage === stage)
                .map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className={'studies-lesson-btn' + (l.id === activeLesson.id ? ' active' : '')}
                    onClick={() => onSelectLesson(l.id)}
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
            <h2 dir="auto">{localize(activeLesson.title, lang)}</h2>
            <button
              type="button"
              className={'studies-complete-btn' + (progress.isComplete(activeLesson.id) ? ' done' : '')}
              onClick={() => progress.markComplete(activeLesson.id)}
            >
              {progress.isComplete(activeLesson.id) ? t('studies.complete') : t('studies.markComplete')}
            </button>
          </div>

          <p className="studies-lesson-description" dir="auto">
            {localize(activeLesson.description, lang)}
          </p>

          {activeLesson.kind === 'inversionMap' && (
            <label className="studies-inversion-set">
              <span>{t('studies.inversionStringSet')}</span>
              <select
                value={inversionStringSet}
                onChange={(e) => onInversionStringSetChange?.(Number(e.target.value))}
              >
                {CAGED_INVERSION_STRING_SETS.map((set) => (
                  <option key={set.order} value={set.order}>
                    {localize(set.label, lang)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {(activeLesson.kind === 'connecting' || activeLesson.kind === 'inversionMap') && roadmap && (
            <PositionRoadmapPanel roadmap={roadmap} />
          )}

          {activeLesson.kind === 'exercise' && (
            <div className="studies-exercise">
              <button
                type="button"
                className="studies-load-exercise-btn"
                onClick={() => drill.loadExercise({ ...activeLesson.exercise, id: activeLesson.id }, 'caged')}
              >
                {t('studies.loadExercise')}
              </button>
              <PracticeDrillPanel drill={drill} />
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
