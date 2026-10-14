/**
 * A chrome bat-handle toggle on the amp panel. `up` = lever up (ON / PLAY).
 * A real <button>: Space/Enter toggle it, aria-pressed carries the state.
 */
export function ToggleSwitch({ className = '', caption, up, pressed, label, onClick, disabled = false, busy = false }) {
  return (
    <div className={'amp-toggle-wrap' + (disabled ? ' is-disabled' : '')}>
      <span className="amp-engrave amp-toggle-top">ON</span>
      <button
        type="button"
        className={`amp-toggle ${className}` + (up ? ' is-up' : ' is-down') + (busy ? ' is-busy' : '')}
        aria-pressed={pressed}
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
      >
        <span className="amp-toggle-nut" aria-hidden="true" />
        <span className="amp-toggle-bat" aria-hidden="true" />
      </button>
      <span className="amp-engrave amp-toggle-caption">{caption}</span>
    </div>
  );
}
