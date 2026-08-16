// The app's brand mark — a five-point star (the "Star" in DudeStar),
// filled with the same purple-to-blue brand gradient already used by
// favicon.svg/icons.svg, so the in-app logo and the browser-tab/home-
// screen icon read as one consistent identity rather than two unrelated
// graphics. Used wherever the app's own name/logo belongs (the sidebar
// drawer header today), the same way a company or product logo sits at
// the top of its own navigation.
export function AppLogo({ size = 22 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="app-logo-gradient" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a855f7" />
          <stop offset="1" stopColor="#47bfff" />
        </linearGradient>
      </defs>
      <path
        fill="url(#app-logo-gradient)"
        d="M12 3 14.12 9.09 20.56 9.22 15.42 13.11 17.29 19.28 12 15.6 6.71 19.28 8.58 13.11 3.44 9.22 8.88 9.09Z"
      />
    </svg>
  );
}
