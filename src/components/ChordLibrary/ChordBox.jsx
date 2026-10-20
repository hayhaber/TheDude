// A chord-book diagram for the Chord Library: strings upright (low E on the
// left — mirrored for left-handed players), the nut on top or an "N fr"
// label, finger numbers in the dots, the root dots in the accent colour, a
// barre bar, × / ○ above the strings and the note names under them.

const COL = 15;
const ROW = 17;
const TOP = 20;
const LEFT = 20;
const ROWS = 5;

// Chord Structure lessons also use it with `roleColors` (dots coloured by
// the tone's role: 1 / 3 / 5 / 7 / extension), `moved` (strings that just
// changed: ringed) and `ghosts` ({s, fret} where a moved finger was: dashed).
export function ChordBox({ frets, fingers, barre, roles, names, position, leftHanded = false, showNames = true, roleColors = false, moved = [], ghosts = [] }) {
  const n = frets.length;
  const order = leftHanded ? [...frets.keys()].reverse() : [...frets.keys()];
  const xOf = (s) => LEFT + order.indexOf(s) * COL;
  const first = position || 1;
  const w = LEFT + COL * (n - 1) + 14;
  const h = TOP + ROW * ROWS + (showNames ? 18 : 6);
  const yOf = (f) => TOP + (f - first + 0.5) * ROW;
  const roleCls = (s) => (roleColors && roles[s] ? ' r-' + roles[s] : '') + (moved.includes(s) ? ' is-moved' : '');
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
        if (f === 0) return <circle key={'o' + s} cx={x} cy={TOP - 9} r={3.6} className={'cl-open' + (roles[s] === 'root' ? ' is-root' : '') + roleCls(s)} />;
        const inBarre = barre && f === barre.fret && s >= barre.from && s <= barre.to && fingers[s] === 1;
        return (
          <g key={'d' + s}>
            {!inBarre && <circle cx={x} cy={yOf(f)} r={6.2} className={'cl-dot' + (roles[s] === 'root' ? ' is-root' : roles[s] === 'bass' ? ' is-bass' : '') + roleCls(s)} />}
            {inBarre && roles[s] === 'root' && <circle cx={x} cy={yOf(f)} r={4.2} className="cl-dot is-root" />}
            {fingers?.[s] > 0 && (
              <text x={x} y={yOf(f) + 3.3} textAnchor="middle" className="cl-finger">
                {fingers[s]}
              </text>
            )}
          </g>
        );
      })}
      {moved.map((s) =>
        frets[s] == null ? null : (
          <circle key={'mv' + s} cx={xOf(s)} cy={frets[s] > 0 ? yOf(frets[s]) : TOP - 9} r={frets[s] > 0 ? 8.6 : 6} className="cl-moved-ring" />
        )
      )}
      {ghosts.map((g) => (
        <circle
          key={'g' + g.s}
          cx={xOf(g.s)}
          cy={g.fret > 0 ? yOf(g.fret) : TOP - 9}
          r={g.fret > 0 ? 6.2 : 3.6}
          className="cl-ghost"
        />
      ))}
      {showNames &&
        frets.map((f, s) =>
          f == null ? null : (
            <text key={'n' + s} x={xOf(s)} y={TOP + ROW * ROWS + 13} textAnchor="middle" className={'cl-note' + (roles[s] === 'root' ? ' is-root' : '') + roleCls(s)}>
              {names[s]}
            </text>
          )
        )}
    </svg>
  );
}
