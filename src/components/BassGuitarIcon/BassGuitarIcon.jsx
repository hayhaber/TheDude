import bassIconSrc from '../../assets/icons/bass-icon.png';
import './BassGuitarIcon.css';

// A real bass-guitar illustration (a monochrome Precision-bass engraving,
// user-supplied artwork with its background removed) replacing the earlier
// hand-drawn stroke glyph, which read as low-quality. Same image-based
// approach as GuitarIcon — a detailed instrument illustration rather than a
// line icon — and its long-neck / offset-body silhouette keeps it instantly
// distinct from the guitar at toggle size. Used in the instrument switcher
// (and anywhere else "bass" is shown as an icon).
export function BassGuitarIcon() {
  return <img src={bassIconSrc} alt="" className="instrument-icon-image bass-icon-image" />;
}
