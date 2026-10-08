import { useEffect, useRef } from 'react';
import { SECTIONS } from './sections';
import { TunerBar } from '../TunerBar/TunerBar';
import { InfoTooltipsToggle } from '../InfoTooltipsToggle/InfoTooltipsToggle';
import { AppLogo } from '../AppLogo/AppLogo';
import { useLanguage } from '../../i18n/LanguageContext';
import { useInstrument } from '../../instruments/useInstrument';
import { supportsInstrument } from '../../instruments/featureCapabilities';
import { INSTRUMENTS } from '../../instruments/instrumentRegistry';
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
// `settingsSlot` is the SettingsPanel (rendered twice — top bar and phone
// corner; it portals its drawer to <body>).
export function AppShell({ activeSection, onSectionChange, settingsSlot, metronomeSlot, stage, onHome, children }) {
  const { t, lang } = useLanguage();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const { instrument } = useInstrument();
  // Sections whose entire feature isn't available on the current instrument
  // (e.g. Improvise is guitar-only) shouldn't appear as a nav destination at
  // all in that mode — clicking through to a "not available" message is
  // worse than never seeing the option in the first place.
  const visibleSections = SECTIONS.filter((s) => supportsInstrument(s.key, instrument));
  const inst = INSTRUMENTS.find((i) => i.key === instrument);
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
    <div className="app-shell">
      {/* Phone/tablet: the logo (back to the home screen), top-left. */}
      <button type="button" className="app-mobile-brand app-brand-home" onClick={() => onHome?.()} aria-label={t('home.open')}>
        <AppLogo size={26} />
      </button>

      <div className="app-mobile-settings">
        <div className="app-mobile-settings-icons">
          {settingsSlot}
          <InfoTooltipsToggle />
        </div>
      </div>

      <main className="app-content">
        {/* Desktop: one bar — logo (home) + the instrument, the instrument's
            features, and the tools. The instrument itself is chosen on the
            home screen; there is no menu drawer any more. */}
        <header className="app-topbar">
          <button type="button" className="app-topbar-brand app-brand-home" onClick={() => onHome?.()} aria-label={t('home.open')}>
            <AppLogo size={26} />
            <span className="app-topbar-name">{t('app.name')}</span>
          </button>
          {inst && (
            <span className="app-topbar-instrument">
              <span className="app-topbar-instrument-icon" aria-hidden="true">
                <SectionIcon icon={inst.icon} />
              </span>
              {t(inst.labelKey)}
            </span>
          )}
          <nav className="app-topbar-nav mode-toggle wrap" dir={dir} aria-label={t('nav.mainLabel')}>
            {visibleSections.map((s) => (
              <button
                key={s.key}
                type="button"
                className={activeSection === s.key ? 'active' : ''}
                aria-current={activeSection === s.key ? 'page' : undefined}
                onClick={() => onSectionChange(s.key)}
                title={t(s.labelKey)}
              >
                <span className="app-topbar-nav-icon" aria-hidden="true">
                  <SectionIcon icon={s.icon} />
                </span>
                <span className="app-topbar-nav-label">{t(s.labelKey)}</span>
              </button>
            ))}
          </nav>
          <div className="app-topbar-tools" dir={dir}>
            {metronomeSlot}
            <TunerBar />
            {settingsSlot}
            <InfoTooltipsToggle />
          </div>
        </header>
        <div className="app-section-content">{children}</div>
        {stage && <div className="app-stage-anchor" ref={stageRef}>{stage}</div>}
      </main>

      <div className="app-mobile-metronome">
        {metronomeSlot}
        <TunerBar />
      </div>

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
            {t(s.labelKey)}
          </button>
        ))}
      </nav>
    </div>
  );
}
