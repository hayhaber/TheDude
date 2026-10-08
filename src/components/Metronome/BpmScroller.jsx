import { useEffect, useRef, useState } from 'react';
import './BpmScroller.css';

// An iPod click-wheel-style BPM control: drag your finger/pointer around the
// ring and the angular motion scrolls the value, the way the iPod's
// clickwheel scrolled menus. Mouse wheel and arrow keys work too, and a tap
// on the number in the middle lets you type the BPM (Enter / leaving the
// field sets it, clamped to min..max; Escape cancels).
export function BpmScroller({ value, onChange, min, max, defaultValue }) {
  const wheelRef = useRef(null);
  const dragRef = useRef(null);
  const inputRef = useRef(null);
  const [draft, setDraft] = useState(null); // string while typing, else null

  useEffect(() => {
    if (draft !== null) inputRef.current?.select();
  }, [draft !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  function commitDraft() {
    const n = parseInt(draft, 10);
    if (Number.isFinite(n)) onChange(clamp(n));
    setDraft(null);
  }

  function clamp(n) {
    return Math.max(min, Math.min(max, n));
  }

  function angleFromCenter(e) {
    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(e.clientY - cy, e.clientX - cx);
  }

  function handleWheel(e) {
    if (draft !== null) return;
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    onChange(clamp(value + direction));
  }

  function handlePointerDown(e) {
    // Track the running value in the ref itself (not just the `value` prop)
    // since prop updates are async — during a fast drag we compute several
    // steps within one handler call, before React has a chance to re-render
    // with the new value, so we can't rely on the prop staying current.
    dragRef.current = { lastAngle: angleFromCenter(e), accum: 0, value };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  // Degrees of rotation needed to move the value by 1 BPM — smaller feels
  // more sensitive, like flicking the real clickwheel.
  const DEGREES_PER_STEP = 10;

  function handlePointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;

    const angle = angleFromCenter(e);
    let delta = angle - drag.lastAngle;
    // Normalize the wraparound at +-180deg so a crossing doesn't jump.
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    drag.lastAngle = angle;

    drag.accum += (delta * 180) / Math.PI;
    while (drag.accum >= DEGREES_PER_STEP) {
      drag.value = clamp(drag.value + 1);
      drag.accum -= DEGREES_PER_STEP;
    }
    while (drag.accum <= -DEGREES_PER_STEP) {
      drag.value = clamp(drag.value - 1);
      drag.accum += DEGREES_PER_STEP;
    }
    onChange(drag.value);
  }

  function handlePointerUp(e) {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function handleDoubleClick() {
    if (defaultValue === undefined) return;
    onChange(clamp(defaultValue));
  }

  function handleKeyDown(e) {
    if (draft !== null) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      setDraft(String(value));
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(clamp(value + 1));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(clamp(value - 1));
    }
  }

  return (
    <div
      ref={wheelRef}
      className="bpm-wheel"
      role="spinbutton"
      tabIndex={0}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label="BPM"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
    >
      {/* The middle is for typing, not dragging. */}
      <div
        className={'bpm-wheel-center' + (draft !== null ? ' is-editing' : '')}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onClick={() => draft === null && setDraft(String(value))}
        title={draft === null ? 'BPM' : undefined}
      >
        {draft === null ? (
          <span className="bpm-wheel-value">{value}</span>
        ) : (
          <input
            ref={inputRef}
            className="bpm-wheel-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            value={draft}
            aria-label="BPM"
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') commitDraft();
              else if (e.key === 'Escape') setDraft(null);
            }}
          />
        )}
        <span className="bpm-wheel-unit">BPM</span>
      </div>
    </div>
  );
}
