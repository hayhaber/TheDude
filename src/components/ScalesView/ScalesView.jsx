import { useState } from 'react';
import { SCALES_STAGES, SCALES_STAGE_LABELS, buildScaleExercise, scaleKeySuffix } from '../../music/scalesCurriculum';
import { fivePositionWindows } from '../../music/scaleShapes';
import { KEY_NAMES } from '../../music/scaleAnalyzer';
import { PracticeDrillPanel } from '../PracticeDrillPanel/PracticeDrillPanel';
import { useInstrument } from '../../instruments/useInstrument';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import './ScalesView.css';

const STAGE_ORDER = [
  SCALES_STAGES.FOUNDATION,
  SCALES_STAGES.MAJOR,
  SCALES_STAGES.MINOR,
  SCALES_STAGES.PENTATONIC,
  SCALES_STAGES.BLUES,
  SCALES_STAGES.MODES,
  SCALES_STAGES.ADVANCED,
];

// Structured Scales course — same rail+detail shell as StudiesView (the
// CAGED course), plus the controls a scale needs that a fixed chord shape
// doesn't: key, degree/note labels, 5-position browser, and practice
// direction/loop/tempo, all feeding the *existing* metronome-driven drill
// engine and shared Fretboard rather than any new playback/visualization.
export function ScalesView({ lessons, scalesLesson, progress, drill, metronome, onOpenScaleEarTraining }) {
  const { t, lang } = useLanguage();
  const { instrument } = useInstrument();
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(12);

  const { lessonId, setLessonId, rootPitchClass, setRootPitchClass, labelMode, setLabelMode, positionIndex, setPositionIndex, direction, setDirection } =
    scalesLesson;

  const activeIndex = lessons.findIndex((l) => l.id === lessonId);
  const lesson = lessons[activeIndex] ?? lessons[0];
  const completeCount = lessons.filter((l) => progress.isComplete(l.id)).length;
  // The 5-position browser (CAGED-derived shape windows anchored to a fret)
  // is a guitar-only concept — piano's own scale rendering already shows
  // the full scale directly from rootPitchClass+scaleKey regardless (see
  // App.jsx's stagePianoProps), so the position browser does nothing useful
  // there. `usesPositions` gates BOTH the nav UI and the practice-exercise
  // fret-window bounds below, rather than just hiding the UI and leaving a
  // dangling piano behavior that still depends on positionIndex.
  const usesPositions = lesson.hasPositions && instrument !== 'piano';
  const positions = usesPositions ? fivePositionWindows(rootPitchClass) : [];
  const currentPosition = positions[positionIndex] ?? null;

  function goTo(index) {
    const clamped = Math.max(0, Math.min(lessons.length - 1, index));
    setLessonId(lessons[clamped].id);
  }

  function loadPractice() {
    const bounds = usesPositions && currentPosition ? currentPosition : { fretStart: loopStart, fretEnd: loopEnd };
    const ex = buildScaleExercise(lesson.scaleKey, rootPitchClass, {
      fretStart: bounds.fretStart,
      fretEnd: bounds.fretEnd,
      direction,
      bpm: metronome.bpm,
    });
    if (!ex || ex.sequence.length === 0) return;
    drill.loadExercise({ ...ex, title: lesson.title, id: lesson.id }, 'scales');
  }

  // Reads the shared timer (see usePracticeDrill.js) before exit() zeroes it
  // — same elapsed time both feeds this lesson's own bestTempo/practiceMs
  // badge tracking and, via exit()'s auto-commit, the global practice
  // history/dashboard, instead of keeping a second independent Date.now()
  // measurement of the same session.
  function finishPractice() {
    if (drill.exercise && drill.elapsedMs > 0) {
      progress.recordPracticeSession(lesson.id, { tempo: metronome.bpm, durationMs: drill.elapsedMs });
    }
    drill.exit();
  }

  function speedUp() {
    metronome.setBpm(metronome.bpm + 5);
  }

  const badges = progress.badgesFor(lesson.id);

  return (
    <div className="scales-view">
      <div className="studies-layout">
        <nav className="studies-rail" aria-label={t('studies.lessonsLabel')}>
          <p className="studies-progress">{t('studies.progress', { done: completeCount, total: lessons.length })}</p>
          {STAGE_ORDER.map((stage) => (
            <div key={stage} className="studies-stage-group">
              <p className="studies-stage-label">{localize(SCALES_STAGE_LABELS[stage], lang)}</p>
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

          {lesson.kind === 'scale' && (
            <div className="scales-controls">
              <label className="scales-field">
                {t('scales.key')}
                <select value={rootPitchClass} onChange={(e) => setRootPitchClass(Number(e.target.value))}>
                  {KEY_NAMES.map((name, i) => (
                    <option key={name} value={i}>
                      {name}
                      {scaleKeySuffix(lesson.scaleKey)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mode-toggle" role="group" aria-label={t('scales.labelMode')}>
                <button type="button" className={labelMode === 'degree' ? 'active' : ''} onClick={() => setLabelMode('degree')}>
                  {t('scales.degrees')}
                </button>
                <button type="button" className={labelMode === 'note' ? 'active' : ''} onClick={() => setLabelMode('note')}>
                  {t('scales.noteNames')}
                </button>
              </div>

              {usesPositions && positions.length > 0 && (
                <div className="scales-position-nav">
                  <button type="button" onClick={() => setPositionIndex((i) => Math.max(0, i - 1))} disabled={positionIndex <= 0}>
                    {t('positionControls.back')}
                  </button>
                  <span className="position-label">
                    {t('scales.positionLabel', { index: positionIndex + 1, total: positions.length, shape: currentPosition?.shapeName })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPositionIndex((i) => Math.min(positions.length - 1, i + 1))}
                    disabled={positionIndex >= positions.length - 1}
                  >
                    {t('positionControls.next')}
                  </button>
                </div>
              )}
            </div>
          )}

          {lesson.kind === 'scale' && (
            <div className="scales-practice">
              <div className="mode-toggle" role="group" aria-label={t('scales.direction')}>
                <button type="button" className={direction === 'ascending' ? 'active' : ''} onClick={() => setDirection('ascending')}>
                  {t('scales.ascending')}
                </button>
                <button type="button" className={direction === 'descending' ? 'active' : ''} onClick={() => setDirection('descending')}>
                  {t('scales.descending')}
                </button>
              </div>

              {!lesson.hasPositions && instrument !== 'piano' && (
                <div className="scales-loop-fields">
                  <label className="scales-field">
                    {t('scales.loopStart')}
                    <input type="number" min={0} max={24} value={loopStart} onChange={(e) => setLoopStart(Number(e.target.value))} />
                  </label>
                  <label className="scales-field">
                    {t('scales.loopEnd')}
                    <input type="number" min={0} max={24} value={loopEnd} onChange={(e) => setLoopEnd(Number(e.target.value))} />
                  </label>
                </div>
              )}

              <div className="scales-practice-buttons">
                <button type="button" className="play-button" onClick={loadPractice}>
                  {t('scales.loadPractice')}
                </button>
                <button type="button" className="play-button" onClick={speedUp} title={t('scales.speedUpHint')}>
                  {t('scales.speedUp')}
                </button>
                <button type="button" className="play-button" onClick={onOpenScaleEarTraining}>
                  {t('scales.earTraining')}
                </button>
              </div>

              <PracticeDrillPanel drill={drill} />
              {drill.exercise && (
                <button type="button" className="scales-finish-btn" onClick={finishPractice}>
                  {t('scales.finishPractice')}
                </button>
              )}
            </div>
          )}

          {badges.length > 0 && (
            <div className="scales-badges">
              {badges.map((b) => (
                <span key={b} className="scales-badge">
                  {t(`scales.badge.${b}`)}
                </span>
              ))}
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
