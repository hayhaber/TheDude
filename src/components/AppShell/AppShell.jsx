import { useEffect, useRef, useState } from 'react';
import { LineIcon } from '../LineIcon/LineIcon';
import { SECTIONS, NAV_GROUPS, lastSectionIn, rememberSection, rememberPlace } from './sections';
import { TunerBar } from '../TunerBar/TunerBar';
import { ProfileChip } from '../../profile/ProfileChip';
import { HomeButton } from '../HomeButton/HomeButton';
import { RewardToast } from '../Achievements/RewardToast';
import { useLanguage } from '../../i18n/LanguageContext';
import { useInstrument } from '../../instruments/useInstrument';
import { FirstVisit } from '../FirstVisit/FirstVisit';
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
// The neck/keys can be folded away per screen (stage 3 of the redesign):
// remembered per section on this device; Songs starts folded (its search
// screens never use the neck).
const STAGE_KEY = 'dudestar-stage-collapsed';
const STAGE_DEFAULT_COLLAPSED = { songs: true };
function loadStageCollapsed() {
  try {
    return { ...STAGE_DEFAULT_COLLAPSED, ...JSON.parse(localStorage.getItem(STAGE_KEY) || '{}') };
  } catch {
    return { ...STAGE_DEFAULT_COLLAPSED };
  }
}

export function AppShell({ activeSection, onSectionChange, onReselect, metronomeSlot, stage, onHome, onSettings, toolsActive = false, children }) {
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
  // Every instrument shows the same five goal names (Learn, Practice,
  // Chords, Play, Create), whatever sections a group holds on it — the bass
  // said "GuitarPro" / "Compose" and the piano "Studies" where the guitar
  // said "Play" / "Create" / "Learn" (flow review 2026-11-06).
  const groupLabel = (g) => t(g.labelKey);
  const groupIcon = (g) => g;
  const openGroup = (g) => {
    if (g === activeGroup && inGroupSwitch) {
      onReselect?.(activeSection);
      return;
    }
    const last = lastSectionIn(g.key);
    onSectionChange(g.sections.some((s) => s.key === last) ? last : g.sections[0].key);
  };
  useEffect(() => {
    rememberSection(activeSection);
    rememberPlace(instrument, activeSection);
  }, [activeSection, instrument]);

  // Phone/tablet: metronome / drums / tuner sit behind ONE Tools button in
  // the top strip (stage 3): a floating glass row above the tab bar.
  const [toolsOpen, setToolsOpen] = useState(false);
  useEffect(() => {
    if (!toolsOpen) return undefined;
    const onDown = (e) => {
      // Taps inside the popover, on a Tools button, or inside a drawer a
      // pill opened keep it open.
      if (e.target.closest?.('.app-tools-popover, .app-tools-button, .metronome-drawer, .tuner-drawer, [role="dialog"]')) return;
      setToolsOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [toolsOpen]);
  useEffect(() => setToolsOpen(false), [activeSection]);

  const hasTools = !bare && !noTools && metronomeSlot != null;
  const toolsButton = (
    <button
      type="button"
      className={'icon-circle-button app-tools-button' + (toolsOpen ? ' active' : '') + (toolsActive ? ' is-live' : '')}
      aria-label={t('nav.tools')}
      title={t('nav.tools')}
      aria-expanded={toolsOpen}
      onClick={() => setToolsOpen((v) => !v)}
    >
      <LineIcon name="metronome" size={19} strokeWidth={1.7} />
    </button>
  );

  const groupSwitch = (where) =>
    inGroupSwitch && activeGroup.sections.length > 1 ? (
      <div className={'app-group-switch mode-toggle ' + where} role="tablist" aria-label={t('nav.group.switch')} dir={dir}>
        {activeGroup.sections.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={activeSection === s.key}
            className={activeSection === s.key ? 'active' : ''}
            onClick={() => onSectionChange(s.key)}
          >
            {/* The label clips (ellipsis), not the button — so the button's
                44 pt hit area (index.css) isn't clipped with it. */}
            <span className="app-group-switch-label">{label(s)}</span>
          </button>
        ))}
      </div>
    ) : null;

  const [stageCollapsedMap, setStageCollapsedMap] = useState(loadStageCollapsed);
  const stageCollapsed = !!stageCollapsedMap[activeSection];
  const toggleStage = () => {
    const next = { ...stageCollapsedMap, [activeSection]: !stageCollapsed };
    setStageCollapsedMap(next);
    try {
      localStorage.setItem(STAGE_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  };
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

      {/* Phone/tablet: the group's segmented control sits in the top strip,
          between Home and the round buttons — iOS's navigation-bar segment. */}
      {groupSwitch('is-strip')}

      <div className="app-mobile-settings">
        <div className="app-mobile-settings-icons">
          {/* The profile (Settings, the ⓘ switch, who's practising) — it
              replaced the ⓘ button (2026-11-06). */}
          <ProfileChip compact onSettings={onSettings} />
          {/* Outer corner, like the top bar's — the popover drops from it. */}
          {hasTools && toolsButton}
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
            {hasTools && toolsButton}
            <ProfileChip compact onSettings={onSettings} />
          </div>
        </header>
        <div className="app-section-content" dir={dir}>
          {/* Inside a group of two: an iOS segmented control between them
              (desktop: above the title; phone/tablet: in the top strip). */}
          {groupSwitch('is-inline')}
          {!bare && <FirstVisit key={instrument + ':' + activeSection} section={activeSection} instrument={instrument} />}
          {children}
        </div>
        {stage && (
          <div className={'app-stage-anchor' + (stageCollapsed ? ' is-collapsed' : '')} ref={stageRef}>
            <button
              type="button"
              className="app-stage-toggle"
              onClick={toggleStage}
              aria-expanded={!stageCollapsed}
              aria-label={t(stageCollapsed ? 'nav.stageShow' : 'nav.stageHide')}
              title={t(stageCollapsed ? 'nav.stageShow' : 'nav.stageHide')}
            >
              <svg viewBox="0 0 24 12" width="18" height="9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={stageCollapsed ? 'M5 9l7-6 7 6' : 'M5 3l7 6 7-6'} />
              </svg>
            </button>
            <div className="app-stage-body">{stage}</div>
          </div>
        )}
      </main>

      {/* ONE place for the tools at every size (stage 3): a Liquid Glass
          popover under the Tools button, top corner — it never covers the
          neck or the tab bar. Mounted once, hidden while closed. */}
      {hasTools && (
        <div
          className={'app-tools-popover' + (toolsOpen ? ' is-open' : '')}
          role="group"
          aria-label={t('nav.tools')}
          dir={dir}
          // A pill opens its full drawer; the popover steps aside.
          onClick={() => setTimeout(() => setToolsOpen(false), 0)}
        >
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
