// A small chord box (chord-book style): 6 strings, low E on the left, the
// nut on top for an open shape or an "Nfr" label for a shape up the neck.
// `shape` = [fret|null × 6] (low E first), from chordShape() in
// music/chordChart.js.
const COL = 13;
const ROW = 15;
const TOP = 16;
const LEFT = 16;

export function ChordShapeDiagram({ shape, size = 1 }) {
  if (!shape) return null;
  const fretted = shape.filter((f) => typeof f === 'number' && f > 0);
  const min = fretted.length ? Math.min(...fretted) : 1;
  const max = fretted.length ? Math.max(...fretted) : 1;
  const open = max <= 4;
  const first = open ? 1 : min; // fret of the first drawn row
  const rows = Math.max(4, max - first + 1);
  const w = LEFT + COL * 5 + 10;
  const h = TOP + ROW * rows + 6;
  // A barre: the lowest fret held on 3+ strings, first to last of them.
  const atMin = shape.map((f, i) => (f === min ? i : -1)).filter((i) => i >= 0);
  let barre = null;
  // (No open strings: A's three fret-2 notes are fingers, not a barre.)
  if (fretted.length && atMin.length >= 2 && !shape.includes(0)) {
    const from = atMin[0];
    const to = atMin[atMin.length - 1];
    if (to - from >= 2 && shape.slice(from, to + 1).every((f) => f != null && f >= min)) barre = { from, to };
  }
  return (
    <svg
      className="gpc-diagram"
      viewBox={`0 0 ${w} ${h}`}
      width={w * size}
      height={h * size}
      aria-hidden="true"
      dir="ltr"
    >
      {[0, 1, 2, 3, 4, 5].map((s) => (
        <line key={'s' + s} x1={LEFT + s * COL} y1={TOP} x2={LEFT + s * COL} y2={TOP + ROW * rows} className="gpc-d-string" />
      ))}
      {Array.from({ length: rows + 1 }, (_, r) => (
        <line
          key={'f' + r}
          x1={LEFT}
          x2={LEFT + COL * 5}
          y1={TOP + r * ROW}
          y2={TOP + r * ROW}
          className={r === 0 && open ? 'gpc-d-nut' : 'gpc-d-fret'}
        />
      ))}
      {!open && (
        <text x={LEFT - 4} y={TOP + ROW * 0.68} textAnchor="end" className="gpc-d-label">
          {first}
        </text>
      )}
      {barre && (
        <rect
          x={LEFT + barre.from * COL - 4.5}
          y={TOP + (min - first + 0.5) * ROW - 4.5}
          width={(barre.to - barre.from) * COL + 9}
          height={9}
          rx={4.5}
          className="gpc-d-dot"
        />
      )}
      {shape.map((f, s) => {
        const x = LEFT + s * COL;
        if (f == null) {
          return (
            <text key={'m' + s} x={x} y={TOP - 4} textAnchor="middle" className="gpc-d-label">
              ×
            </text>
          );
        }
        if (f === 0) return <circle key={'o' + s} cx={x} cy={TOP - 7} r={3.2} className="gpc-d-open" />;
        if (barre && f === min && s >= barre.from && s <= barre.to) return null;
        return <circle key={'d' + s} cx={x} cy={TOP + (f - first + 0.5) * ROW} r={4.6} className="gpc-d-dot" />;
      })}
    </svg>
  );
}
