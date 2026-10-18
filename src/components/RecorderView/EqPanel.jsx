import { useMemo, useRef, useState } from 'react';
import { EQ_BANDS, EQ_LABELS, EQ_RANGE, clampGain, eqActive, eqResponseDb, flatEq, normEq } from '../../audio/studio/eq';
import { RackHead } from './StudioControls';

// EQ-10: a 10-band graphic equalizer rack unit (user's request 2026-10-18).
// One EQ per track + one on the mix bus, chosen with the Channel select.
// Changes are mix changes (heard at once while playing, no undo step) and go
// into the export / bounce too.

const MASTER = 'master';
const F_MIN = 20;
const F_MAX = 20000;
const W = 600;
const H = 90;

const xOf = (f) => (Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN)) * W;
const yOf = (db) => H / 2 - (db / (EQ_RANGE + 3)) * (H / 2);
const fmt = (db) => (db > 0 ? '+' : db < 0 ? '−' : '') + Math.abs(db).toFixed(1) + ' dB';

function Curve({ eq, active, label }) {
  const path = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const f = F_MIN * Math.pow(F_MAX / F_MIN, i / 120);
      pts.push(`${xOf(f).toFixed(1)},${yOf(eqResponseDb(eq, f)).toFixed(1)}`);
    }
    return 'M' + pts.join(' L');
  }, [eq]);
  const on = eq.on;
  return (
    <div className={'eq-screen' + (on ? '' : ' is-off')}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        {[-12, -6, 6, 12].map((d) => (
          <line key={d} x1="0" x2={W} y1={yOf(d)} y2={yOf(d)} className="eq-grid" />
        ))}
        {[100, 1000, 10000].map((f) => (
          <line key={f} x1={xOf(f)} x2={xOf(f)} y1="0" y2={H} className="eq-grid" />
        ))}
        <line x1="0" x2={W} y1={yOf(0)} y2={yOf(0)} className="eq-zero" />
        <path d={`${path} L${W},${yOf(0)} L0,${yOf(0)} Z`} className="eq-fill" />
        <path d={path} className="eq-line" vectorEffect="non-scaling-stroke" />
        {EQ_BANDS.map((f, i) => (
          <line
            key={f}
            x1={xOf(f)}
            x2={xOf(f)}
            y1={yOf(on ? eq.gains[i] : 0)}
            y2={yOf(on ? eq.gains[i] : 0)}
            className={'eq-dot' + (active === i ? ' is-active' : '')}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <span className="eq-readout" dir="ltr">
        {active != null ? `${EQ_LABELS[active]} Hz  ${fmt(eq.gains[active])}` : label}
      </span>
    </div>
  );
}

function Fader({ value, label, disabled, onChange, onActive }) {
  const slot = useRef(null);
  const valueAt = (clientY) => {
    const r = slot.current.getBoundingClientRect();
    const share = 1 - Math.min(1, Math.max(0, (clientY - r.top - 8) / (r.height - 16)));
    return clampGain(-EQ_RANGE + share * 2 * EQ_RANGE);
  };
  const pos = ((value + EQ_RANGE) / (2 * EQ_RANGE)) * 100;
  return (
    <div className="eq-band">
      <div
        ref={slot}
        className="eq-slot"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${label} Hz`}
        aria-valuemin={-EQ_RANGE}
        aria-valuemax={EQ_RANGE}
        aria-valuenow={value}
        aria-valuetext={fmt(value)}
        aria-disabled={disabled || undefined}
        onPointerDown={(e) => {
          if (disabled) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture?.(e.pointerId);
          e.currentTarget.focus({ preventScroll: true });
          onActive(true);
          onChange(valueAt(e.clientY));
        }}
        onPointerMove={(e) => {
          if (!disabled && e.currentTarget.hasPointerCapture?.(e.pointerId)) onChange(valueAt(e.clientY));
        }}
        onPointerUp={() => onActive(false)}
        onPointerCancel={() => onActive(false)}
        onDoubleClick={() => !disabled && onChange(0)}
        onKeyDown={(e) => {
          if (disabled) return;
          const step = { ArrowUp: 0.5, ArrowRight: 0.5, ArrowDown: -0.5, ArrowLeft: -0.5, PageUp: 3, PageDown: -3 }[e.key];
          if (step != null) {
            e.preventDefault();
            onChange(clampGain(value + step));
          } else if (e.key === 'Home' || e.key === '0') {
            e.preventDefault();
            onChange(0);
          }
        }}
        onFocus={() => onActive(true)}
        onBlur={() => onActive(false)}
      >
        <span className="eq-groove" />
        <span className="eq-cap" style={{ bottom: `calc((100% - 16px) * ${pos / 100})` }} />
      </div>
      <span className="eq-freq">{label}</span>
    </div>
  );
}

export function EqPanel({ t, studio }) {
  const { project } = studio;
  const [channel, setChannel] = useState(MASTER);
  const [active, setActive] = useState(null);
  if (!project) return null;
  const track = project.tracks.find((x) => x.id === channel);
  const ch = track ? track.id : MASTER;
  const eq = normEq(track ? track.eq : project.masterEq);
  const anyOn = eqActive(project.masterEq) || project.tracks.some((x) => eqActive(x.eq));
  const setEq = (next) =>
    studio.updateMix((p) =>
      ch === MASTER ? { ...p, masterEq: next } : { ...p, tracks: p.tracks.map((x) => (x.id === ch ? { ...x, eq: next } : x)) }
    );
  const setBand = (i, v) => setEq({ ...eq, gains: eq.gains.map((g, k) => (k === i ? v : g)) });
  const name = track ? track.name : t('rec.eqMix');

  return (
    <div className="st-panel rk-unit rk-black eq-unit">
      <RackHead name={t('rec.eq')} tip={t('rec.tip.eq')} model="EQ-10" led={anyOn} />
      <div className="st-row eq-top">
        <label className="st-field">
          <span className="st-label">{t('rec.eqChannel')}</span>
          <select value={ch} onChange={(e) => setChannel(e.target.value)} dir="auto">
            <option value={MASTER}>{t('rec.eqMix')}</option>
            {project.tracks.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
                {eqActive(x.eq) ? ' •' : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="st-btns eq-keys">
          <button
            type="button"
            className={'st-toggle' + (eq.on ? ' is-on' : '')}
            aria-pressed={eq.on}
            onClick={() => setEq({ ...eq, on: !eq.on })}
            title={t('rec.eqBypass')}
          >
            EQ
          </button>
          <button type="button" className="amp-btn" disabled={!eq.gains.some((g) => g)} onClick={() => setEq({ ...flatEq(), on: eq.on })}>
            {t('rec.flat')}
          </button>
        </div>
      </div>
      <Curve eq={eq} active={active} label={name} />
      <div className={'eq-faders' + (eq.on ? '' : ' is-off')} dir="ltr">
        <div className="eq-scale" aria-hidden="true">
          <span>+12</span>
          <span>+6</span>
          <span>0</span>
          <span>−6</span>
          <span>−12</span>
        </div>
        {EQ_BANDS.map((f, i) => (
          <Fader
            key={f}
            value={eq.gains[i]}
            label={EQ_LABELS[i]}
            disabled={!eq.on}
            onChange={(v) => setBand(i, v)}
            onActive={(on) => setActive(on ? i : null)}
          />
        ))}
      </div>
    </div>
  );
}
