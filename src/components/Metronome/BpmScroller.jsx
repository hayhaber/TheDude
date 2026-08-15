import { useRef } from 'react';
import './BpmScroller.css';

// An iPod click-wheel-style BPM control: drag your finger/pointer around the
// ring and the angular motion scrolls the value, the way the iPod's
// clickwheel scrolled menus. Mouse wheel and arrow keys work too.
export function BpmScroller({ value, onChange, min, max, defaultValue }) {
  const wheelRef = useRef(null);
  const dragRef = useRef(null);

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
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
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
      <div className="bpm-wheel-center">
        <span className="bpm-wheel-value">{value}</span>
        <span className="bpm-wheel-unit">BPM</span>
      </div>
    </div>
  );
}
