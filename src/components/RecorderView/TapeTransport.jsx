import { useEffect, useId, useRef } from 'react';

// The reel-to-reel transport drawn in one SVG: two 10.5" metal (NAB) reels,
// the tape pack moving from the left reel to the right one as the take
// runs, the tape path down to the guide rollers and across the heads.
// Reels turn on a requestAnimationFrame clock (not a CSS animation): tape
// runs at a constant speed, so each reel's angular speed is speed / pack
// radius and changes all the time — and a reel speeds up / coasts down with
// a little inertia, like a real motor.

const W = 640;
const H = 340;
const R = 128; // flange
const HUB = 46; // tape hub (empty reel)
const FULL = 118; // full pack
const L = { x: 165, y: 148 };
const RR = { x: 475, y: 148 };
const ROLL_R = 11;
const ROLL_L = { x: 238, y: 300 };
const ROLL_RT = { x: 402, y: 300 };
const TAPE_Y = ROLL_L.y - ROLL_R;
const K = 0.32 * 360 * FULL; // deg/s at radius 1 (≈0.32 rev/s on a full pack)
const WIND = 9; // fast wind multiple

const f1 = (n) => Math.round(n * 10) / 10;
const pol = (r, a) => [r * Math.cos(a), r * Math.sin(a)];

/** An annular-sector window (rounded corners) in reel coordinates. */
function windowPath(r1, r2, a1, a2, c) {
  const d1 = c / r1;
  const d2 = c / r2;
  const P = (r, a) => pol(r, a).map(f1).join(' ');
  return [
    `M${P(r1 + c, a1)}`,
    `Q${P(r1, a1)} ${P(r1, a1 + d1)}`,
    `A${r1} ${r1} 0 0 1 ${P(r1, a2 - d1)}`,
    `Q${P(r1, a2)} ${P(r1 + c, a2)}`,
    `L${P(r2 - c, a2)}`,
    `Q${P(r2, a2)} ${P(r2, a2 - d2)}`,
    `A${r2} ${r2} 0 0 0 ${P(r2, a1 + d2)}`,
    `Q${P(r2, a1)} ${P(r2 - c, a1)}`,
    'Z',
  ].join(' ');
}

const RAD = Math.PI / 180;
const WINDOWS = [-90, 30, 150].map((mid) => windowPath(54, 114, (mid - 35) * RAD, (mid + 35) * RAD, 8));

/** Pack radius for a share of the tape (area-proportional). */
const packR = (share) => Math.sqrt(HUB * HUB + Math.max(0, Math.min(1, share)) * (FULL * FULL - HUB * HUB));

/** Where the tape leaves a pack (center c, radius r) toward point q. */
function tangent(c, r, q, side) {
  const dx = q.x - c.x;
  const dy = q.y - c.y;
  const d = Math.hypot(dx, dy);
  const th = Math.atan2(dy, dx);
  const al = Math.acos(Math.min(1, r / d));
  const a = th + side * al;
  return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
}

function Reel({ c, r, uid, gid, rotRef, lightRef }) {
  return (
    <g transform={`translate(${c.x} ${c.y})`}>
      <circle cx="5" cy="9" r={R + 4} fill={`url(#${gid}-shadow)`} />
      <g ref={rotRef}>
        <defs>
          <clipPath id={`${uid}-win`}>
            {WINDOWS.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </clipPath>
        </defs>
        {/* Front flange: spun aluminium, lit from the top left. */}
        <circle r={R} fill={`url(#${gid}-spun)`} />
        <circle r={R} fill={`url(#${uid}-light)`} />
        {/* Windows: the rear flange and the brown tape pack behind them. */}
        {WINDOWS.map((d, i) => (
          <path key={i} d={d} fill={`url(#${gid}-rear)`} />
        ))}
        <g clipPath={`url(#${uid}-win)`}>
          <circle r={f1(r)} fill={`url(#${gid}-pack)`} />
          <circle r={f1(r)} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1.2" />
        </g>
        {WINDOWS.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="rgba(0,0,0,0.38)" strokeWidth="1.4" />
        ))}
        <circle r={R - 1} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
        <circle r={R - 4.5} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
        {/* NAB hub. */}
        <circle r="26" fill={`url(#${gid}-cap)`} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
        {[0, 120, 240].map((a) => (
          <rect key={a} x="-3" y="-21" width="6" height="9" rx="1.5" fill="#2a2b2e" transform={`rotate(${a})`} />
        ))}
        <circle r="9" fill="#1c1d20" />
        <circle r="5" fill="#55585e" />
      </g>
      {/* Static highlight: counter-rotated so the light stays put. */}
      <defs>
        <linearGradient id={`${uid}-light`} ref={lightRef} gradientUnits="userSpaceOnUse" x1={-R} y1={-R} x2={R} y2={R}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.75" stopColor="#000" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
      </defs>
    </g>
  );
}

/**
 * share: 0..1 of the tape on the take-up (right) reel.
 * motion: 'stop' | 'play' | 'rew' | 'ff'.
 */
export function TapeTransport({ share, motion }) {
  const uid = useId().replace(/:/g, '');
  const leftRot = useRef(null);
  const rightRot = useRef(null);
  const leftLight = useRef(null);
  const rightLight = useRef(null);
  const rs = packR(1 - share);
  const rt = packR(share);
  const live = useRef({ motion, rs, rt });
  live.current = { motion, rs, rt };

  useEffect(() => {
    const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (still) return undefined;
    const st = { a: [0, 0], w: [0, 0], t: performance.now() };
    let raf = 0;
    const tick = (now) => {
      const dt = Math.min(0.1, (now - st.t) / 1000);
      st.t = now;
      const { motion: m, rs: r1, rt: r2 } = live.current;
      const k = m === 'play' ? 1 : m === 'ff' ? WIND : m === 'rew' ? -WIND : 0;
      const target = [(k * K) / r1, (k * K) / r2];
      // Motor inertia: spin up / coast down over ~0.25 s (winds ~0.5 s).
      const tau = Math.abs(k) > 1 ? 0.45 : 0.22;
      const g = 1 - Math.exp(-dt / tau);
      for (let i = 0; i < 2; i++) {
        st.w[i] += (target[i] - st.w[i]) * g;
        if (Math.abs(st.w[i]) < 0.5 && !k) st.w[i] = 0;
        st.a[i] = (st.a[i] + st.w[i] * dt) % 360;
      }
      const rots = [leftRot.current, rightRot.current];
      const lights = [leftLight.current, rightLight.current];
      for (let i = 0; i < 2; i++) {
        if (rots[i]) rots[i].setAttribute('transform', `rotate(${f1(st.a[i])})`);
        if (lights[i]) lights[i].setAttribute('gradientTransform', `rotate(${f1(-st.a[i])})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const qL = { x: ROLL_L.x, y: TAPE_Y };
  const qR = { x: ROLL_RT.x, y: TAPE_Y };
  const tL = tangent(L, rs, qL, 1);
  const tR = tangent(RR, rt, qR, -1);
  const tape = `M${f1(tL.x)} ${f1(tL.y)} L${qL.x} ${qL.y} L${qR.x} ${qR.y} L${f1(tR.x)} ${f1(tR.y)}`;

  return (
    <svg className="tape-transport" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-spun`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="2.6" spreadMethod="repeat">
          <stop offset="0" stopColor="#e9ebee" />
          <stop offset="0.5" stopColor="#d3d6db" />
          <stop offset="1" stopColor="#e9ebee" />
        </radialGradient>
        <radialGradient id={`${uid}-rear`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r={R}>
          <stop offset="0" stopColor="#6c7077" />
          <stop offset="1" stopColor="#8d9299" />
        </radialGradient>
        <radialGradient id={`${uid}-pack`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1.8" spreadMethod="repeat">
          <stop offset="0" stopColor="#4a3022" />
          <stop offset="0.5" stopColor="#3a2519" />
          <stop offset="1" stopColor="#4a3022" />
        </radialGradient>
        <radialGradient id={`${uid}-cap`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#c9cdd3" />
          <stop offset="1" stopColor="#8c9199" />
        </radialGradient>
        <radialGradient id={`${uid}-shadow`}>
          <stop offset="0.82" stopColor="#000" stopOpacity="0.32" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-chrome`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbfbfc" />
          <stop offset="0.5" stopColor="#a9aeb5" />
          <stop offset="1" stopColor="#dfe2e6" />
        </linearGradient>
        <linearGradient id={`${uid}-cover`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3c41" />
          <stop offset="1" stopColor="#17181b" />
        </linearGradient>
      </defs>

      {/* Head block base, behind the tape. */}
      <rect x="252" y="272" width="136" height="60" rx="9" fill="#202125" />
      {[282, 314, 346].map((x) => (
        <rect key={x} x={x} y={TAPE_Y} width="14" height="17" rx="3" fill={`url(#${uid}-chrome)`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
      ))}

      {/* The tape. */}
      <path d={tape} fill="none" stroke="#3b2618" strokeWidth="3.4" strokeLinejoin="round" />

      {/* Guide rollers (tension arms). */}
      {[ROLL_L, ROLL_RT].map((p) => (
        <g key={p.x}>
          <circle cx={p.x} cy={p.y + 1.5} r={ROLL_R + 1} fill="rgba(0,0,0,0.25)" />
          <circle cx={p.x} cy={p.y} r={ROLL_R} fill={`url(#${uid}-chrome)`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
          <circle cx={p.x} cy={p.y} r="3.4" fill="#2a2b2e" />
        </g>
      ))}

      {/* Smoked head cover with a brushed strip. */}
      <rect x="262" y="298" width="116" height="34" rx="6" fill={`url(#${uid}-cover)`} />
      <rect x="270" y="304" width="100" height="5" rx="2.5" fill="#b9bdc3" opacity="0.85" />

      <Reel c={L} r={rs} uid={`${uid}l`} gid={uid} rotRef={leftRot} lightRef={leftLight} />
      <Reel c={RR} r={rt} uid={`${uid}r`} gid={uid} rotRef={rightRot} lightRef={rightLight} />
    </svg>
  );
}
