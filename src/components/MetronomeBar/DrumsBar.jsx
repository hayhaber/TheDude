import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DrumMachine } from '../Metronome/DrumMachine';
import { useLanguage } from '../../i18n/LanguageContext';
import './MetronomeBar.css';

// The drum machine's pill, next to the metronome's wherever that one is
// (app top bar on desktop, the bar above the tabs on phones/tablets) — the
// same pill shape and the same drawer, with the DrumMachine in it (user's
// request 2026-10-17). Closing the drawer leaves the drums playing, as the
// metronome's drawer does.
export function DrumsBar({ metronome, drums }) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const running = metronome.isRunning && drums.drumsActive;

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={'metronome-bar drums-bar' + (running ? ' running' : '')}
        onClick={() => setOpen(true)}
        aria-label={t('drums.title')}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="metronome-bar-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="11" rx="7.5" ry="2.6" />
            <path d="M4.5 11v5.5c0 1.4 3.4 2.6 7.5 2.6s7.5-1.2 7.5-2.6V11" />
            <path d="M9.5 8.6 5 3.5M14.5 8.6 19 3.5" />
          </svg>
        </span>
        <span className="metronome-bar-bpm">{t('drums.nav')}</span>
        <span className="metronome-bar-chevron" aria-hidden="true">›</span>
      </button>

      {createPortal(
        <>
          <div className={'metronome-drawer-scrim' + (open ? ' open' : '')} aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            className={'metronome-drawer expanded drums-drawer' + (open ? ' open' : '')}
            role="dialog"
            aria-modal="true"
            aria-label={t('drums.title')}
            inert={!open}
          >
            <div className="metronome-drawer-header">
              <h2 className="metronome-drawer-title">{t('drums.title')}</h2>
              <button type="button" className="metronome-drawer-close" onClick={() => setOpen(false)} aria-label={t('metronomeBar.hide')}>
                ×
              </button>
            </div>
            <div className="metronome-drawer-body">{open && <DrumMachine {...metronome} drums={drums} />}</div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
