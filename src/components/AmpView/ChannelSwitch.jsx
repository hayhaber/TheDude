import { useId, useRef } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { AmpKnobArt, f2, polar } from './Knob';

// The channel selector as a rotary selector — the very same knob as Gate &
// co., but with three detents instead of a 1-10 scale: CLEAN (left), CRUNCH
// (up), LEAD (right), clockwise = more gain, like a real amp's selector.
// Tap the knob to step to the next channel, tap a printed name to jump
// there, drag sideways/up-down to turn, or use the arrow keys.
const POSITIONS = ['clean', 'crunch', 'lead'];
const ANGLES = [-60, 0, 60];
const DRAG_PX = 40;

const TICKS = ANGLES.map((a) => {
  const [x1, y1] = polar(50, 50, 33, a);
  const [x2, y2] = polar(50, 50, 37.5, a);
  return `M${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}`;
}).join('');

export function ChannelSwitch({ value, onChange }) {
  const { t } = useLanguage();
  const uid = 'c' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const index = Math.max(0, POSITIONS.indexOf(value));
  const dragRef = useRef(null);
  const set = (i) => {
    const v = POSITIONS[Math.max(0, Math.min(2, i))];
    if (v !== value) onChange(v);
  };

  const scale = {
    ticks: TICKS,
    labels: POSITIONS.map((p, i) => {
      const [x, y] = polar(50, 50, i === 1 ? 44 : 41, ANGLES[i]);
      return {
        v: p.toUpperCase(),
        x: f2(x + (i === 0 ? 2 : i === 2 ? -2 : 0)),
        y: f2(y - (i === 1 ? 0 : 4)),
        anchor: i === 0 ? 'end' : i === 2 ? 'start' : 'middle',
        on: i === index,
        index: i,
      };
    }),
  };

  const onPointerDown = (e) => {
    if (e.button > 0) return;
    // A printed position name: jump straight there.
    const name = e.target.closest?.('[data-pos]');
    if (name) {
      dragRef.current = null;
      set(Number(name.getAttribute('data-pos')));
      return;
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, i: index, moved: false };
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const delta = e.clientX - d.x + (d.y - e.clientY);
    if (Math.abs(delta) > 4) d.moved = true;
    if (d.moved) set(d.i + Math.round(delta / DRAG_PX));
  };
  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && !d.moved) set((index + 1) % 3);
  };
  const onKeyDown = (e) => {
    const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (step) {
      e.preventDefault();
      set(index + step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      set(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      set(2);
    }
  };

  return (
    <div className="amp-knob is-amp amp-channel-knob">
      <div
        className="amp-knob-dial"
        role="slider"
        tabIndex={0}
        aria-label={t('amp.voicing')}
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={index}
        aria-valuetext={t(`amp.voicing.${POSITIONS[index]}`)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (dragRef.current = null)}
        onKeyDown={onKeyDown}
      >
        <AmpKnobArt angle={ANGLES[index]} uid={uid} scale={scale} />
      </div>
      <span className="amp-knob-label">
        <span className="amp-knob-caption">CHANNEL</span>
      </span>
      <span className="amp-knob-readout">{t(`amp.voicing.${POSITIONS[index]}`)}</span>
    </div>
  );
}
