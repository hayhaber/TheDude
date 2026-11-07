import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GuitarTuner } from '../GuitarTuner/GuitarTuner';
import { useInstrument } from '../../instruments/useInstrument';
import { supportsInstrument } from '../../instruments/featureCapabilities';
import { useLanguage } from '../../i18n/LanguageContext';
import './TunerBar.css';

// Compact, always-visible trigger (mirrors MetronomeBar's pill) that opens
// the full GuitarTuner in a right-side drawer — unlike MetronomeBar's inline
// expansion, the tuner's gauge/reference-row needs more room than the nav
// column has to spare, and it's a focused "one thing at a time" task rather
// than something you'd want glanceable at all times alongside the rest of
// the app. Doesn't start listening on its own — GuitarTuner only requests
// the microphone once the user presses Start inside the opened drawer.
//
// The scrim + drawer are portaled to document.body rather than rendered
// where <TunerBar> is mounted (inside AppShell's nav drawer). That nav
// drawer has `transform: translateX(...)` on itself (see AppShell.css),
// and CSS makes a transformed ancestor the containing block for any
// position:fixed descendant — so without the portal, this drawer's
// right:0/top:0/bottom:0 resolved against the nav drawer's own (offscreen,
// ~232px-wide) box instead of the viewport, landing it at the left edge of
// the screen, on top of the nav, even while "closed". Portaling to <body>
// escapes that ancestor entirely so the fixed positioning is always
// relative to the real viewport, exactly like AppShell's own nav drawer
// (which isn't nested inside anything transformed, so it never hit this).
export function TunerBar() {
  const [open, setOpen] = useState(false);
  const { instrument } = useInstrument();
  const { t } = useLanguage();
  const drawerRef = useRef(null);
  const bodyRef = useRef(null);

  // The whole tuner always shows, never a scrollbar: on a short window
  // (small laptop, browser zoom) the device is scaled down to the room the
  // drawer has (CSS zoom keeps taps where they're drawn).
  useLayoutEffect(() => {
    if (!open) return undefined;
    const fit = () => {
      const drawer = drawerRef.current;
      const tuner = bodyRef.current?.firstElementChild;
      if (!drawer || !tuner) return;
      tuner.style.zoom = '';
      const cs = getComputedStyle(drawer);
      const maxH = parseFloat(cs.maxHeight) || window.innerHeight;
      const chrome = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.rowGap || 0) + (drawer.firstElementChild?.offsetHeight ?? 0);
      const natural = tuner.offsetHeight;
      const z = natural ? Math.min(1, (maxH - chrome - 2) / natural) : 1;
      if (z < 0.995) tuner.style.zoom = String(Math.max(0.5, z));
    };
    fit();
    const timers = [requestAnimationFrame(fit), setTimeout(fit, 350)];
    window.addEventListener('resize', fit);
    return () => {
      cancelAnimationFrame(timers[0]);
      clearTimeout(timers[1]);
      window.removeEventListener('resize', fit);
    };
  }, [open]);

  // Same body-scroll-lock + Escape-to-close as AppShell's own nav drawer.
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

  // Guitar and bass (bass pages tune a bass) — hidden entirely in Piano mode
  // rather than shown with an InstrumentGate "Guitar Mode only" message,
  // since this is persistent nav chrome, not section content.
  const bass = instrument === 'bass';
  if (!bass && !supportsInstrument('pitchTrainer', instrument)) return null;

  return (
    <>
      <button type="button" className="tuner-bar" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
        <span className="tuner-bar-icon" aria-hidden="true">
          🎵
        </span>
        <span className="tuner-bar-label">{t('tunerBar.label')}</span>
        <span className="tuner-bar-chevron" aria-hidden="true">
          ›
        </span>
      </button>

      {createPortal(
        <>
          <div className={'tuner-drawer-scrim' + (open ? ' open' : '')} aria-hidden="true" onClick={() => setOpen(false)} />
          <div ref={drawerRef} className={'tuner-drawer' + (open ? ' open' : '')} role="dialog" aria-modal="true" aria-label={t('tunerBar.label')} inert={!open}>
            <div className="tuner-drawer-header">
              <h2 className="tuner-drawer-title">{t('tunerBar.label')}</h2>
              <button type="button" className="tuner-drawer-close" onClick={() => setOpen(false)} aria-label={t('tunerBar.close')}>
                ×
              </button>
            </div>
            <div className="tuner-drawer-body" ref={bodyRef}>{open && <GuitarTuner mode={bass ? 'bass' : 'guitar'} />}</div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
