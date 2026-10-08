import { useId } from 'react';
import { useInstrument } from '../../instruments/useInstrument';

// The GuitarPro feature icon: a glossy red pick, tilted over three strings,
// with "GP" on it. The strings follow the text colour (currentColor); the
// pick keeps its own red in light and dark themes.
const PICK =
  'M12 2.6c4.9 0 8.6 1.6 8.6 4.6 0 4.2-5 11.6-7.2 13.7-.8.8-2 .8-2.8 0C8.4 18.8 3.4 11.4 3.4 7.2c0-3 3.7-4.6 8.6-4.6Z';

export function GuitarProIcon({ size = 18 }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#ff6a5c" />
          <stop offset=".45" stopColor="#e3261b" />
          <stop offset="1" stopColor="#9d0f0a" />
        </linearGradient>
      </defs>
      <g stroke="currentColor" strokeWidth=".9" opacity=".4">
        <path d="M1 8.5h22M1 12h22M1 15.5h22" />
      </g>
      <g transform="rotate(-14 12 12)">
        <path d={PICK} fill={`url(#${id}r)`} />
        <path d="M5 5.6c2.2-1.1 6.4-1.3 9.4-.5" stroke="#fff" strokeOpacity=".5" strokeWidth=".9" fill="none" strokeLinecap="round" />
        <path d={PICK} fill="none" stroke="#6e0805" strokeOpacity=".35" strokeWidth=".5" />
        <text
          x="12"
          y="12.7"
          textAnchor="middle"
          fontFamily="Helvetica Neue, Arial, sans-serif"
          fontSize="7.2"
          fontWeight="800"
          fontStyle="italic"
          fill="#fff"
        >
          GP
        </text>
      </g>
    </svg>
  );
}

// The plain line icon (a tab page) the feature had before — used where the
// pick doesn't fit: the piano pages (and the home cards).
export function GuitarProLineIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18M3 12h18M3 15h18" opacity=".35" />
      <path d="M8 7v10M15 7v10" />
    </svg>
  );
}

// The nav icon: the red pick inside guitar and bass, the line icon on piano.
export function GuitarProNavIcon() {
  const { instrument } = useInstrument();
  return instrument === 'guitar' || instrument === 'bass' ? <GuitarProIcon /> : <GuitarProLineIcon />;
}
