import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { subscribeRewardEvents } from '../../coach/useAchievements';
import { pick } from '../Coach/coachFormat';
import './RewardToast.css';

// A small, quiet notice when a measured run completes a challenge, unlocks
// an achievement or reaches a new level — anywhere inside the app (mounted
// once by AppShell). One at a time, ~4 s each, tap to dismiss.

const SHOW_MS = 4200;

function Glyph({ ev }) {
  if (ev.type === 'achievement') return <span className="rw-toast-emoji">{ev.icon}</span>;
  if (ev.type === 'level') return <span className="rw-toast-level">{ev.level}</span>;
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function RewardToast() {
  const { t, lang } = useLanguage();
  const [queue, setQueue] = useState([]);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(null);

  useEffect(() => subscribeRewardEvents((events) => setQueue((q) => [...q, ...events.map((e, i) => ({ ...e, key: `${Date.now()}-${i}` }))])), []);

  const current = queue[0] ?? null;
  const next = useCallback(() => {
    setLeaving(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setLeaving(false);
      setQueue((q) => q.slice(1));
    }, 220);
  }, []);

  useEffect(() => {
    if (!current) return undefined;
    const id = setTimeout(next, SHOW_MS);
    return () => clearTimeout(id);
  }, [current, next]);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!current) return <div className="rw-toast-live" aria-live="polite" />;
  let head;
  let body;
  if (current.type === 'daily') {
    head = t('challenge.toast.daily');
    body = pick(current.title, lang);
  } else if (current.type === 'weekly') {
    head = t('challenge.toast.weekly');
    body = pick(current.title, lang);
  } else if (current.type === 'achievement') {
    head = t('achieve.toast.badge');
    body = pick(current.title, lang);
  } else {
    head = t('achieve.toast.levelText');
    body = t('achieve.toast.level', { n: current.level });
  }
  return (
    <div className="rw-toast-live" aria-live="polite" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <button type="button" key={current.key} className={`rw-toast is-${current.type}` + (leaving ? ' is-leaving' : '')} onClick={next} aria-label={`${head}: ${body}. ${t('achieve.toast.close')}`}>
        <span className="rw-toast-glyph" aria-hidden="true">
          <Glyph ev={current} />
        </span>
        <span className="rw-toast-text">
          <span className="rw-toast-head">{head}</span>
          <span className="rw-toast-body" dir="auto">
            {body}
          </span>
        </span>
      </button>
    </div>
  );
}
