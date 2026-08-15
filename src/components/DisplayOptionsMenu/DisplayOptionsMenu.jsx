import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ModeToggle } from '../ModeToggle/ModeToggle';
import { LabelModeToggle } from '../LabelModeToggle/LabelModeToggle';
import { ColorModeToggle } from '../ColorModeToggle/ColorModeToggle';
import { useLanguage } from '../../i18n/LanguageContext';
import { useInstrument } from '../../instruments/useInstrument';
import '../SettingsPanel/SettingsPanel.css';
import './DisplayOptionsMenu.css';

// Right-side drawer, same interaction/anchor as MetronomeBar/TunerBar
// (top-anchored, capped max-height so it never covers the Stage, portaled to
// <body> for the same containing-block reason those two already document) —
// per explicit request, replacing an earlier anchored-popover version of
// this same menu. Collapses what used to be 4 always-visible controls
// (mode/label/color toggles + heat map switch) behind one icon button, so
// Compose's default view shows only the chord input, chips, and playback —
// the toggles are still the exact same components, unchanged, just shown on
// demand instead of permanently (and now in a drawer instead of a popover).
export function DisplayOptionsMenu({
  mode,
  setMode,
  labelMode,
  setLabelMode,
  colorMode,
  setColorMode,
  twoHandView,
  setTwoHandView,
  showHeatMap,
  setShowHeatMap,
}) {
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
    <div className="display-options-menu">
      <button
        type="button"
        className={'display-options-trigger' + (open ? ' active' : '')}
        onClick={() => setOpen(true)}
        aria-label={t('displayOptions.label')}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <line x1="4" y1="6" x2="16" y2="6" />
          <line x1="4" y1="10" x2="16" y2="10" />
          <line x1="4" y1="14" x2="16" y2="14" />
          <circle cx="7" cy="6" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="13" cy="10" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="9" cy="14" r="1.6" fill="currentColor" stroke="none" />
        </svg>
        {t('displayOptions.button')}
      </button>

      {createPortal(
        <>
          <div className={'display-options-drawer-scrim' + (open ? ' open' : '')} aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            className={'display-options-drawer' + (open ? ' open' : '')}
            role="dialog"
            aria-modal="true"
            aria-label={t('displayOptions.label')}
            inert={!open}
          >
            <div className="display-options-drawer-header">
              <h2 className="display-options-drawer-title">{t('displayOptions.label')}</h2>
              <button type="button" className="display-options-drawer-close" onClick={() => setOpen(false)} aria-label={t('metronomeBar.hide')}>
                ×
              </button>
            </div>

            <div className="display-options-drawer-body">
              {/* Guitar only — "Chord" (full 6-string shape) vs "Triad"
                  (3-notes-per-string-set voicing) is a fretboard-shape
                  concept with no piano equivalent: computePianoChordTones
                  doesn't take this mode at all, so the toggle was a
                  no-op on piano, silently doing nothing when clicked. */}
              {instrument === 'guitar' && (
                <div className="settings-field">
                  {t('modeToggle.label')}
                  <ModeToggle mode={mode} onChange={setMode} />
                </div>
              )}

              {/* Guitar only, same reason — "Fingering" labels are computed
                  from a fretboard shape (Fretboard.jsx's assignFingers);
                  PianoKeyboard has no fingering-label concept at all (its
                  own finger-number badges, used by the Piano course, are a
                  separate per-lesson prop, not tied to this toggle). */}
              {instrument === 'guitar' && (
                <div className="settings-field">
                  {t('labelModeToggle.label')}
                  <LabelModeToggle labelMode={labelMode} onChange={setLabelMode} />
                </div>
              )}

              <div className="settings-field">
                {t('colorModeToggle.label')}
                <ColorModeToggle colorMode={colorMode} onChange={setColorMode} />
              </div>

              {/* Piano only — the real 2-hand accompaniment pattern method
                  books teach: left hand plays the root alone an octave down,
                  right hand plays the chord exactly as already resolved
                  above (root position or whichever inversion is selected).
                  Guitar has no equivalent (a fretboard shape is already
                  played with both hands together, not split by role). */}
              {instrument === 'piano' && (
                <div className="settings-field" title={t('displayOptions.twoHandViewHint')}>
                  {t('displayOptions.twoHandView')}
                  <div className="mode-toggle" role="group" aria-label={t('displayOptions.twoHandView')}>
                    <button type="button" className={!twoHandView ? 'active' : ''} onClick={() => setTwoHandView(false)}>
                      {t('displayOptions.off')}
                    </button>
                    <button type="button" className={twoHandView ? 'active' : ''} onClick={() => setTwoHandView(true)}>
                      {t('displayOptions.on')}
                    </button>
                  </div>
                </div>
              )}

              <div className="display-options-divider" />

              {/* Same mode-toggle pill as every other row here (not the
                  iOS-style switch used elsewhere in the app, e.g.
                  PlaybackControls' Auto-play) — per explicit request, so
                  every control in this drawer reads as one consistent
                  segmented-button size/style, not a visually different
                  control for just this one setting. */}
              <div className="settings-field" title={t('compose.heatMapHint')}>
                {t('compose.heatMap')}
                <div className="mode-toggle" role="group" aria-label={t('compose.heatMap')}>
                  <button type="button" className={!showHeatMap ? 'active' : ''} onClick={() => setShowHeatMap(false)}>
                    {t('displayOptions.off')}
                  </button>
                  <button type="button" className={showHeatMap ? 'active' : ''} onClick={() => setShowHeatMap(true)}>
                    {t('displayOptions.on')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
