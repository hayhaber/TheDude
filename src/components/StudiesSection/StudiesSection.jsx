import { StudiesView } from '../StudiesView/StudiesView';
import { ScalesView } from '../ScalesView/ScalesView';
import { TechniqueMastersView } from '../TechniqueMastersView/TechniqueMastersView';
import { CircleOfFifthsView } from '../CircleOfFifthsView/CircleOfFifthsView';
import { HarmonyView } from '../HarmonyView/HarmonyView';
import { ChordsByEarView } from '../ChordsByEarView/ChordsByEarView';
import { PianoView } from '../PianoView/PianoView';
import { CAGED_LESSONS } from '../../music/cagedCurriculum';
import { SCALES_LESSONS } from '../../music/scalesCurriculum';
import { CIRCLE_LESSONS } from '../../music/circleOfFifthsCurriculum';
import { HARMONY_LESSONS } from '../../music/harmonyCurriculum';
import { CHORDS_BY_EAR_LESSONS, CHORDS_BY_EAR_STAGES } from '../../music/chordsByEarCurriculum';
import { PIANO_LESSONS } from '../../music/pianoCurriculum';
import { useInstrument } from '../../instruments/useInstrument';
import { supportsInstrument } from '../../instruments/featureCapabilities';
import { useLanguage } from '../../i18n/LanguageContext';
import './StudiesSection.css';

// `feature` is the featureCapabilities.js key gating this course (undefined =
// works on every instrument) — used to hide a course tab entirely on an
// instrument it doesn't support, instead of showing it and then blocking its
// content behind a "not available" message.
const COURSE_FEATURE = { caged: 'caged', techniqueMasters: 'techniqueMasters', pianoCurriculum: 'pianoCurriculum' };

// Studies now holds two independent courses. StudiesView (the CAGED system)
// is completely untouched — this just wraps it as one tab alongside the new
// Scales course, the same Drills/Ear-Training tab pattern PracticeView
// already uses one level up.
export function StudiesSection({
  course,
  onCourseChange,
  cagedLessonId,
  onSelectCagedLesson,
  cagedProgress,
  cagedRoadmap,
  scalesLesson,
  scalesProgress,
  drill,
  metronome,
  onOpenScaleEarTraining,
  techniqueVisualizer,
  circleLesson,
  circleProgress,
  harmonyLesson,
  harmonyProgress,
  chordsByEarLesson,
  chordsByEarProgress,
  pianoLesson,
  pianoCurriculumProgress,
}) {
  const { t } = useLanguage();
  const { instrument } = useInstrument();
  const courseSupported = (key) => !COURSE_FEATURE[key] || supportsInstrument(COURSE_FEATURE[key], instrument);

  // The FRETBOARD_MAP stage ("The 3-Step System on the Neck") is guitar
  // geometry in CONCEPT, not just wording — anchored strings, fret offsets,
  // "slide to fret X" — none of which has a piano equivalent, unlike the
  // rest of this course's theory (which does). Rather than hide the whole
  // course (most of it IS instrument-neutral) or leave 6 guitar-only
  // lessons visible and confusing on piano, only this one stage is filtered
  // out per-instrument, same spirit as COURSE_FEATURE above but scoped to a
  // few lessons within a course instead of a whole course.
  const chordsByEarLessons =
    instrument === 'piano'
      ? CHORDS_BY_EAR_LESSONS.filter((l) => l.stage !== CHORDS_BY_EAR_STAGES.FRETBOARD_MAP)
      : CHORDS_BY_EAR_LESSONS;

  return (
    <div className="studies-section">
      <div>
        <h1>{t('studies.title')}</h1>
      </div>

      <div className="studies-course-tabs" role="group" aria-label={t('studies.courseLabel')}>
        {courseSupported('caged') && (
          <button type="button" className={course === 'caged' ? 'active' : ''} onClick={() => onCourseChange('caged')}>
            {t('studies.course.caged')}
          </button>
        )}
        <button type="button" className={course === 'scales' ? 'active' : ''} onClick={() => onCourseChange('scales')}>
          {t('studies.course.scales')}
        </button>
        {courseSupported('techniqueMasters') && (
          <button
            type="button"
            className={course === 'techniqueMasters' ? 'active' : ''}
            onClick={() => onCourseChange('techniqueMasters')}
          >
            {t('studies.course.techniqueMasters')}
          </button>
        )}
        <button
          type="button"
          className={course === 'circleOfFifths' ? 'active' : ''}
          onClick={() => onCourseChange('circleOfFifths')}
        >
          {t('studies.course.circleOfFifths')}
        </button>
        <button type="button" className={course === 'harmony' ? 'active' : ''} onClick={() => onCourseChange('harmony')}>
          {t('studies.course.harmony')}
        </button>
        <button type="button" className={course === 'chordsByEar' ? 'active' : ''} onClick={() => onCourseChange('chordsByEar')}>
          {t('studies.course.chordsByEar')}
        </button>
        {courseSupported('pianoCurriculum') && (
          <button
            type="button"
            className={course === 'pianoCurriculum' ? 'active' : ''}
            onClick={() => onCourseChange('pianoCurriculum')}
          >
            {t('studies.course.pianoCurriculum')}
          </button>
        )}
      </div>

      {course === 'caged' && (
        <StudiesView
          lessons={CAGED_LESSONS}
          activeLessonId={cagedLessonId}
          onSelectLesson={onSelectCagedLesson}
          progress={cagedProgress}
          drill={drill}
          roadmap={cagedRoadmap}
        />
      )}

      {course === 'scales' && (
        <ScalesView
          lessons={SCALES_LESSONS}
          scalesLesson={scalesLesson}
          progress={scalesProgress}
          drill={drill}
          metronome={metronome}
          onOpenScaleEarTraining={onOpenScaleEarTraining}
        />
      )}

      {course === 'techniqueMasters' && <TechniqueMastersView visualizer={techniqueVisualizer} />}

      {course === 'circleOfFifths' && (
        <CircleOfFifthsView
          lessons={CIRCLE_LESSONS}
          circleLesson={circleLesson}
          progress={circleProgress}
          drill={drill}
          metronome={metronome}
        />
      )}

      {course === 'harmony' && <HarmonyView lessons={HARMONY_LESSONS} harmonyLesson={harmonyLesson} progress={harmonyProgress} />}

      {course === 'chordsByEar' && (
        <ChordsByEarView lessons={chordsByEarLessons} chordsByEarLesson={chordsByEarLesson} progress={chordsByEarProgress} />
      )}

      {course === 'pianoCurriculum' && <PianoView lessons={PIANO_LESSONS} pianoLesson={pianoLesson} progress={pianoCurriculumProgress} />}
    </div>
  );
}
