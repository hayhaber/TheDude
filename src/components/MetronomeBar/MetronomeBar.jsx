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
  const { isRunning, bpm } = metronome;
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
    <>
      {/* One compact button — opens the full metronome drawer, mirroring
          TunerBar's pill. The in-bar Play/Stop moved into the drawer so
          the two nav pills can sit side by side. */}
      <button
        type="button"
        className={'metronome-bar' + (isRunning ? ' running' : '')}
        onClick={() => setOpen(true)}
        aria-label={t('metronome.title')}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="metronome-bar-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.3 18.3 L9.8 4 L14.2 4 L17.7 18.3 Z" />
            <path d="M4.6 20.7 H19.4" />
            <path d="M12 5 L9.5 14.8" />
            <circle cx="10.5" cy="10.8" r="1.35" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span className="metronome-bar-bpm">
          {bpm} <span className="metronome-bar-bpm-unit">BPM</span>
        </span>
        <span className="metronome-bar-chevron" aria-hidden="true">›</span>
      </button>

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
    </>
  );
}
