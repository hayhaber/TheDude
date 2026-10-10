import { useEffect, useRef } from 'react';

const FLOOR_DB = -60;

/**
 * A thin horizontal level meter. `bind` is a ref the owner fills with an
 * update function: bind.current({ peak, rms }) (linear) or null to reset.
 * Drawn straight to the DOM, so a 60 fps meter never re-renders React.
 */
export function LevelMeter({ label, bind }) {
  const fillRef = useRef(null);
  const peakRef = useRef(null);
  const hold = useRef({ v: 0, t: 0 });

  useEffect(() => {
    bind.current = (lvl) => {
      const fill = fillRef.current;
      const pk = peakRef.current;
      if (!fill || !pk) return;
      if (!lvl) {
        fill.style.transform = 'scaleX(0)';
        pk.style.opacity = '0';
        fill.parentElement.classList.remove('is-clip');
        return;
      }
      const toPos = (lin) => {
        const db = 20 * Math.log10(lin + 1e-9);
        return Math.max(0, Math.min(1, (db - FLOOR_DB) / -FLOOR_DB));
      };
      fill.style.transform = `scaleX(${toPos(lvl.rms * 1.41).toFixed(3)})`;
      const now = performance.now();
      const p = toPos(lvl.peak);
      if (p >= hold.current.v || now - hold.current.t > 900) hold.current = { v: p, t: now };
      pk.style.opacity = hold.current.v > 0 ? '1' : '0';
      pk.style.insetInlineStart = `calc(${(hold.current.v * 100).toFixed(1)}% - 1px)`;
      fill.parentElement.classList.toggle('is-clip', lvl.peak > 0.97);
    };
    return () => {
      bind.current = null;
    };
  }, [bind]);

  return (
    <div className="amp-meter">
      <span className="amp-meter-label">{label}</span>
      <div className="amp-meter-bar" aria-hidden="true">
        <div className="amp-meter-fill" ref={fillRef} />
        <div className="amp-meter-peak" ref={peakRef} />
      </div>
    </div>
  );
}
