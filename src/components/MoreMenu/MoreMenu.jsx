import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './MoreMenu.css';

// The iOS "More" button (•••): secondary settings and actions of a screen
// in a Liquid Glass popover, so the screen keeps one clear primary row
// (stage 5 of the Apple-style redesign). Closes on a tap outside / Escape.
export function MoreMenu({ label, children, align = 'end' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const popRef = useRef(null);
  // Keep the popover on screen whatever side of the row the button lands on.
  useLayoutEffect(() => {
    const pop = popRef.current;
    if (!open || !pop) return;
    pop.style.transform = '';
    const r = pop.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    let dx = 0;
    if (r.right > vw - 8) dx = vw - 8 - r.right;
    if (r.left + dx < 8) dx = 8 - r.left;
    if (dx) pop.style.translate = `${Math.round(dx)}px 0`;
    else pop.style.translate = '';
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <span className={'more-menu is-' + align} ref={ref}>
      <button type="button" className={'more-menu-btn' + (open ? ' active' : '')} aria-label={label} title={label} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="5.5" cy="12" r="1.8" fill="currentColor" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <circle cx="18.5" cy="12" r="1.8" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div
          className="more-menu-pop"
          role="menu"
          ref={popRef}
          // an action row closes the menu (as on iOS); switches stay open
          onClick={(e) => {
            const item = e.target.closest?.('button.more-menu-item');
            if (item && !item.hasAttribute('aria-pressed') && !item.dataset.keep) setOpen(false);
          }}
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </span>
  );
}
