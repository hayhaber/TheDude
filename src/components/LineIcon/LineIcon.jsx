// One line-icon set for the whole app (24px grid, 1.5 stroke, round caps)
// — the home cards' shortcuts and the in-app navigation share it, so every
// place a feature appears shows the same picture (stage 1 of the
// Apple-style redesign, 2026-11-03).
export const ICON_PATHS = {
  // Piano Chord Library: a keyboard with a three-note chord marked on it.
  pianoChords: (
    <>
      <rect x="2.5" y="4.5" width="19" height="15" rx="1.5" />
      <path d="M6.3 4.5v15M10.1 4.5v15M13.9 4.5v15M17.7 4.5v15" opacity=".4" />
      <path d="M6.3 4.5v6.2M10.1 4.5v6.2M17.7 4.5v6.2" strokeWidth="2.4" />
      <circle cx="4.4" cy="16" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="19.6" cy="16" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),
  // A check mark (done).
  check: <path d="M5 12.5l4.6 4.6L19 7.5" strokeWidth="2.2" />,
  // A chord box: nut, strings, frets, three dots.
  chords: (
    <>
      <path d="M5 4h14" strokeWidth="2.2" />
      <path d="M5 4v16M9.7 4v16M14.3 4v16M19 4v16" opacity=".55" />
      <path d="M5 9.3h14M5 14.6h14M5 20h14" opacity=".55" />
      <circle cx="9.7" cy="6.7" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="14.3" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),
  // A few piano keys.
  freeplay: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M8 5v14M13 5v14M18 5v14" opacity=".55" />
      <path d="M6.5 5v8M10.5 5v8M15.5 5v8" strokeWidth="2.6" />
    </>
  ),
  compose: (
    <>
      <path d="M4 6h16M4 10h16M4 14h16M4 18h16" opacity=".35" />
      <path d="M14 18V6l5-1.5v3L14 9" />
      <circle cx="11.5" cy="18" r="2.5" />
    </>
  ),
  improvise: (
    <>
      <path d="M3 15c2-6 4-6 6 0s4 6 6 0 4-6 6 0" />
      <path d="M18 3l.8 1.9L21 5.5l-1.9.8L18.5 8l-.8-1.9L16 5.5l1.9-.8z" />
    </>
  ),
  practice: (
    <>
      <path d="M8 21h8l-2.5-17h-3z" />
      <path d="M12 15l5-8" />
      <path d="M7 17h10" />
    </>
  ),
  // A mortarboard: the teacher's lesson.
  teacher: (
    <>
      <path d="M2.5 9.5L12 5l9.5 4.5L12 14z" />
      <path d="M6.5 11.6v4.2c1.6 1.5 3.4 2.2 5.5 2.2s3.9-.7 5.5-2.2v-4.2" />
      <path d="M21.5 9.5v5" />
    </>
  ),
  // Steps up: the lesson path.
  path: (
    <>
      <path d="M3 20h5v-5h5v-5h5V5h3" />
      <circle cx="5.5" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // A target: the coach's goal.
  coach: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  studies: (
    <>
      <path d="M3 5c3-1 6-1 9 1v14c-3-2-6-2-9-1z" />
      <path d="M21 5c-3-1-6-1-9 1v14c3-2 6-2 9-1z" />
    </>
  ),
  songs: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </>
  ),
  guitarpro: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18M3 12h18M3 15h18" opacity=".35" />
      <path d="M8 7v10M15 7v10" />
    </>
  ),
  vocal: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
    </>
  ),
  metronome: (
    <>
      <path d="M6.3 18.3 L9.8 4 L14.2 4 L17.7 18.3 Z" />
      <path d="M4.6 20.7 H19.4" />
      <path d="M12 16 L15.5 6.5" />
      <circle cx="14.3" cy="9.8" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  tuner: (
    <>
      <path d="M4 16a8 8 0 0 1 16 0" />
      <path d="M12 16l3-6" />
      <path d="M12 8v1.5M6.3 10.3l1 1M17.7 10.3l-1 1" opacity=".5" />
      <circle cx="12" cy="16" r="1.3" fill="currentColor" stroke="none" />
      <path d="M8 20h8" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
      <circle cx="12" cy="12" r="7" opacity=".35" />
    </>
  ),
  // A small amp head: grille + two knobs.
  amp: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10.5h18" />
      <circle cx="7.5" cy="8.3" r=".9" fill="currentColor" stroke="none" />
      <circle cx="11" cy="8.3" r=".9" fill="currentColor" stroke="none" />
      <path d="M7 13.5h10M7 16h10" opacity=".45" />
    </>
  ),
  // A snare drum with two sticks.
  drums: (
    <>
      <ellipse cx="12" cy="11" rx="7.5" ry="2.6" />
      <path d="M4.5 11v5.5c0 1.4 3.4 2.6 7.5 2.6s7.5-1.2 7.5-2.6V11" />
      <path d="M8 13.4v5M12 13.7v5.4M16 13.4v5" opacity=".45" />
      <path d="M9.5 8.6 5 3.5M14.5 8.6 19 3.5" />
    </>
  ),
  // A record dot inside a ring.
  record: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    </>
  ),
  // Songwriter: a page with lyric lines and a note.
  lyrics: (
    <>
      <path d="M5 3.5h10l4 4v13H5z" />
      <path d="M15 3.5v4h4" />
      <path d="M8 11h6M8 14.5h4" opacity=".55" />
      <path d="M14.5 19v-5.5l3-1v4.2" />
      <circle cx="13.3" cy="19" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="16.3" cy="16.7" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  // A new song: a page with a plus.
  newSong: (
    <>
      <path d="M5 3.5h10l4 4v13H5z" />
      <path d="M15 3.5v4h4" />
      <path d="M12 10.5v7M8.5 14h7" />
    </>
  ),
  // A quick idea: a light bulb.
  idea: (
    <>
      <path d="M9 17.5h6M9.8 20.5h4.4" />
      <path d="M12 3.5a6 6 0 0 0-3.6 10.8c.6.5.9 1.2.9 1.9v1.3h5.4v-1.3c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3.5z" />
    </>
  ),
  // Play (songs + Guitar Pro): a play triangle in a rounded square.
  play: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <path d="M10 8.6v6.8l5.6-3.4z" fill="currentColor" stroke="none" />
    </>
  ),
  // Create (compose + improvise): a pencil drawing a wave.
  create: (
    <>
      <path d="M3 18c1.6-2.4 3.2-2.4 4.8 0" />
      <path d="M13.8 5.2l3 3L9 16H6v-3z" />
      <path d="M12.2 6.8l3 3" />
    </>
  ),
  // Practice library icons (stage 4).
  stopwatch: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 13.5V9.5M10 3h4M12 3v3M18.2 6.8l1.3-1.3" />
    </>
  ),
  changes: (
    <>
      <path d="M4 8h13l-3.5-3.5" />
      <path d="M20 16H7l3.5 3.5" />
    </>
  ),
  note: (
    <>
      <path d="M9.5 17.5V5.5l9-2v11.5" />
      <circle cx="7" cy="17.5" r="2.5" />
      <circle cx="16" cy="15" r="2.5" />
    </>
  ),
  bend: (
    <>
      <path d="M4 18h6c3 0 4.5-2 5.5-5.5S17.5 6 20 6" />
      <path d="M17 3.5L20 6l-2.5 3" />
    </>
  ),
  hand: (
    <>
      <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5" />
      <path d="M14 10.5V5.5a1.5 1.5 0 0 1 3 0V14c0 4-2.7 7-6.5 7-2.4 0-3.9-1-5.2-3L3.6 15a1.5 1.5 0 0 1 2.4-1.8L8 15" />
    </>
  ),
  falling: (
    <>
      <path d="M6 3v5M12 3v9M18 3v3" />
      <rect x="3" y="15" width="18" height="6" rx="1.5" />
      <path d="M9 15v6M15 15v6" opacity=".55" />
    </>
  ),
  ear: (
    <>
      <path d="M7 9a5 5 0 1 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0" />
      <path d="M10 9a2 2 0 1 1 4 0" />
    </>
  ),
};


export function LineIcon({ name, size = 30, strokeWidth = 1.5 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
