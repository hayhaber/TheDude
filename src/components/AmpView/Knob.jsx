import { useEffect, useRef, useState } from 'react';

const MIN = 0;
const MAX = 10;
const SWEEP = 270; // degrees, from 7:30 to 4:30 o'clock
const DRAG_PX = 160; // a full turn = this much vertical drag
const clamp = (v) => Math.min(MAX, Math.max(MIN, v));
const round1 = (v) => Math.round(v * 10) / 10;

function polar(cx, cy, r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arc(cx, cy, r, from, to) {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * A 0..10 knob: drag up/down (Shift = fine), arrow keys / PageUp / Home /
 * End, or tap it to type a value. Accessible as role="slider".
 */
export function Knob({ label, value, onChange, size = 64, hint, disabled = false, accent }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const dragRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const start = -SWEEP / 2;
  const angle = start + ((value - MIN) / (MAX - MIN)) * SWEEP;
  const c = 32;
  const r = 26;
  const [px, py] = polar(c, c, 15, angle);
  const [qx, qy] = polar(c, c, 6, angle);

  const onPointerDown = (e) => {
    if (disabled || e.button > 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { y: e.clientY, v: value, moved: false };
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dy = d.y - e.clientY;
    if (Math.abs(dy) > 3) d.moved = true;
    if (!d.moved) return;
    const scale = e.shiftKey ? 4 : 1;
    onChange(round1(clamp(d.v + (dy / DRAG_PX / scale) * (MAX - MIN))));
  };
  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && !d.moved && !disabled) {
      setDraft(String(round1(value)));
      setEditing(true);
    }
  };
  const onKeyDown = (e) => {
    if (disabled) return;
    const steps = { ArrowUp: 0.5, ArrowRight: 0.5, ArrowDown: -0.5, ArrowLeft: -0.5, PageUp: 2, PageDown: -2 };
    if (e.key in steps) {
      e.preventDefault();
      onChange(round1(clamp(value + steps[e.key])));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(MIN);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(MAX);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setDraft(String(round1(value)));
      setEditing(true);
    }
  };
  const commit = () => {
    const n = parseFloat(String(draft).replace(',', '.'));
    if (Number.isFinite(n)) onChange(round1(clamp(n)));
    setEditing(false);
  };

  return (
    <div className={'amp-knob' + (disabled ? ' is-disabled' : '')} style={{ '--knob-size': `${size}px`, '--knob-accent': accent }}>
      <div
        className="amp-knob-dial"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={round1(value)}
        aria-disabled={disabled || undefined}
        title={hint}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (dragRef.current = null)}
        onKeyDown={onKeyDown}
      >
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <path className="amp-knob-track" d={arc(c, c, r, start, start + SWEEP)} />
          {value > MIN && <path className="amp-knob-value" d={arc(c, c, r, start, Math.max(start + 0.5, angle))} />}
          <circle className="amp-knob-cap" cx={c} cy={c} r="19" />
          <line className="amp-knob-pointer" x1={qx} y1={qy} x2={px} y2={py} />
        </svg>
      </div>
      <span className="amp-knob-label">{label}</span>
      {editing ? (
        <input
          ref={inputRef}
          className="amp-knob-input"
          type="text"
          inputMode="decimal"
          value={draft}
          aria-label={label}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            else if (e.key === 'Escape') {
              e.stopPropagation();
              setEditing(false);
            }
          }}
        />
      ) : (
        <span className="amp-knob-readout">{round1(value).toFixed(1)}</span>
      )}
    </div>
  );
}
