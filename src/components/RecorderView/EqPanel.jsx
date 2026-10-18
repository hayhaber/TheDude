import { useEffect, useRef, useState } from 'react';
import { EQ_BANDS, EQ_LABELS, EQ_PRESETS, EQ_RANGE, clampGain, eqActive, flatEq, normEq, presetOf } from '../../audio/studio/eq';
import { RackHead } from './StudioControls';

// EQ-10: a 10-band graphic equalizer rack unit (user's request 2026-10-18),
// drawn after the classic studio 1/1-octave graphic EQs: a brushed aluminium
// face, a black window with an LED spectrum ladder over every band, long
// black-capped faders, presets per style. One EQ per track + one on the mix
// bus (Channel select). Changes are mix changes (heard at once while
// playing, no undo step) and go into the export / bounce too.

const MASTER = 'master';
const LEDS = 10;
// LED thresholds (band power from engine.outputBands(), dB): bottom LED at
// -54, top (red) at -9, 5 dB apart. 7 green, 2 amber, 1 red.
const LED_DB = Array.from({ length: LEDS }, (_, i) => -54 + i * 5);
const RELEASE_DB_S = 24; // fall speed
const HOLD_MS = 1000; // peak hold

const fmt = (db) => (db > 0 ? '+' : db < 0 ? '-' : ' ') + Math.abs(db).toFixed(1);

/** The LED spectrum: drives the lamps straight in the DOM (no re-render per frame). */
function useSpectrum(studio, cols) {
  const playing = studio.phase === 'playing';
  useEffect(() => {
    const lamps = cols.current;
    const level = EQ_BANDS.map(() => -120);
    const peak = EQ_BANDS.map(() => ({ db: -120, at: 0 }));
    const paint = (now) => {
      lamps.forEach((col, b) => {
        if (!col) return;
        const lit = LED_DB.filter((th) => level[b] >= th).length;
        const pk = LED_DB.filter((th) => peak[b].db >= th).length;
        const hold = pk > lit && now - peak[b].at < HOLD_MS;
        col.querySelectorAll('.eq-led').forEach((el, i) => {
          el.classList.toggle('is-lit', i < lit || (hold && i === pk - 1));
        });
      });
    };
    if (!playing) {
      paint(0);
      return undefined;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const bands = studio.engine.outputBands?.();
      EQ_BANDS.forEach((_, b) => {
        const v = bands ? bands[b] : -120;
        level[b] = v > level[b] ? v : Math.max(v, level[b] - RELEASE_DB_S * dt);
        if (level[b] >= peak[b].db || now - peak[b].at > HOLD_MS) peak[b] = { db: level[b], at: now };
      });
      paint(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      level.fill(-120);
      peak.forEach((p) => (p.db = -120));
      paint(0);
    };
  }, [playing, studio.engine, cols]);
}

function Fader({ value, label, disabled, onChange, onActive }) {
  const slot = useRef(null);
  const valueAt = (clientY) => {
    const r = slot.current.getBoundingClientRect();
    const share = 1 - Math.min(1, Math.max(0, (clientY - r.top - 9) / (r.height - 18)));
    return clampGain(-EQ_RANGE + share * 2 * EQ_RANGE);
  };
  const pos = (value + EQ_RANGE) / (2 * EQ_RANGE);
  return (
    <div
      ref={slot}
      className="eq-slot"
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${label} Hz`}
      aria-valuemin={-EQ_RANGE}
      aria-valuemax={EQ_RANGE}
      aria-valuenow={value}
      aria-valuetext={`${fmt(value)} dB`}
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
      <span className="eq-cap" style={{ bottom: `calc((100% - 18px) * ${pos})` }} />
    </div>
  );
}

const Scale = () => (
  <div className="eq-scale" aria-hidden="true">
    <span>+12</span>
    <span>+6</span>
    <span>0</span>
    <span>-6</span>
    <span>-12</span>
  </div>
);

export function EqPanel({ t, studio }) {
  const { project } = studio;
  const [channel, setChannel] = useState(MASTER);
  const [active, setActive] = useState(null);
  const cols = useRef([]);
  useSpectrum(studio, cols);
  if (!project) return null;
  const track = project.tracks.find((x) => x.id === channel);
  const ch = track ? track.id : MASTER;
  const eq = normEq(track ? track.eq : project.masterEq);
  const preset = presetOf(eq.gains);
  const anyOn = eqActive(project.masterEq) || project.tracks.some((x) => eqActive(x.eq));
  const setEq = (next) =>
    studio.updateMix((p) =>
      ch === MASTER ? { ...p, masterEq: next } : { ...p, tracks: p.tracks.map((x) => (x.id === ch ? { ...x, eq: next } : x)) }
    );
  const setBand = (i, v) => setEq({ ...eq, gains: eq.gains.map((g, k) => (k === i ? v : g)) });
  const readout = active != null ? `${EQ_LABELS[active].padStart(3)} ${fmt(eq.gains[active])}` : eq.on ? 'EQ  ON' : 'BYPASS';

  return (
    <div className="st-panel rk-unit rk-silver eq-unit">
      <RackHead name={t('rec.eq')} tip={t('rec.tip.eq')} model="EQ-10" led={anyOn} />
      <div className="eq-top">
        <label className="st-field eq-field">
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
        <label className="st-field eq-field">
          <span className="st-label">{t('rec.eqPreset')}</span>
          <select
            value={preset ?? 'custom'}
            onChange={(e) => {
              const p = EQ_PRESETS.find((x) => x.key === e.target.value);
              if (p) setEq({ on: true, gains: [...p.gains] });
            }}
            dir="auto"
          >
            {EQ_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {t(`rec.eqp.${p.key}`)}
              </option>
            ))}
            {!preset && <option value="custom">{t('rec.eqp.custom')}</option>}
          </select>
        </label>
        <div className="eq-display" dir="ltr" aria-live="polite">
          {readout}
        </div>
        <div className="eq-keys">
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

      <div className={'eq-window' + (eq.on ? '' : ' is-off')} dir="ltr">
        <span className="eq-corner" />
        {EQ_BANDS.map((f, b) => (
          <div key={f} className="eq-ladder" ref={(el) => (cols.current[b] = el)} aria-hidden="true">
            {LED_DB.map((th, i) => (
              <span key={th} className={'eq-led ' + (i >= LEDS - 1 ? 'is-red' : i >= LEDS - 3 ? 'is-amber' : 'is-green')} />
            ))}
          </div>
        ))}
        <span className="eq-corner" />

        <Scale />
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
        <Scale />

        <span className="eq-unit-hz">Hz</span>
        {EQ_LABELS.map((l) => (
          <span key={l} className="eq-freq">
            {l}
          </span>
        ))}
        <span className="eq-unit-hz">dB</span>
      </div>
    </div>
  );
}
