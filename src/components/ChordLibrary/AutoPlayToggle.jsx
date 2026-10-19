// Chord Library: sound when stepping through shapes / inversions with ‹ ›
// on or off (user's request 2026-10-19). Strum / Play and a tap on the
// diagram always sound.
export function AutoPlayToggle({ on, onChange, label }) {
  return (
    <button
      type="button"
      className={'cl-autoplay' + (on ? ' is-on' : '')}
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={() => onChange(!on)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5h3.2L12 5.6v12.8l-4.8-3.9H4z" fill="currentColor" />
        {on ? (
          <>
            <path d="M15.2 9.2a4 4 0 0 1 0 5.6" />
            <path d="M17.6 6.8a7.4 7.4 0 0 1 0 10.4" />
          </>
        ) : (
          <path d="M15.5 9.5l5 5m0-5l-5 5" />
        )}
      </svg>
    </button>
  );
}
