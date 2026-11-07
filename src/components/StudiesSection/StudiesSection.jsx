import { StudiesView } from '../StudiesView/StudiesView';
import { LibraryRow, BackButton } from '../PracticeView/PracticeHome';
import '../PracticeView/PracticeHome.css';
import { ScalesView } from '../ScalesView/ScalesView';
import { TechniqueMastersView } from '../TechniqueMastersView/TechniqueMastersView';
import { CircleOfFifthsView } from '../CircleOfFifthsView/CircleOfFifthsView';
import { HarmonyView } from '../HarmonyView/HarmonyView';
import { ChordsByEarView } from '../ChordsByEarView/ChordsByEarView';
import { PianoView } from '../PianoView/PianoView';
import { ChordBuilderView } from '../ChordBuilder/ChordBuilderView';
import { TriadsCourse } from '../TriadsCourse/TriadsCourse';
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
const COURSE_FEATURE = { triads: 'triads', caged: 'caged', techniqueMasters: 'techniqueMasters', pianoCurriculum: 'pianoCurriculum', chordBuilder: 'chordBuilder' };

// Studies now holds two independent courses. StudiesView (the CAGED system)
// is completely untouched — this just wraps it as one tab alongside the new
// Scales course, the same Drills/Ear-Training tab pattern PracticeView
// already uses one level up.
// The courses in list order (colour tile + LineIcon, like the Practice library).
const COURSES = [
  { key: 'chordBuilder', icon: 'chords', color: '#AF52DE' },
  { key: 'triads', icon: 'chords', color: '#FF2D55' },
  { key: 'caged', icon: 'path', color: '#FF9500' },
  { key: 'scales', icon: 'note', color: '#007AFF' },
  { key: 'techniqueMasters', icon: 'hand', color: '#30B0C7' },
  { key: 'circleOfFifths', icon: 'changes', color: '#5856D6' },
  { key: 'harmony', icon: 'studies', color: '#FF2D55' },
  { key: 'chordsByEar', icon: 'ear', color: '#34C759' },
  { key: 'pianoCurriculum', icon: 'freeplay', color: '#A2845E' },
];

export function StudiesSection({
  course,
  onCourseChange,
  cagedLessonId,
  onSelectCagedLesson,
  cagedProgress,
  cagedRoadmap,
  cagedInversionStringSet,
  onCagedInversionStringSetChange,
  cagedKey,
  onCagedKeyChange,
  cagedLessonVars,
  cagedLessonFacts,
  resolveCagedExercise,
  shapeShift,
  shapeQuiz,
  progressionAreas,
  progressionAreaIndex,
  onProgressionAreaChange,
  progressionPlayer,
  chordToneLabels,
  onChordToneLabelsChange,
  scalesLesson,
  scalesProgress,
  drill,
  metronome,
  onOpenScaleEarTraining,
  onOpenScalePracticeTransition,
  techniqueVisualizer,
  circleLesson,
  circleProgress,
  harmonyLesson,
  harmonyProgress,
  chordsByEarLesson,
  chordsByEarProgress,
  pianoLesson,
  pianoCurriculumProgress,
  onChordBuilderStage,
  onTriadStage,
  triadMetro,
  browsing = false,
  onBrowse = () => {},
}) {
  const { t, lang } = useLanguage();
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
    <div className="studies-section" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      {/* Theory = a library of courses (flow review 2026-11-06: seven
          chips + a lesson list + an empty neck on arrival). A course opens
          under an iOS back button; the Learn tab / segment returns here. */}
      {browsing ? (
        <div className="ph studies-library">
          <div className="ph-head">
            <h1>{t('studies.title')}</h1>
            <p className="subtitle">{t('studies.lead')}</p>
          </div>
          <div className="ph-group">
            {COURSES.filter((c) => courseSupported(c.key)).map((c) => (
              <LibraryRow
                key={c.key}
                color={c.color}
                icon={c.icon}
                title={t(`studies.course.${c.key}`)}
                desc={t(`studies.desc.${c.key}`)}
                onClick={() => {
                  onCourseChange(c.key);
                  onBrowse(false);
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="practice-detail-head">
          <BackButton label={t('studies.title')} onClick={() => onBrowse(true)} />
          <h1 className="ph-detail-title">{t(`studies.course.${course}`)}</h1>
        </div>
      )}
      {!browsing && (
      <>
      {course === 'chordBuilder' && <ChordBuilderView onStage={onChordBuilderStage} />}
      {course === 'triads' && <TriadsCourse onStage={onTriadStage} metro={triadMetro} />}

      {course === 'caged' && (
        <StudiesView
          lessons={CAGED_LESSONS}
          activeLessonId={cagedLessonId}
          onSelectLesson={onSelectCagedLesson}
          progress={cagedProgress}
          drill={drill}
          roadmap={cagedRoadmap}
          inversionStringSet={cagedInversionStringSet}
          onInversionStringSetChange={onCagedInversionStringSetChange}
          keyValue={cagedKey}
          onKeyChange={onCagedKeyChange}
          lessonVars={cagedLessonVars}
          lessonFacts={cagedLessonFacts}
          resolveExercise={resolveCagedExercise}
          shapeShift={shapeShift}
          shapeQuiz={shapeQuiz}
          progressionAreas={progressionAreas}
          progressionAreaIndex={progressionAreaIndex}
          onProgressionAreaChange={onProgressionAreaChange}
          progressionPlayer={progressionPlayer}
          chordToneLabels={chordToneLabels}
          onChordToneLabelsChange={onChordToneLabelsChange}
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
          onOpenScalePracticeTransition={onOpenScalePracticeTransition}
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
      </>
      )}
    </div>
  );
}
