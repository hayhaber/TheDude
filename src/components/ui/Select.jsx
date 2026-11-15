import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ui.css';

// The Apple pop-up button (v1.0.195, the controls library). A drop-in for
// <select>: the SAME native element with the same props / children / events,
// drawn as a grey capsule with the chosen option + ⌃⌄ (HIG "Pop-up buttons").
// - Touch (iPhone / iPad / Android): the system's own menu opens — on iOS
//   that is Apple's native UIMenu, nothing to imitate.
// - Mouse / trackpad: a Liquid Glass menu (✓ beside the chosen row) instead
//   of the browser's list (Windows / Chrome draws its own).
// Choosing writes the native value and fires a real `change` event, so every
// caller's onChange(e => e.target.value) keeps working unchanged.

const finePointer = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

function readOptions(sel) {
  const out = [];
  const add = (o, group) => {
    if (o.hidden) return;
    out.push({ kind: 'option', value: o.value, label: o.text, disabled: o.disabled, selected: o.selected, group });
  };
  for (const el of sel.children) {
    if (el.tagName === 'OPTGROUP') {
      if (el.hidden) continue;
      out.push({ kind: 'group', label: el.label, disabled: el.disabled });
      for (const o of el.children) if (o.tagName === 'OPTION') add(o, true);
    } else if (el.tagName === 'OPTION') add(el, false);
  }
  return out;
}

const setNativeValue = (sel, value) => {
  const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  set.call(sel, value);
  sel.dispatchEvent(new Event('input', { bubbles: true }));
  sel.dispatchEvent(new Event('change', { bubbles: true }));
};

export const Select = forwardRef(function Select({ className = '', onMouseDown, onPointerDown, onKeyDown, ...props }, outerRef) {
  const ref = useRef(null);
  const lastPointer = useRef('mouse');
  const [menu, setMenu] = useState(null); // {items, rect, dir}
  const setRefs = useCallback(
    (el) => {
      ref.current = el;
      if (typeof outerRef === 'function') outerRef(el);
      else if (outerRef) outerRef.current = el;
    },
    [outerRef],
  );

  const open = () => {
    const sel = ref.current;
    if (!sel || sel.disabled) return;
    const items = readOptions(sel);
    if (!items.some((i) => i.kind === 'option')) return;
    setMenu({ items, rect: sel.getBoundingClientRect(), dir: getComputedStyle(sel).direction });
  };
  const close = (refocus) => {
    setMenu(null);
    if (refocus) ref.current?.focus({ preventScroll: true });
  };
  const choose = (value) => {
    const sel = ref.current;
    close(true);
    if (sel && sel.value !== value) setNativeValue(sel, value);
  };

  return (
    <>
      <select
        {...props}
        ref={setRefs}
        className={'ui-select ' + className}
        onPointerDown={(e) => {
          lastPointer.current = e.pointerType || 'mouse';
          onPointerDown?.(e);
        }}
        onMouseDown={(e) => {
          onMouseDown?.(e);
          if (e.defaultPrevented || e.button !== 0) return;
          if (lastPointer.current !== 'mouse' || !finePointer()) return; // touch: the system menu
          e.preventDefault();
          ref.current?.focus({ preventScroll: true });
          if (menu) close(false);
          else open();
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented || !finePointer()) return;
          if (e.key === 'Enter' || e.key === ' ' || ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.altKey) || e.key === 'F4') {
            e.preventDefault();
            open();
          }
        }}
      />
      {menu && createPortal(<SelectMenu menu={menu} onChoose={choose} onClose={close} anchor={ref} />, document.body)}
    </>
  );
});

function SelectMenu({ menu, onChoose, onClose, anchor }) {
  const popRef = useRef(null);
  const opts = menu.items.map((it, i) => ({ it, i })).filter(({ it }) => it.kind === 'option' && !it.disabled);
  const [hi, setHi] = useState(() => {
    const s = menu.items.findIndex((it) => it.kind === 'option' && it.selected);
    return s >= 0 ? s : opts[0]?.i ?? -1;
  });

  // Place under (or above) the button, inside the window; the chosen row in view.
  useLayoutEffect(() => {
    const pop = popRef.current;
    if (!pop) return;
    const r = menu.rect;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const gap = 6;
    const below = vh - r.bottom - gap - 8;
    const above = r.top - gap - 8;
    const want = pop.scrollHeight;
    const down = below >= Math.min(want, 260) || below >= above;
    const maxH = Math.max(120, Math.min(want, down ? below : above));
    pop.style.maxHeight = maxH + 'px';
    pop.style.top = (down ? r.bottom + gap : r.top - gap - maxH) + 'px';
    const w = Math.min(Math.max(r.width, pop.offsetWidth), vw - 16);
    pop.style.minWidth = Math.min(r.width, vw - 16) + 'px';
    let left = menu.dir === 'rtl' ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, vw - 8 - w));
    pop.style.left = left + 'px';
    pop.dataset.side = down ? 'down' : 'up';
    pop.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [menu]);

  useEffect(() => {
    const onDown = (e) => {
      if (popRef.current?.contains(e.target) || anchor.current === e.target) return;
      onClose(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Tab') {
        e.preventDefault();
        onClose(e.key === 'Escape');
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const k = opts.findIndex((o) => o.i === hi);
        const n = e.key === 'ArrowDown' ? Math.min(opts.length - 1, k + 1) : Math.max(0, k - 1);
        setHi(opts[n]?.i ?? hi);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        setHi((e.key === 'Home' ? opts[0] : opts[opts.length - 1])?.i ?? hi);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const it = menu.items[hi];
        if (it?.kind === 'option' && !it.disabled) onChoose(it.value);
      } else if (e.key.length === 1) {
        // type-ahead: the next row starting with that letter
        const ch = e.key.toLowerCase();
        const k = opts.findIndex((o) => o.i === hi);
        const order = [...opts.slice(k + 1), ...opts.slice(0, k + 1)];
        const m = order.find((o) => o.it.label.trim().toLowerCase().startsWith(ch));
        if (m) setHi(m.i);
      }
    };
    const onResize = () => onClose(false);
    const onScroll = (e) => {
      if (!popRef.current?.contains(e.target)) onClose(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [hi, opts, menu, onChoose, onClose, anchor]);

  useLayoutEffect(() => {
    popRef.current?.querySelector(`[data-i="${hi}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [hi]);

  return (
    <div className="ui-menu" role="listbox" ref={popRef} dir={menu.dir}>
      {menu.items.map((it, i) =>
        it.kind === 'group' ? (
          <div key={i} className="ui-menu-group" role="presentation">
            {it.label}
          </div>
        ) : (
          <div
            key={i}
            data-i={i}
            role="option"
            aria-selected={it.selected}
            aria-disabled={it.disabled || undefined}
            className={'ui-menu-item' + (i === hi ? ' is-hi' : '') + (it.group ? ' in-group' : '') + (it.disabled ? ' is-disabled' : '')}
            onPointerEnter={() => !it.disabled && setHi(i)}
            onClick={() => !it.disabled && onChoose(it.value)}
          >
            <span className="ui-menu-check" aria-hidden="true">
              {it.selected && (
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="ui-menu-label">{it.label}</span>
          </div>
        ),
      )}
    </div>
  );
}
