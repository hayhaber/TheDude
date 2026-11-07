import { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LibraryRow } from '../PracticeView/PracticeHome';
import { LessonPlayer } from '../Teacher/LessonPlayer';
import { TRIAD_LESSONS } from '../../teacher/curriculum/triads';
import { useTeacher } from '../../teacher/teacherState';
import '../PracticeView/PracticeHome.css';
import '../Teacher/Teacher.css';
import '../ModeToggle/ModeToggle.css';
import './TriadsCourse.css';

// Theory -> Triads (v1.0.133): the course list (10 units, in the order of the
// established methods — see teacher/curriculum/triads.js) and, for an open
// unit, the Teacher's LessonPlayer (the mic follows every shape). Progress
// lives in the teacher state like any lesson (furthest step, done).
const COLORS = ['#AF52DE', '#007AFF', '#34C759', '#FF9500', '#5856D6', '#FF2D55', '#30B0C7', '#A2845E', '#FF3B30', '#00C7BE'];

export function TriadsCourse({ onStage, metro }) {
  const { t, lang } = useLanguage();
  const tx = (x) => (x ? x[lang] ?? x.en : '');
  const [state] = useTeacher();
  const [openId, setOpenId] = useState(null);
  const lesson = TRIAD_LESSONS.find((l) => l.id === openId) ?? null;

  // the list has no neck; a unit draws its own
  useEffect(() => {
    if (!lesson) onStage?.(null);
  }, [lesson, onStage]);
  useEffect(() => () => onStage?.(null), [onStage]);

  if (lesson) {
    return (
      <div className="teacher" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <LessonPlayer key={lesson.id} lesson={lesson} onClose={() => setOpenId(null)} onStage={onStage} metro={metro} />
      </div>
    );
  }

  const doneCount = TRIAD_LESSONS.filter((l) => state.lessons[l.id]?.done).length;
  const next = TRIAD_LESSONS.find((l) => !state.lessons[l.id]?.done) ?? TRIAD_LESSONS[0];
  const status = (l) => {
    const s = state.lessons[l.id];
    if (s?.done) return t('triads.done');
    if (s) return t('triads.step', { n: Math.min((s.at ?? 0) + 1, l.steps.length), m: l.steps.length });
    return t('triads.min', { n: l.minutes });
  };

  return (
    <div className="ph triads-course">
      <p className="subtitle">{t('triads.lead')}</p>
      <div className="ph-group">
        <LibraryRow
          color="var(--accent-fill)"
          icon="play"
          title={doneCount ? t('triads.continue', { n: next.unit }) : t('triads.start')}
          desc={tx(next.title)}
          onClick={() => setOpenId(next.id)}
        />
      </div>
      <h2 className="ph-section-title">{t('triads.units', { done: doneCount, n: TRIAD_LESSONS.length })}</h2>
      <div className="ph-group">
        {TRIAD_LESSONS.map((l, k) => (
          <LibraryRow
            key={l.id}
            color={COLORS[k % COLORS.length]}
            icon={state.lessons[l.id]?.done ? 'check' : 'chords'}
            title={`${l.unit}. ${tx(l.title)}`}
            desc={`${tx(l.objective)}`}
            tag={status(l)}
            onClick={() => setOpenId(l.id)}
          />
        ))}
      </div>
      <p className="tc-hint">{t('triads.method')}</p>
    </div>
  );
}
