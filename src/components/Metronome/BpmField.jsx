import { useEffect, useRef, useState } from 'react';

// Tempo readout with − / + (hold to keep going) and type-in: tap the number,
// type, Enter or leave the field to set it (clamped), Escape cancels.
export function BpmField({ value, onChange, min, max, className = '', labels }) {
  const [draft, setDraft] = useState(null);
  const inputRef = useRef(null);
  const hold = useRef(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (draft !== null) inputRef.current?.select();
  }, [draft !== null]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(hold.current), []);

  const clamp = (n) => Math.max(min, Math.min(max, n));
  const step = (d) => onChange(clamp(valueRef.current + d));
  const startHold = (d) => {
    step(d);
    let delay = 380;
    const again = () => {
      step(d);
      delay = Math.max(45, delay * 0.82);
      hold.current = setTimeout(again, delay);
    };
    hold.current = setTimeout(again, delay);
  };
  const endHold = () => clearTimeout(hold.current);
  const commit = () => {
    const n = parseInt(draft, 10);
    if (Number.isFinite(n)) onChange(clamp(n));
    setDraft(null);
  };

  const key = (d, text, aria) => (
    <button
      type="button"
      className="bpm-field-step"
      aria-label={aria}
      onPointerDown={(e) => {
        e.preventDefault();
        startHold(d);
      }}
      onPointerUp={endHold}
      onPointerLeave={endHold}
      onPointerCancel={endHold}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          step(d);
        }
      }}
    >
      {text}
    </button>
  );

  return (
    <div className={'bpm-field ' + className} dir="ltr">
      {key(-1, '−', labels.down)}
      {draft !== null ? (
        <input
          ref={inputRef}
          className="bpm-field-input"
          inputMode="numeric"
          value={draft}
          aria-label={labels.value}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setDraft(null);
          }}
        />
      ) : (
        <button type="button" className="bpm-field-value" title={labels.edit} onClick={() => setDraft(String(value))}>
          {value}
        </button>
      )}
      {key(1, '+', labels.up)}
    </div>
  );
}
