import { useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useCoach } from '../../coach/useCoach';
import { localDay } from '../../coach/perfLog';
import { useChallengesVersion, rerollToday, startChallenge } from '../../coach/useChallenges';
import { getRewards } from '../../coach/useAchievements';
import { XP } from '../../coach/achievements';
import { pick, formatDate } from '../Coach/coachFormat';
import './RewardsView.css';

// The Coach page's "Rewards" view: level + XP, streak, today's three
// challenges (one swap a day), this week's challenge and the achievements
// grid. Everything is computed from the performance log (src/coach/*); this
// file only draws it. Rendered inside .coach-view (shares its cards/buttons).

function Check({ size = 12 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

function Bar({ value, done, label }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={'rw-bar' + (done ? ' is-done' : '')} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

function LevelCard({ r, lang, t }) {
  const [how, setHow] = useState(false);
  const { level, into, need } = r.level;
  const s = r.streak;
  const total = r.achievements.length;
  return (
    <section className="coach-card rw-hero">
      <div className="rw-hero-level">
        <div className="rw-level-badge" aria-hidden="true">
          <span>{level}</span>
        </div>
        <div className="rw-level-text">
          <span className="coach-eyebrow">{t('achieve.xpTotal', { n: r.xp })}</span>
          <h2>{t('achieve.level', { n: level })}</h2>
          <Bar value={into / need} label={t('achieve.xpOf', { into, need })} />
          <div className="rw-level-meta">
            <span dir="ltr">{t('achieve.xpOf', { into, need })}</span>
            {r.xpToday > 0 && <span className="rw-today-xp">{t('achieve.xpToday', { n: r.xpToday })}</span>}
          </div>
        </div>
      </div>
      <div className="rw-hero-stats">
        <div className="rw-stat">
          <span className="coach-eyebrow">{t('achieve.streak')}</span>
          <strong className={'rw-stat-big' + (s.current ? ' is-on' : '')}>
            {s.current ? (s.current === 1 ? t('achieve.streakDay') : t('achieve.streakDays', { n: s.current })) : t('achieve.streakNone')}
          </strong>
          <span className="rw-stat-note">{s.practisedToday ? t('achieve.streakKept') : t('achieve.streakToday')}</span>
          {s.best > 1 && <span className="rw-stat-note">{t('achieve.streakBest', { n: s.best })}</span>}
        </div>
        <div className="rw-stat">
          <span className="coach-eyebrow">{t('achieve.badges')}</span>
          <strong className="rw-stat-big">{t('achieve.badgesOf', { n: r.unlockedCount, total })}</strong>
          <span className="rw-stat-note">{t('achieve.gridMeta')}</span>
        </div>
      </div>
      <div className="rw-how">
        <button type="button" className="quiet rw-how-toggle" aria-expanded={how} onClick={() => setHow((v) => !v)}>
          {t('achieve.how')}
          <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" className={how ? 'is-open' : ''}>
            <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {how && <p className="coach-note rw-how-text">{t('achieve.howText')}</p>}
      </div>
    </section>
  );
}

function ChallengeRow({ c, canSwap, onSwap, lang, t }) {
  const done = c.status.done;
  return (
    <li className={'rw-ch' + (done ? ' is-done' : '')}>
      <div className="rw-ch-main">
        <div className="rw-ch-head">
          <span className="rw-tool">{t(`challenge.tool.${c.tool}`)}</span>
          {done && (
            <span className="rw-done-tag">
              <Check /> {t('challenge.done')}
            </span>
          )}
        </div>
        <strong className="rw-ch-title" dir="auto">
          {pick(c.title, lang)}
        </strong>
        <Bar value={c.status.progress} done={done} label={pick(c.title, lang)} />
      </div>
      {!done && (
        <div className="rw-ch-actions">
          {c.launch && (
            <button type="button" className="primary" onClick={() => startChallenge(c)}>
              {t('challenge.start')}
            </button>
          )}
          {canSwap && (
            <button type="button" className="quiet" onClick={onSwap} title={t('challenge.swapHint')}>
              {t('challenge.swap')}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function TodayChallenges({ ch, lang, t }) {
  const list = ch.today;
  const done = list.filter((c) => c.status.done).length;
  return (
    <section className="coach-card rw-today">
      <div className="coach-card-head">
        <div>
          <h2>{t('challenge.today')}</h2>
          <span className="coach-card-meta">{t('challenge.todayMeta', { done, total: list.length, xp: XP.DAILY })}</span>
        </div>
      </div>
      {done === list.length && list.length > 0 && <p className="coach-celebrate">{t('challenge.allDone')}</p>}
      <ol className="rw-ch-list">
        {list.map((c, i) => (
          <ChallengeRow key={c.id} c={c} canSwap={!ch.rerolled} onSwap={() => rerollToday(i)} lang={lang} t={t} />
        ))}
      </ol>
      {ch.rerolled && done < list.length && <p className="coach-note rw-swap-used">{t('challenge.swapUsed')}</p>}
    </section>
  );
}

function WeeklyChallenge({ ch, lang, t }) {
  const w = ch.weekly;
  if (!w) return null;
  const done = w.status.done;
  return (
    <section className={'coach-card rw-week' + (done ? ' is-done' : '')}>
      <div className="coach-card-head">
        <div>
          <h2>{t('challenge.week')}</h2>
          <span className="coach-card-meta">{t('challenge.weekMeta', { xp: XP.WEEKLY, date: formatDate(ch.weekEnd, lang, { weekday: 'short', day: 'numeric', month: 'short' }) })}</span>
        </div>
        {!done && <span className="rw-days-left">{ch.daysLeft > 0 ? t('challenge.daysLeft', { n: ch.daysLeft }) : t('challenge.dayLeft')}</span>}
      </div>
      <h3 className="rw-week-title">{pick(w.title, lang)}</h3>
      <ul className="rw-parts">
        {w.parts.map((p, i) => (
          <li key={i} className={p.done ? 'is-done' : ''}>
            <div className="rw-part-head">
              <span className="rw-part-mark" aria-hidden="true">
                {p.done ? <Check size={11} /> : i + 1}
              </span>
              <span className="rw-part-label" dir="auto">
                {pick(p.label, lang)}
              </span>
              <span className="rw-part-num" dir="ltr">
                {t('challenge.partOf', { value: Math.min(p.value ?? 0, p.need), need: p.need })}
              </span>
            </div>
            <Bar value={p.progress} done={p.done} label={pick(p.label, lang)} />
          </li>
        ))}
      </ul>
      {done ? (
        <p className="coach-celebrate">{t('challenge.weekDone')}</p>
      ) : (
        w.launch && (
          <div className="rw-week-actions">
            <button type="button" className="primary" onClick={() => startChallenge(w)}>
              {t('challenge.start')}
            </button>
          </div>
        )
      )}
    </section>
  );
}

function Achievements({ list, lang, t }) {
  return (
    <section className="coach-card rw-badges">
      <div className="coach-card-head">
        <div>
          <h2>{t('achieve.grid')}</h2>
          <span className="coach-card-meta">{t('achieve.gridMeta')}</span>
        </div>
      </div>
      <ul className="rw-badge-grid">
        {list.map((a) => {
          const st = a.status;
          const showProgress = !st.done && st.progress > 0;
          return (
            <li key={a.id} className={'rw-badge' + (st.done ? ' is-on' : ' is-locked')}>
              <span className="rw-medal" aria-hidden="true">
                <span className="rw-medal-icon">{a.icon}</span>
              </span>
              <span className="rw-badge-text">
                <strong className="rw-badge-title">{pick(a.title, lang)}</strong>
                <span className="rw-badge-desc">{pick(a.desc, lang)}</span>
                {st.done ? (
                  <span className="rw-badge-date">{t('achieve.unlockedOn', { date: formatDate(st.at, lang) })}</span>
                ) : showProgress ? (
                  <span className="rw-badge-progress">
                    <Bar value={st.progress} label={pick(a.title, lang)} />
                    {Number.isFinite(st.need) && Number.isFinite(st.value) && (
                      <span dir="ltr">{t('achieve.progress', { value: st.value, need: st.need })}</span>
                    )}
                  </span>
                ) : (
                  <span className="rw-badge-date is-locked">{t('achieve.locked')}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function RewardsView() {
  const { t, lang } = useLanguage();
  const coach = useCoach();
  const version = useChallengesVersion();
  const day = localDay();
  // Recomputed on every new perf entry, challenge change (swap / new day's
  // set) and coach change (blocks / rungs earn XP).
  const r = useMemo(() => getRewards({ coach: coach.state, day }), [version, coach.state, coach.perfVersion, day]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="rw-grid">
      <LevelCard r={r} lang={lang} t={t} />
      <TodayChallenges ch={r.challenges} lang={lang} t={t} />
      <WeeklyChallenge ch={r.challenges} lang={lang} t={t} />
      <Achievements list={r.achievements} lang={lang} t={t} />
    </div>
  );
}
