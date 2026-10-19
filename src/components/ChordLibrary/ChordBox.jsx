// A chord-book diagram for the Chord Library: strings upright (low E on the
// left — mirrored for left-handed players), the nut on top or an "N fr"
// label, finger numbers in the dots, the root dots in the accent colour, a
// barre bar, × / ○ above the strings and the note names under them.

const COL = 15;
const ROW = 17;
const TOP = 20;
const LEFT = 20;
const ROWS = 5;

export function ChordBox({ frets, fingers, barre, roles, names, position, leftHanded = false, showNames = true }) {
  const n = frets.length;
  const order = leftHanded ? [...frets.keys()].reverse() : [...frets.keys()];
  const xOf = (s) => LEFT + order.indexOf(s) * COL;
  const first = position || 1;
  const w = LEFT + COL * (n - 1) + 14;
  const h = TOP + ROW * ROWS + (showNames ? 18 : 6);
  const yOf = (f) => TOP + (f - first + 0.5) * ROW;
  return (
    <svg className="cl-box" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" dir="ltr">
      {Array.from({ length: n }, (_, s) => (
        <line key={'s' + s} x1={xOf(s)} x2={xOf(s)} y1={TOP} y2={TOP + ROW * ROWS} className={'cl-string' + (s < 3 ? ' is-wound' : '')} />
      ))}
      {Array.from({ length: ROWS + 1 }, (_, r) => (
        <line
          key={'f' + r}
          x1={LEFT}
          x2={LEFT + COL * (n - 1)}
          y1={TOP + r * ROW}
          y2={TOP + r * ROW}
          className={r === 0 && !position ? 'cl-nut' : 'cl-fret'}
        />
      ))}
      {position > 0 && (
        <text x={leftHanded ? LEFT + COL * (n - 1) + 5 : LEFT - 5} y={TOP + ROW * 0.68} textAnchor={leftHanded ? 'start' : 'end'} className="cl-fr">
          {position}
        </text>
      )}
      {barre && (
        <rect
          x={Math.min(xOf(barre.from), xOf(barre.to)) - 6}
          y={yOf(barre.fret) - 6}
          width={Math.abs(xOf(barre.to) - xOf(barre.from)) + 12}
          height={12}
          rx={6}
          className="cl-barre"
        />
      )}
      {frets.map((f, s) => {
        const x = xOf(s);
        if (f == null)
          return (
            <text key={'m' + s} x={x} y={TOP - 6} textAnchor="middle" className="cl-mute">
              ×
            </text>
          );
        if (f === 0) return <circle key={'o' + s} cx={x} cy={TOP - 9} r={3.6} className={'cl-open' + (roles[s] === 'root' ? ' is-root' : '')} />;
        const inBarre = barre && f === barre.fret && s >= barre.from && s <= barre.to && fingers[s] === 1;
        return (
          <g key={'d' + s}>
            {!inBarre && <circle cx={x} cy={yOf(f)} r={6.2} className={'cl-dot' + (roles[s] === 'root' ? ' is-root' : roles[s] === 'bass' ? ' is-bass' : '')} />}
            {inBarre && roles[s] === 'root' && <circle cx={x} cy={yOf(f)} r={4.2} className="cl-dot is-root" />}
            {fingers[s] > 0 && (
              <text x={x} y={yOf(f) + 3.3} textAnchor="middle" className="cl-finger">
                {fingers[s]}
              </text>
            )}
          </g>
        );
      })}
      {showNames &&
        frets.map((f, s) =>
          f == null ? null : (
            <text key={'n' + s} x={xOf(s)} y={TOP + ROW * ROWS + 13} textAnchor="middle" className={'cl-note' + (roles[s] === 'root' ? ' is-root' : '')}>
              {names[s]}
            </text>
          )
        )}
    </svg>
  );
}
