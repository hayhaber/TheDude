// A small wireless-guitar receiver plugged into the INPUT jack — the amp
// looks connected without a cable. Seen from the front: a matte graphite
// body on a swivel plug, turned sideways (towards the panel's left edge) so
// it never covers the INPUT engraving; a tiny status LED that glows when the
// amp is on. Deliberately small and quiet. Decorative only.
export function InputReceiver({ on }) {
  return (
    <span className={'amp-receiver' + (on ? ' is-on' : '')} aria-hidden="true">
      <svg viewBox="0 0 44 22" width="44" height="22">
        <defs>
          <linearGradient id="ampRxBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a4b4f" />
            <stop offset="0.45" stopColor="#2a2b2e" />
            <stop offset="1" stopColor="#17181a" />
          </linearGradient>
          <linearGradient id="ampRxRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f2f3f5" />
            <stop offset="0.5" stopColor="#9ea3aa" />
            <stop offset="1" stopColor="#d9dce0" />
          </linearGradient>
          <filter id="ampRxShadow" x="-30%" y="-30%" width="160%" height="180%">
            <feGaussianBlur stdDeviation="1.3" />
          </filter>
        </defs>
        {/* shadow on the panel */}
        <rect x="2" y="6" width="38" height="14" rx="5" fill="rgba(0,0,0,0.38)" filter="url(#ampRxShadow)" />
        {/* body */}
        <rect x="1" y="3" width="36" height="15" rx="5" fill="url(#ampRxBody)" />
        <rect x="1.5" y="3.5" width="35" height="6" rx="3" fill="rgba(255,255,255,0.07)" />
        {/* swivel collar over the socket */}
        <circle cx="35" cy="10.5" r="7.2" fill="url(#ampRxRing)" />
        <circle cx="35" cy="10.5" r="5.2" fill="url(#ampRxBody)" />
        {/* status LED */}
        <circle className="amp-receiver-led" cx="8" cy="10.5" r="1.7" />
      </svg>
    </span>
  );
}
