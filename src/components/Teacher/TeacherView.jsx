// The guitar teacher (nav 'teacher'): Today (next lesson + homework + the
// Coach), Path (levels -> lessons -> skills with measured status), the intake
// and the lesson player. State: teacher/teacherState.js; mastery derived in
// teacher/mastery.js; content in teacher/curriculum/guitar.js.
import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { CoachView } from '../Coach/CoachView';
import { MinuteChanges } from '../MinuteChanges/MinuteChanges';
import { LESSONS, LEVELS, SKILLS } from '../../teacher/curriculum/guitar';
import { recordPass, saveIntake, useTeacher } from '../../teacher/teacherState';
import { allSkillStatus, nextLesson, openHomework } from '../../teacher/mastery';
import { onPerf } from '../../coach/perfLog';
import { HomeworkList, LessonPlayer, PlayStep } from './LessonPlayer';
import '../ModeToggle/ModeToggle.css';
import './Teacher.css';

const EXPERIENCE = ['none', 'little', 'some', 'lot'];
const CAN = ['D', 'A', 'E', 'Am', 'Em', 'G', 'C', 'Dm', 'barre', 'pentatonic', 'tab'];
const GOALS = ['songs', 'accompany', 'solo', 'theory', 'band'];
const STYLES = ['pop', 'rock', 'blues', 'israeli', 'folk', 'jazz', 'metal'];
const MINUTES = [10, 15, 20, 30, 45, 60];

// Re-render when a practice run is logged (homework / mastery come from it).
function usePerfTick() {
  const [, setN] = useState(0);
  useEffect(() => onPerf(() => setN((n) => n + 1)), []);
}

function Intake({ initial, onDone }) {
  const { t } = useLanguage();
  const [v, setV] = useState(
    () => initial ?? { experience: 'none', can: [], goals: ['songs'], style: 'pop', minutes: 20, songs: '' }
  );
  const set = (patch) => setV((x) => ({ ...x, ...patch }));
  const toggle = (key, item) => set({ [key]: v[key].includes(item) ? v[key].filter((x) => x !== item) : [...v[key], item] });
  const canLabel = (c) => (/^[A-G]/.test(c) ? c : t(`teacher.can.${c}`));
  return (
    <div className="tc-card tc-intake">
      <h2>{t('teacher.intake.title')}</h2>
      <label className="tc-field">
        <span>{t('teacher.intake.experience')}</span>
        <select value={v.experience} onChange={(e) => set({ experience: e.target.value })}>
          {EXPERIENCE.map((x) => (
            <option key={x} value={x}>
              {t(`teacher.exp.${x}`)}
            </option>
          ))}
        </select>
      </label>
      {v.experience !== 'none' && (
        <fieldset className="tc-field">
          <legend>{t('teacher.intake.can')}</legend>
          <div className="tc-chips">
            {CAN.map((c) => (
              <button key={c} type="button" className={'tc-chip' + (v.can.includes(c) ? ' is-on' : '')} aria-pressed={v.can.includes(c)} onClick={() => toggle('can', c)}>
                <bdi>{canLabel(c)}</bdi>
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className="tc-field">
        <legend>{t('teacher.intake.goal')}</legend>
        <div className="tc-chips">
          {GOALS.map((g) => (
            <button key={g} type="button" className={'tc-chip' + (v.goals.includes(g) ? ' is-on' : '')} aria-pressed={v.goals.includes(g)} onClick={() => toggle('goals', g)}>
              {t(`teacher.goal.${g}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="tc-row">
        <label className="tc-field">
          <span>{t('teacher.intake.style')}</span>
          <select value={v.style} onChange={(e) => set({ style: e.target.value })}>
            {STYLES.map((x) => (
              <option key={x} value={x}>
                {t(`teacher.style.${x}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="tc-field">
          <span>{t('teacher.intake.minutes')}</span>
          <select value={v.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })}>
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {t('teacher.min', { n: m })}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="tc-field">
        <span>{t('teacher.intake.songs')}</span>
        <textarea rows={3} value={v.songs} dir="auto" onChange={(e) => set({ songs: e.target.value })} />
        <small>{t('teacher.intake.songsHint')}</small>
      </label>
      <button type="button" className="tc-btn is-primary tc-wide" onClick={() => onDone(v)}>
        {t('teacher.intake.save')}
      </button>
    </div>
  );
}

function NextLessonCard({ state, tx, onOpen }) {
  const { t } = useLanguage();
  const lesson = nextLesson(state);
  if (!lesson) {
    return (
      <div className="tc-card tc-hero">
        <p className="tc-text">{t('teacher.next.allDone')}</p>
      </div>
    );
  }
  const level = LEVELS.find((l) => l.n === lesson.level);
  const saved = state.lessons[lesson.id];
  const written = !!lesson.steps;
  const inProgress = saved && !saved.done && (saved.step ?? 0) > 0;
  return (
    <div className="tc-card tc-hero">
      <span className="tc-eyebrow">{t('teacher.next.label')}</span>
      <h2>{tx(lesson.title)}</h2>
      <span className="tc-meta">
        {t('teacher.next.level', { n: lesson.level, grade: level?.grade ?? '' })}
        {lesson.minutes ? ' · ' + t('teacher.next.min', { n: lesson.minutes }) : ''}
        {inProgress ? ' · ' + t('teacher.next.step', { n: (saved.at ?? 0) + 1, m: lesson.steps.length }) : ''}
      </span>
      {lesson.objective && <p className="tc-text">{tx(lesson.objective)}</p>}
      {written ? (
        <button type="button" className="tc-btn is-primary tc-wide" onClick={() => onOpen(lesson)}>
          {inProgress ? t('teacher.next.continue') : t('teacher.next.start')}
        </button>
      ) : (
        <p className="tc-hint">{t('teacher.next.soon')}</p>
      )}
    </div>
  );
}

function Today({ state, tx, onOpen, onCoach, onPractise, onIntake }) {
  const { t } = useLanguage();
  if (!state.intake) {
    return (
      <div className="tc-card tc-hero tc-welcome">
        <h2>{t('teacher.welcome.title')}</h2>
        <p className="tc-text">{t('teacher.welcome.text')}</p>
        <button type="button" className="tc-btn is-primary tc-wide" onClick={onIntake}>
          {t('teacher.welcome.start')}
        </button>
      </div>
    );
  }
  const hw = openHomework(state);
  return (
    <>
      <NextLessonCard state={state} tx={tx} onOpen={onOpen} />
      <div className="tc-card">
        <h3>{t('teacher.hw.title')}</h3>
        {hw.length ? <HomeworkList items={hw} tx={tx} onPractise={onPractise} /> : <p className="tc-hint">{t('teacher.hw.none')}</p>}
      </div>
      <button type="button" className="tc-card tc-link" onClick={onCoach}>
        <span className="tc-link-body">
          <strong>{t('teacher.coach.title')}</strong>
          <span>{t('teacher.coach.text')}</span>
        </span>
        <span className="tc-chev" aria-hidden="true">
          ›
        </span>
      </button>
    </>
  );
}

function PathView({ state, tx, onOpen }) {
  const { t } = useLanguage();
  const status = allSkillStatus(state);
  const now = nextLesson(state);
  return (
    <div className="tc-path">
      {LEVELS.map((lv) => {
        const lessons = LESSONS.filter((l) => l.level === lv.n);
        const skills = SKILLS.filter((s) => s.level === lv.n);
        return (
          <section key={lv.n} className="tc-card tc-level">
            <header>
              <span className="tc-level-n">{lv.n}</span>
              <span>
                <h3>{tx(lv.title)}</h3>
                <span className="tc-meta">
                  <bdi>{lv.grade}</bdi>
                  {lessons.length ? ' · ' + t('teacher.path.lessons', { n: lessons.length }) : ''}
                </span>
              </span>
            </header>
            {lessons.length > 0 && (
              <ol className="tc-lessons">
                {lessons.map((l) => {
                  const done = !!state.lessons[l.id]?.done;
                  const tag = done ? 'done' : !l.steps ? 'soon' : now?.id === l.id ? 'now' : null;
                  return (
                    <li key={l.id}>
                      <button type="button" className={'tc-lesson-row' + (tag ? ' is-' + tag : '')} disabled={!l.steps} onClick={() => onOpen(l)}>
                        <span className="tc-lesson-mark" aria-hidden="true">
                          {done ? '✓' : ''}
                        </span>
                        <span className="tc-lesson-name">{tx(l.title)}</span>
                        {tag && <span className="tc-tag">{t(`teacher.path.${tag}`)}</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
            <ul className="tc-skills">
              {skills.map((s) => {
                const st = status[s.id];
                return (
                  <li key={s.id} className={'is-' + st.status} title={t('teacher.skill.days', { n: st.days, m: st.need })}>
                    <span className="tc-skill-dot" aria-hidden="true" />
                    <span>{tx(s.title)}</span>
                    <span className="tc-skill-state">
                      {t(`teacher.skill.${st.status}`)}
                      {st.best != null ? ' · ' + t('teacher.skill.best', { n: st.best }) : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function TeacherView({ initialScreen = 'today', onStage }) {
  const { t, lang } = useLanguage();
  const tx = useCallback((x) => (x ? x[lang] ?? x.en : ''), [lang]);
  const [state] = useTeacher();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  usePerfTick();
  // today | path | intake | lesson | coach | practise
  const [screen, setScreen] = useState(initialScreen === 'lesson' ? 'today' : initialScreen);
  const [lesson, setLesson] = useState(null);
  const [practise, setPractise] = useState(null);

  // The card's "Lesson" shortcut goes straight into the next written lesson.
  useEffect(() => {
    if (initialScreen !== 'lesson') return;
    const l = nextLesson(state);
    if (l?.steps && state.intake) {
      setLesson(l);
      setScreen('lesson');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The neck is shown only inside a lesson.
  useEffect(() => {
    if (screen !== 'lesson' && !(screen === 'practise' && practise?.kind === 'play')) onStage?.(null);
  }, [screen, onStage, practise]);
  useEffect(() => () => onStage?.(null), [onStage]);

  const open = (l) => {
    setLesson(l);
    setScreen('lesson');
  };
  const back = () => setScreen('today');

  if (screen === 'lesson' && lesson) {
    return (
      <div className="teacher" dir={dir}>
        <LessonPlayer key={lesson.id} lesson={lesson} onClose={back} onStage={onStage} />
      </div>
    );
  }

  const sub = (title, body) => (
    <div className="teacher" dir={dir}>
      <div className="tc-subhead">
        <button type="button" className="tc-back" onClick={back}>
          <span aria-hidden="true">‹</span>
          {t('teacher.back')}
        </button>
        {title && <h2>{title}</h2>}
      </div>
      {body}
    </div>
  );

  if (screen === 'coach') return sub(null, <CoachView />);
  if (screen === 'practise' && practise?.kind === 'play')
    return sub(
      null,
      <div className="tc-card tc-step">
        <h2>{tx(practise.text)}</h2>
        <PlayStep step={{ ...practise, text: null }} tx={tx} onStage={onStage} onPass={() => recordPass(practise.skill)} />
      </div>
    );
  if (screen === 'practise' && practise) return sub(null, <MinuteChanges initialChords={practise.pair} />);
  if (screen === 'intake')
    return sub(
      null,
      <Intake
        initial={state.intake}
        onDone={(v) => {
          saveIntake(v);
          setScreen('today');
        }}
      />
    );

  return (
    <div className="teacher" dir={dir}>
      <div className="tc-top">
        <h1>{t('home.teacher.title')}</h1>
        <div className="mode-toggle tc-tabs" role="tablist">
          {['today', 'path'].map((k) => (
            <button key={k} type="button" role="tab" aria-selected={screen === k} className={screen === k ? 'active' : ''} onClick={() => setScreen(k)}>
              {t(`teacher.tab.${k}`)}
            </button>
          ))}
        </div>
      </div>
      {screen === 'path' ? (
        <PathView state={state} tx={tx} onOpen={open} />
      ) : (
        <Today
          state={state}
          tx={tx}
          onOpen={open}
          onCoach={() => setScreen('coach')}
          onIntake={() => setScreen('intake')}
          onPractise={(item) => {
            setPractise(item);
            setScreen('practise');
          }}
        />
      )}
      {state.intake && screen === 'today' && (
        <button type="button" className="tc-quiet" onClick={() => setScreen('intake')}>
          {t('teacher.intake.title')}
        </button>
      )}
    </div>
  );
}
