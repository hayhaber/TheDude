import { useCallback, useEffect, useState } from 'react';
import { SECTIONS } from './sections';
import { InstrumentToggle } from '../InstrumentToggle/InstrumentToggle';
import { TunerBar } from '../TunerBar/TunerBar';
import { InfoTooltipsToggle } from '../InfoTooltipsToggle/InfoTooltipsToggle';
import { AppLogo } from '../AppLogo/AppLogo';
import { useLanguage } from '../../i18n/LanguageContext';
import { useInstrument } from '../../instruments/useInstrument';
import { supportsInstrument } from '../../instruments/featureCapabilities';
import { usePopoverDismiss } from '../../hooks/usePopoverDismiss';
import './AppShell.css';

// A section's `icon` is either an emoji string (rendered as-is) or a
// component reference (a custom SVG like MetronomeIcon) — see sections.js.
function SectionIcon({ icon: Icon }) {
  return typeof Icon === 'string' ? Icon : <Icon />;
}

// Persistent navigation chrome. ≥900px: a hamburger-triggered off-canvas
// drawer (hidden by default, opens over the content with a scrim) instead
// of a permanently-docked sidebar — the content column gets that width
// back rather than always reserving it. <900px: unchanged bottom tab bar,
// already the right pattern for 3-5 top-level destinations on a small
// screen (Material Design's own guidance), so it isn't touched here.
// `settingsSlot` is the existing SettingsPanel; LanguageToggle is
// self-contained (reads/writes language via context).
export function AppShell({ activeSection, onSectionChange, settingsSlot, metronomeSlot, stage, children }) {
  const { t } = useLanguage();
  const { instrument } = useInstrument();
  // Sections whose entire feature isn't available on the current instrument
  // (e.g. Improvise is guitar-only) shouldn't appear as a nav destination at
  // all in that mode — clicking through to a "not available" message is
  // worse than never seeing the option in the first place.
  const visibleSections = SECTIONS.filter((s) => supportsInstrument(s.key, instrument));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  // Wraps the trigger button too (not just the drawer itself) so clicking
  // the hamburger to close doesn't register as an "outside click" and
  // immediately reopen it.
  const drawerAreaRef = usePopoverDismiss(drawerOpen, closeDrawer);

  // A section change is itself a completed navigation action — close the
  // drawer the same way a menu closes after picking an item.
  function selectSection(key) {
    onSectionChange(key);
    closeDrawer();
  }

  // Body scroll would otherwise still work behind the scrim on touch
  // devices (the scrim only stops clicks, not touch-scroll) — lock it
  // while the drawer is open, same as any modal overlay.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  return (
    <div className="app-shell">
      <div
        className="app-drawer-scrim"
        style={{ opacity: drawerOpen ? 1 : 0, pointerEvents: drawerOpen ? 'auto' : 'none' }}
        aria-hidden="true"
      />

      <div className="app-drawer-area" ref={drawerAreaRef}>
        <button
          type="button"
          className="app-drawer-trigger"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label={drawerOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={drawerOpen}
        >
          <span className="app-drawer-trigger-bar" />
          <span className="app-drawer-trigger-bar" />
          <span className="app-drawer-trigger-bar" />
        </button>

        <nav
          className="app-drawer"
          style={{ transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)', pointerEvents: drawerOpen ? 'auto' : 'none' }}
          aria-label={t('nav.mainLabel')}
          inert={!drawerOpen}
        >
          <div className="app-drawer-header">
            <div className="app-sidebar-brand">
              <span className="app-sidebar-brand-icon" aria-hidden="true">
                <AppLogo size={24} />
              </span>
              <span className="app-sidebar-brand-text">{t('app.name')}</span>
            </div>
            <button type="button" className="app-drawer-close" onClick={closeDrawer} aria-label={t('nav.closeMenu')}>
              ×
            </button>
          </div>

          <div className="app-sidebar-top-controls">
            <InstrumentToggle />
            {settingsSlot}
            <InfoTooltipsToggle />
          </div>

          <div className="app-sidebar-nav">
            {visibleSections.map((s) => (
              <button
                key={s.key}
                type="button"
                className={'app-nav-item' + (activeSection === s.key ? ' active' : '')}
                aria-current={activeSection === s.key ? 'page' : undefined}
                onClick={() => selectSection(s.key)}
              >
                <span className="app-nav-item-icon" aria-hidden="true">
                  <SectionIcon icon={s.icon} />
                </span>
                {t(s.labelKey)}
              </button>
            ))}
          </div>

          <div className="app-sidebar-metronome">
            {metronomeSlot}
            <TunerBar />
          </div>
        </nav>
      </div>

      <div className="app-mobile-settings">
        <InstrumentToggle />
        {settingsSlot}
        <InfoTooltipsToggle />
      </div>

      <main className="app-content">
        <div className="app-section-content">{children}</div>
        <div className="app-stage-anchor">{stage}</div>
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
