import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useProfiles } from '../../profile/profileStorage';
import { useCoach } from '../../coach/useCoach';
import { loadPerf, localDay } from '../../coach/perfLog';
import { GOALS, CHORD_SETS, goalByKey, matchGoalText } from '../../coach/goals';
import {
  activeGoal,
  currentRungIndex,
  estimateTime,
  scheduleStatus,
  placementTests,
  findWeaknesses,
  dailySeries,
  seriesUnit,
  seriesTargets,
  pairStats,
  minutesByDay,
  sessionTemplate,
} from '../../coach/engine';
import { pick, formatValue, formatTarget, clock, formatDate } from './coachFormat';
import { ProgressChart } from './ProgressChart';
import './CoachView.css';

// Coach section: a goal-based practice plan. No plan yet -> a short wizard
// (welcome, about you, goal, placement test, plan). With a plan -> the
// dashboard (today's session, progress chart + goal ladder, weak points,
// practice time, chord pairs). Logic lives in src/coach/ (engine + store).

const MINUTES = [10, 15, 20, 30, 45, 60];
const DAYS = [3, 4, 5, 6, 7];
const LEVELS = ['new', 'beginner', 'intermediate', 'advanced'];
const STYLES = ['rock', 'blues', 'pop', 'acoustic', 'metal'];
const DEFAULT_INTAKE = { minutesPerDay: 20, daysPerWeek: 5, level: 'beginner', style: 'rock' };
const PARTS = ['warm', 'goal', 'support', 'brk', 'music'];

// Ticks once a second while `on` (running block timers).
function useNow(on) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [on]);
  return now;
}

// The chart's number format for a goal's series.
function seriesFormat(goal, t) {
  if (goal.measure === 'minuteChangesWeakestPair') return (v) => `${Math.round(v)}${t('coach.unit.perMin')}`;
  if (goal.measure === 'bendAccuracy' || goal.measure === 'earAccuracy') return (v) => `${Math.round(v)}%`;
  return (v) => String(Math.round(v));
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

function Cross() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/** Measured value vs target: a green ✓ / amber ✗ chip, or a plain value. */
function ResultBadge({ measure, result, t }) {
  if (!result || !Number.isFinite(result.value)) return null;
  const cls = result.met === true ? ' is-met' : result.met === false ? ' is-missed' : '';
  return (
    <span className={'coach-result' + cls}>
      {result.met === true && <Check />}
      {result.met === false && <Cross />}
      <span dir="ltr">{formatValue(measure, result.value, t)}</span>
      {result.met === false && result.bpm && measure?.bpm && result.bpm < measure.bpm - 1 ? <span dir="ltr"> @ {result.bpm}</span> : null}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------------

function WizardFrame({ step, total, title, lead, children, footer, t }) {
  return (
    <section className="coach-card coach-wizard">
      {step != null && (
        <div className="coach-steps" aria-label={t('coach.steps', { n: step, total })}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={'coach-step-dot' + (i + 1 === step ? ' is-on' : i + 1 < step ? ' is-past' : '')} />
          ))}
          <span className="coach-steps-text">{t('coach.steps', { n: step, total })}</span>
        </div>
      )}
      {title && <h2 className="coach-wizard-title">{title}</h2>}
      {lead && <p className="coach-lead">{lead}</p>}
      <div className="coach-wizard-body">{children}</div>
      {footer && <div className="coach-wizard-footer">{footer}</div>}
    </section>
  );
}

function WelcomeStep({ onNext, t }) {
  return (
    <WizardFrame
      step={1}
      total={5}
      t={t}
      footer={
        <>
          <span />
          <button type="button" className="primary" onClick={onNext}>
            {t('coach.next')}
          </button>
        </>
      }
    >
      <span className="coach-eyebrow">{t('coach.welcome.eyebrow')}</span>
      <h1 className="coach-hero">{t('coach.welcome.title')}</h1>
      <p className="coach-lead">{t('coach.welcome.lead')}</p>
      <div className="coach-two">
        <div className="coach-panel">
          <h3>{t('coach.welcome.measures')}</h3>
          <ul className="coach-list is-yes">
            {['m1', 'm2', 'm3', 'm4'].map((k) => (
              <li key={k}>
                <span className="coach-list-icon">
                  <Check />
                </span>
                {t(`coach.welcome.${k}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="coach-panel">
          <h3>{t('coach.welcome.cant')}</h3>
          <ul className="coach-list is-no">
            {['c1', 'c2', 'c3'].map((k) => (
              <li key={k}>
                <span className="coach-list-icon">
                  <Cross />
                </span>
                {t(`coach.welcome.${k}`)}
              </li>
            ))}
          </ul>
          <p className="coach-note">{t('coach.welcome.cantNote')}</p>
        </div>
      </div>
    </WizardFrame>
  );
}

function Field({ id, label, children, hint }) {
  return (
    <label className="coach-field" htmlFor={id}>
      <span className="coach-field-label">{label}</span>
      {children}
      {hint && <span className="coach-field-hint">{hint}</span>}
    </label>
  );
}

function AboutStep({ initial, editing, onBack, onDone, t }) {
  const [d, setD] = useState({ ...DEFAULT_INTAKE, ...initial });
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  return (
    <WizardFrame
      step={editing ? null : 2}
      total={5}
      t={t}
      title={t('coach.about.title')}
      lead={t('coach.about.lead')}
      footer={
        <>
          <button type="button" onClick={onBack}>
            {editing ? t('coach.cancel') : t('coach.back')}
          </button>
          <button type="button" className="primary" onClick={() => onDone(d)}>
            {editing ? t('coach.save') : t('coach.next')}
          </button>
        </>
      }
    >
      <div className="coach-fields">
        <Field id="coach-minutes" label={t('coach.about.minutes')}>
          <select id="coach-minutes" value={d.minutesPerDay} onChange={(e) => set('minutesPerDay', Number(e.target.value))}>
            {MINUTES.map((n) => (
              <option key={n} value={n}>
                {t('coach.about.minutesValue', { n })}
              </option>
            ))}
          </select>
        </Field>
        <Field id="coach-days" label={t('coach.about.days')}>
          <select id="coach-days" value={d.daysPerWeek} onChange={(e) => set('daysPerWeek', Number(e.target.value))}>
            {DAYS.map((n) => (
              <option key={n} value={n}>
                {t('coach.about.daysValue', { n })}
              </option>
            ))}
          </select>
        </Field>
        <Field id="coach-level" label={t('coach.about.level')} hint={t(`coach.level.${d.level}.desc`)}>
          <select id="coach-level" value={d.level} onChange={(e) => set('level', e.target.value)}>
            {LEVELS.map((k) => (
              <option key={k} value={k}>
                {t(`coach.level.${k}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="coach-style" label={t('coach.about.style')}>
          <select id="coach-style" value={d.style} onChange={(e) => set('style', e.target.value)}>
            {STYLES.map((k) => (
              <option key={k} value={k}>
                {t(`coach.style.${k}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </WizardFrame>
  );
}

function GoalCard({ goal, selected, onSelect, lang, t }) {
  return (
    <button type="button" className={'coach-goal' + (selected ? ' is-selected' : '')} aria-pressed={selected} onClick={onSelect}>
      <span className="coach-goal-icon" aria-hidden="true">
        {goal.icon}
      </span>
      <span className="coach-goal-text">
        <span className="coach-goal-title">{pick(goal.title, lang)}</span>
        <span className="coach-goal-desc">{pick(goal.desc, lang)}</span>
        <span className="coach-goal-metric">{t('coach.goal.measured', { metric: pick(goal.metric, lang) })}</span>
      </span>
    </button>
  );
}

function GoalStep({ intake, editing, onBack, onChoose, lang, t }) {
  const [text, setText] = useState('');
  const [key, setKey] = useState(null);
  const [chordSet, setChordSet] = useState('ADE');
  const matches = useMemo(() => matchGoalText(text).slice(0, 3), [text]);
  const level = intake?.level ?? 'beginner';
  const forYou = GOALS.filter((g) => g.level.includes(level));
  const others = GOALS.filter((g) => !g.level.includes(level));
  const selected = key ? goalByKey(key) : null;
  return (
    <WizardFrame
      step={editing ? null : 3}
      total={5}
      t={t}
      title={t('coach.goal.title')}
      lead={t('coach.goal.lead')}
      footer={
        <>
          <button type="button" onClick={onBack}>
            {editing ? t('coach.cancel') : t('coach.back')}
          </button>
          <button
            type="button"
            className="primary"
            disabled={!selected}
            title={selected ? undefined : t('coach.goal.choose')}
            onClick={() => onChoose(key, key === 'changes' ? { chordSet } : {})}
          >
            {t('coach.next')}
          </button>
        </>
      }
    >
      <Field id="coach-goal-text" label={t('coach.goal.input')}>
        <input
          id="coach-goal-text"
          type="text"
          dir="auto"
          value={text}
          placeholder={t('coach.goal.placeholder')}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
        />
      </Field>
      {text.trim() && (
        <div className="coach-suggest" aria-live="polite">
          <span className="coach-subhead">{t('coach.goal.suggest')}</span>
          {matches.length ? (
            <div className="coach-chips">
              {matches.map(({ goal }) => (
                <button
                  key={goal.key}
                  type="button"
                  className={'coach-chip' + (key === goal.key ? ' is-on' : '')}
                  aria-pressed={key === goal.key}
                  onClick={() => setKey(goal.key)}
                >
                  <span aria-hidden="true">{goal.icon}</span>
                  {pick(goal.title, lang)}
                </button>
              ))}
            </div>
          ) : (
            <p className="coach-note">{t('coach.goal.noMatch')}</p>
          )}
        </div>
      )}
      {selected?.key === 'changes' && (
        <Field id="coach-chordset" label={t('coach.goal.chordSet')}>
          <select id="coach-chordset" value={chordSet} onChange={(e) => setChordSet(e.target.value)} dir="ltr">
            {CHORD_SETS.map((s) => (
              <option key={s.key} value={s.key}>
                {pick(s.label, lang)}
              </option>
            ))}
          </select>
        </Field>
      )}
      <span className="coach-subhead">{t('coach.goal.forYou')}</span>
      <div className="coach-goals">
        {forYou.map((g) => (
          <GoalCard key={g.key} goal={g} selected={key === g.key} onSelect={() => setKey(g.key)} lang={lang} t={t} />
        ))}
      </div>
      {others.length > 0 && (
        <>
          <span className="coach-subhead">{t('coach.goal.others')}</span>
          <div className="coach-goals">
            {others.map((g) => (
              <GoalCard key={g.key} goal={g} selected={key === g.key} onSelect={() => setKey(g.key)} lang={lang} t={t} />
            ))}
          </div>
        </>
      )}
    </WizardFrame>
  );
}

function PlacementStep({ coach, g, goal, onBack, lang, t }) {
  const tests = useMemo(() => placementTests(goal, g.params), [goal, g.params]);
  const running = coach.running;
  const now = useNow(!!running);
  // A failed "stop if failed" test skips every test after it.
  let stopAt = Infinity;
  tests.forEach((test, i) => {
    if (stopAt === Infinity && test.stopIfFailed && g.placement?.[i]?.status === 'failed') stopAt = i;
  });
  return (
    <WizardFrame
      step={4}
      total={5}
      t={t}
      title={t('coach.place.title')}
      lead={t('coach.place.lead')}
      footer={
        <>
          <button type="button" onClick={onBack}>
            {t('coach.back')}
          </button>
          <button type="button" className="primary" onClick={coach.finishPlacement}>
            {t('coach.place.plan')}
          </button>
        </>
      }
    >
      <div className="coach-goal-banner">
        <span aria-hidden="true">{goal.icon}</span>
        <strong>{pick(goal.title, lang)}</strong>
      </div>
      <ol className="coach-tests">
        {tests.map((test, i) => {
          const id = `placement:${g.id}:${i}`;
          const rec = g.placement?.[i];
          const auto = i > stopAt && !rec;
          const isRunning = running?.blockId === id;
          const block = { id, title: test.title, how: test.how, launch: test.launch, measure: test.measure, minutes: test.launch?.tool === 'minuteChanges' ? 1 : 2 };
          const start = () => coach.startBlock(block, { kind: 'placement', placementIndex: i, placementTotal: tests.length, goalId: g.id });
          let status;
          if (isRunning) status = <span className="coach-status is-running">{t('coach.place.running')} · {clock(now - running.startedAt)}</span>;
          else if (auto) status = <span className="coach-status">{t('coach.place.autoSkipped')}</span>;
          else if (rec?.status === 'skipped') status = <span className="coach-status">{t('coach.place.skipped')}</span>;
          else if (rec?.status === 'failed') status = <span className="coach-status is-missed">{t('coach.place.failed')}</span>;
          else if (rec?.status === 'done' && rec.result?.met === true) status = <span className="coach-status is-met">{t('coach.place.passed')}</span>;
          else if (rec?.status === 'done') status = <span className="coach-status is-met">{t('coach.place.measured')}</span>;
          else if (!rec) status = <span className="coach-status">{t('coach.place.pending')}</span>;
          const live = isRunning ? running.result : null;
          const result = rec?.result ?? live;
          const target = formatTarget(test.measure, t);
          return (
            <li key={id} className={'coach-test' + (isRunning ? ' is-running' : '') + (auto || rec?.status === 'skipped' ? ' is-muted' : '')}>
              <span className="coach-test-num">{i + 1}</span>
              <div className="coach-test-main">
                <div className="coach-test-head">
                  <strong>{pick(test.title, lang)}</strong>
                  {status}
                </div>
                <p className="coach-how">{pick(test.how, lang)}</p>
                <div className="coach-test-meta">
                  {target && <span className="coach-target">{t('coach.place.target', { target })}</span>}
                  <ResultBadge measure={test.measure} result={result} t={t} />
                  {isRunning && !result && <span className="coach-note">{t('coach.place.waiting')}</span>}
                </div>
              </div>
              {!auto && (
                <div className="coach-test-actions">
                  <button type="button" className={rec || isRunning ? '' : 'primary'} onClick={start}>
                    {rec?.result ? t('coach.place.retry') : t('coach.place.start')}
                  </button>
                  {!rec && !isRunning && (
                    <button type="button" onClick={() => coach.skipPlacement(i)}>
                      {t('coach.place.skip')}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </WizardFrame>
  );
}

function Ladder({ goal, g, rungIndex, lang, t, compact }) {
  return (
    <ol className={'coach-ladder' + (compact ? ' is-compact' : '')}>
      {goal.rungs.map((r, i) => {
        const reached = i < rungIndex;
        const now = i === rungIndex;
        const log = g.rungLog?.find((x) => x.rung === i);
        return (
          <li key={i} className={reached ? 'is-reached' : now ? 'is-now' : 'is-next'} aria-current={now ? 'step' : undefined}>
            <span className="coach-ladder-mark">{reached ? <Check /> : i + 1}</span>
            <span className="coach-ladder-text">
              <span className="coach-ladder-label">{pick(r.label, lang)}</span>
              {reached && log && <span className="coach-ladder-date">{t('coach.ladderReached', { date: formatDate(log.at, lang, { day: 'numeric', month: 'short' }) })}</span>}
              {now && <span className="coach-ladder-now">{t('coach.ladderNow')}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function SessionShape({ intake, t }) {
  const tpl = sessionTemplate(intake?.minutesPerDay);
  const parts = PARTS.filter((p) => tpl[p] > 0);
  return (
    <div className="coach-shape">
      <div className="coach-shape-bar" aria-hidden="true">
        {parts.map((p) => (
          <span key={p} className={`coach-part-${p}`} style={{ flexGrow: tpl[p] }} />
        ))}
      </div>
      <ul className="coach-shape-legend">
        {parts.map((p) => (
          <li key={p}>
            <span className={`coach-swatch coach-part-${p}`} aria-hidden="true" />
            <span className="coach-shape-name">{t(`coach.part.${p}`)}</span>
            <span className="coach-shape-min">{t('coach.min', { n: tpl[p] })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlanStep({ coach, state, g, goal, onBack, onOtherGoal, lang, t }) {
  const perf = useMemo(() => loadPerf(), [coach.perfVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const ri = currentRungIndex(goal, g.params, perf);
  const done = ri >= goal.rungs.length;
  const est = estimateTime(goal, ri, state.intake);
  return (
    <WizardFrame
      step={5}
      total={5}
      t={t}
      title={t('coach.plan.title')}
      footer={
        <>
          {done ? (
            <button type="button" className="primary" onClick={onOtherGoal}>
              {t('coach.plan.otherGoal')}
            </button>
          ) : (
            <button type="button" onClick={onBack}>
              {t('coach.back')}
            </button>
          )}
          {!done && (
            <button type="button" className="primary" onClick={coach.acceptPlan}>
              {t('coach.plan.start')}
            </button>
          )}
        </>
      }
    >
      <div className="coach-goal-banner">
        <span aria-hidden="true">{goal.icon}</span>
        <strong>{pick(goal.title, lang)}</strong>
      </div>
      {done ? (
        <p className="coach-lead">{t('coach.plan.done')}</p>
      ) : (
        <div className="coach-plan">
          <div className="coach-panel">
            <span className="coach-eyebrow">{t('coach.plan.nowLabel')}</span>
            <p className="coach-big">{t('coach.plan.now', { n: ri + 1, total: goal.rungs.length })}</p>
            <Ladder goal={goal} g={g} rungIndex={ri} lang={lang} t={t} compact />
          </div>
          <div className="coach-panel">
            <span className="coach-eyebrow">{t('coach.plan.time')}</span>
            <p className="coach-big">{est.low === est.high && est.low <= 1 ? t('coach.plan.weeksOne', { n: est.low }) : t('coach.plan.weeks', { low: est.low, high: est.high })}</p>
            <p className="coach-target-date">{t('coach.plan.target', { date: formatDate(est.date, lang) })}</p>
            <p className="coach-note">{t('coach.plan.basis', { minutes: state.intake?.minutesPerDay ?? 20, days: state.intake?.daysPerWeek ?? 5 })}</p>
            <span className="coach-eyebrow coach-eyebrow-gap">{t('coach.plan.session')}</span>
            <SessionShape intake={state.intake} t={t} />
          </div>
        </div>
      )}
    </WizardFrame>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function Header({ coach, state, g, goal, status, est, profileName, onEdit, onGoal, lang, t }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <header className="coach-card coach-header">
      <div className="coach-header-main">
        <span className="coach-header-icon" aria-hidden="true">
          {goal.icon}
        </span>
        <div className="coach-header-text">
          <span className="coach-eyebrow" dir="auto">
            {profileName ? t('coach.planOf', { name: profileName }) : t('coach.planYours')}
          </span>
          <h1 className="coach-header-title">{pick(goal.title, lang)}</h1>
          <div className="coach-header-meta">
            <span className={`coach-pill is-${status}`}>{t(`coach.status.${status}`)}</span>
            {g.status !== 'done' && <span className="coach-header-date">{t('coach.targetDate', { date: formatDate(est.date, lang) })}</span>}
          </div>
        </div>
      </div>
      <div className="coach-header-actions">
        {confirm ? (
          <div className="coach-confirm" role="alertdialog" aria-label={t('coach.resetConfirm')}>
            <span>{t('coach.resetConfirm')}</span>
            <div className="coach-confirm-buttons">
              <button
                type="button"
                className="danger"
                onClick={() => {
                  setConfirm(false);
                  coach.resetCoach();
                }}
              >
                {t('coach.reset')}
              </button>
              <button type="button" onClick={() => setConfirm(false)}>
                {t('coach.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button type="button" onClick={onEdit}>
              {t('coach.edit')}
            </button>
            <button type="button" onClick={onGoal}>
              {t('coach.newGoal')}
            </button>
            <button type="button" onClick={() => setConfirm(true)}>
              {t('coach.reset')}
            </button>
          </>
        )}
      </div>
    </header>
  );
}

function BlockRow({ block, coach, running, now, lang, t }) {
  const isRunning = running?.blockId === block.id;
  const elapsed = isRunning ? now - running.startedAt : 0;
  const manual = !block.launch;
  const left = block.minutes * 60000 - elapsed;
  const result = isRunning ? running.result : block.result;
  const target = formatTarget(block.measure, t);
  const done = () =>
    coach.markBlockDone(block.id, {
      spentMin: isRunning ? Math.max(1, Math.round(elapsed / 60000)) : block.minutes,
      result: isRunning ? running.result ?? null : block.result ?? null,
    });
  return (
    <li className={'coach-block' + (block.done ? ' is-done' : '') + (isRunning ? ' is-running' : '')}>
      <div className="coach-block-main">
        <div className="coach-block-head">
          <span className={`coach-kind is-${block.kind}`}>{t(`coach.kind.${block.kind}`)}</span>
          <strong className="coach-block-title">{pick(block.title, lang)}</strong>
          <span className="coach-block-min">{t('coach.min', { n: block.minutes })}</span>
        </div>
        <p className="coach-how">{pick(block.how, lang)}</p>
        <div className="coach-block-meta">
          {block.done && (
            <span className="coach-done-tag">
              <Check /> {t('coach.blockFinished')}
            </span>
          )}
          {target && <span className="coach-target">{t('coach.target', { target })}</span>}
          {block.metronomeBpm && <span className="coach-target">{t('coach.metronomeAt', { bpm: block.metronomeBpm })}</span>}
          <ResultBadge measure={block.measure} result={result} t={t} />
          {isRunning && manual && (
            <span className={'coach-countdown' + (left <= 0 ? ' is-over' : '')} aria-live="off">
              {left > 0 ? clock(left) : t('coach.timeUp')}
            </span>
          )}
          {isRunning && !manual && (
            <span className="coach-status is-running">
              {t('coach.blockRunning')} · {clock(elapsed)}
            </span>
          )}
        </div>
      </div>
      <div className="coach-block-actions">
        {block.done ? (
          <button type="button" className="quiet" onClick={() => coach.undoBlock(block.id)}>
            {t('coach.blockUndo')}
          </button>
        ) : isRunning ? (
          <>
            {!manual && (
              <button type="button" onClick={() => coach.startBlock(block)}>
                {t('coach.blockOpen')}
              </button>
            )}
            <button type="button" className="primary" onClick={done}>
              {t('coach.blockDone')}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="primary" onClick={() => coach.startBlock(block)}>
              {t('coach.blockStart')}
            </button>
            <button type="button" onClick={done}>
              {t('coach.blockDone')}
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function TodayCard({ coach, today, lang, t }) {
  const running = coach.running;
  const now = useNow(!!running);
  const blocks = today?.blocks ?? [];
  const total = blocks.reduce((s, b) => s + (b.minutes ?? 0), 0);
  const doneMin = blocks.filter((b) => b.done).reduce((s, b) => s + (b.minutes ?? 0), 0);
  const allDone = blocks.length > 0 && blocks.every((b) => b.done);
  return (
    <section className="coach-card coach-today">
      <div className="coach-card-head">
        <div>
          <h2>{t('coach.today')}</h2>
          <span className="coach-card-meta">{t('coach.todayMeta', { done: doneMin, total })}</span>
        </div>
        <button type="button" onClick={coach.regenerateToday} title={t('coach.regenerateHint')}>
          {t('coach.regenerate')}
        </button>
      </div>
      <div className="coach-progressbar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={doneMin}>
        <span style={{ width: `${total ? (doneMin / total) * 100 : 0}%` }} />
      </div>
      {allDone && <p className="coach-celebrate">{t('coach.sessionDone')}</p>}
      <ol className="coach-blocks">
        {blocks.map((b) => (
          <BlockRow key={b.id} block={b} coach={coach} running={running} now={now} lang={lang} t={t} />
        ))}
      </ol>
    </section>
  );
}

function ProgressCard({ g, goal, perf, rungIndex, lang, t }) {
  const points = useMemo(() => dailySeries(goal, g.params, perf), [goal, g.params, perf]);
  const unit = pick(seriesUnit(goal), lang);
  const fmt = seriesFormat(goal, t);
  const last = points[points.length - 1];
  return (
    <section className="coach-card coach-progress">
      <div className="coach-card-head">
        <div>
          <h2>{t('coach.progress')}</h2>
          <span className="coach-card-meta">{unit}</span>
        </div>
      </div>
      {points.length >= 2 ? (
        <ProgressChart
          points={points}
          targets={seriesTargets(goal)}
          format={fmt}
          lang={lang}
          label={t('coach.chartLabel', { unit, n: points.length, value: fmt(last.value) })}
        />
      ) : (
        <div className="coach-empty">{t('coach.progressEmpty')}</div>
      )}
      <span className="coach-subhead">{t('coach.ladder')}</span>
      <Ladder goal={goal} g={g} rungIndex={rungIndex} lang={lang} t={t} />
    </section>
  );
}

function WeakCard({ perf, lang, t }) {
  const weak = useMemo(() => findWeaknesses(perf), [perf]);
  return (
    <section className="coach-card coach-weak">
      <div className="coach-card-head">
        <h2>{t('coach.weak')}</h2>
      </div>
      {weak.length ? (
        <ul className="coach-weak-list">
          {weak.map((w) => (
            <li key={w.key}>
              <strong>{pick(w.title, lang)}</strong>
              <p className="coach-weak-detail">{pick(w.detail, lang)}</p>
              <p className="coach-weak-remedy">
                <span className="coach-eyebrow">{t('coach.weakRemedy')}</span>
                {pick(w.remedy, lang)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="coach-empty">{t('coach.weakEmpty')}</div>
      )}
    </section>
  );
}

function WeekCard({ state, perf, lang, t }) {
  const days = useMemo(() => minutesByDay(state, perf, 14), [state, perf]);
  const plan = state.intake?.minutesPerDay ?? 20;
  const max = Math.max(plan, ...days.map((d) => d.minutes), 1);
  const last7 = days.slice(-7);
  const practised = last7.filter((d) => d.minutes > 0).length;
  const minutes7 = last7.reduce((s, d) => s + d.minutes, 0);
  const today = localDay();
  return (
    <section className="coach-card coach-week">
      <div className="coach-card-head">
        <div>
          <h2>{t('coach.week')}</h2>
          <span className="coach-card-meta">{t('coach.weekMeta')}</span>
        </div>
      </div>
      <div className="coach-bars" dir="ltr">
        <div className="coach-bars-area">
          <span className="coach-bars-plan" style={{ bottom: `${(plan / max) * 100}%` }} aria-hidden="true" />
          {days.map((d) => (
            <div
              key={d.day}
              className={'coach-bar' + (d.day === today ? ' is-today' : '')}
              title={`${formatDate(d.day, lang, { weekday: 'short', day: 'numeric', month: 'short' })}: ${t('coach.min', { n: d.minutes })}`}
            >
              <span style={{ height: d.minutes ? `${(d.minutes / max) * 100}%` : undefined }} className={d.minutes ? '' : 'is-zero'} />
            </div>
          ))}
        </div>
        <div className="coach-bars-labels" aria-hidden="true">
          {days.map((d) => (
            <span key={d.day} className={d.day === today ? 'is-today' : ''}>
              {formatDate(d.day, lang, { weekday: 'narrow' })}
            </span>
          ))}
        </div>
      </div>
      <div className="coach-week-stats">
        <span>
          <strong>{t('coach.weekDays', { n: practised, plan: state.intake?.daysPerWeek ?? 5 })}</strong>
        </span>
        <span className="coach-card-meta">{t('coach.weekMinutes', { n: minutes7 })}</span>
      </div>
    </section>
  );
}

function PairsCard({ g, goal, perf, rungIndex, lang, t }) {
  const stats = useMemo(() => pairStats(goal, g.params, perf), [goal, g.params, perf]);
  const target = goal.rungs[Math.min(rungIndex, goal.rungs.length - 1)].min;
  const top = Math.max(goal.rungs[goal.rungs.length - 1].min, ...stats.map((s) => s.best));
  return (
    <section className="coach-card coach-pairs">
      <div className="coach-card-head">
        <div>
          <h2>{t('coach.pairs')}</h2>
          <span className="coach-card-meta">{t('coach.pairsMeta')}</span>
        </div>
      </div>
      <ul className="coach-pair-list">
        {stats.map((s) => (
          <li key={s.key}>
            <span className="coach-pair-name" dir="ltr">
              {s.a} ↔ {s.b}
            </span>
            <div className="coach-pair-track" dir="ltr" aria-hidden="true">
              <span className="coach-pair-best" style={{ width: `${(s.best / top) * 100}%` }} />
              {s.latest != null && <span className={'coach-pair-latest' + (s.latest >= target ? ' is-met' : '')} style={{ width: `${(s.latest / top) * 100}%` }} />}
              <span className="coach-pair-target" style={{ left: `${(target / top) * 100}%` }} />
            </div>
            <span className="coach-pair-nums">
              {s.runs ? (
                <>
                  <span>
                    {t('coach.pairLatest')} <strong dir="ltr">{s.latest ?? '—'}</strong>
                  </span>
                  <span>
                    {t('coach.pairBest')} <strong dir="ltr">{s.best}</strong>
                  </span>
                </>
              ) : (
                <span>{t('coach.pairNone')}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Dashboard({ coach, state, g, goal, onEdit, onGoal, lang, t }) {
  const { active } = useProfiles();
  // Unnamed profile ("Me"): just "Your plan".
  const profileName = active?.name?.trim() || '';
  const perf = useMemo(() => loadPerf(), [coach.perfVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const rungIndex = useMemo(() => currentRungIndex(goal, g.params, perf), [goal, g.params, perf]);
  const est = estimateTime(goal, g.startRung ?? 0, state.intake, g.createdAt);
  const status = g.status === 'done' || rungIndex >= goal.rungs.length ? 'done' : scheduleStatus(g, goal, rungIndex, state.intake).status;
  const chordGoal = goal.measure === 'minuteChangesWeakestPair';

  // Today's session is built the first time the page is seen each day.
  const { ensureToday } = coach;
  const today = coach.today;
  useEffect(() => {
    if (!today) ensureToday();
  }, [today, ensureToday]);

  return (
    <div className="coach-grid">
      <Header coach={coach} state={state} g={g} goal={goal} status={status} est={est} profileName={profileName} onEdit={onEdit} onGoal={onGoal} lang={lang} t={t} />
      <TodayCard coach={coach} today={today} lang={lang} t={t} />
      <ProgressCard g={g} goal={goal} perf={perf} rungIndex={rungIndex} lang={lang} t={t} />
      <WeakCard perf={perf} lang={lang} t={t} />
      <WeekCard state={state} perf={perf} lang={lang} t={t} />
      {chordGoal ? <PairsCard g={g} goal={goal} perf={perf} rungIndex={rungIndex} lang={lang} t={t} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function CoachView() {
  const { t, lang } = useLanguage();
  const coach = useCoach();
  const { state } = coach;
  const g = activeGoal(state);
  const goal = g ? goalByKey(g.goalKey) : null;
  // 'welcome' | 'about' | 'goal' while editing or walking back; null = derived.
  const [override, setOverride] = useState(null);
  const hasPlan = !!(g && g.planSeen && goal);

  let mode;
  if (override) mode = override;
  else if (!state) mode = 'welcome';
  else if (!g || !goal) mode = 'goal';
  else if (g.status === 'placement') mode = 'placement';
  else if (!g.planSeen) mode = 'plan';
  else mode = 'dashboard';
  // Only the first walk-through shows step dots; from the dashboard it's an edit.
  const editing = hasPlan;

  // Scroll the section to the top on every wizard step.
  useEffect(() => {
    document.querySelector('.app-section-content')?.scrollTo?.({ top: 0 });
  }, [mode]);

  let body;
  if (mode === 'welcome') body = <WelcomeStep t={t} onNext={() => setOverride('about')} />;
  else if (mode === 'about')
    body = (
      <AboutStep
        t={t}
        editing={editing}
        initial={state?.intake}
        onBack={() => setOverride(editing ? null : 'welcome')}
        onDone={(intake) => {
          coach.setIntake(intake);
          setOverride(editing ? null : 'goal');
        }}
      />
    );
  else if (mode === 'goal')
    body = (
      <GoalStep
        t={t}
        lang={lang}
        editing={editing}
        intake={state?.intake}
        onBack={() => setOverride(editing ? null : 'about')}
        onChoose={(key, params) => {
          coach.chooseGoal(key, params);
          setOverride(null);
        }}
      />
    );
  else if (mode === 'placement') body = <PlacementStep coach={coach} g={g} goal={goal} lang={lang} t={t} onBack={() => setOverride('goal')} />;
  else if (mode === 'plan')
    body = (
      <PlanStep
        coach={coach}
        state={state}
        g={g}
        goal={goal}
        lang={lang}
        t={t}
        onBack={coach.reopenPlacement}
        onOtherGoal={() => setOverride('goal')}
      />
    );
  else body = <Dashboard coach={coach} state={state} g={g} goal={goal} lang={lang} t={t} onEdit={() => setOverride('about')} onGoal={() => setOverride('goal')} />;

  return (
    <div className={'coach-view' + (mode === 'dashboard' ? ' is-dashboard' : ' is-wizard')} dir={lang === 'he' ? 'rtl' : 'ltr'}>
      {body}
    </div>
  );
}
