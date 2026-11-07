import { useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useInstrument } from '../../instruments/useInstrument';
import { LineIcon } from '../LineIcon/LineIcon';
import { PRACTICE_GROUPS, itemsFor, itemFor, groupColor, studentLevel, forYou, practiceSummary, lastPracticeTab } from './practiceLibrary';
import './PracticeHome.css';

// The root of Practice (stage 4 of the Apple-style redesign): an iOS
// inset-grouped list instead of a row of nine tabs. Personal on top —
// Continue, then "For you" (the coach's goal, else the student's level) —
// then every tool by group. Tools made for levels BELOW the student's fold
// into one "N more basic exercises" row per group (never hidden for good);
// a tool above the level carries a "Challenging" tag.
// One row of the library (also used by the bass's own Practice list).
export function LibraryRow({ color, icon, title, desc, tag, tagTone, onClick }) {
  return (
    <button type="button" className="ph-row" onClick={onClick}>
      <span className="ph-tile" style={{ background: color }} aria-hidden="true">
        <LineIcon name={icon} size={19} strokeWidth={1.9} />
      </span>
      <span className="ph-text">
        <span className="ph-title" dir="auto">{title}</span>
        {desc && <span className="ph-desc" dir="auto">{desc}</span>}
      </span>
      {tag && <span className={'ph-tag' + (tagTone ? ' is-' + tagTone : '')}>{tag}</span>}
      <span className="ph-chev" aria-hidden="true">
        <svg viewBox="0 0 8 14" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 1.5L6.5 7l-5 5.5" />
        </svg>
      </span>
    </button>
  );
}

export function BackButton({ label, onClick }) {
  return (
    <button type="button" className="ph-back practice-tabs" onClick={onClick}>
      <svg viewBox="0 0 12 20" width="12" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 2L2 10l8 8" />
      </svg>
      {label}
    </button>
  );
}

function Row({ item, level, onOpen, t }) {
  const challenging = level != null && item.min > level;
  return (
    <LibraryRow
      color={groupColor(item.group)}
      icon={item.icon}
      title={t(`ph.ex.${item.tab}.title`)}
      desc={t(`ph.ex.${item.tab}.desc`)}
      tag={challenging ? t('ph.challenge') : null}
      onClick={() => onOpen(item.tab)}
    />
  );
}

export function PracticeHome({ onOpen, onSetLevel }) {
  const { t, lang } = useLanguage();
  const { instrument } = useInstrument();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const [expanded, setExpanded] = useState({});
  const items = useMemo(() => itemsFor(instrument), [instrument]);
  const level = useMemo(() => studentLevel(), []);
  const summary = useMemo(() => practiceSummary(), []);
  const picks = useMemo(() => (level == null ? [] : forYou(instrument, level)), [instrument, level]);
  const lastTab = lastPracticeTab();
  const last = items.find((i) => i.tab === lastTab) ?? null;

  const summaryText = summary
    ? [summary.minutes > 0 ? t('ph.today', { minutes: summary.minutes }) : null, summary.streak > 1 ? t('ph.streak', { days: summary.streak }) : summary.streak === 1 ? t('ph.streak1') : null]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <div className="ph" dir={dir}>
      <header className="ph-head">
        <h1>{t('practice.title')}</h1>
        {summaryText && <p className="subtitle">{summaryText}</p>}
      </header>

      {level == null && onSetLevel && (
        <div className="ph-invite">
          <span>{t('ph.setLevel')}</span>
          <button type="button" className="ph-invite-btn" onClick={onSetLevel}>
            {t('ph.setLevelBtn')}
          </button>
        </div>
      )}

      {last && (
        <button type="button" className="ph-continue" onClick={() => onOpen(last.tab)}>
          <span className="ph-tile is-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
            </svg>
          </span>
          <span className="ph-text">
            <span className="ph-desc">{t('ph.continue')}</span>
            <span className="ph-title">{t(`ph.ex.${last.tab}.title`)}</span>
          </span>
          <span className="ph-chev" aria-hidden="true">
            <svg viewBox="0 0 8 14" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1.5 1.5L6.5 7l-5 5.5" />
            </svg>
          </span>
        </button>
      )}

      {picks.length > 0 && (
        <section className="ph-section">
          <h2 className="ph-section-title">{t('ph.forYou')}</h2>
          <div className="ph-group">
            {picks.map((tab) => (
              <Row key={tab} item={itemFor(tab)} level={level} onOpen={onOpen} t={t} />
            ))}
          </div>
        </section>
      )}

      {PRACTICE_GROUPS.map((g) => {
        const inGroup = items.filter((i) => i.group === g.key);
        if (!inGroup.length) return null;
        const basic = level == null ? [] : inGroup.filter((i) => i.max < level);
        const main = inGroup.filter((i) => !basic.includes(i)).sort((a, b) => (level != null && a.min > level) - (level != null && b.min > level));
        const open = expanded[g.key];
        return (
          <section key={g.key} className="ph-section">
            <h2 className="ph-section-title">{t(`ph.group.${g.key}`)}</h2>
            <div className="ph-group">
              {main.map((item) => (
                <Row key={item.tab} item={item} level={level} onOpen={onOpen} t={t} />
              ))}
              {open && basic.map((item) => <Row key={item.tab} item={item} level={level} onOpen={onOpen} t={t} />)}
              {basic.length > 0 && (
                <button type="button" className="ph-more" onClick={() => setExpanded((e) => ({ ...e, [g.key]: !open }))}>
                  {open ? t('ph.fewer') : basic.length === 1 ? t('ph.moreOne') : t('ph.more', { count: basic.length })}
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
