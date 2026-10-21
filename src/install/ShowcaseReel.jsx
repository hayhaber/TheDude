// The install page's picture (user's request 2026-10-21, replaces the card
// wheel): a short self-playing "reel" of real screenshots from the app —
// each one fades in growing from the depth of the screen, drifts slowly,
// then grows on and fades out as the next arrives. Instruments first, then
// the learning features, then the tools and the studio. A tap only moves
// on to the next shot; nothing opens. Shots live in public/install/*.webp
// (captured from the production build at 2x, ~400 KB in all).
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const SHOTS = [
  { src: 'card-guitar', en: 'Guitar', he: 'גיטרה' },
  { src: 'chords', en: 'Chord library', he: 'ספריית אקורדים' },
  { src: 'structure', en: 'How chords are built', he: 'מבנה אקורדים' },
  { src: 'guitarpro', en: 'Songs & solos from Guitar Pro', he: 'שירים וסולואים מקובצי גיטרה פרו' },
  { src: 'card-piano', en: 'Piano', he: 'פסנתר' },
  { src: 'piano-chords', en: 'Piano chords', he: 'אקורדים לפסנתר' },
  { src: 'card-bass', en: 'Bass', he: 'בס' },
  { src: 'card-vocal', en: 'Singing', he: 'שירה' },
  { src: 'card-tools', en: 'Tools', he: 'כלי עזר' },
  { src: 'tuner', en: 'Precision tuner', he: 'טיונר מדויק' },
  { src: 'metronome', en: 'Metronome', he: 'מטרונום' },
  { src: 'drums', en: 'Drum machine', he: 'מכונת תופים' },
  { src: 'amp', en: 'Guitar amp', he: 'מגבר גיטרה' },
  { src: 'pedals', en: 'Effect pedals', he: 'פדלי אפקטים' },
  { src: 'recorder', en: 'Recording studio', he: 'אולפן הקלטות' },
  { src: 'eq', en: '10-band equalizer', he: 'אקולייזר 10 ערוצים' },
];
const HOLD_MS = 1800; // each shot on screen (was 2600 — user: faster)
// where each shot comes in from (dx, dy in % of the stage, start turn, start
// size) — a different way every time, in a fixed shuffled order
const ENTRIES = [
  { dx: 0, dy: 0, r: 0, s: 0.55 }, // from the depth
  { dx: -60, dy: 0, r: -6, s: 0.8 }, // left
  { dx: 0, dy: 55, r: 3, s: 0.8 }, // bottom
  { dx: 60, dy: -40, r: 8, s: 0.7 }, // top right
  { dx: 0, dy: -55, r: -3, s: 0.8 }, // top
  { dx: -55, dy: 45, r: -8, s: 0.7 }, // bottom left
  { dx: 60, dy: 0, r: 6, s: 0.8 }, // right
  { dx: 0, dy: 0, r: -10, s: 1.35 }, // from in front, shrinking in
  { dx: -55, dy: -45, r: 7, s: 0.7 }, // top left
  { dx: 55, dy: 45, r: -7, s: 0.7 }, // bottom right
];
const url = (s) => `/install/${s}.webp`;

export function ShowcaseReel() {
  const { lang } = useLanguage();
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState(null);
  const [tick, setTick] = useState(0); // re-arms the timer while the tab is hidden
  const timer = useRef(0);

  // fetch every shot up front so none pops in half-loaded
  useEffect(() => {
    SHOTS.forEach((s) => {
      const im = new Image();
      im.src = url(s.src);
    });
  }, []);

  const iRef = useRef(0);
  const go = (next) => {
    const cur = iRef.current;
    const n = next(cur);
    if (n === cur) return;
    iRef.current = n;
    setPrev(cur);
    setI(n);
  };

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!document.hidden) go((cur) => (cur + 1) % SHOTS.length);
      else setTick((t) => t + 1); // tab hidden: try again later
    }, HOLD_MS);
    return () => clearTimeout(timer.current);
  }, [i, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="reel" onClick={() => go((cur) => (cur + 1) % SHOTS.length)} aria-hidden="true">
      <div className="reel-stage">
        {SHOTS.map((s, k) => (
          <img
            key={s.src}
            src={url(s.src)}
            alt=""
            draggable="false"
            className={'reel-shot' + (k === i ? ' is-in' : k === prev ? ' is-out' : '')}
            style={(() => {
              const e = ENTRIES[k % ENTRIES.length];
              return { '--dx': `${e.dx}%`, '--dy': `${e.dy}%`, '--r': `${e.r}deg`, '--s': e.s };
            })()}
          />
        ))}
      </div>
      <div className="reel-caption" key={i}>
        {lang === 'he' ? SHOTS[i].he : SHOTS[i].en}
      </div>
    </div>
  );
}
