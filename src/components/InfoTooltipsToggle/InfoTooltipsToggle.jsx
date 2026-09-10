import { useInfoTooltipsEnabled } from '../../hooks/useInfoTooltipsEnabled';
import { useHoverExplanation } from '../InfoTooltip/useHoverExplanation';
import { useLanguage } from '../../i18n/LanguageContext';
import './InfoTooltipsToggle.css';

// Master switch for every InfoTooltip (ⓘ) icon in the app, sitting next to
// the Settings gear (same 44px circular sizing/placement, see AppShell) —
// per explicit request: clicking it changes its own color to show the
// feature is now active, and only then do ⓘ icons elsewhere start appearing
// (InfoTooltip.jsx itself renders nothing while this is off). This single
// button is both the toggle (click) AND its own explanation trigger
// (hover/focus, via the shared useHoverExplanation hook also used by
// InfoTooltip) — no separate small ⓘ next to it, so turning the feature off
// doesn't remove the only way to find out what the switch does.
export function InfoTooltipsToggle() {
  const { enabled, setEnabled } = useInfoTooltipsEnabled();
  const { t } = useLanguage();
  const { triggerRef, tooltipId, open, hoverHandlers, renderBubble } = useHoverExplanation();

  return (
    <span className="info-tooltips-toggle-group">
      <button
        ref={triggerRef}
        type="button"
        className={'info-tooltips-toggle icon-circle-button' + (enabled ? ' active' : '')}
        onClick={() => setEnabled((v) => !v)}
        aria-label={t('infoTooltips.toggleLabel')}
        aria-pressed={enabled}
        aria-describedby={open ? tooltipId : undefined}
        {...hoverHandlers}
      >
        {/* Inline glyph (not the ⓘ emoji) so the active state can tint just
            the small circle + "i" blue via `color`, leaving the button's
            own background/border neutral. */}
        <svg
          className="info-tooltips-toggle-glyph"
          viewBox="0 0 24 24"
          width="17"
          height="17"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11 V16" />
          <path d="M12 7.75 V7.85" />
        </svg>
      </button>
      {renderBubble(t('infoTooltips.toggleExplanation'))}
    </span>
  );
}
