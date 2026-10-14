import { useEffect, useId, useRef, useState } from 'react';

const MIN = 0;
const MAX = 10;
const SWEEP = 270; // degrees, from 7:30 to 4:30 o'clock
const DRAG_PX = 160; // a full turn = this much vertical drag
const clamp = (v) => Math.min(MAX, Math.max(MIN, v));
const round1 = (v) => Math.round(v * 10) / 10;
const START = -SWEEP / 2;
const angleOf = (v) => START + ((v - MIN) / (MAX - MIN)) * SWEEP;

function polar(cx, cy, r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

const f2 = (n) => n.toFixed(2);

// Knurled edge: short radial grooves round the rim (drawn once, rotated with
// the knob so the grip turns like a real one).
function flutes(c, r1, r2, n) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const deg = (360 / n) * i;
    const [x1, y1] = polar(c, c, r1, deg);
    const [x2, y2] = polar(c, c, r2, deg);
    d += `M${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}`;
  }
  return d;
}

const AMP_FLUTES = flutes(50, 26.5, 30, 40);
const PEDAL_FLUTES = flutes(32, 22.6, 26, 32);

// Printed 0..10 scale round an amp knob: a tick for every step, numbers 1..10.
const AMP_TICKS = (() => {
  let d = '';
  for (let v = 0; v <= 10; v++) {
    const a = angleOf(v);
    const [x1, y1] = polar(50, 50, 33, a);
    const [x2, y2] = polar(50, 50, v % 5 === 0 ? 37.5 : 36, a);
    d += `M${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}`;
  }
  return d;
})();
const AMP_NUMBERS = Array.from({ length: 10 }, (_, i) => {
  const v = i + 1;
  const [x, y] = polar(50, 50, 44, angleOf(v));
  return { v, x: f2(x), y: f2(y) };
});

function AmpKnobArt({ angle, uid }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <defs>
        <filter id={`${uid}-sh`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <radialGradient id={`${uid}-face`} cx="42%" cy="34%" r="70%">
          <stop offset="0" stopColor="#3a3a3c" />
          <stop offset="0.55" stopColor="#161617" />
          <stop offset="1" stopColor="#050505" />
        </radialGradient>
        <radialGradient id={`${uid}-cap`} cx="38%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#d9dce1" />
          <stop offset="0.7" stopColor="#8d929b" />
          <stop offset="1" stopColor="#c9cdd3" />
        </radialGradient>
      </defs>
      <path className="amp-scale-ticks" d={AMP_TICKS} />
      {AMP_NUMBERS.map((n) => (
        <text key={n.v} className="amp-scale-num" x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central">
          {n.v}
        </text>
      ))}
      <circle cx="50" cy="54" r="30" fill="rgba(0,0,0,0.55)" filter={`url(#${uid}-sh)`} />
      <g transform={`rotate(${f2(angle)} 50 50)`}>
        <circle cx="50" cy="50" r="30" fill="#0b0b0b" />
        <path d={AMP_FLUTES} stroke="#333336" strokeWidth="1.4" />
        <circle cx="50" cy="50" r="26" fill={`url(#${uid}-face)`} stroke="#000" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="13.5" fill={`url(#${uid}-cap)`} stroke="#4a4d52" strokeWidth="0.6" />
        <line x1="50" y1="36.5" x2="50" y2="22.5" stroke="#f4f1e8" strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* fixed highlight: light falls from the top-left whatever the angle */}
      <ellipse cx="44" cy="35" rx="11" ry="5" fill="rgba(255,255,255,0.14)" />
    </svg>
  );
}

function PedalKnobArt({ angle, uid }) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <defs>
        <filter id={`${uid}-sh`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <radialGradient id={`${uid}-face`} cx="40%" cy="32%" r="75%">
          <stop offset="0" stopColor="#404042" />
          <stop offset="0.5" stopColor="#18181a" />
          <stop offset="1" stopColor="#030303" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="36" r="26" fill="rgba(0,0,0,0.5)" filter={`url(#${uid}-sh)`} />
      <g transform={`rotate(${f2(angle)} 32 32)`}>
        <circle cx="32" cy="32" r="26" fill="#0a0a0a" />
        <path d={PEDAL_FLUTES} stroke="#38383b" strokeWidth="1.6" />
        <circle cx="32" cy="32" r="21.5" fill={`url(#${uid}-face)`} stroke="#000" strokeWidth="0.8" />
        <line x1="32" y1="25" x2="32" y2="12" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
      </g>
      <ellipse cx="27" cy="20" rx="9" ry="4" fill="rgba(255,255,255,0.12)" />
    </svg>
  );
}

/**
 * A 0..10 knob: drag up/down (Shift = fine), arrow keys / PageUp / Home /
 * End, or tap it to type a value. Accessible as role="slider".
 * `variant`: 'amp' (black knob with a chrome cap and a printed 1-10 scale)
 * or 'pedal' (small black stompbox knob with a white pointer).
 * `label` is the accessible name; `caption` (optional) is the engraved text.
 */
export function Knob({ label, caption, value, onChange, size, hint, disabled = false, variant = 'amp', tip }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const dragRef = useRef(null);
  const inputRef = useRef(null);
  const uid = 'k' + useId().replace(/[^a-zA-Z0-9_-]/g, '');

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const angle = angleOf(value);

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
    <div
      className={`amp-knob is-${variant}` + (disabled ? ' is-disabled' : '')}
      style={size ? { '--knob-size': `${size}px` } : undefined}
    >
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
        {variant === 'pedal' ? <PedalKnobArt angle={angle} uid={uid} /> : <AmpKnobArt angle={angle} uid={uid} />}
      </div>
      <span className="amp-knob-label">
        <span className="amp-knob-caption">{caption ?? label}</span>
        {tip}
      </span>
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
