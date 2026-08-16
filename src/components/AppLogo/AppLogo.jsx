// The app's brand mark — a guitar pick (the music/"Dude" half of
// DudeStar) with a five-point star badge (the "Star" half) set inside it,
// filled with the same purple-to-blue brand gradient already used by
// favicon.svg/icons.svg, so the in-app logo and the browser-tab/home-
// screen icon read as one consistent identity rather than two unrelated
// graphics. Two simple, bold shapes (not fussy detail) so it still reads
// clearly at small sizes — nav icon, browser tab. Used wherever the app's
// own name/logo belongs (the sidebar drawer header today), the same way a
// company or product logo sits at the top of its own navigation.
export function AppLogo({ size = 22 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="app-logo-gradient" x1="3" y1="1.5" x2="21" y2="21.5" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a855f7" />
          <stop offset="1" stopColor="#47bfff" />
        </linearGradient>
      </defs>
      <path
        fill="url(#app-logo-gradient)"
        d="M12 1.5C15.5 1.5 21 6.5 21 12.5 21 17.5 17 21.5 12 21.5 7 21.5 3 17.5 3 12.5 3 6.5 8.5 1.5 12 1.5Z"
      />
      <path
        fill="#fff"
        d="M12 8 13.06 11.04 16.28 11.11 13.71 13.06 14.65 16.14 12 14.3 9.36 16.14 10.29 13.06 7.72 11.11 10.44 11.04Z"
      />
    </svg>
  );
}
