import { midiName } from '../../music/vocal/voiceRange';

// A slim keyboard from C2 to C6 with the singer's range lit — the white keys
// drawn, black keys as short marks, the range as a coloured band on top.
const FROM = 36; // C2
const TO = 84; // C6
const BLACK = new Set([1, 3, 6, 8, 10]);

export function RangeBar({ low, high, comfortLow = low, comfortHigh = high, compact = false }) {
  const whites = [];
  for (let m = FROM; m <= TO; m += 1) if (!BLACK.has(m % 12)) whites.push(m);
  const pos = (m) => {
    // Position by white-key index, black keys in between.
    let i = whites.findIndex((w) => w >= m);
    if (i < 0) i = whites.length - 1;
    const exact = whites[i] === m ? i : i - 0.5;
    return ((exact + 0.5) / whites.length) * 100;
  };
  // The band marks the comfortable part; keys only reachable are lighter.
  const a = pos(Math.max(FROM, comfortLow));
  const b = pos(Math.min(TO, comfortHigh));
  return (
    <div className={'vocal-rangebar' + (compact ? ' is-compact' : '')} aria-label={`${midiName(low)} – ${midiName(high)}`}>
      <div className="vocal-rangebar-keys">
        {whites.map((m) => (
          <span key={m} className={m >= comfortLow && m <= comfortHigh ? 'is-in' : m >= low && m <= high ? 'is-reach' : ''}>
            {!compact && m % 12 === 0 ? <em>{midiName(m)}</em> : null}
          </span>
        ))}
      </div>
      <div className="vocal-rangebar-band" style={{ left: `${a}%`, width: `${Math.max(1, b - a)}%` }} />
    </div>
  );
}
