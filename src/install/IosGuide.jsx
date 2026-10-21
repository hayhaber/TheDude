// iPhone / iPad Safari: a short looping "video" of the four taps
// (••• -> Share -> Add to Home Screen -> Add -> the icon on the home screen),
// drawn as a simplified phone (not Apple's artwork), in step with the
// numbered list above (onStep), plus a bouncing arrow at the edge of the
// page pointing at where Safari's ••• button really is (user's request
// 2026-10-21). A web page can't see taps on Safari's own buttons, so the
// guide can only show, not follow.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

// scene -> step highlighted in the list (0-based), and how long it stays
const SCENES = [
  { step: 0, ms: 2400 }, // the page; finger on •••
  { step: 1, ms: 2400 }, // the menu; finger on Share
  { step: 2, ms: 2600 }, // the share sheet; finger on Add to Home Screen
  { step: 3, ms: 2400 }, // the Add dialog; finger on Add
  { step: 4, ms: 2200 }, // the icon lands on the home screen
];

const TXT = {
  en: { share: 'Share', add: 'Add to Home Screen', addBtn: 'Add', cancel: 'Cancel', copy: 'Copy', bookmark: 'Add Bookmark', find: 'Find on Page', here: 'Tap here' },
  he: { share: 'שיתוף', add: 'הוסף למסך הבית', addBtn: 'הוסף', cancel: 'ביטול', copy: 'העתק', bookmark: 'הוסף סימניה', find: 'חפש בעמוד', here: 'הקש כאן' },
};

export const isIpad = () => typeof navigator !== 'undefined' && (/iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));
// iOS mirrors its own buttons when the phone's language is right-to-left.
const systemRtl = () => typeof navigator !== 'undefined' && /^(he|ar|fa|ur)/i.test(navigator.language || '');

export function IosGuide({ onStep }) {
  const { lang } = useLanguage();
  const tx = TXT[lang] ?? TXT.en;
  const [scene, setScene] = useState(0);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const id = setTimeout(() => setScene((s) => (s + 1) % SCENES.length), SCENES[scene].ms * (reduceMotion ? 1.6 : 1));
    return () => clearTimeout(id);
  }, [scene, reduceMotion]);
  useEffect(() => onStep?.(SCENES[scene].step), [scene, onStep]);

  // the finger goes to the centre of what this scene taps (measured, so it
  // lands right whatever the language / text length)
  const screenRef = useRef(null);
  const [tap, setTap] = useState(null);
  useLayoutEffect(() => {
    const scr = screenRef.current;
    if (!scr) return;
    const sel = ['.ios-bar-more', '.ios-menu .is-target', '.ios-sheet .is-target', '.ios-dialog .is-target', null][scene];
    const el = sel && scr.querySelector(sel);
    if (!el) {
      setTap(null);
      return;
    }
    // measure where the element ends up (its layer's transition finishes in ~0.3 s)
    const id = setTimeout(() => {
      const a = scr.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setTap({ x: ((r.left + r.width / 2 - a.left) / a.width) * 100, y: ((r.top + r.height / 2 - a.top) / a.height) * 100 });
    }, 340);
    return () => clearTimeout(id);
  }, [scene, lang]);

  const mirror = systemRtl();
  return (
    <div className={'ios-guide' + (mirror ? ' is-mirrored' : '')} onClick={() => setScene(0)} title={tx.here}>
      <div className="ios-phone" dir={mirror ? 'rtl' : 'ltr'}>
        <div className="ios-island" />
        <div className={'ios-screen scene-' + scene} ref={screenRef}>
          {/* the web page */}
          <div className="ios-page">
            <div className="ios-page-icon" />
            <i />
            <i />
            <i className="short" />
          </div>
          {/* Safari's bottom bar */}
          <div className="ios-bar">
            <span className="ios-bar-back">‹</span>
            <span className="ios-bar-url">the-dude.vercel.app</span>
            <span className="ios-bar-more">•••</span>
          </div>
          {/* the ••• menu */}
          <div className="ios-menu">
            <div className="ios-row is-target">
              <ShareGlyph />
              {tx.share}
            </div>
            <div className="ios-row">{tx.bookmark}</div>
            <div className="ios-row">{tx.find}</div>
          </div>
          {/* the share sheet */}
          <div className="ios-sheet">
            <div className="ios-sheet-apps">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="ios-row">{tx.copy}</div>
            <div className="ios-row is-target">
              <PlusGlyph />
              {tx.add}
            </div>
          </div>
          {/* the Add to Home Screen dialog */}
          <div className="ios-dialog">
            <div className="ios-dialog-top">
              <span>{tx.cancel}</span>
              <b className="is-target">{tx.addBtn}</b>
            </div>
            <div className="ios-dialog-app">
              <img src="/pwa-192.png" alt="" />
              <span>DudeStar</span>
            </div>
          </div>
          {/* the home screen */}
          <div className="ios-home">
            {Array.from({ length: 11 }, (_, i) => (
              <i key={i} />
            ))}
            <img className="ios-home-icon" src="/pwa-192.png" alt="" />
          </div>
          {/* the finger */}
          <span className="ios-tap" style={tap ? { left: `${tap.x}%`, top: `${tap.y}%`, opacity: 1 } : { opacity: 0 }} />
        </div>
      </div>
    </div>
  );
}

/** The bouncing arrow at the page's edge, pointing at Safari's real ••• button. */
export function IosArrow() {
  const { lang } = useLanguage();
  const tx = TXT[lang] ?? TXT.en;
  const ipad = isIpad();
  const mirror = systemRtl();
  return (
    <div className={'ios-arrow' + (ipad ? ' is-ipad' : '') + (mirror ? ' is-mirrored' : '')} aria-hidden="true">
      <span>
        {tx.here} <b>•••</b>
      </span>
      <svg viewBox="0 0 24 24">
        <path d="M12 3v16M5 12l7 7 7-7" />
      </svg>
    </div>
  );
}

function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="ios-glyph">
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
      <path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 10H16" />
    </svg>
  );
}
function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="ios-glyph">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}
