import { useEffect, useRef } from 'react';

// A classic wooden pyramid metronome (Maelzel style), drawn in SVG: the
// pendulum swings in time with the clicks and the sliding weight sits at
// the tempo on the printed scale (higher = slower, as on the real thing).
// The pendulum passes the centre ON each click (sin curve over one beat),
// so it starts from rest without a jump. Drag up/down on the metronome (or
// use the arrow keys) to set the tempo; beat lamps on the base.

const W = 240;
const PIVOT_X = 120;
const PIVOT_Y = 252;
const ROD_TOP = 26; // the rod's tip (y)
const D_SLOW = 196; // weight distance from the pivot at the slowest tempo
const D_FAST = 44; // … and at the fastest
const SWING_DEG = 24;
const SCALE_MARKS = [40, 50, 60, 72, 84, 96, 108, 120, 138, 160, 184, 208, 240, 280];
const LABELLED = new Set([40, 60, 84, 120, 184, 280]);

function weightDistance(bpm, min, max) {
  const f = (Math.log(bpm) - Math.log(min)) / (Math.log(max) - Math.log(min));
  return D_SLOW + (D_FAST - D_SLOW) * Math.min(1, Math.max(0, f));
}

function bpmFromDistance(d, min, max) {
  const f = (d - D_SLOW) / (D_FAST - D_SLOW);
  return Math.round(Math.exp(Math.log(min) + Math.min(1, Math.max(0, f)) * (Math.log(max) - Math.log(min))));
}

export function WoodMetronome({ bpm, setBpm, minBpm, maxBpm, isRunning, currentBeat, beatsPerMeasure, label }) {
  const svgRef = useRef(null);
  const rodRef = useRef(null);
  const anim = useRef({ beatAt: 0, side: 1, angle: 0, running: false, bpm });
  anim.current.bpm = bpm;
  anim.current.running = isRunning;

  // Each click: the pendulum is at the centre now and swings out to the
  // other side, back through the centre at the next click.
  useEffect(() => {
    if (!isRunning || currentBeat == null) return;
    const a = anim.current;
    a.beatAt = performance.now();
    a.side = -a.side;
  }, [currentBeat, isRunning]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const a = anim.current;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (a.running && a.beatAt) {
        const beat = 60000 / a.bpm;
        const phase = Math.min(1.25, (now - a.beatAt) / beat);
        a.angle = a.side * SWING_DEG * Math.sin(Math.PI * phase);
      } else {
        // Stopped: settle back to rest.
        a.angle += (0 - a.angle) * Math.min(1, dt * 6);
        if (!a.running) a.beatAt = 0;
      }
      rodRef.current?.setAttribute('transform', `rotate(${a.angle.toFixed(2)} ${PIVOT_X} ${PIVOT_Y})`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Drag up/down = move the weight = set the tempo.
  const dragRef = useRef(null);
  const yToBpm = (clientY) => {
    const box = svgRef.current.getBoundingClientRect();
    const y = ((clientY - box.top) / box.height) * 330;
    return bpmFromDistance(PIVOT_Y - y, minBpm, maxBpm);
  };
  const onPointerDown = (e) => {
    dragRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setBpm(yToBpm(e.clientY));
  };
  const onPointerMove = (e) => {
    if (dragRef.current) setBpm(yToBpm(e.clientY));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };
  const onKeyDown = (e) => {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') setBpm(bpm + step);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') setBpm(bpm - step);
    else return;
    e.preventDefault();
  };

  const d = weightDistance(bpm, minBpm, maxBpm);
  const wy = PIVOT_Y - d;
  const lamps = Array.from({ length: beatsPerMeasure }, (_, i) => i);
  const lampGap = Math.min(22, 150 / Math.max(1, beatsPerMeasure - 1));
  const lampX0 = PIVOT_X - (lampGap * (beatsPerMeasure - 1)) / 2;

  return (
    <svg
      ref={svgRef}
      className="wood-metronome"
      viewBox={`0 0 ${W} 330`}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={minBpm}
      aria-valuemax={maxBpm}
      aria-valuenow={bpm}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <defs>
        <linearGradient id="wm-wood" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#4a2410" />
          <stop offset="0.22" stopColor="#7c4421" />
          <stop offset="0.5" stopColor="#a5653a" />
          <stop offset="0.78" stopColor="#7c4421" />
          <stop offset="1" stopColor="#40200d" />
        </linearGradient>
        <linearGradient id="wm-base" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#6e3a1b" />
          <stop offset="0.12" stopColor="#8a4d26" />
          <stop offset="1" stopColor="#3a1c0b" />
        </linearGradient>
        <linearGradient id="wm-ivory" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f3ead6" />
          <stop offset="1" stopColor="#ddcfae" />
        </linearGradient>
        <linearGradient id="wm-rod" x1="0" x2="1">
          <stop offset="0" stopColor="#8e8e93" />
          <stop offset="0.5" stopColor="#f5f5f7" />
          <stop offset="1" stopColor="#7a7a80" />
        </linearGradient>
        <linearGradient id="wm-brass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f3d98a" />
          <stop offset="0.5" stopColor="#c9a03e" />
          <stop offset="1" stopColor="#8a6a1c" />
        </linearGradient>
        <clipPath id="wm-body-clip">
          <polygon points="80,8 160,8 228,270 12,270" />
        </clipPath>
      </defs>

      {/* body */}
      <polygon points="80,8 160,8 228,270 12,270" fill="url(#wm-wood)" />
      <g clipPath="url(#wm-body-clip)" opacity="0.18" stroke="#2a1205" fill="none" strokeWidth="1">
        <path d="M60 270 C 70 200, 64 120, 88 8" />
        <path d="M84 270 C 92 190, 86 110, 100 8" />
        <path d="M156 270 C 150 190, 156 110, 141 8" />
        <path d="M182 270 C 172 200, 178 120, 152 8" />
        <path d="M36 270 C 52 190, 60 110, 82 8" opacity="0.6" />
        <path d="M204 270 C 190 190, 182 110, 158 8" opacity="0.6" />
      </g>
      <polygon points="80,8 160,8 160,12 80,12" fill="#2a1205" opacity="0.35" />
      {/* the scale panel, recessed */}
      <polygon points="99,22 141,22 150,238 90,238" fill="#2a1205" opacity="0.45" />
      <polygon points="101,24 139,24 147,236 93,236" fill="url(#wm-ivory)" />
      {SCALE_MARKS.filter((m) => m >= minBpm && m <= maxBpm).map((m) => {
        const y = PIVOT_Y - weightDistance(m, minBpm, maxBpm);
        if (y < 30 || y > 232) return null;
        const big = LABELLED.has(m);
        return (
          <g key={m}>
            {/* ticks right of the rod, numbers left of it (the rod rests on the centre line) */}
            <line x1={125} x2={big ? 136 : 131} y1={y} y2={y} stroke="#6b4a22" strokeWidth="1" />
            {big && (
              <text x={115} y={y + 3} textAnchor="end" className="wm-scale-text">
                {m}
              </text>
            )}
          </g>
        );
      })}

      {/* pendulum: rod + sliding weight, swinging round the pivot */}
      <g ref={rodRef}>
        <rect x={PIVOT_X - 1.6} y={ROD_TOP} width="3.2" height={PIVOT_Y - ROD_TOP} rx="1.6" fill="url(#wm-rod)" />
        <circle cx={PIVOT_X} cy={ROD_TOP} r="2.6" fill="#d9d9de" />
        <g transform={`translate(${PIVOT_X} ${wy})`}>
          <path d="M-13 -9 L13 -9 L10 9 L-10 9 Z" fill="url(#wm-brass)" stroke="#6e5214" strokeWidth="0.8" />
          <line x1="-10" x2="10" y1="0" y2="0" stroke="#7a5c18" strokeWidth="1" opacity="0.7" />
        </g>
      </g>

      {/* base */}
      <rect x="6" y="268" width="228" height="56" rx="5" fill="url(#wm-base)" />
      <rect x="6" y="268" width="228" height="5" rx="2" fill="#a96a3e" opacity="0.6" />
      <circle cx={PIVOT_X} cy={PIVOT_Y} r="5" fill="#2a1205" />
      <circle cx={PIVOT_X} cy={PIVOT_Y} r="2.6" fill="url(#wm-brass)" />
      {/* beat lamps (accent = amber) */}
      {lamps.map((i) => {
        const on = isRunning && currentBeat === i;
        return (
          <circle
            key={i}
            cx={lampX0 + i * lampGap}
            cy="287"
            r="4.2"
            className={'wm-lamp' + (i === 0 ? ' is-accent' : '') + (on ? ' is-on' : '')}
          />
        );
      })}
      {/* plaque */}
      <rect x="82" y="300" width="76" height="15" rx="2" fill="url(#wm-brass)" />
      <text x={PIVOT_X} y="311" textAnchor="middle" className="wm-plaque-text">
        DUDESTAR
      </text>
    </svg>
  );
}
