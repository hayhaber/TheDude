import { useEffect, useState } from 'react';
import { LibraryBar } from '../LickTrainer/LickTrainer';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useInstrument } from '../../instruments/useInstrument';
import { LanguageToggle } from '../LanguageToggle/LanguageToggle';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { GUITAR_SOUND_PROFILES, PIANO_SOUND_PROFILES, BASS_SOUND_PROFILES } from '../../audio/instrumentProfiles';
import { AudioInputSettings } from '../AudioInputSettings/AudioInputSettings';
import { YoutubeApiKeySettings } from '../YoutubeApiKeySettings/YoutubeApiKeySettings';
import { KeyboardShortcutsSettings } from '../KeyboardShortcutsSettings/KeyboardShortcutsSettings';
import { useLeftHanded } from '../Fretboard/handedness';
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
export function SettingsPanel(settings) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

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

            <SettingsBody {...settings} />
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

/**
 * The settings themselves — in the app's side drawer (SettingsPanel) and on
 * the home screen's Settings page (ToolScreen). `allSounds` shows every
 * instrument's sound picker (the home screen has no "current" instrument
 * page); otherwise only the instrument in use.
 */
export function SettingsBody({
  theme,
  onThemeChange,
  guitarProfile,
  onGuitarProfileChange,
  pianoProfile,
  onPianoProfileChange,
  bassProfile,
  onBassProfileChange,
  shortcuts,
  // The Lick Trainer / GuitarPro state, for "Sync between devices".
  syncTrainer = null,
  allSounds = false,
}) {
  const { t } = useLanguage();
  const { instrument } = useInstrument();
  const [leftHanded, setLeftHanded] = useLeftHanded();
  // Left-handed only means something where there's a neck: on the home
  // screen's page (allSounds) and inside guitar/bass, not inside piano.
  const showHand = allSounds || instrument !== 'piano';
  const showSound = (key) => allSounds || (key === 'guitar' ? instrument !== 'piano' && instrument !== 'bass' : instrument === key);

  return (
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

      {showHand && (
        <div className="settings-field">
          <span className="settings-field-label">
            {t('tuning.hand')}
            <InfoTooltip text={t('tuning.tip.leftHanded')} />
          </span>
          <div className="mode-toggle" role="group" aria-label={t('tuning.hand')}>
            <button type="button" className={!leftHanded ? 'active' : ''} aria-pressed={!leftHanded} onClick={() => setLeftHanded(false)}>
              {t('tuning.hand.right')}
            </button>
            <button type="button" className={leftHanded ? 'active' : ''} aria-pressed={leftHanded} onClick={() => setLeftHanded(true)}>
              {t('tuning.hand.left')}
            </button>
          </div>
        </div>
      )}

      {/* Instrument-aware, per docs/PIANO_MODE_ARCHITECTURE.md's roadmap —
          one sound-profile field, showing whichever instrument's own
          profile list applies, rather than always showing Guitar Sound
          even while in Piano mode. Explicit per-instrument checks
          (not an `else` catch-all) — with Bass as a 3rd instrument
          value, an `else` here would have silently shown Guitar's
          own profile list/setter while in Bass mode. */}
      {showSound('guitar') && (
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
      {showSound('piano') && (
        <label className="settings-field">
          <span className="settings-field-label">
            {t('settings.pianoSound')}
            <InfoTooltip text={t('tip.tools.pianoSound')} />
          </span>
          <select value={pianoProfile} onChange={(e) => onPianoProfileChange(e.target.value)}>
            {PIANO_SOUND_PROFILES.map((p) => (
              <option key={p.key} value={p.key}>
                {t(p.labelKey)}
              </option>
            ))}
          </select>
          <span className="settings-attribution">{t('settings.pianoAudioAttribution')}</span>
        </label>
      )}
      {showSound('bass') && (
        <label className="settings-field">
          <span className="settings-field-label">
            {t('settings.bassSound')}
            <InfoTooltip text={t('tip.tools.bassSound')} />
          </span>
          <select value={bassProfile} onChange={(e) => onBassProfileChange(e.target.value)}>
            {BASS_SOUND_PROFILES.map((p) => (
              <option key={p.key} value={p.key}>
                {t(p.labelKey)}
              </option>
            ))}
          </select>
          <span className="settings-attribution">{t('settings.audioAttribution')}</span>
        </label>
      )}

      {syncTrainer && (
        <>
          <h3 className="settings-drawer-subtitle">{t('lickTrainer.libTitle')}</h3>
          <LibraryBar trainer={syncTrainer} t={t} bare />
        </>
      )}

      <h3 className="settings-drawer-subtitle">{t('settings.audioInput')}</h3>
      <AudioInputSettings />

      <h3 className="settings-drawer-subtitle">{t('settings.youtube')}</h3>
      <YoutubeApiKeySettings />

      <h3 className="settings-drawer-subtitle">{t('settings.shortcuts.title')}</h3>
      <KeyboardShortcutsSettings shortcuts={shortcuts} />
    </div>
  );
}
