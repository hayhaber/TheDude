import { useInstrument } from '../../instruments/useInstrument';

// Nav icon for the Chord Library: a chord box (nut, strings, frets, dots) on
// guitar; on piano a keyboard with a three-note chord marked on it.
export function ChordsNavIcon() {
  const { instrument } = useInstrument() ?? {};
  if (instrument === 'piano') {
    return (
      <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <rect x="2.5" y="4.5" width="19" height="15" rx="1.5" />
        <path d="M6.3 4.5v15M10.1 4.5v15M13.9 4.5v15M17.7 4.5v15" opacity=".4" />
        <path d="M6.3 4.5v6.2M10.1 4.5v6.2M17.7 4.5v6.2" strokeWidth="2.4" />
        <circle cx="4.4" cy="16" r="1.7" fill="currentColor" stroke="none" />
        <circle cx="12" cy="16" r="1.7" fill="currentColor" stroke="none" />
        <circle cx="19.6" cy="16" r="1.7" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M5 4h14" strokeWidth="2.4" />
      <path d="M5 4v16M9.7 4v16M14.3 4v16M19 4v16" opacity=".55" />
      <path d="M5 9.3h14M5 14.6h14M5 20h14" opacity=".55" />
      <circle cx="9.7" cy="6.7" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="14.3" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
