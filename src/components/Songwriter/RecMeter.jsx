/**
 * The live input meter while recording: an LED equalizer — a column of
 * lights per frequency band (low to high), lit from the bottom by that
 * band's level (green, amber near the top, red at the top), so the writer
 * SEES the voice arriving. Values from the recorder (useSongAudio tick.bands).
 */
const ROWS = 7;

export function RecMeter({ bands, silent = false, db = null, label }) {
  const cols = bands ?? new Array(12).fill(0);
  return (
    <span className={'sw-eq' + (silent ? ' is-silent' : '')} dir="ltr" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={1} aria-valuenow={Math.max(0, ...cols).toFixed(2)}>
      {cols.map((v, i) => {
        const lit = Math.round(v * ROWS);
        return (
          <span key={i} className="sw-eq-col">
            {Array.from({ length: ROWS }, (_, k) => {
              const row = ROWS - 1 - k; // top first
              const on = row < lit;
              const tone = row >= ROWS - 1 ? 'is-red' : row >= ROWS - 3 ? 'is-amber' : 'is-green';
              return <span key={k} className={'sw-eq-led ' + tone + (on ? ' is-on' : '')} />;
            })}
          </span>
        );
      })}
      {db != null && <span className="sw-eq-db">{db}</span>}
    </span>
  );
}
