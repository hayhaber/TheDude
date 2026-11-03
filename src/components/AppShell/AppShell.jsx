import { useEffect, useRef } from 'react';
import { LineIcon } from '../LineIcon/LineIcon';
import { SECTIONS, NAV_GROUPS, lastSectionIn, rememberSection } from './sections';
import { TunerBar } from '../TunerBar/TunerBar';
import { InfoTooltipsToggle } from '../InfoTooltipsToggle/InfoTooltipsToggle';
import { HomeButton } from '../HomeButton/HomeButton';
import { RewardToast } from '../Achievements/RewardToast';
import { useLanguage } from '../../i18n/LanguageContext';
import { useInstrument } from '../../instruments/useInstrument';
import { supportsInstrument } from '../../instruments/featureCapabilities';
import '../ModeToggle/ModeToggle.css';
import './AppShell.css';

// Every section icon comes from the shared LineIcon set (see sections.js) —
// one drawing style across the top bar, the bottom tabs and the home cards.
const ICON_SIZE = 17;
const TAB_ICON_SIZE = 24;

function SectionIcon({ section, instrument, size }) {
  const name = (instrument === 'piano' && section.pianoIcon) || section.icon;
  return <LineIcon name={name} size={size} strokeWidth={1.6} />;
}

// Persistent navigation chrome — the inside of an instrument (the home
// screen picks the instrument). >=900px: a top bar with the logo (home), the
// instrument, its features and the tools. <900px: the logo + settings at the
// top, metronome/tuner and the feature tabs at the bottom.
// Settings live only on the home screen's Tools card (no gear in here).
export function AppShell({ activeSection, onSectionChange, metronomeSlot, stage, onHome, children }) {
  const { t, lang } = useLanguage();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const { instrument } = useInstrument();
  // Sections whose entire feature isn't available on the current instrument
  // (e.g. Improvise is guitar-only) shouldn't appear as a nav destination at
  // all in that mode — clicking through to a "not available" message is
  // worse than never seeing the option in the first place.
  // Singing has its own home-screen card: inside an instrument the Vocal
  // section isn't a destination, and inside Vocal the bar shows only it.
  // Singing is a single page: no section tabs, no tuner, and no metronome
  // (App passes no metronomeSlot there).
  const bare = activeSection === 'vocal';
  // Chord Library: no metronome / drums / tuner bar — the chord gets the room (user's request).
  const noTools = activeSection === 'chords';
  const visibleSections = bare ? [] : SECTIONS.filter((s) => s.key !== 'vocal' && supportsInstrument(s.key, instrument));
  // On the piano the Guitar Pro player is "PianoPro".
  const label = (s) => t(s.key === 'guitarpro' && instrument === 'piano' ? 'nav.pianopro' : s.labelKey);
  // The bar shows goal GROUPS (sections.js NAV_GROUPS); a group with one
  // section here is shown as that section. Sections outside every group
  // (vocal, coach) keep the bar as it is with nothing selected.
  const visibleKeys = new Set(visibleSections.map((s) => s.key));
  const groups = NAV_GROUPS.map((g) => ({ ...g, sections: g.members.map((k) => SECTIONS.find((s) => s.key === k)).filter((s) => s && visibleKeys.has(s.key)) })).filter((g) => g.sections.length);
  const activeGroup = groups.find((g) => g.sections.some((s) => s.key === activeSection) || g.also?.includes(activeSection)) ?? null;
  const inGroupSwitch = activeGroup?.sections.some((s) => s.key === activeSection);
  const groupLabel = (g) => (g.sections.length === 1 ? label(g.sections[0]) : t(g.labelKey));
  const groupIcon = (g) => (g.sections.length === 1 ? g.sections[0] : g);
  const openGroup = (g) => {
    if (g === activeGroup && inGroupSwitch) return;
    const last = lastSectionIn(g.key);
    onSectionChange(g.sections.some((s) => s.key === last) ? last : g.sections[0].key);
  };
  useEffect(() => {
    rememberSection(activeSection);
  }, [activeSection]);
  // The pinned instrument's height, as --stage-height on the root, so a
  // section can size a panel to exactly the room left above it.
  const stageRef = useRef(null);
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--stage-height', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, [stage != null]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={'app-shell' + (bare ? ' is-bare' : '') + (noTools ? ' no-tools' : '')}>
      {/* Phone/tablet: the round Home button (back to the main menu), top-left. */}
      <HomeButton className="app-mobile-brand" onClick={() => onHome?.()} />

      <div className="app-mobile-settings">
        <div className="app-mobile-settings-icons">
          <InfoTooltipsToggle />
        </div>
      </div>

      <main className="app-content">
        {/* Desktop: one bar — the instrument's features, and the tools (home,
            metronome, tuner, info). The instrument itself is chosen
            on the home screen; there is no menu drawer any more. */}
        <header className="app-topbar">
          {/* Left: the round Home button (back to the main menu). */}
          <div className="app-topbar-brand">
            <HomeButton className="app-topbar-home" onClick={() => onHome?.()} />
          </div>
          {/* The goal groups in reading order (Learn first). */}
          <nav className={'app-topbar-nav mode-toggle wrap' + (bare ? ' is-empty' : '')} dir={dir} aria-label={t('nav.mainLabel')}>
            {groups.map((g) => (
              <button
                key={g.key}
                type="button"
                className={activeGroup === g ? 'active' : ''}
                aria-current={activeGroup === g ? 'page' : undefined}
                onClick={() => openGroup(g)}
                title={groupLabel(g)}
              >
                <span className="app-topbar-nav-icon" aria-hidden="true">
                  <SectionIcon section={groupIcon(g)} instrument={instrument} size={ICON_SIZE} />
                </span>
                <span className="app-topbar-nav-label">{groupLabel(g)}</span>
              </button>
            ))}
          </nav>
          <div className="app-topbar-tools" dir={dir}>
            {!noTools && metronomeSlot}
            {!bare && !noTools && <TunerBar />}
            <InfoTooltipsToggle />
          </div>
        </header>
        <div className="app-section-content">
          {/* Inside a group of two: an iOS segmented control between them. */}
          {inGroupSwitch && activeGroup.sections.length > 1 && (
            <div className="app-group-switch mode-toggle" role="tablist" aria-label={t('nav.group.switch')} dir={dir}>
              {activeGroup.sections.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={activeSection === s.key}
                  className={activeSection === s.key ? 'active' : ''}
                  onClick={() => onSectionChange(s.key)}
                >
                  {label(s)}
                </button>
              ))}
            </div>
          )}
          {children}
        </div>
        {stage && <div className="app-stage-anchor" ref={stageRef}>{stage}</div>}
      </main>

      {!bare && !noTools && (
        <div className="app-mobile-metronome">
          {metronomeSlot}
          <TunerBar />
        </div>
      )}

      {!bare && (
        <nav className="app-bottom-tabs" aria-label={t('nav.mainLabel')} dir={dir}>
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            data-group={g.key}
            className={'app-bottom-tab' + (activeGroup === g ? ' active' : '')}
            aria-current={activeGroup === g ? 'page' : undefined}
            onClick={() => openGroup(g)}
          >
            <span className="app-bottom-tab-icon" aria-hidden="true">
              <SectionIcon section={groupIcon(g)} instrument={instrument} size={TAB_ICON_SIZE} />
            </span>
            {groupLabel(g)}
          </button>
        ))}
        </nav>
      )}

      {/* Challenge done / achievement unlocked / new level (any section). */}
      <RewardToast />
    </div>
  );
}
