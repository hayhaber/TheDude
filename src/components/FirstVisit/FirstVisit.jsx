import { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import './FirstVisit.css';

// Stage 6 of the redesign (guidance): the first time a screen opens, one
// short note on how to use it + "Got it". Dismissed for good, per profile
// (personal key below) and per instrument (the same section can differ).
const KEY = 'dudestar-p-seen-intro';

function loadSeen() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function FirstVisit({ section, instrument }) {
  const { t } = useLanguage();
  const [seen, setSeen] = useState(loadSeen);
  const id = `${instrument}:${section}`;
  if (!section || seen.includes(id)) return null;
  const own = `intro.${section}.${instrument}`;
  const base = `intro.${section}`;
  const text = t(own) !== own ? t(own) : t(base) !== base ? t(base) : null;
  if (!text) return null;

  const dismiss = () => {
    const next = [...loadSeen().filter((x) => x !== id), id];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
    setSeen(next);
  };

  return (
    <div className="first-visit" role="note">
      <span className="first-visit-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
        </svg>
      </span>
      <p className="first-visit-text">{text}</p>
      <button type="button" className="first-visit-ok" onClick={dismiss}>
        {t('intro.ok')}
      </button>
    </div>
  );
}
