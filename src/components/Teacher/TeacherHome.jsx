// The teacher as ONE screen (flow review 2026-11-06, user: "Today / Goal /
// Path is unclear"; mockup canvas https://claude.ai/artifact/DvZN2huEHUCDtC7FpUTrvJ):
// one primary card (the next lesson, or the student's goal), then quiet rows —
// progress (-> the path), today's practice (only when there is some), the goal,
// achievements. A goal can be a SKILL (the old Coach plan) or a SPECIFIC SOLO
// from the GuitarPro library: the teacher splits it into its sections, follows
// their mastery from the perf log and opens the weakest one at its tempo.
import { useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import { LESSONS, LEVELS } from '../../teacher/curriculum/guitar';
import { nextLesson, openHomework } from '../../teacher/mastery';
import { setTeacherGoal } from '../../teacher/teacherState';
import { loadPerf } from '../../coach/perfLog';
import { launch } from '../../coach/launchBus';
import { sectionMastery, weakestSection } from '../../music/lickTrainer/practiceModes';
import { soloSection } from '../../music/lickTrainer/library';
import { LibraryRow } from '../PracticeView/PracticeHome';
import { HomeworkList } from './LessonPlayer';
import '../PracticeView/PracticeHome.css';

const L = (en, he) => ({ en, he });

// ---- what the student is on ---------------------------------------------------

export function levelProgress(state) {
  const next = nextLesson(state);
  const lvl = next?.level ?? LEVELS[LEVELS.length - 1].n;
  const written = LESSONS.filter((l) => l.level === lvl && l.steps);
  const done = written.filter((l) => state.lessons[l.id]?.done).length;
  const at = next ? Math.max(1, written.findIndex((l) => l.id === next.id) + 1) : written.length;
  return { level: lvl, at, of: written.length, share: written.length ? done / written.length : 1, next };
}

/** The goal row shows once level 0 is behind (or at once for players, or when a goal exists). */
export function goalVisible(state, coachGoal) {
  if (state.goal || coachGoal) return true;
  const exp = state.intake?.experience;
  if (exp === 'some' || exp === 'lot') return true;
  return LESSONS.filter((l) => l.level === 0 && l.steps).every((l) => state.lessons[l.id]?.done);
}

// ---- a solo goal ---------------------------------------------------------------

const round5 = (v) => Math.round(v / 5) * 5;

function techniquesOf(notes) {
  const has = (f) => notes.some(f);
  return {
    bend: has((n) => n.technique === 'bend' || n.technique === 'release' || n.bend),
    tap: has((n) => n.technique === 'tap'),
    legato: has((n) => n.technique === 'hammer' || n.technique === 'pull'),
    vibrato: has((n) => n.vibrato),
  };
}

/** Everything the solo plan shows, from the perf log. */
export function soloPlan(solo, goal) {
  const target = goal?.target ?? 100;
  const n = solo.sections?.length ?? 0;
  const mastery = n ? sectionMastery(loadPerf(), solo.id, n) : [];
  const mastered = mastery.filter((m) => m.status === 'mastered').length;
  const weak = n ? weakestSection(mastery) : null;
  const tempoOf = (m) => (m.status === 'mastered' ? target : Math.min(target, Math.max(50, round5(m.topTempo ?? 60))));
  const sec = weak != null ? { index: weak, tempo: tempoOf(mastery[weak]), tech: techniquesOf(soloSection(solo, weak).notes) } : null;
  const whole = { tempo: n && mastered === n ? target : Math.min(target, 80) };
  return { n, mastery, mastered, sec, whole, target, tempoOf };
}

const titleOf = (solo, lang) => localize(solo?.title, lang) ?? '';

// ---- the screens ----------------------------------------------------------------

function Bar({ mastery }) {
  return (
    <span className="tc-secbar" aria-hidden="true">
      {mastery.map((m) => (
        <span key={m.index} className={'is-' + m.status} />
      ))}
    </span>
  );
}

function Hero({ eyebrow, title, meta, children, action, onAction, tone }) {
  return (
    <div className={'tc-card tc-hero' + (tone ? ' is-' + tone : '')}>
      <span className="tc-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {meta && <span className="tc-meta">{meta}</span>}
      {children}
      {action && (
        <button type="button" className="tc-btn is-primary tc-hero-btn" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

export function TeacherHome({ state, tx, coachGoal, coachGoalTitle, gp, onOpen, onScreen, onPractise }) {
  const { t, lang } = useLanguage();
  const prog = levelProgress(state);
  const hw = openHomework(state);
  const soloGoal = state.goal?.kind === 'solo' ? state.goal : null;
  const solo = soloGoal ? gp?.solos?.find((s) => s.id === soloGoal.soloId) : null;
  const plan = useMemo(() => (solo ? soloPlan(solo, soloGoal) : null), [solo, soloGoal]);
  const showGoal = goalVisible(state, coachGoal);
  const next = prog.next;
  const nextSaved = next && state.lessons[next.id];
  const nextInProgress = nextSaved && !nextSaved.done && (nextSaved.step ?? 0) > 0;
  const lessonMeta = next
    ? [t('teacher.next.level', { n: next.level, grade: '' }).replace(/\s*·\s*$/, ''), next.minutes ? t('teacher.next.min', { n: next.minutes }) : null]
        .filter(Boolean)
        .join(' · ')
    : '';

  let hero;
  if (solo && plan) {
    const s = plan.sec;
    hero = (
      <Hero
        tone="goal"
        eyebrow={tx(L('Your goal', 'היעד שלך'))}
        title={titleOf(solo, lang)}
        meta={tx(L(`${plan.mastered} of ${plan.n} sections mastered at full speed`, `${plan.mastered} מתוך ${plan.n} קטעים נשלטו במהירות מלאה`))}
        action={t('teacher.next.continue')}
        onAction={() => (s ? gp.openSolo(solo.id, s.index, s.tempo) : gp.openSolo(solo.id, -1, plan.whole.tempo))}
      >
        {plan.n > 0 && <Bar mastery={plan.mastery} />}
        <p className="tc-text">
          {s
            ? tx(
                L(
                  `Today: ${localize(solo.sections[s.index].label, 'en')} at ${s.tempo}%, then the whole solo.`,
                  `היום: ${localize(solo.sections[s.index].label, 'he')} ב־${s.tempo}%, ואז כל הסולו.`
                )
              )
            : tx(L(`Today: the whole solo at ${plan.whole.tempo}%.`, `היום: כל הסולו ב־${plan.whole.tempo}%.`))}
        </p>
      </Hero>
    );
  } else if (coachGoal && showGoal) {
    hero = (
      <Hero tone="goal" eyebrow={tx(L('Your goal', 'היעד שלך'))} title={coachGoalTitle} action={t('teacher.next.continue')} onAction={() => onScreen('skillGoal')}>
        <p className="tc-text">{t('teacher.goal.open')}</p>
      </Hero>
    );
  } else if (next) {
    hero = (
      <Hero
        eyebrow={t('teacher.next.label')}
        title={tx(next.title)}
        meta={lessonMeta + (nextInProgress ? ' · ' + t('teacher.next.step', { n: (nextSaved.at ?? 0) + 1, m: next.steps.length }) : '')}
        action={next.steps ? (nextInProgress ? t('teacher.next.continue') : t('teacher.next.start')) : null}
        onAction={() => onOpen(next)}
      >
        {next.objective && <p className="tc-text">{tx(next.objective)}</p>}
        {!next.steps && <p className="tc-hint">{t('teacher.next.soon')}</p>}
      </Hero>
    );
  } else {
    hero = (
      <div className="tc-card tc-hero">
        <p className="tc-text">{t('teacher.next.allDone')}</p>
      </div>
    );
  }
  const goalHero = (solo && plan) || (coachGoal && showGoal);
  const levelName = tx(LEVELS.find((l) => l.n === prog.level)?.title);

  return (
    <>
      {hero}

      <div className="ph-group">
        <button type="button" className="ph-row tc-progress-row" onClick={() => onScreen('path')}>
          <span className="ph-tile" style={{ background: '#34c759' }} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 18c4 0 4-12 8-12s4 12 8 12" />
            </svg>
          </span>
          <span className="ph-text">
            <span className="ph-title">{tx(L('My progress', 'ההתקדמות שלי'))}</span>
            <span className="ph-desc">
              {tx(L(`Level ${prog.level} · ${levelName} · lesson ${prog.at} of ${prog.of}`, `רמה ${prog.level} · ${levelName} · שיעור ${prog.at} מתוך ${prog.of}`))}
            </span>
            <span className="tc-pbar" aria-hidden="true">
              <span style={{ width: Math.round(prog.share * 100) + '%' }} />
            </span>
          </span>
          <span className="ph-chev" aria-hidden="true">
            <svg viewBox="0 0 8 14" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1.5 1.5L6.5 7l-5 5.5" />
            </svg>
          </span>
        </button>
        {goalHero && next?.steps && (
          <LibraryRow color="#007aff" icon="teacher" title={tx(next.title)} desc={tx(L('Next lesson', 'השיעור הבא'))} onClick={() => onOpen(next)} />
        )}
      </div>

      {hw.length > 0 && (
        <div className="tc-section">
          <span className="tc-section-head">{tx(L('Today’s practice', 'התרגול של היום'))}</span>
          <div className="tc-card">
            <HomeworkList items={hw} tx={tx} onPractise={onPractise} />
          </div>
        </div>
      )}

      <div className="ph-group">
        {solo && <LibraryRow color="#ff9500" icon="path" title={tx(L('The solo plan', 'תוכנית הסולו'))} desc={tx(L('Sections, tempos, today’s session', 'קטעים, מהירויות, האימון של היום'))} onClick={() => onScreen('soloPlan')} />}
        {!solo && coachGoal && showGoal && <LibraryRow color="#ff9500" icon="path" title={tx(L('My goal', 'היעד שלי'))} desc={coachGoalTitle} onClick={() => onScreen('skillGoal')} />}
        {!solo && !coachGoal && showGoal && (
          <LibraryRow
            color="#ff9500"
            icon="path"
            title={tx(L('My goal', 'היעד שלי'))}
            desc={tx(L('A solo, a song or a skill — the teacher builds the way there', 'סולו, שיר או מיומנות — המורה בונה את הדרך אליו'))}
            onClick={() => onScreen('goal')}
          />
        )}
        <LibraryRow color="#af52de" icon="studies" title={t('teacher.rewards.title')} desc={t('teacher.rewards.text')} onClick={() => onScreen('rewards')} />
      </div>
    </>
  );
}

/** The path: lessons only, one mark each. */
export function PathList({ state, tx, onOpen }) {
  const now = nextLesson(state);
  return (
    <div className="tc-pathlist">
      {LEVELS.map((lv) => {
        const lessons = LESSONS.filter((l) => l.level === lv.n);
        const written = lessons.filter((l) => l.steps);
        const soon = lessons.length - written.length;
        if (!lessons.length) return null;
        return (
          <div key={lv.n} className="tc-section">
            <span className="tc-section-head">{tx(L(`Level ${lv.n} · `, `רמה ${lv.n} · `))}{tx(lv.title)}</span>
            {written.length > 0 && (
              <div className="ph-group">
                {written.map((l) => {
                  const done = !!state.lessons[l.id]?.done;
                  const isNow = now?.id === l.id;
                  const saved = state.lessons[l.id];
                  return (
                    <button key={l.id} type="button" className={'ph-row tc-path-row' + (isNow ? ' is-now' : '') + (done ? ' is-done' : '')} onClick={() => onOpen(l)}>
                      <span className="tc-mark" aria-hidden="true">
                        {done ? '✓' : isNow ? <span /> : ''}
                      </span>
                      <span className="ph-text">
                        <span className="ph-title">{tx(l.title)}</span>
                        {isNow && (
                          <span className="ph-desc tc-now">
                            {tx(L('Now', 'עכשיו'))}
                            {saved && !saved.done && (saved.step ?? 0) > 0 ? tx(L(` · step ${(saved.at ?? 0) + 1} of ${l.steps.length}`, ` · צעד ${(saved.at ?? 0) + 1} מתוך ${l.steps.length}`)) : ''}
                          </span>
                        )}
                      </span>
                      <span className="ph-chev" aria-hidden="true">
                        <svg viewBox="0 0 8 14" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1.5 1.5L6.5 7l-5 5.5" />
                        </svg>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {soon > 0 && <span className="tc-soon">{tx(L(`${soon} more lesson${soon > 1 ? 's' : ''} on the way`, soon > 1 ? `ועוד ${soon} שיעורים בדרך` : 'ועוד שיעור אחד בדרך'))}</span>}
          </div>
        );
      })}
    </div>
  );
}

/** "What do you want to play?" — a solo / song, or a skill. */
export function GoalPick({ tx, hasSolos, onSolo, onSkill }) {
  return (
    <>
      <p className="tc-text">{tx(L('The teacher builds the way to your goal and fits each day’s practice to it.', 'המורה בונה את הדרך ליעד ומתאים אליו את האימון של כל יום.'))}</p>
      <div className="ph-group">
        {hasSolos && <LibraryRow color="#ff3b30" icon="guitarpro" title={tx(L('A specific solo or song', 'סולו או שיר מסוים'))} desc={tx(L('From your GuitarPro library', 'מספריית ה־GuitarPro שלך'))} onClick={onSolo} />}
        <LibraryRow color="#5856d6" icon="practice" title={tx(L('A skill', 'מיומנות'))} desc={tx(L('Changes, barre, pentatonic, bends, speed…', 'החלפות, ברה, פנטטוני, כפיפות, מהירות…'))} onClick={onSkill} />
      </div>
    </>
  );
}

const TARGETS = [100, 90, 80];

/** Choose the solo + the target tempo. */
export function SoloGoalForm({ tx, solos, initial, onDone }) {
  const { lang } = useLanguage();
  const [soloId, setSoloId] = useState(initial?.soloId ?? solos[0]?.id ?? '');
  const [target, setTarget] = useState(initial?.target ?? 100);
  return (
    <>
      <p className="tc-text">
        {tx(
          L(
            'The teacher splits the solo into sections, follows each one, and every day opens the weakest at the right tempo. New file? Import it in GuitarPro first.',
            'המורה מחלק את הסולו לקטעים, עוקב אחרי כל אחד, וכל יום פותח את החלש במהירות המתאימה. קובץ חדש? ייבא אותו קודם ב־GuitarPro.'
          )
        )}
      </p>
      <div className="tc-card tc-form">
        <label className="tc-field">
          <span>{tx(L('The solo', 'הסולו'))}</span>
          <select value={soloId} onChange={(e) => setSoloId(e.target.value)}>
            {solos.map((s) => (
              <option key={s.id} value={s.id}>
                {titleOf(s, lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="tc-field">
          <span>{tx(L('Target tempo', 'מהירות יעד'))}</span>
          <select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
            {TARGETS.map((v) => (
              <option key={v} value={v}>
                {v === 100 ? tx(L('100% — the original', '100% — המקורית')) : v + '%'}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        className="tc-btn is-primary tc-wide"
        disabled={!soloId}
        onClick={() => {
          setTeacherGoal({ kind: 'solo', soloId, target });
          onDone();
        }}
      >
        {tx(L('Build', 'בנה'))}
      </button>
    </>
  );
}

/** The solo plan: sections + today's session. */
export function SoloPlan({ tx, solo, goal, gp, onChange }) {
  const { lang } = useLanguage();
  const plan = soloPlan(solo, goal);
  const s = plan.sec;
  const label = (k) => localize(solo.sections[k].label, lang);
  const steps = [];
  if (s?.tech.bend)
    steps.push({
      title: tx(L('Warm-up: bends that land on the note', 'חימום: כפיפות שנוחתות על הצליל')),
      meta: tx(L('the section has bends', 'בקטע יש כפיפות')),
      go: () => launch({ tool: 'bending' }),
    });
  if (s)
    steps.push({
      title: tx(L(`${label(s.index)} on a loop, from ${s.tempo}%`, `${label(s.index)} בלולאה, מ־${s.tempo}%`)),
      meta: tx(L('the weakest section', 'הקטע החלש')),
      go: () => gp.openSolo(solo.id, s.index, s.tempo),
    });
  steps.push({
    title: tx(L(`The whole solo at ${plan.whole.tempo}%`, `כל הסולו ב־${plan.whole.tempo}%`)),
    meta: tx(L('with the band', 'עם הלהקה')),
    go: () => gp.openSolo(solo.id, -1, plan.whole.tempo),
  });
  const st = {
    mastered: L('mastered', 'נשלט'),
    close: L('close', 'קרוב'),
    weak: L('needs work', 'צריך עבודה'),
    none: L('not yet', 'עוד לא'),
  };
  return (
    <>
      <span className="tc-meta">
        {tx(L(`Target ${plan.target}% · ${plan.mastered} of ${plan.n} sections mastered`, `יעד ${plan.target}% · ${plan.mastered} מתוך ${plan.n} קטעים נשלטו`))}
      </span>
      <div className="tc-section">
        <span className="tc-section-head">{tx(L('Today’s session', 'האימון של היום'))}</span>
        <div className="ph-group">
          {steps.map((x, k) => (
            <button key={k} type="button" className="ph-row tc-step-row" onClick={x.go}>
              <span className="tc-step-n" aria-hidden="true">
                {k + 1}
              </span>
              <span className="ph-text">
                <span className="ph-title">{x.title}</span>
                <span className="ph-desc">{x.meta}</span>
              </span>
              <span className="tc-go">{tx(L('Go', 'קדימה'))}</span>
            </button>
          ))}
        </div>
      </div>
      {plan.n > 0 && (
        <div className="tc-section">
          <span className="tc-section-head">{tx(L('The sections', 'הקטעים'))}</span>
          <div className="ph-group">
            {plan.mastery.map((m) => (
              <button key={m.index} type="button" className={'ph-row tc-path-row is-' + m.status + (s?.index === m.index ? ' is-now' : '')} onClick={() => gp.openSolo(solo.id, m.index, plan.tempoOf(m))}>
                <span className="tc-mark" aria-hidden="true">
                  {m.status === 'mastered' ? '✓' : s?.index === m.index ? <span /> : ''}
                </span>
                <span className="ph-text">
                  <span className="ph-title">{label(m.index)}</span>
                  <span className="ph-desc">
                    {tx(st[m.status])}
                    {m.best != null ? tx(L(` · best ${m.best}`, ` · שיא ${m.best}`)) : ''}
                  </span>
                </span>
                <span className="tc-tempo" dir="ltr">
                  {m.topTempo != null ? m.topTempo + '%' : '—'}
                </span>
              </button>
            ))}
          </div>
          <span className="tc-soon">
            {tx(L('“Mastered” = a score of 85+ at full speed.', '„נשלט” = ציון 85 ומעלה במהירות מלאה.'))}
          </span>
        </div>
      )}
      <div className="tc-goal-actions">
        <button type="button" className="tc-btn" onClick={onChange}>
          {tx(L('Change', 'שנה'))}
        </button>
        <button type="button" className="tc-btn tc-danger" onClick={() => setTeacherGoal(null)}>
          {tx(L('Remove', 'הסר'))}
        </button>
      </div>
    </>
  );
}
