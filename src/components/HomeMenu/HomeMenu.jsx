import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useInstrument } from '../../instruments/useInstrument';
import { supportsInstrument } from '../../instruments/featureCapabilities';
import { AppLogo } from '../AppLogo/AppLogo';
import { INSTRUMENT_ART } from './instrumentArt';
import { ProfileChip } from '../../profile/ProfileChip';
import { LineIcon } from '../LineIcon/LineIcon';
import { NAV_GROUPS, lastSectionIn } from '../AppShell/sections';
import './HomeMenu.css';

// One card per instrument. `instrument: null` keeps whatever is selected
// (singing isn't an instrument mode of its own). Shortcuts an instrument
// doesn't support are left out (featureCapabilities).
const CARDS = [
  {
    key: 'guitar',
    instrument: 'guitar',
    titleKey: 'home.guitar.title',
    descKey: 'home.guitar.desc',
    // The same five goal groups as the in-app bar (sections.js NAV_GROUPS;
    // stage 2 of the redesign, 2026-11-03). `group` opens the section last
    // used inside it, else `section`.
    options: [
      { group: 'learn', section: 'teacher', icon: 'teacher', labelKey: 'nav.group.learn' },
      { section: 'practice', icon: 'practice' },
      { section: 'chords', icon: 'chords' },
      { group: 'play', section: 'guitarpro', icon: 'play', labelKey: 'nav.group.play' },
      { group: 'create', section: 'compose', icon: 'create', labelKey: 'nav.group.create' },
    ],
  },
  {
    key: 'piano',
    instrument: 'piano',
    titleKey: 'home.piano.title',
    descKey: 'home.piano.desc',
    options: [
      { section: 'studies', icon: 'studies' },
      { section: 'practice', icon: 'practice' },
      { section: 'chords', icon: 'pianoChords' },
      { group: 'play', section: 'guitarpro', icon: 'play', labelKey: 'nav.group.play' },
      { group: 'create', section: 'compose', icon: 'create', labelKey: 'nav.group.create' },
    ],
  },
  {
    key: 'bass',
    instrument: 'bass',
    titleKey: 'home.bass.title',
    descKey: 'home.bass.desc',
    options: [
      { section: 'bassPractice', icon: 'practice', labelKey: 'nav.practice' },
      { section: 'guitarpro', icon: 'guitarpro' },
      { section: 'compose', icon: 'compose' },
    ],
  },
  {
    key: 'vocal',
    instrument: null,
    titleKey: 'home.vocal.title',
    descKey: 'home.vocal.desc',
    options: [
      { section: 'vocal', icon: 'vocal' },
      // The singers' own ear training (Vocal section's ear screen) — not
      // the instrument quiz on the guitar's Practice page.
      {
        section: 'vocal',
        vocalScreen: 'ear',
        icon: 'ear',
        labelKey: 'practice.tab.earTraining',
      },
    ],
  },
  {
    // Songwriting (not an instrument): lyrics + chords + the sung melody.
    key: 'songwriter',
    instrument: null,
    titleKey: 'home.songwriter.title',
    descKey: 'home.songwriter.desc',
    options: [
      { songwriter: 'list', icon: 'lyrics', labelKey: 'sw.nav.songs' },
      { songwriter: 'new', icon: 'newSong', labelKey: 'sw.nav.new' },
      { songwriter: 'idea', icon: 'idea', labelKey: 'sw.nav.idea' },
    ],
  },
  {
    // Not an instrument: metronome / tuner / amp / recorder / settings, each on a screen
    // of its own.
    key: 'tools',
    instrument: null,
    titleKey: 'home.tools.title',
    descKey: 'amp.homeDesc',
    options: [
      { tool: 'metronome', icon: 'metronome', labelKey: 'metronome.title' },
      { tool: 'drums', icon: 'drums', labelKey: 'drums.nav' },
      { tool: 'tuner', icon: 'tuner', labelKey: 'tunerBar.label' },
      { tool: 'amp', icon: 'amp', labelKey: 'amp.nav' },
      { tool: 'record', icon: 'record', labelKey: 'rec.nav' },
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
const TURN_DEG = 33;
const TURN_DEG_PHONE = 33; // phones (<=640px) — same as desktop for now
const PHONE_MQ = '(max-width: 640px)';
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
export function HomeMenu({ onOpen, onContinue, onNextLesson, initialCard }) {
  const { t, lang } = useLanguage();
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
    const turnDeg = window.matchMedia?.(PHONE_MQ).matches ? TURN_DEG_PHONE : TURN_DEG;
    const first = cardRefs.current[0];
    const gap = parseFloat(getComputedStyle(track).getPropertyValue('--home-gap')) || 28;
    const cardW = first?.offsetWidth || 1;
    // Wider screens (iPad, desktop): the neighbours wait just OFF the screen
    // and slide in with the swipe — at rest only the chosen card shows (user,
    // 2026-11-01: the next cards' edges peeked in at the sides). Phones keep
    // the plain card + gap step.
    const phone = window.matchMedia?.(PHONE_MQ).matches;
    const viewW = rootRef.current?.clientWidth || window.innerWidth;
    const step = phone ? cardW + gap : Math.max(cardW + gap, viewW / 2 + (cardW * (1 - SHRINK)) / 2 + 24);
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const d = ringDist(i, pos);
      const a = Math.min(1, Math.abs(d));
      // RTL: the next card waits on the left.
      const x = -d * step;
      const turn = reduceMotion ? 0 : Math.max(-1.5, Math.min(1.5, d)) * turnDeg;
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

  // While the home screen is up, the document itself can't scroll or
  // bounce either (iOS rubber-band).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('home-locked');
    return () => root.classList.remove('home-locked');
  }, []);

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
        dragRef.current = null; // a vertical gesture: nothing to do
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

  // Mouse wheel / trackpad (desktop): ONE card per gesture, like a swipe on
  // the iPad. A trackpad swipe is a stream of small deltas followed by a
  // long inertia tail (well over a second on a Mac): after the gesture's one
  // step the tail is swallowed. A NEW gesture = a pause in the events
  // (GESTURE_GAP), or — when the next swipe starts while the tail is still
  // running, so there is no pause — the deltas RISING again (a tail only
  // decays). The first version only knew the pause, so a second swipe soon
  // after the first did nothing (user, 2026-10-31).
  useEffect(() => {
    const box = rootRef.current; // anywhere on the home screen
    if (!box) return undefined;
    const GESTURE_GAP = 220;
    let sum = 0;
    let lastAt = -Infinity;
    let stepped = false;
    let recent = []; // |delta| of the last events
    let peak = 0; // largest |delta| since the step
    let decayed = false; // the stream has fallen well below that peak
    const avg = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
    const onWheel = (e) => {
      // The profile list scrolls by itself.
      if (e.target instanceof Element && e.target.closest('.profile-pop')) return;
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      e.preventDefault();
      const d = horizontal ? -e.deltaX : e.deltaY;
      const now = performance.now();
      let fresh = now - lastAt > GESTURE_GAP;
      lastAt = now;
      recent.push(Math.abs(d));
      if (recent.length > 8) recent = recent.slice(-8);
      if (stepped) {
        peak = Math.max(peak, Math.abs(d));
        if (Math.abs(d) < peak * 0.5) decayed = true;
      }
      if (!fresh && stepped && decayed && recent.length >= 6) {
        // still streaming: a clear rise over the decaying tail = a new swipe
        const older = avg(recent.slice(-6, -3));
        const newer = avg(recent.slice(-3));
        if (newer > 4 && newer > older * 1.6) fresh = true;
      }
      if (fresh) {
        sum = 0;
        stepped = false;
        recent = recent.slice(-3);
      }
      if (stepped) return;
      // Sideways: content follows the fingers (RTL: right = next).
      sum += d;
      if (Math.abs(sum) < 40) return;
      stepped = true;
      peak = 0;
      decayed = false;
      recent = [];
      step(sum > 0 ? 1 : -1);
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, [step]);

  // A group shortcut returns to the screen last used in that group (when it
  // exists on this instrument).
  const openSectionFor = (option, inst) => {
    if (!option.group) return option.section;
    const last = lastSectionIn(option.group);
    const g = NAV_GROUPS.find((x) => x.key === option.group);
    return last && g?.members.includes(last) && supportsInstrument(last, inst) ? last : option.section;
  };

  const open = (card, option) => {
    if (option.songwriter) {
      onOpen({ songwriter: option.songwriter, card: card.key });
      return;
    }
    if (option.tool) {
      // The tool on its own screen.
      onOpen({ tool: option.tool, tunerMode: option.tunerMode, card: card.key });
      return;
    }
    onOpen({
      instrument: card.instrument ?? (instrument === 'bass' ? 'guitar' : instrument),
      section: openSectionFor(option, card.instrument ?? instrument),
      practiceTab: option.practiceTab ?? null,
      vocalScreen: option.vocalScreen ?? null,
      teacherScreen: option.teacherScreen ?? null,
      card: card.key,
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
        <div className="home-top-end">
          {/* Who's practising (local profiles), at the far right. */}
          <ProfileChip onSettings={() => onOpen({ tool: 'settings', card: CARDS[((Math.round(targetRef.current) % N) + N) % N].key })} />
          {onContinue && (
            <button type="button" className="home-continue" onClick={onContinue}>
              {t('home.continue')}
            </button>
          )}
          {!onContinue && onNextLesson && (
            <button type="button" className="home-continue is-lesson" onClick={onNextLesson}>
              {t('home.nextLesson')}
            </button>
          )}
        </div>
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
              if (o.tool || o.songwriter) return true;
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
                  <span className="home-text" dir="auto">
                    <span className="home-title">{t(card.titleKey)}</span>
                    <span className="home-desc">{t(card.descKey)}</span>
                  </span>
                </button>
                {/* Shortcuts in reading order, like the in-app bar. */}
                <div className="home-options" dir={lang === 'he' ? 'rtl' : 'ltr'}>
                  {opts.map((o) => (
                    <button
                      key={o.tool ?? o.songwriter ?? o.section + (o.practiceTab ?? '') + (o.vocalScreen ?? '') + (o.teacherScreen ?? '')}
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
