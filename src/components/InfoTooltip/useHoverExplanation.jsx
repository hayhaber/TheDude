import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const VIEWPORT_MARGIN = 8; // never let the bubble touch the very edge of the screen
const TRIGGER_GAP = 8; // space between the trigger and the bubble

// Shared hover/focus-triggered explanation-bubble mechanics (positioning,
// viewport clamping, Escape-to-close, click-outside-to-close) — extracted
// out of InfoTooltip.jsx so InfoTooltipsToggle.jsx can reuse the exact same
// bubble behavior on its OWN button (a single control that both toggles a
// setting on click AND shows its own explanation on hover) without either
// duplicating this logic or being forced through InfoTooltip's own separate
// ⓘ trigger element.
export function useHoverExplanation() {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [placement, setPlacement] = useState('top');
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const tooltipId = useId();
  // Escape closes the bubble AND returns focus to the trigger (so keyboard
  // users don't lose their place) — but focusing it fires the trigger's own
  // onFocus, which would otherwise immediately reopen the very bubble
  // Escape just closed. This flag tells that one resulting onFocus call to
  // no-op instead.
  const suppressNextFocusOpen = useRef(false);

  // Prefers directly above the trigger, centered; flips below when there's
  // not enough room above, and clamps horizontally so it's always fully
  // inside the viewport rather than running off either edge.
  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let nextPlacement = 'top';
    let top = triggerRect.top - tooltipRect.height - TRIGGER_GAP;
    if (top < VIEWPORT_MARGIN) {
      nextPlacement = 'bottom';
      top = triggerRect.bottom + TRIGGER_GAP;
      // Extremely short viewport (top AND bottom both too tight) — clamp
      // rather than let it run off the bottom edge instead.
      if (top + tooltipRect.height > viewportH - VIEWPORT_MARGIN) {
        top = Math.max(VIEWPORT_MARGIN, viewportH - VIEWPORT_MARGIN - tooltipRect.height);
      }
    }

    let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, viewportW - tooltipRect.width - VIEWPORT_MARGIN));

    setPlacement(nextPlacement);
    setCoords({ top, left });
  }, []);

  // Runs before paint (not useEffect) so the bubble never flashes at its
  // initial off-screen placeholder position before snapping to the real one.
  useLayoutEffect(() => {
    if (!open) return undefined;
    reposition();

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        suppressNextFocusOpen.current = true;
        triggerRef.current?.focus();
      }
    }
    function handlePointerDown(e) {
      if (!triggerRef.current?.contains(e.target) && !tooltipRef.current?.contains(e.target)) {
        setOpen(false);
      }
    }
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [open, reposition]);

  const hoverHandlers = {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => {
      if (suppressNextFocusOpen.current) {
        suppressNextFocusOpen.current = false;
        return;
      }
      setOpen(true);
    },
    onBlur: () => setOpen(false),
  };

  function renderBubble(text) {
    if (!open) return null;
    return createPortal(
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        className={'info-tooltip-bubble' + (coords ? ' visible' : '')}
        style={coords ? { top: coords.top, left: coords.left } : { top: -9999, left: -9999 }}
        data-placement={placement}
      >
        {text}
      </div>,
      document.body
    );
  }

  return { triggerRef, tooltipId, open, setOpen, hoverHandlers, renderBubble };
}
