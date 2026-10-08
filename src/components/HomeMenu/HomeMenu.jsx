import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useInstrument } from '../../instruments/useInstrument';
import { supportsInstrument } from '../../instruments/featureCapabilities';
import { AppLogo } from '../AppLogo/AppLogo';
import { INSTRUMENT_ART } from './instrumentArt';
import './HomeMenu.css';

// Line icons for the per-instrument shortcuts (24px grid).
const ICON_PATHS = {
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
  ear: (
    <>
      <path d="M7 9a5 5 0 1 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0" />
      <path d="M10 9a2 2 0 1 1 4 0" />
    </>
  ),
};

function LineIcon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="30"
      height="30"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

// One card per instrument. `instrument: null` keeps whatever is selected
// (singing isn't an instrument mode of its own). Shortcuts an instrument
// doesn't support are left out (featureCapabilities).
const CARDS = [
  {
    key: 'guitar',
    instrument: 'guitar',
    titleKey: 'home.guitar.title',
    descKey: 'home.guitar.desc',
    options: [
      { section: 'compose', icon: 'compose' },
      { section: 'improvise', icon: 'improvise' },
      { section: 'practice', icon: 'practice' },
      { section: 'guitarpro', icon: 'guitarpro' },
    ],
  },
  {
    key: 'piano',
    instrument: 'piano',
    titleKey: 'home.piano.title',
    descKey: 'home.piano.desc',
    options: [
      { section: 'compose', icon: 'compose' },
      { section: 'studies', icon: 'studies' },
      { section: 'practice', icon: 'practice' },
      { section: 'guitarpro', icon: 'guitarpro' },
    ],
  },
  {
    key: 'bass',
    instrument: 'bass',
    titleKey: 'home.bass.title',
    descKey: 'home.bass.desc',
    options: [
      { section: 'compose', icon: 'compose' },
      { section: 'guitarpro', icon: 'guitarpro' },
      {
        tool: 'tuner',
        tunerMode: 'bass',
        icon: 'tuner',
        labelKey: 'tunerBar.label',
      },
    ],
  },
  {
    key: 'vocal',
    instrument: null,
    titleKey: 'home.vocal.title',
    descKey: 'home.vocal.desc',
    options: [
      { section: 'vocal', icon: 'vocal' },
      {
        section: 'practice',
        practiceTab: 'ear-training',
        icon: 'ear',
        labelKey: 'practice.tab.earTraining',
      },
    ],
  },
  {
    // Not an instrument: the metronome / tuner / settings, each on a screen
    // of its own.
    key: 'tools',
    instrument: null,
    titleKey: 'home.tools.title',
    descKey: 'home.tools.desc',
    options: [
      { tool: 'metronome', icon: 'metronome', labelKey: 'metronome.title' },
      { tool: 'tuner', icon: 'tuner', labelKey: 'tunerBar.label' },
      { tool: 'settings', icon: 'settings', labelKey: 'settings.title' },
    ],
  },
];

// Drawn, not a ‹ › character: those are mirrored in right-to-left text.
function Chevron({ dir }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === 'right' ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7'} />
    </svg>
  );
}

// The carousel is drawn, not scrolled: every card is placed by a transform
// from one continuous position `pos` (in cards). That makes it truly endless
// (each card sits at its distance from `pos` wrapped around the ring), moves
// exactly one card per swipe, and keeps the "drum" in step with the finger —
// native scrolling on iPhone (momentum, snap, a copy-jump for the loop)
// flickered, skipped several cards and ran out of copies.
const N = CARDS.length;

// The drum: cards beside the centre turn away and recede.
const TURN_DEG = 20;
const SHRINK = 0.092;
const FADE = 0.63;
const ANIM_MS = 420;
// A swipe past this share of a card, or this fast (px/ms), moves one card.
const SWIPE_SHARE = 0.12;
const SWIPE_SPEED = 0.35;

// Signed distance on the ring, in -N/2..N/2.
function ringDist(i, pos) {
  let d = (i - pos) % N;
  if (d < -N / 2) d += N;
  if (d >= N / 2) d -= N;
  return d;
}

const easeOut = (x) => 1 - Math.pow(1 - x, 3);

/**
 * The home screen: an endless carousel of instruments (swipe, wheel, arrows,
 * keys or the dots — one card per step), each card with a short description
 * and shortcuts into the app. Tapping the card itself opens its first
 * shortcut.
 */
export function HomeMenu({ onOpen, onContinue, initialCard }) {
  const { t } = useLanguage();
  const { instrument } = useInstrument();
  const trackRef = useRef(null);
  const rootRef = useRef(null);
  const cardRefs = useRef([]);
  // Back from a tool screen = back on the Tools card; otherwise the
  // instrument in use.
  const startIndex = Math.max(
    0,
    CARDS.findIndex((c) => (initialCard ? c.key === initialCard : c.instrument === instrument)),
  );
  const [active, setActive] = useState(startIndex);
  const activeRef = useRef(startIndex);
  const posRef = useRef(startIndex); // where the ring is drawn now
  const targetRef = useRef(startIndex); // where it is heading (an integer)
  const animRef = useRef(0);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Place every card for the current position.
  const draw = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const pos = posRef.current;
    const first = cardRefs.current[0];
    const gap = parseFloat(getComputedStyle(track).getPropertyValue('--home-gap')) || 28;
    const step = (first?.offsetWidth || 1) + gap;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const d = ringDist(i, pos);
      const a = Math.min(1, Math.abs(d));
      // RTL: the next card waits on the left.
      const x = -d * step;
      const turn = reduceMotion ? 0 : Math.max(-1.5, Math.min(1.5, d)) * TURN_DEG;
      el.style.transform = `translateX(${x.toFixed(1)}px) perspective(1600px) rotateY(${turn.toFixed(2)}deg) scale(${(1 - a * SHRINK).toFixed(4)})`;
      el.style.opacity = (1 - a * FADE).toFixed(3);
      el.style.visibility = Math.abs(d) > 2.2 ? 'hidden' : '';
      el.style.zIndex = String(10 - Math.round(Math.abs(d) * 2));
    });
    const idx = ((Math.round(pos) % N) + N) % N;
    if (idx !== activeRef.current) {
      activeRef.current = idx;
      setActive(idx);
    }
  }, [reduceMotion]);

  // Glide from wherever the ring is to `target`.
  const animateTo = useCallback(
    (target) => {
      cancelAnimationFrame(animRef.current);
      targetRef.current = target;
      const from = posRef.current;
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / ANIM_MS);
        posRef.current = from + (target - from) * easeOut(k);
        draw();
        if (k < 1) animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
    },
    [draw],
  );

  // One card forward/back.
  const step = useCallback((dir) => animateTo(targetRef.current + dir), [animateTo]);

  // A dot / a side card: the shortest way round to it.
  const goToCard = useCallback((i) => animateTo(targetRef.current + ringDist(i, targetRef.current)), [animateTo]);

  useLayoutEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  // Swipe / drag: the ring follows the finger, then settles one card over
  // (or back) — never more than one per swipe.
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const first = cardRefs.current[0];
    const gap = parseFloat(getComputedStyle(trackRef.current).getPropertyValue('--home-gap')) || 28;
    dragRef.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      base: Math.round(targetRef.current),
      startPos: posRef.current,
      step: (first?.offsetWidth || 1) + gap,
      lastX: e.clientX,
      lastT: performance.now(),
      v: 0,
      dragging: false,
    };
    suppressClickRef.current = false;
  };
  const onPointerMove = (e) => {
    const g = dragRef.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x0;
    if (!g.dragging) {
      if (Math.abs(dx) < 6) return;
      if (Math.abs(e.clientY - g.y0) > Math.abs(dx)) {
        dragRef.current = null; // a vertical gesture: leave it to the page
        return;
      }
      g.dragging = true;
      suppressClickRef.current = true;
      cancelAnimationFrame(animRef.current);
      g.startPos = posRef.current;
      try {
        trackRef.current.setPointerCapture(e.pointerId);
      } catch {
        /* not capturable — still works */
      }
    }
    const now = performance.now();
    g.v = (e.clientX - g.lastX) / Math.max(1, now - g.lastT);
    g.lastX = e.clientX;
    g.lastT = now;
    // RTL: dragging right brings the next (left) card in. Held to one card
    // either side of where the swipe began.
    const raw = g.startPos + dx / g.step;
    posRef.current = Math.max(g.base - 1, Math.min(g.base + 1, raw));
    draw();
  };
  const onPointerUp = (e) => {
    const g = dragRef.current;
    dragRef.current = null;
    if (!g || g.id !== e.pointerId || !g.dragging) return;
    const moved = posRef.current - g.base;
    let target = g.base;
    if (moved > SWIPE_SHARE || g.v > SWIPE_SPEED) target = g.base + 1;
    else if (moved < -SWIPE_SHARE || g.v < -SWIPE_SPEED) target = g.base - 1;
    animateTo(target);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      // RTL: the next card is to the left.
      step(e.key === 'ArrowLeft' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  // Mouse wheel (desktop): down = next card, up = previous — one card per
  // flick. A trackpad sends a burst of small deltas, so they're summed and
  // a step is followed by a short pause. A sideways trackpad swipe moves
  // one card too.
  useEffect(() => {
    const box = rootRef.current; // anywhere on the home screen
    if (!box) return undefined;
    let sum = 0;
    let lockedUntil = 0;
    const onWheel = (e) => {
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      e.preventDefault();
      const now = performance.now();
      if (now < lockedUntil) return;
      // Sideways: content follows the fingers (RTL: right = next).
      sum += horizontal ? -e.deltaX : e.deltaY;
      if (Math.abs(sum) < 40) return;
      const dir = sum > 0 ? 1 : -1;
      sum = 0;
      lockedUntil = now + 450;
      step(dir);
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, [step]);

  const open = (card, option) => {
    if (option.tool) {
      // The tool on its own screen.
      onOpen({ tool: option.tool, tunerMode: option.tunerMode, card: card.key });
      return;
    }
    onOpen({
      instrument: card.instrument ?? (instrument === 'bass' ? 'guitar' : instrument),
      section: option.section,
      practiceTab: option.practiceTab ?? null,
    });
  };

  // A tap at the end of a drag isn't a click.
  const guard = (fn) => (e) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      return;
    }
    fn();
  };

  return (
    <div className="home-menu" dir="rtl" ref={rootRef}>
      <header className="home-top">
        <div className="home-brand">
          <AppLogo size={40} />
          <span dir="ltr">{t('app.name')}</span>
        </div>
        {onContinue && (
          <button type="button" className="home-continue" onClick={onContinue}>
            {t('home.continue')}
          </button>
        )}
      </header>

      <div className="home-carousel">
        <div
          className="home-track"
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {CARDS.map((card, i) => {
            const opts = card.options.filter((o) => {
              if (o.tool) return true;
              const inst = card.instrument ?? (instrument === 'bass' ? 'guitar' : instrument);
              return supportsInstrument(o.section, inst);
            });
            const isActive = i === active;
            return (
              <article
                key={card.key}
                ref={(el) => (cardRefs.current[i] = el)}
                className={'home-card' + (isActive ? ' is-active' : '')}
                aria-current={isActive ? 'true' : undefined}
                aria-hidden={isActive ? undefined : 'true'}
              >
                <button
                  type="button"
                  className="home-card-main"
                  onClick={guard(() => (isActive ? open(card, opts[0]) : goToCard(i)))}
                  tabIndex={isActive ? 0 : -1}
                >
                  <span className={`home-art home-art-${card.key}`} dangerouslySetInnerHTML={{ __html: INSTRUMENT_ART[card.key] }} />
                  <span className="home-text">
                    <span className="home-title">{t(card.titleKey)}</span>
                    <span className="home-desc">{t(card.descKey)}</span>
                  </span>
                </button>
                <div className="home-options">
                  {opts.map((o) => (
                    <button
                      key={o.tool ?? o.section + (o.practiceTab ?? '')}
                      type="button"
                      className="home-option"
                      onClick={guard(() => (isActive ? open(card, o) : goToCard(i)))}
                      tabIndex={isActive ? 0 : -1}
                    >
                      <LineIcon name={o.icon} />
                      <span>{t(o.labelKey ?? `nav.${o.section}`)}</span>
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Arrows flank the dots, under the cards (hidden on phones). */}
      <div className="home-nav">
        <button type="button" className="home-arrow home-arrow-prev" onClick={() => step(-1)} aria-label={t('home.prev')}>
          <Chevron dir="right" />
        </button>
        <div className="home-dots" role="tablist" aria-label={t('home.instruments')}>
          {CARDS.map((card, i) => (
            <button
              key={card.key}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={t(card.titleKey)}
              className={i === active ? 'on' : ''}
              onClick={() => goToCard(i)}
            />
          ))}
        </div>
        <button type="button" className="home-arrow home-arrow-next" onClick={() => step(1)} aria-label={t('home.next')}>
          <Chevron dir="left" />
        </button>
      </div>
    </div>
  );
}
