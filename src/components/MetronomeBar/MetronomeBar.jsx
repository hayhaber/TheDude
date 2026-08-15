import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Metronome } from '../Metronome/Metronome';
import { useLanguage } from '../../i18n/LanguageContext';
import './MetronomeBar.css';

// Always-visible, compact — BPM, a single beat-pulse dot, and Start/Stop.
// The full Metronome component (time signature, sound, tap tempo, Drum
// Machine mixer) opens in a right-side drawer, same interaction as
// TunerBar/GuitarTuner: anchored to the top of the screen with a capped
// max-height (see .metronome-drawer's max-height, using the same
// --stage-reserve-height gap TunerBar-style components can share) so it
// never grows down far enough to cover the fretboard/piano Stage pinned at
// the bottom of the screen — that's the one thing an earlier floating-panel
// attempt got wrong (see git history), not the drawer approach itself.
// Portaled to document.body for the same reason as TunerBar's drawer:
// AppShell's nav drawer has a `transform` on itself, which would otherwise
// hijack this drawer's fixed positioning (see TunerBar.jsx's comment).
export function MetronomeBar({ metronome, drums }) {
  const [open, setOpen] = useState(false);
  const { isRunning, currentBeat, bpm, toggle } = metronome;
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
    <div className="metronome-bar-container">
      <div className="metronome-bar">
        <button
          type="button"
          className={'metronome-bar-toggle' + (isRunning ? ' running' : '')}
          onClick={toggle}
          aria-label={isRunning ? t('metronomeBar.stop') : t('metronomeBar.start')}
        >
          {isRunning ? '■' : '▶'}
        </button>

        <span className={'metronome-bar-pulse' + (isRunning && currentBeat === 0 ? ' accent' : '') + (isRunning ? ' live' : '')} aria-hidden="true" />

        <span className="metronome-bar-bpm">
          {bpm} <span className="metronome-bar-bpm-unit">BPM</span>
        </span>

        <button
          type="button"
          className={'metronome-bar-expand' + (open ? ' active' : '')}
          onClick={() => setOpen(true)}
          aria-label={open ? t('metronomeBar.hide') : t('metronomeBar.show')}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          ›
        </button>
      </div>

      {createPortal(
        <>
          <div className={'metronome-drawer-scrim' + (open ? ' open' : '')} aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            className={'metronome-drawer' + (open ? ' open' : '') + (drums?.drumsActive ? ' expanded' : '')}
            role="dialog"
            aria-modal="true"
            aria-label={t('metronome.title')}
            inert={!open}
          >
            <div className="metronome-drawer-header">
              <h2 className="metronome-drawer-title">{t('metronome.title')}</h2>
              <button type="button" className="metronome-drawer-close" onClick={() => setOpen(false)} aria-label={t('metronomeBar.hide')}>
                ×
              </button>
            </div>
            <div className="metronome-drawer-body">{open && <Metronome {...metronome} drums={drums} />}</div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
