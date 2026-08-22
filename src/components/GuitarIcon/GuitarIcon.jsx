import guitarIconSrc from '../../assets/icons/guitar-icon.png';
import './GuitarIcon.css';

// A real electric-guitar illustration (a Gibson Les Paul-style sunburst,
// user-supplied artwork with its background removed) replacing the plain
// 🎸 emoji everywhere "guitar" is represented as an icon — the instrument
// switcher, the Improvise nav destination (guitar-only feature), and the
// InstrumentGate "guitar mode only" fallback message. Same
// component-reference icon convention as BassGuitarIcon/TrainingIcon (see
// instrumentRegistry.js's own comment).
export function GuitarIcon() {
  return <img src={guitarIconSrc} alt="" className="instrument-icon-image" />;
}
