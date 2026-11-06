// The guitar teacher (nav 'teacher'): Today (next lesson + homework + the
// Coach), Path (levels -> lessons -> skills with measured status), the intake
// and the lesson player. State: teacher/teacherState.js; mastery derived in
// teacher/mastery.js; content in teacher/curriculum/guitar.js.
import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { CoachView } from '../Coach/CoachView';
import { RewardsView } from '../Achievements/RewardsView';
import { MinuteChanges } from '../MinuteChanges/MinuteChanges';
import { LESSONS, LEVELS, SKILLS, lessonById } from '../../teacher/curriculum/guitar';
import { useCoach, setIntake } from '../../coach/useCoach';
import { coachIntakeFromTeacher, stylesOf } from '../../onboarding/onboardingState';
import { activeGoal, loadCoach } from '../../coach/engine';
import { goalByKey } from '../../coach/goals';
import { pick } from '../Coach/coachFormat';
import { recordPass, saveIntake, useTeacher } from '../../teacher/teacherState';
import { allSkillStatus, nextLesson, openHomework } from '../../teacher/mastery';
import { onPerf } from '../../coach/perfLog';
import { HomeworkList, LessonPlayer, PlayStep } from './LessonPlayer';
import { GoalPick, PathList, SoloGoalForm, SoloPlan, TeacherHome } from './TeacherHome';
import { MoreMenu } from '../MoreMenu/MoreMenu';
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
    () => {
      const base = initial ?? { experience: 'none', can: [], goals: ['songs'], style: 'pop', minutes: 20, songs: '' };
      return { ...base, styles: stylesOf(base) };
    }
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
      {/* Styles: several allowed (2026-11-06). */}
      <fieldset className="tc-field">
        <legend>{t('teacher.intake.style')}</legend>
        <div className="tc-chips">
          {STYLES.map((x) => (
            <button key={x} type="button" className={'tc-chip' + (v.styles.includes(x) ? ' is-on' : '')} aria-pressed={v.styles.includes(x)} onClick={() => toggle('styles', x)}>
              {t(`teacher.style.${x}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="tc-row">
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
      <button type="button" className="tc-btn is-primary tc-wide" onClick={() => onDone({ ...v, style: v.styles[0] ?? v.style ?? 'pop' })}>
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

function Today({ state, tx, onOpen, onCoach, onRewards, onPractise, onIntake }) {
  const { t, lang } = useLanguage();
  const coach = useCoach();
  const g = activeGoal(coach.state);
  const goal = g ? goalByKey(g.goalKey) : null;
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
      {/* The goal is the teacher's too (flow review 2026-11-06: "teacher"
          and "coach" were one thing to the user) — its plan is the Goal tab. */}
      <button type="button" className="tc-card tc-link" onClick={onCoach}>
        <span className="tc-link-body">
          <strong>{goal ? t('teacher.goal.yours', { goal: pick(goal.title, lang) }) : t('teacher.goal.set')}</strong>
          <span>{t(goal ? 'teacher.goal.open' : 'teacher.goal.setText')}</span>
        </span>
        <span className="tc-chev" aria-hidden="true">
          ›
        </span>
      </button>
      <button type="button" className="tc-card tc-link" onClick={onRewards}>
        <span className="tc-link-body">
          <strong>{t('teacher.rewards.title')}</strong>
          <span>{t('teacher.rewards.text')}</span>
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

export function TeacherView({ initialScreen = 'today', initialLesson = null, onStage, metro, gp }) {
  const { t, lang } = useLanguage();
  const tx = useCallback((x) => (x ? x[lang] ?? x.en : ''), [lang]);
  const [state] = useTeacher();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  usePerfTick();
  // today | path | intake | lesson | coach | practise
  // today | path | goal | soloGoal | soloPlan | skillGoal | rewards | intake | lesson | practise
  const coach = useCoach();
  const coachGoal = activeGoal(coach.state);
  const coachGoalDef = coachGoal ? goalByKey(coachGoal.goalKey) : null;
  const [screen, setScreen] = useState(() =>
    initialScreen === 'lesson' ? 'today' : initialScreen === 'coach' ? (coachGoal ? 'skillGoal' : 'goal') : initialScreen
  );
  const [lesson, setLesson] = useState(null);
  const [practise, setPractise] = useState(null);

  // The card's "Lesson" shortcut goes straight into the next written lesson.
  useEffect(() => {
    if (initialScreen !== 'lesson') return;
    // A "try it in" link names its lesson; the card's shortcut takes the next.
    const named = initialLesson ? lessonById(initialLesson) : null;
    if (named?.steps) {
      setLesson(named);
      setScreen('lesson');
      return;
    }
    const l = nextLesson(state);
    if (l?.steps && state.intake) {
      setLesson(l);
      setScreen('lesson');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One teacher: answers given here (or at the first run) carry into the
  // Goal tab, whose planner would otherwise ask "about you" again.
  useEffect(() => {
    if (state.intake && !loadCoach()?.intake) setIntake(coachIntakeFromTeacher(state.intake));
  }, [state.intake]);

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
        <LessonPlayer key={lesson.id} lesson={lesson} onClose={back} onStage={onStage} metro={metro} />
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

  const solo = state.goal?.kind === 'solo' ? gp?.solos?.find((x) => x.id === state.goal.soloId) : null;
  if (screen === 'rewards') return sub(t('teacher.rewards.title'), <RewardsView />);
  if (screen === 'path') return sub(t('teacher.path.title'), <PathList state={state} tx={tx} onOpen={open} />);
  if (screen === 'goal')
    return sub(
      t('teacher.goal.pick'),
      <GoalPick tx={tx} hasSolos={!!gp?.solos?.length} onSolo={() => setScreen('soloGoal')} onSkill={() => setScreen('skillGoal')} />
    );
  if (screen === 'soloGoal' && gp?.solos?.length)
    return sub(t('teacher.goalPick.solo'), <SoloGoalForm tx={tx} solos={gp.solos} initial={state.goal} onDone={() => setScreen('soloPlan')} />);
  if (screen === 'soloPlan' && solo)
    return sub(
      typeof solo.title === 'string' ? solo.title : tx(solo.title),
      <SoloPlan tx={tx} solo={solo} goal={state.goal} gp={gp} onChange={() => setScreen('soloGoal')} />
    );
  if (screen === 'skillGoal') return sub(null, <CoachView embedded />);
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
          if (!loadCoach()?.intake) setIntake(coachIntakeFromTeacher(v));
          setScreen('today');
        }}
      />
    );

  return (
    <div className="teacher" dir={dir}>
      <div className="tc-top">
        <h1>{t('home.teacher.title')}</h1>
        {state.intake && (
          <MoreMenu label={t('teacher.more')}>
            <button type="button" className="more-menu-item" onClick={() => setScreen('intake')}>
              {t('teacher.intake.title')}
            </button>
            <button type="button" className="more-menu-item" onClick={() => setScreen('path')}>
              {t('teacher.path.title')}
            </button>
            <button type="button" className="more-menu-item" onClick={() => setScreen('goal')}>
              {t('teacher.goal.pick')}
            </button>
          </MoreMenu>
        )}
      </div>
      {!state.intake ? (
        <Today state={state} tx={tx} onOpen={open} onIntake={() => setScreen('intake')} />
      ) : (
        <TeacherHome
          state={state}
          tx={tx}
          coachGoal={coachGoal}
          coachGoalTitle={coachGoalDef ? pick(coachGoalDef.title, lang) : ''}
          gp={gp}
          onOpen={open}
          onScreen={setScreen}
          onPractise={(item) => {
            setPractise(item);
            setScreen('practise');
          }}
        />
      )}
    </div>
  );
}
