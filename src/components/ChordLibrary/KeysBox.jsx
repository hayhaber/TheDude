// A chord-book keyboard diagram for the piano Chord Library: the octaves
// the voicing needs (at least two, from a C), right-hand keys in the accent
// colour, left-hand keys blue, the root ringed, finger numbers on the keys
// and the note names under them.

const W = 16; // white key width
const H = 70; // white key height
const BW = 10; // black key width
const BH = 44;
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_AFTER = { 0: 1, 2: 3, 5: 6, 7: 8, 9: 10 }; // white pc -> black pc right of it

export function KeysBox({ keys }) {
  if (!keys?.length) return null;
  const lo = Math.min(...keys.map((k) => k.midi));
  const hi = Math.max(...keys.map((k) => k.midi));
  let start = lo - (lo % 12); // the C at or below
  let end = hi + (11 - (hi % 12)); // the B at or above
  if (end - start < 23) end = start + 23;
  const byMidi = new Map(keys.map((k) => [k.midi, k]));
  const whites = [];
  for (let m = start; m <= end; m++) if (WHITE_PCS.includes(m % 12)) whites.push(m);
  const xOfWhite = (m) => whites.indexOf(m) * W;
  const blacks = [];
  for (const m of whites) if (BLACK_AFTER[m % 12] != null && m + 1 <= end) blacks.push(m + 1);
  const width = whites.length * W;
  const height = H + 34;
  const cls = (k) => 'kb-on ' + (k.hand === 'left' ? 'is-left' : 'is-right') + (k.role === 'root' ? ' is-root' : '') + (k.role === 'bass' ? ' is-bass' : '');
  const label = (k, x, isBlack) => (
    <g key={'l' + k.midi}>
      {k.finger ? (
        <text x={x} y={(isBlack ? BH : H) - 7} textAnchor="middle" className={'kb-finger' + (isBlack ? ' is-black' : '')}>
          {k.finger}
        </text>
      ) : null}
      <text x={x} y={H + (isBlack ? 13 : 26)} textAnchor="middle" className={'kb-name' + (k.role === 'root' ? ' is-root' : '')}>
        {k.name}
      </text>
    </g>
  );
  return (
    <svg className="kb-box" viewBox={`-1 -1 ${width + 2} ${height + 2}`} aria-hidden="true" dir="ltr">
      {whites.map((m) => {
        const k = byMidi.get(m);
        return <rect key={m} x={xOfWhite(m)} y={0} width={W} height={H} rx={2} className={'kb-white' + (k ? ' ' + cls(k) : '')} />;
      })}
      {blacks.map((m) => {
        const k = byMidi.get(m);
        return <rect key={m} x={xOfWhite(m - 1) + W - BW / 2} y={0} width={BW} height={BH} rx={1.5} className={'kb-black' + (k ? ' ' + cls(k) : '')} />;
      })}
      {/* middle C mark */}
      {whites.includes(60) && <circle cx={xOfWhite(60) + W / 2} cy={H - 3} r={1.6} className="kb-midc" />}
      {keys.map((k) => {
        const isBlack = !WHITE_PCS.includes(k.midi % 12);
        const x = isBlack ? xOfWhite(k.midi - 1) + W : xOfWhite(k.midi) + W / 2;
        return label(k, x, isBlack);
      })}
    </svg>
  );
}
