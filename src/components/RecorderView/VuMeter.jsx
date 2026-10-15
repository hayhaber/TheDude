import { useEffect, useId, useRef } from 'react';

// An analog VU meter: backlit cream face, the classic -20..+3 scale (red from
// 0), a needle with real VU ballistics (~300 ms to settle) and a peak LED.
// `bind` is a ref the owner fills: bind.current({ peak, rms }) (linear) or
// null for silence — the needle is moved straight in the DOM.

const PX = 100; // needle pivot (below the face)
const PY = 150;
const SPAN = 48; // degrees each side of upright
const REF_DB = 20; // 0 VU = -20 dBFS RMS
const TAU = 0.065; // VU integration

const pos = (vu) => (10 ** (vu / 20) - 0.1) / (10 ** (3 / 20) - 0.1);
const ang = (p) => -SPAN + 2 * SPAN * p;
const at = (deg, r) => {
  const a = (deg * Math.PI) / 180;
  return [PX + r * Math.sin(a), PY - r * Math.cos(a)];
};
const f1 = (n) => Math.round(n * 10) / 10;

const MARKS = [
  { vu: -20, label: '20' },
  { vu: -10, label: '10' },
  { vu: -7, label: '7' },
  { vu: -5, label: '5' },
  { vu: -3, label: '3' },
  { vu: -2, label: '2' },
  { vu: -1, label: '1' },
  { vu: 0, label: '0' },
  { vu: 1, label: '1' },
  { vu: 2, label: '2' },
  { vu: 3, label: '3' },
];

function arc(r, a1, a2) {
  const [x1, y1] = at(a1, r);
  const [x2, y2] = at(a2, r);
  return `M${f1(x1)} ${f1(y1)} A${r} ${r} 0 0 1 ${f1(x2)} ${f1(y2)}`;
}

const A0 = ang(pos(0));
const AMIN = ang(0);
const AMAX = ang(1);
const REST = AMIN - 4;

export function VuMeter({ label, bind }) {
  const uid = useId().replace(/:/g, '');
  const needle = useRef(null);
  const led = useRef(null);
  const target = useRef(null);

  useEffect(() => {
    bind.current = (lvl) => {
      target.current = lvl;
    };
    let raf = 0;
    let p = REST;
    let last = performance.now();
    let peakAt = 0;
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const lvl = target.current;
      let want = REST;
      if (lvl && lvl.rms > 0) {
        const vu = 20 * Math.log10(lvl.rms * 1.41) + REF_DB;
        want = Math.max(REST, Math.min(AMAX + 3, ang(pos(vu))));
      }
      p += (want - p) * (1 - Math.exp(-dt / TAU));
      needle.current?.setAttribute('transform', `rotate(${f1(p)} ${PX} ${PY})`);
      if (lvl && lvl.peak > 0.89) peakAt = now;
      led.current?.classList.toggle('is-on', now - peakAt < 400);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      bind.current = null;
    };
  }, [bind]);

  return (
    <div className="tape-vu">
      <svg viewBox="0 0 200 116" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-face`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbf0c9" />
            <stop offset="1" stopColor="#ecd28c" />
          </linearGradient>
          <radialGradient id={`${uid}-glow`} cx="50%" cy="85%" r="75%">
            <stop offset="0" stopColor="#fff6d6" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fff6d6" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${uid}-clip`}>
            <rect width="200" height="116" />
          </clipPath>
        </defs>
        <rect width="200" height="116" fill={`url(#${uid}-face)`} />
        <rect width="200" height="116" fill={`url(#${uid}-glow)`} />
        {/* Scale. */}
        <path d={arc(104, AMIN, A0)} fill="none" stroke="#1c1b18" strokeWidth="1.2" />
        <path d={arc(105.5, A0, AMAX)} fill="none" stroke="#c4271d" strokeWidth="4" />
        {MARKS.map((m) => {
          const a = ang(pos(m.vu));
          const big = m.vu === -20 || m.vu === -10 || m.vu === 0 || m.vu === 3 || m.vu === -5;
          const [x1, y1] = at(a, 104);
          const [x2, y2] = at(a, big ? 113 : 110);
          const [tx, ty] = at(a, 122);
          const red = m.vu > 0 || m.vu === 0;
          return (
            <g key={m.vu}>
              <line x1={f1(x1)} y1={f1(y1)} x2={f1(x2)} y2={f1(y2)} stroke={red && m.vu > 0 ? '#c4271d' : '#1c1b18'} strokeWidth={big ? 1.6 : 1.1} />
              <text x={f1(tx)} y={f1(ty)} className={'tape-vu-num' + (m.vu > 0 ? ' is-red' : '')} textAnchor="middle" dominantBaseline="central">
                {m.label}
              </text>
            </g>
          );
        })}
        <text x="14" y="12" className="tape-vu-sign" dominantBaseline="central">
          −
        </text>
        <text x="186" y="12" className="tape-vu-sign is-red" textAnchor="end" dominantBaseline="central">
          +
        </text>
        <text x="100" y="70" className="tape-vu-big" textAnchor="middle">
          VU
        </text>
        {/* Needle, then the black pivot housing over its foot. */}
        <g clipPath={`url(#${uid}-clip)`}>
          <g ref={needle} transform={`rotate(${REST} ${PX} ${PY})`}>
            <line x1={PX} y1={PY} x2={PX} y2={PY - 120} stroke="#121212" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        </g>
        <path d="M0 94 H200 V116 H0 Z" fill="#1a1a1c" />
        <path d="M0 94 H200" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <text x="10" y="106" className="tape-vu-label" dominantBaseline="central">
          {label}
        </text>
      </svg>
      <span className="tape-vu-led" ref={led} aria-hidden="true" />
    </div>
  );
}
