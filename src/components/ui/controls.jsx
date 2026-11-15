import { useEffect, useRef } from 'react';
import './ui.css';

// The controls library (v1.0.195) — ONE button, switch, segmented control
// and stepper for the whole app, after Apple's HIG (canvas "ספריית פקדים
// DudeStar"). New UI uses these; old screens move over one by one.

/**
 * Button. variant: 'filled' (the screen's one primary action) | 'tinted' |
 * 'gray' | 'plain'; size: 'sm' 30 | 'md' 36 | 'lg' 50; danger; icon (node,
 * before the label); iconOnly = a 44 circle (needs aria-label).
 */
export function Button({ variant = 'gray', size = 'md', danger = false, icon = null, iconOnly = false, className = '', type = 'button', children, ...rest }) {
  const cls = ['ui-btn', 'is-' + variant, 'is-' + size, danger && 'is-danger', iconOnly && 'is-icon', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {icon}
      {!iconOnly && children != null && <span className="ui-btn-label">{children}</span>}
    </button>
  );
}

/** The iOS switch. onChange(checked). Always at the END of its row. */
export function Switch({ checked, onChange, disabled = false, className = '', ...rest }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      disabled={disabled}
      className={'ui-switch ' + className}
      onClick={() => onChange?.(!checked)}
      {...rest}
    >
      <span className="ui-switch-knob" />
    </button>
  );
}

/** A row: label (+ sub) at the start, the control at the end, >= 44 tall. */
export function ControlRow({ label, sub, children, className = '' }) {
  return (
    <div className={'ui-row ' + className}>
      <span className="ui-row-text">
        <span className="ui-row-label">{label}</span>
        {sub && <span className="ui-row-sub">{sub}</span>}
      </span>
      <span className="ui-row-control">{children}</span>
    </div>
  );
}

/**
 * Segmented control: 2–5 short options that switch a view.
 * options [{value, label}], value, onChange(value).
 */
export function Segmented({ options, value, onChange, className = '', ariaLabel, ...rest }) {
  return (
    <div className={'ui-seg ' + className} role="radiogroup" aria-label={ariaLabel} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} {...rest}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? 'is-on' : ''}
          disabled={o.disabled}
          onClick={() => o.value !== value && onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Stepper (− | +): the value sits BESIDE it (pass `children` to show it).
 * Hold = repeat, faster and faster. onChange(next).
 */
export function Stepper({ value, onChange, min = -Infinity, max = Infinity, step = 1, labels = {}, children, className = '' }) {
  const hold = useRef(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  useEffect(() => () => clearTimeout(hold.current), []);
  const clamp = (n) => Math.max(min, Math.min(max, n));
  const bump = (d) => {
    const n = clamp(valueRef.current + d);
    if (n !== valueRef.current) onChange(n);
  };
  const start = (d) => {
    bump(d);
    let delay = 380;
    const again = () => {
      bump(d);
      delay = Math.max(45, delay * 0.82);
      hold.current = setTimeout(again, delay);
    };
    hold.current = setTimeout(again, delay);
  };
  const end = () => clearTimeout(hold.current);
  const key = (d, text, aria, off) => (
    <button
      type="button"
      aria-label={aria}
      disabled={off}
      onPointerDown={(e) => {
        e.preventDefault();
        start(d);
      }}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          bump(d);
        }
      }}
    >
      {text}
    </button>
  );
  return (
    <span className={'ui-stepper-wrap ' + className}>
      {children != null && <span className="ui-stepper-value">{children}</span>}
      <span className="ui-stepper" dir="ltr">
        {key(-step, '−', labels.down ?? '−', value <= min)}
        <i aria-hidden="true" />
        {key(step, '+', labels.up ?? '+', value >= max)}
      </span>
    </span>
  );
}
