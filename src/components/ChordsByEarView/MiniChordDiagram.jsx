import { NOTE_FUNCTION_COLORS, MUTED_DOT_COLOR } from '../../styles/colors';

// A compact, self-contained barre-chord diagram — same visual convention
// every real chord book/chart uses (vertical grid, low E string on the
// left, an "Nfr" label when the shape doesn't start at the nut) — for the
// 6-Chord Road Map, which asks for exactly this ("chord G is 1, chord C
// below it is 4, etc.") rather than plain roman-numeral text. Deliberately
// its own small SVG instead of reusing the main <Fretboard>: that component
// pages through a wide multi-fret window with playback/paging chrome built
// in, which is the wrong shape for 6 of these sitting side by side as one
// at-a-glance chart.
const STRING_COUNT = 6;
const ROW_H = 22;
const COL_W = 18;
const TOP_PAD = 22;
const LEFT_PAD = 14;

// Picks where the diagram's grid starts: at the nut (0) whenever the shape's
// lowest fret is 0 or 1 (an open or near-open shape), otherwise right at the
// shape's own lowest fret (a moved-up barre position, labeled "Nfr" like a
// real chart). `baseFretForCell` is the fret the FIRST drawn row represents
// — fret 1 for an open/nut shape (the nut line itself is fret 0), or the
// shape's own start fret for a barre position.
function fretWindow(position) {
  const fretted = position.strings.map((s) => s.fret).filter((f) => typeof f === 'number');
  if (fretted.length === 0) return { startFret: 0, baseFretForCell: 1, rows: 3 };
  const minFret = Math.min(...fretted);
  const maxFret = Math.max(...fretted);
  const startFret = minFret <= 1 ? 0 : minFret;
  const baseFretForCell = startFret === 0 ? 1 : startFret;
  const rows = Math.max(3, maxFret - baseFretForCell + 1);
  return { startFret, baseFretForCell, rows };
}

export function MiniChordDiagram({ position, degreeLabel, romanLabel, chordText, active, onClick }) {
  if (!position) return null;
  const { startFret, baseFretForCell, rows } = fretWindow(position);
  const gridWidth = COL_W * (STRING_COUNT - 1);
  const width = LEFT_PAD + gridWidth + 10;
  const height = TOP_PAD + ROW_H * rows + 6;

  return (
    <button
      type="button"
      className={'cbe-mini-chord' + (active ? ' active' : '')}
      onClick={onClick}
      aria-label={`${romanLabel} — ${chordText}`}
    >
      <span className="cbe-mini-chord-degree">{degreeLabel}</span>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="cbe-mini-chord-svg" aria-hidden="true">
        {Array.from({ length: STRING_COUNT }).map((_, i) => {
          const x = LEFT_PAD + i * COL_W;
          return <line key={'str' + i} x1={x} y1={TOP_PAD} x2={x} y2={TOP_PAD + ROW_H * rows} stroke="var(--border)" strokeWidth="1.5" />;
        })}
        {Array.from({ length: rows + 1 }).map((_, r) => {
          const y = TOP_PAD + r * ROW_H;
          const isNut = startFret === 0 && r === 0;
          return (
            <line key={'fret' + r} x1={LEFT_PAD} y1={y} x2={LEFT_PAD + gridWidth} y2={y} stroke="var(--text)" strokeWidth={isNut ? 3.5 : 1} />
          );
        })}
        {startFret > 0 && (
          <text x={LEFT_PAD - 5} y={TOP_PAD + ROW_H * 0.7} textAnchor="end" fontSize="10" fill="var(--text-secondary)">
            {startFret}fr
          </text>
        )}
        {position.strings.map((s, stringIdx) => {
          const x = LEFT_PAD + stringIdx * COL_W;
          if (s.fret === null) {
            return (
              <text key={'mute' + stringIdx} x={x} y={TOP_PAD - 6} textAnchor="middle" fontSize="11" fill="var(--text-secondary)">
                ×
              </text>
            );
          }
          if (s.fret === 0) {
            return <circle key={'open' + stringIdx} cx={x} cy={TOP_PAD - 8} r="4" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" />;
          }
          const row = s.fret - baseFretForCell;
          const y = TOP_PAD + (row + 0.5) * ROW_H;
          const color = NOTE_FUNCTION_COLORS[s.role] ?? MUTED_DOT_COLOR;
          return <circle key={'dot' + stringIdx} cx={x} cy={y} r="6.5" fill={color} />;
        })}
      </svg>
      <span className="cbe-mini-chord-text" dir="ltr">
        {romanLabel} · {chordText}
      </span>
    </button>
  );
}
