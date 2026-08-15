import { useInfoTooltipsEnabled } from '../../hooks/useInfoTooltipsEnabled';
import { useHoverExplanation } from './useHoverExplanation';
import './InfoTooltip.css';

// Reusable contextual-help tooltip: a small "ⓘ" trigger that reveals a short
// explanation. Opens on hover, keyboard focus, OR click/tap — hover alone
// doesn't exist on touchscreens, so click is the only way a phone/tablet
// user can ever see it, and focus is what makes it reachable by keyboard.
// Closes on mouse-leave, blur, Escape (returning focus to the trigger), or
// a click outside. Renders through a portal (position:fixed, computed from
// the trigger's live getBoundingClientRect()) so it's never clipped by a
// parent's own overflow:hidden — this app has several scrollable panels
// that would otherwise cut a tooltip off mid-sentence.
//
// Usage:
//   <label>
//     Capo
//     <InfoTooltip text="Shifts every chord shape up by this many frets, without changing what you typed." />
//   </label>
//
// Gated on the app-wide "i" master switch next to Settings (see AppShell +
// hooks/InfoTooltipsProvider.jsx) — every InfoTooltip in the app renders
// nothing at all while that switch is off, per explicit request.
export function InfoTooltip({ text, label = 'More info' }) {
  const { enabled } = useInfoTooltipsEnabled();
  const { triggerRef, tooltipId, open, setOpen, hoverHandlers, renderBubble } = useHoverExplanation();

  if (!enabled) return null;

  return (
    <span className="info-tooltip">
      <button
        ref={triggerRef}
        type="button"
        className="info-tooltip-trigger"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        {...hoverHandlers}
        onClick={() => setOpen(true)}
      >
        ⓘ
      </button>

      {renderBubble(text)}
    </span>
  );
}
