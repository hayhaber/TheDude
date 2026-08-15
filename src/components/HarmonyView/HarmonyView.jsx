import { useEffect, useState } from 'react';
import { HARMONY_LEVELS, HARMONY_LEVEL_LABELS } from '../../music/harmonyCurriculum';
import { HarmonyChordToggle } from './HarmonyChordToggle';
import { HarmonyDiatonicTable } from './HarmonyDiatonicTable';
import { HarmonyProgressionRow } from './HarmonyProgressionRow';
import { HarmonyInversionPicker } from './HarmonyInversionPicker';
import { HarmonySpellingQuiz } from './HarmonySpellingQuiz';
import { HarmonyFunctionQuiz } from './HarmonyFunctionQuiz';
import { CircleOfFifthsDiagram } from '../CircleOfFifthsDiagram/CircleOfFifthsDiagram';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import './HarmonyView.css';

const LEVEL_ORDER = [HARMONY_LEVELS.BEGINNER, HARMONY_LEVELS.INTERMEDIATE, HARMONY_LEVELS.ADVANCED, HARMONY_LEVELS.PRACTICE];

// A fixed single-chord demo (no controls) — "here's what a C major triad
// looks like," for the 2 overview lessons that just need one illustrative
// example rather than an interactive picker.
function HarmonyFixedDemo({ chordText, onPreviewChord }) {
  useEffect(() => {
    onPreviewChord(chordText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chordText]);
  return (
    <p className="harmony-chord-readout" dir="ltr">
      {chordText}
    </p>
  );
}

// Structured Harmony & Chord Theory course — same rail+detail shell as the
// other 3 Studies courses. Its own twist: lessons are grouped by student
// LEVEL (beginner/intermediate/advanced), not by topic, per an explicit
// request, and each lesson's interactive demo is one of a handful of
// reusable widgets (see harmonyCurriculum.js's `demo.type`) that all reduce
// to the same thing by the time they reach the shared Fretboard/piano: one
// currently-previewed chord (see useHarmonyLesson.js).
export function HarmonyView({ lessons, harmonyLesson, progress }) {
  const { t, lang } = useLanguage();
  const { lessonId, setLessonId, rootPitchClass, setRootPitchClass, setPreviewChordText, setInversionKey } = harmonyLesson;
  // Local, standalone state — the capstone circle diagram is purely
  // illustrative (no fretboard/piano preview to keep in sync), so it doesn't
  // share rootPitchClass with the other demo widgets (which is a chromatic
  // pitch class, not a circle-of-fifths position — the two aren't the same
  // numbering, see circleOfFifthsCurriculum.js's KEY_CIRCLE).
  const [circlePosition, setCirclePosition] = useState(0);

  const activeIndex = lessons.findIndex((l) => l.id === lessonId);
  const lesson = lessons[activeIndex] ?? lessons[0];
  const completeCount = lessons.filter((l) => progress.isComplete(l.id)).length;

  function goTo(index) {
    const clamped = Math.max(0, Math.min(lessons.length - 1, index));
    setLessonId(lessons[clamped].id);
  }

  return (
    <div className="harmony-view">
      <div className="studies-layout">
        <nav className="studies-rail" aria-label={t('studies.lessonsLabel')}>
          <p className="studies-progress">{t('studies.progress', { done: completeCount, total: lessons.length })}</p>
          {LEVEL_ORDER.map((level) => (
            <div key={level} className="studies-stage-group">
              <p className="studies-stage-label">{localize(HARMONY_LEVEL_LABELS[level], lang)}</p>
              {lessons
                .filter((l) => l.level === level)
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

          {lesson.demo?.type === 'fixed' && <HarmonyFixedDemo chordText={lesson.demo.chordText} onPreviewChord={setPreviewChordText} />}

          {lesson.demo?.type === 'chordToggle' && (
            <HarmonyChordToggle
              rootPitchClass={rootPitchClass}
              onRootChange={setRootPitchClass}
              options={lesson.demo.options}
              onPreviewChord={setPreviewChordText}
            />
          )}

          {lesson.demo?.type === 'diatonicTable' && (
            <HarmonyDiatonicTable
              rootPitchClass={rootPitchClass}
              onRootChange={setRootPitchClass}
              family={lesson.demo.family}
              seventh={lesson.demo.seventh}
              compareFamily={lesson.demo.compareFamily}
              showFunction={lesson.demo.showFunction}
              onPreviewChord={setPreviewChordText}
            />
          )}

          {lesson.demo?.type === 'progression' && (
            <HarmonyProgressionRow
              rootPitchClass={rootPitchClass}
              onRootChange={setRootPitchClass}
              chords={lesson.demo.chords}
              onPreviewChord={setPreviewChordText}
            />
          )}

          {lesson.demo?.type === 'inversion' && (
            <HarmonyInversionPicker
              rootPitchClass={rootPitchClass}
              onRootChange={setRootPitchClass}
              onPreviewChord={setPreviewChordText}
              onInversionChange={setInversionKey}
            />
          )}

          {lesson.demo?.type === 'circleDiagram' && (
            <div className="circle-diagram-wrap">
              <CircleOfFifthsDiagram selectedPosition={circlePosition} onSelectPosition={setCirclePosition} highlightNeighbors />
            </div>
          )}

          {lesson.kind === 'quiz' && lesson.quizType === 'spelling' && <HarmonySpellingQuiz progress={progress} lessonId={lesson.id} />}
          {lesson.kind === 'quiz' && lesson.quizType === 'function' && <HarmonyFunctionQuiz progress={progress} lessonId={lesson.id} />}

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
