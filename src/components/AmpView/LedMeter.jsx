import { useEffect, useRef } from 'react';

const FLOOR_DB = -60;
const LEDS = 10;
// 7 green, 2 amber, 1 red — like the ladder on a real panel.
const COLOR = (i) => (i >= LEDS - 1 ? 'r' : i >= LEDS - 3 ? 'a' : 'g');

/**
 * A row of panel LEDs (the amp's In/Out level). Same `bind` contract as
 * LevelMeter: bind.current({ peak, rms }) (linear) or null to reset. Writes
 * class names straight to the DOM, only when a LED changes.
 */
export function LedMeter({ label, bind }) {
  const rowRef = useRef(null);
  const hold = useRef({ v: 0, t: 0 });
  const shown = useRef('');

  useEffect(() => {
    const leds = () => rowRef.current?.children ?? [];
    bind.current = (lvl) => {
      const els = leds();
      if (!els.length) return;
      let lit = 0;
      let pk = -1;
      if (lvl) {
        const toPos = (lin) => {
          const db = 20 * Math.log10(lin + 1e-9);
          return Math.max(0, Math.min(1, (db - FLOOR_DB) / -FLOOR_DB));
        };
        lit = Math.round(toPos(lvl.rms * 1.41) * LEDS);
        const now = performance.now();
        const p = toPos(lvl.peak);
        if (p >= hold.current.v || now - hold.current.t > 900) hold.current = { v: p, t: now };
        pk = hold.current.v > 0 ? Math.min(LEDS - 1, Math.max(0, Math.ceil(hold.current.v * LEDS) - 1)) : -1;
        if (lvl.peak > 0.97) pk = LEDS - 1;
      } else {
        hold.current = { v: 0, t: 0 };
      }
      const key = `${lit}|${pk}`;
      if (key === shown.current) return;
      shown.current = key;
      for (let i = 0; i < els.length; i++) els[i].classList.toggle('is-lit', i < lit || i === pk);
    };
    return () => {
      bind.current = null;
    };
  }, [bind]);

  return (
    <div className="amp-ledmeter">
      <span className="amp-engrave amp-ledmeter-label">{label}</span>
      <span className="amp-ledmeter-row" ref={rowRef} aria-hidden="true">
        {Array.from({ length: LEDS }, (_, i) => (
          <span key={i} className={`amp-ledmeter-led c-${COLOR(i)}`} />
        ))}
      </span>
    </div>
  );
}
