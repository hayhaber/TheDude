import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './MoreMenu.css';

// The iOS "More" button (•••): secondary settings and actions of a screen
// in a Liquid Glass popover, so the screen keeps one clear primary row
// (stage 5 of the Apple-style redesign). Closes on a tap outside / Escape.
// The part of the screen the menu can use: inside the nearest scrolling
// box, above the floating tab bar / control bubbles at the foot.
function visibleBand(el) {
  let top = 8;
  let bottom = window.innerHeight - 8;
  for (let p = el?.parentElement; p && p !== document.body; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if (oy === 'auto' || oy === 'scroll') {
      const r = p.getBoundingClientRect();
      top = Math.max(top, r.top + 4);
      bottom = Math.min(bottom, r.bottom - 4);
      break;
    }
  }
  for (const sel of ['.app-bottom-tabs', '.stage-perf-bar']) {
    const bar = document.querySelector(sel);
    if (!bar || !bar.offsetParent) continue;
    const r = bar.getBoundingClientRect();
    if (r.height && r.top < bottom && r.bottom > window.innerHeight - 140) bottom = Math.min(bottom, r.top - 6);
  }
  return { top, bottom };
}

// even the larger side is too short: the menu scrolls inside itself
function cap(pop, room) {
  pop.style.maxHeight = `${Math.max(120, Math.floor(room))}px`;
  pop.style.overflowY = 'auto';
}

export function MoreMenu({ label, children, align = 'end', icon = null, btnClass = '', disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const popRef = useRef(null);
  // Keep the popover on screen whatever side of the row the button lands on,
  // and open it UPWARD when there's no room below (the last rows of a list),
  // as iOS menus do (v1.0.286).
  useLayoutEffect(() => {
    const pop = popRef.current;
    if (!open || !pop) return;
    pop.style.transform = '';
    pop.classList.remove('is-up');
    pop.style.maxHeight = '';
    pop.style.overflowY = '';
    const { top: visTop, bottom: visBottom } = visibleBand(ref.current);
    const btn = ref.current.getBoundingClientRect();
    const h = pop.offsetHeight;
    const below = visBottom - btn.bottom - 8;
    const above = btn.top - visTop - 8;
    if (h > below && above > below) {
      pop.classList.add('is-up');
      if (h > above) cap(pop, above);
    } else if (h > below) {
      cap(pop, below);
    }
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
      <button
        type="button"
        className={'more-menu-btn' + (btnClass ? ' ' + btnClass : '') + (open ? ' active' : '')}
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        {icon ?? (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle cx="5.5" cy="12" r="1.8" fill="currentColor" />
            <circle cx="12" cy="12" r="1.8" fill="currentColor" />
            <circle cx="18.5" cy="12" r="1.8" fill="currentColor" />
          </svg>
        )}
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
