import { useEffect, useRef } from 'react';
import { SECTIONS } from './sections';
import { TunerBar } from '../TunerBar/TunerBar';
import { InfoTooltipsToggle } from '../InfoTooltipsToggle/InfoTooltipsToggle';
import { HomeButton } from '../HomeButton/HomeButton';
import { RewardToast } from '../Achievements/RewardToast';
import { useLanguage } from '../../i18n/LanguageContext';
import { useInstrument } from '../../instruments/useInstrument';
import { supportsInstrument } from '../../instruments/featureCapabilities';
import '../ModeToggle/ModeToggle.css';
import './AppShell.css';

// A section's `icon` is either an emoji string (rendered as-is) or a
// component reference (a custom SVG like TrainingIcon) — see sections.js.
function SectionIcon({ icon: Icon }) {
  return typeof Icon === 'string' ? Icon : <Icon />;
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
          {/* Features left to right in both languages (Compose first). */}
          <nav className={'app-topbar-nav mode-toggle wrap' + (bare ? ' is-empty' : '')} dir="ltr" aria-label={t('nav.mainLabel')}>
            {visibleSections.map((s) => (
              <button
                key={s.key}
                type="button"
                className={activeSection === s.key ? 'active' : ''}
                aria-current={activeSection === s.key ? 'page' : undefined}
                onClick={() => onSectionChange(s.key)}
                title={label(s)}
              >
                <span className="app-topbar-nav-icon" aria-hidden="true">
                  <SectionIcon icon={s.icon} />
                </span>
                <span className="app-topbar-nav-label">{label(s)}</span>
              </button>
            ))}
          </nav>
          <div className="app-topbar-tools" dir={dir}>
            {!noTools && metronomeSlot}
            {!bare && !noTools && <TunerBar />}
            <InfoTooltipsToggle />
          </div>
        </header>
        <div className="app-section-content">{children}</div>
        {stage && <div className="app-stage-anchor" ref={stageRef}>{stage}</div>}
      </main>

      {!bare && !noTools && (
        <div className="app-mobile-metronome">
          {metronomeSlot}
          <TunerBar />
        </div>
      )}

      {!bare && (
        <nav className="app-bottom-tabs" aria-label={t('nav.mainLabel')}>
        {visibleSections.map((s) => (
          <button
            key={s.key}
            type="button"
            data-section={s.key}
            className={'app-bottom-tab' + (activeSection === s.key ? ' active' : '')}
            aria-current={activeSection === s.key ? 'page' : undefined}
            onClick={() => onSectionChange(s.key)}
          >
            <span className="app-bottom-tab-icon" aria-hidden="true">
              <SectionIcon icon={s.icon} />
            </span>
            {label(s)}
          </button>
        ))}
        </nav>
      )}

      {/* Challenge done / achievement unlocked / new level (any section). */}
      <RewardToast />
    </div>
  );
}
