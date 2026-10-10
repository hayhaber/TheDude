import { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useCoach } from '../../coach/useCoach';
import { pick, formatValue, formatTarget, clock } from './coachFormat';
import './CoachBanner.css';

// A coach block is running and the student is in a practice tool: a compact
// bar at the top of the section (in the flow, sticky — it never covers the
// tool's controls) with the block, its target, the time and the live result.
// Done = finish the block (or the placement test) and go back to the coach;
// Coach = go back without finishing.

export function CoachIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CoachBanner({ onCoach }) {
  const { t, lang } = useLanguage();
  const coach = useCoach();
  const run = coach.running;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!run) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [run]);
  if (!run) return null;

  const elapsed = Math.max(0, now - run.startedAt);
  const planned = (run.minutes ?? 1) * 60000;
  const over = elapsed >= planned;
  const target = formatTarget(run.measure, t);
  const result = run.result;
  const isPlacement = run.kind === 'placement';

  function done() {
    if (!isPlacement) {
      coach.markBlockDone(run.blockId, { spentMin: Math.max(1, Math.round(elapsed / 60000)), result: result ?? null });
    } else {
      coach.endBlock();
    }
    onCoach?.();
  }

  return (
    <div className="coach-banner" role="status" aria-label={t('coach.banner.label')} dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <span className="coach-banner-icon">
        <CoachIcon />
      </span>
      <div className="coach-banner-main">
        <div className="coach-banner-title">
          {isPlacement && <span className="coach-banner-tag">{t('coach.banner.test', { i: (run.placementIndex ?? 0) + 1, n: run.placementTotal ?? 1 })}</span>}
          <strong>{pick(run.title, lang)}</strong>
        </div>
        <div className="coach-banner-meta">
          {target && <span>{t('coach.target', { target })}</span>}
          <span className={'coach-banner-time' + (over ? ' is-over' : '')} dir="ltr">
            {clock(elapsed)} / {clock(planned)}
          </span>
          {result && Number.isFinite(result.value) ? (
            <span className={'coach-banner-result' + (result.met === true ? ' is-met' : result.met === false ? ' is-missed' : '')}>
              {result.met === true ? '✓ ' : ''}
              <span dir="ltr">{formatValue(run.measure, result.value, t)}</span>
            </span>
          ) : run.measure ? (
            <span className="coach-banner-wait">{t('coach.banner.waiting')}</span>
          ) : null}
        </div>
      </div>
      <div className="coach-banner-actions">
        <button type="button" className="coach-banner-btn is-primary" onClick={done}>
          {t('coach.banner.done')}
        </button>
        <button type="button" className="coach-banner-btn" onClick={() => onCoach?.()}>
          {t('coach.banner.back')}
        </button>
      </div>
    </div>
  );
}
