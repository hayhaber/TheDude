import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { INSTRUMENTS } from '../../instruments/instrumentRegistry';
import { useInstrument } from '../../instruments/useInstrument';
import { useLanguage } from '../../i18n/LanguageContext';
import './InstrumentToggle.css';

// `icon` is either an emoji string or a component reference (see
// instrumentRegistry.js's own comment) — same one-line convention
// AppShell.jsx's SectionIcon already uses for nav icons.
function InstrumentIcon({ icon: Icon }) {
  return typeof Icon === 'string' ? Icon : <Icon />;
}

// Self-contained (reads/writes instrument via context), same global,
// one-click-from-anywhere placement as LanguageToggle. A custom dropdown
// (button + small anchored menu) rather than the segmented-pill toggle this
// used to be — 3 instruments' worth of icon+label pills stopped fitting the
// narrow sidebar/mobile-settings drawer this renders in (Bass's pill
// overflowed past the drawer edge), and per this app's own >2-options rule
// a real dropdown reads better here than squeezing pills further. Built as
// a real button+listbox (not a native <select>) specifically so each
// option can show its own icon, not just text.
export function InstrumentToggle() {
  const { instrument, setInstrument } = useInstrument();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const current = INSTRUMENTS.find((i) => i.key === instrument) ?? INSTRUMENTS[0];

  useEffect(() => {
    if (!open) return undefined;

    function positionMenu() {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuRect({ top: rect.bottom + 6, left: rect.left, minWidth: rect.width });
    }
    positionMenu();

    function handlePointerDown(e) {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function choose(key) {
    setInstrument(key);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="instrument-dropdown">
      <button
        ref={triggerRef}
        type="button"
        className={'instrument-dropdown-trigger' + (open ? ' open' : '')}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('instrument.label')}
      >
        <span className="instrument-dropdown-icon" aria-hidden="true">
          <InstrumentIcon icon={current.icon} />
        </span>
        <span className="instrument-dropdown-label">{t(current.labelKey)}</span>
        <svg className="instrument-dropdown-chevron" viewBox="0 0 12 8" width="10" height="7" aria-hidden="true">
          <path d="M1 1 L6 6 L11 1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open &&
        menuRect &&
        createPortal(
          <div
            ref={menuRef}
            className="instrument-dropdown-menu"
            role="listbox"
            aria-label={t('instrument.label')}
            style={{ top: menuRect.top, left: menuRect.left, minWidth: menuRect.minWidth }}
          >
            {INSTRUMENTS.map((i) => (
              <button
                key={i.key}
                type="button"
                role="option"
                aria-selected={instrument === i.key}
                className={'instrument-dropdown-option' + (instrument === i.key ? ' active' : '')}
                onClick={() => choose(i.key)}
              >
                <span className="instrument-dropdown-option-icon" aria-hidden="true">
                  <InstrumentIcon icon={i.icon} />
                </span>
                <span className="instrument-dropdown-option-label">{t(i.labelKey)}</span>
                {instrument === i.key && (
                  <svg className="instrument-dropdown-check" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                    <path d="M3 8.5 L6.5 12 L13 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
