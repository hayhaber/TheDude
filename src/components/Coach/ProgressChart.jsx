import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDate } from './coachFormat';

// A small, dependency-free line chart for the coach's daily series: one
// line (accent), dashed reference lines at the rung targets, the last value
// labelled, a hover/tap read-out of the nearest day. Time runs left to
// right in both languages.

const H = 200;
const PAD = { top: 14, right: 30, bottom: 26, left: 30 };
const DAY = 86400000;

function dayMs(day) {
  return new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)), 12).getTime();
}

function niceTicks(max, count = 4) {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

function useWidth(ref) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setW(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

export function ProgressChart({ points, targets = [], format = (v) => String(Math.round(v)), label, lang }) {
  const boxRef = useRef(null);
  const width = useWidth(boxRef);
  const [hover, setHover] = useState(null);

  const geo = useMemo(() => {
    if (!width || points.length < 2) return null;
    const xs = points.map((p) => dayMs(p.day));
    const x0 = xs[0];
    const x1 = Math.max(xs[xs.length - 1], x0 + DAY);
    const maxV = Math.max(...points.map((p) => p.value), ...targets, 1);
    const ticks = niceTicks(maxV * 1.08);
    const yMax = ticks[ticks.length - 1] || 1;
    const iw = width - PAD.left - PAD.right;
    const ih = H - PAD.top - PAD.bottom;
    const sx = (t) => PAD.left + ((t - x0) / (x1 - x0)) * iw;
    const sy = (v) => PAD.top + ih - (v / yMax) * ih;
    const pts = points.map((p, i) => ({ ...p, x: sx(xs[i]), y: sy(p.value) }));
    return { pts, ticks, sy, iw, ih, yMax };
  }, [width, points, targets]);

  const last = geo?.pts[geo.pts.length - 1];
  const active = hover != null && geo ? geo.pts[hover] : null;

  function onMove(e) {
    if (!geo) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    let best = 0;
    geo.pts.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(geo.pts[best].x - x)) best = i;
    });
    setHover(best);
  }

  return (
    <div className="coach-chart" ref={boxRef} dir="ltr">
      {geo && (
        <svg
          width={width}
          height={H}
          viewBox={`0 0 ${width} ${H}`}
          role="img"
          aria-label={label}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <title>{label}</title>
          {geo.ticks.map((v) => (
            <g key={`t${v}`} className="coach-chart-grid">
              <line x1={PAD.left} x2={PAD.left + geo.iw} y1={geo.sy(v)} y2={geo.sy(v)} />
              <text x={PAD.left - 8} y={geo.sy(v)} textAnchor="end" dominantBaseline="middle">
                {Math.round(v)}
              </text>
            </g>
          ))}
          {targets
            .filter((v) => v <= geo.yMax)
            .map((v) => (
              <g key={`r${v}`} className="coach-chart-target">
                <line x1={PAD.left} x2={PAD.left + geo.iw} y1={geo.sy(v)} y2={geo.sy(v)} />
                <text x={PAD.left + geo.iw + 6} y={geo.sy(v)} dominantBaseline="middle">
                  {Math.round(v)}
                </text>
              </g>
            ))}
          <polyline className="coach-chart-line" points={geo.pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} />
          {geo.pts.map((p, i) => (
            <circle key={p.day} className={'coach-chart-dot' + (i === geo.pts.length - 1 ? ' is-last' : '')} cx={p.x} cy={p.y} r={i === geo.pts.length - 1 ? 4.5 : 3} />
          ))}
          {!active && last && (
            <text className="coach-chart-last" x={Math.min(last.x, PAD.left + geo.iw - 4)} y={last.y - 11} textAnchor="end">
              {format(last.value)}
            </text>
          )}
          <text className="coach-chart-axis" x={PAD.left} y={H - 6} textAnchor="start">
            {formatDate(geo.pts[0].day, lang, { day: 'numeric', month: 'short' })}
          </text>
          <text className="coach-chart-axis" x={PAD.left + geo.iw} y={H - 6} textAnchor="end">
            {formatDate(last.day, lang, { day: 'numeric', month: 'short' })}
          </text>
          {active && (
            <g className="coach-chart-hover">
              <line x1={active.x} x2={active.x} y1={PAD.top} y2={PAD.top + geo.ih} />
              <circle cx={active.x} cy={active.y} r={5.5} />
            </g>
          )}
        </svg>
      )}
      {active && (
        <div
          className="coach-chart-tip"
          style={{ left: Math.max(4, Math.min(active.x - 60, width - 124)), top: Math.max(0, active.y - 52) }}
        >
          <strong>{format(active.value)}</strong>
          <span>{formatDate(active.day, lang, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        </div>
      )}
    </div>
  );
}
