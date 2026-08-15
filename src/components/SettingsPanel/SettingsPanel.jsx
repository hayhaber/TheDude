import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useInstrument } from '../../instruments/useInstrument';
import { LanguageToggle } from '../LanguageToggle/LanguageToggle';
import { GUITAR_SOUND_PROFILES, PIANO_SOUND_PROFILES } from '../../audio/instrumentProfiles';
import { AudioInputSettings } from '../AudioInputSettings/AudioInputSettings';
import { YoutubeApiKeySettings } from '../YoutubeApiKeySettings/YoutubeApiKeySettings';
import { KeyboardShortcutsSettings } from '../KeyboardShortcutsSettings/KeyboardShortcutsSettings';
import '../ModeToggle/ModeToggle.css';
import './SettingsPanel.css';

// Right-side drawer, same interaction/anchor as MetronomeBar/TunerBar/
// DisplayOptionsMenu (top-anchored, capped max-height so it never covers the
// Stage, portaled to <body>) — per explicit request, replacing an earlier
// measured-position popover. That popover anchored itself against the gear
// button's own on-screen rect, which made it hard to find/inconsistent with
// every other panel in the app; a drawer is a single, predictable, always
// same-place destination like the others.
//
// This component is rendered TWICE by AppShell (once inside the off-canvas
// nav drawer, once in the mobile top bar) — portaling to document.body means
// both instances behave identically regardless of which triggered it.
export function SettingsPanel({ theme, onThemeChange, guitarProfile, onGuitarProfileChange, pianoProfile, onPianoProfileChange, shortcuts }) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const { instrument } = useInstrument();

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="settings-panel">
      <button
        type="button"
        className={'settings-gear icon-circle-button' + (open ? ' active' : '')}
        onClick={() => setOpen(true)}
        aria-label={t('settings.gearLabel')}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        ⚙︎
      </button>

      {createPortal(
        <>
          <div className={'settings-drawer-scrim' + (open ? ' open' : '')} aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            className={'settings-drawer' + (open ? ' open' : '')}
            role="dialog"
            aria-modal="true"
            aria-label={t('settings.title')}
            inert={!open}
          >
            <div className="settings-drawer-header">
              <h2 className="settings-drawer-title">{t('settings.title')}</h2>
              <button type="button" className="settings-drawer-close" onClick={() => setOpen(false)} aria-label={t('metronomeBar.hide')}>
                ×
              </button>
            </div>

            <div className="settings-drawer-body">
              <div className="settings-field">
                <span className="settings-field-label">{t('languageToggle.label')}</span>
                <LanguageToggle />
              </div>

              <div className="settings-field">
                <span className="settings-field-label">{t('settings.appearance')}</span>
                <div className="mode-toggle" role="group" aria-label={t('settings.appearance')}>
                  <button type="button" className={theme === 'light' ? 'active' : ''} onClick={() => onThemeChange('light')}>
                    {t('settings.light')}
                  </button>
                  <button type="button" className={theme === 'dark' ? 'active' : ''} onClick={() => onThemeChange('dark')}>
                    {t('settings.dark')}
                  </button>
                </div>
              </div>

              {/* Instrument-aware, per docs/PIANO_MODE_ARCHITECTURE.md's roadmap —
                  one sound-profile field, showing whichever instrument's own
                  profile list applies, rather than always showing Guitar Sound
                  even while in Piano mode. */}
              {instrument === 'piano' ? (
                <label className="settings-field">
                  <span className="settings-field-label">{t('settings.pianoSound')}</span>
                  <select value={pianoProfile} onChange={(e) => onPianoProfileChange(e.target.value)}>
                    {PIANO_SOUND_PROFILES.map((p) => (
                      <option key={p.key} value={p.key}>
                        {t(p.labelKey)}
                      </option>
                    ))}
                  </select>
                  <span className="settings-attribution">{t('settings.pianoAudioAttribution')}</span>
                </label>
              ) : (
                <label className="settings-field">
                  <span className="settings-field-label">{t('settings.guitarSound')}</span>
                  <select value={guitarProfile} onChange={(e) => onGuitarProfileChange(e.target.value)}>
                    {GUITAR_SOUND_PROFILES.map((p) => (
                      <option key={p.key} value={p.key}>
                        {t(p.labelKey)}
                      </option>
                    ))}
                  </select>
                  <span className="settings-attribution">{t('settings.audioAttribution')}</span>
                </label>
              )}

              <h3 className="settings-drawer-subtitle">{t('settings.audioInput')}</h3>
              <AudioInputSettings />

              <h3 className="settings-drawer-subtitle">{t('settings.youtube')}</h3>
              <YoutubeApiKeySettings />

              <h3 className="settings-drawer-subtitle">{t('settings.shortcuts.title')}</h3>
              <KeyboardShortcutsSettings shortcuts={shortcuts} />
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
