import { useCallback, useEffect, useRef, useState } from 'react';
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
  ear: (
    <>
      <path d="M7 9a5 5 0 1 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0" />
      <path d="M10 9a2 2 0 1 1 4 0" />
    </>
  ),
};

function LineIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    ],
  },
  {
    key: 'vocal',
    instrument: null,
    titleKey: 'home.vocal.title',
    descKey: 'home.vocal.desc',
    options: [
      { section: 'vocal', icon: 'vocal' },
      { section: 'practice', practiceTab: 'ear-training', icon: 'ear', labelKey: 'practice.tab.earTraining' },
    ],
  },
  {
    // Not an instrument: the metronome / tuner, each on a screen of its own.
    key: 'tools',
    instrument: null,
    titleKey: 'home.tools.title',
    descKey: 'home.tools.desc',
    options: [
      { tool: 'metronome', icon: 'metronome', labelKey: 'metronome.title' },
      { tool: 'tuner', icon: 'tuner', labelKey: 'tunerBar.label' },
    ],
  },
];

/**
 * The home screen: a carousel of instruments (swipe, arrows or the dots),
 * each card with a short description and shortcuts into the app. Tapping
 * the card itself opens its first shortcut.
 */
export function HomeMenu({ onOpen, onContinue, initialCard }) {
  const { t } = useLanguage();
  const { instrument } = useInstrument();
  const scrollRef = useRef(null);
  const rootRef = useRef(null);
  const cardRefs = useRef([]);
  // Back from a tool screen = back on the Tools card; otherwise the
  // instrument in use.
  const startIndex = Math.max(
    0,
    CARDS.findIndex((c) => (initialCard ? c.key === initialCard : c.instrument === instrument))
  );
  const [active, setActive] = useState(startIndex);

  const scrollTo = useCallback((i, smooth = true) => {
    // Scroll the track only (scrollIntoView would also move the page), by
    // the card's distance from the middle — works the same in RTL.
    const card = cardRefs.current[i];
    const box = scrollRef.current;
    if (!card || !box) return;
    const c = card.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    box.scrollBy({ left: c.left + c.width / 2 - (b.left + b.width / 2), behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  // Open on the instrument in use.
  useEffect(() => {
    scrollTo(startIndex, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The card nearest the middle is the active one.
  const onScroll = () => {
    const box = scrollRef.current;
    if (!box) return;
    const mid = box.getBoundingClientRect().left + box.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActive(best);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      // RTL: the next card is to the left.
      const step = e.key === 'ArrowLeft' ? 1 : -1;
      scrollTo(Math.min(CARDS.length - 1, Math.max(0, active + step)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, scrollTo]);

  // Mouse wheel (desktop): down = next card, up = previous — one card per
  // flick. A trackpad sends a burst of small deltas, so they're summed and
  // a step is followed by a short pause. Sideways trackpad swipes scroll
  // natively and are left alone.
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    const box = rootRef.current; // anywhere on the home screen
    if (!box) return undefined;
    let sum = 0;
    let lockedUntil = 0;
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const now = performance.now();
      if (now < lockedUntil) return;
      sum += e.deltaY;
      if (Math.abs(sum) < 40) return;
      const step = sum > 0 ? 1 : -1;
      sum = 0;
      lockedUntil = now + 450;
      const next = Math.min(CARDS.length - 1, Math.max(0, activeRef.current + step));
      if (next !== activeRef.current) scrollTo(next);
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, [scrollTo]);

  const open = (card, option) => {
    if (option.tool) {
      // The tool on its own screen.
      onOpen({ tool: option.tool });
      return;
    }
    onOpen({
      instrument: card.instrument ?? (instrument === 'bass' ? 'guitar' : instrument),
      section: option.section,
      practiceTab: option.practiceTab ?? null,
    });
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
        <button
          type="button"
          className="home-arrow home-arrow-prev"
          onClick={() => scrollTo(Math.max(0, active - 1))}
          disabled={active === 0}
          aria-label={t('home.prev')}
        >
          ›
        </button>
        <div className="home-track" ref={scrollRef} onScroll={onScroll}>
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
              >
                <button
                  type="button"
                  className="home-card-main"
                  onClick={() => (isActive ? open(card, opts[0]) : scrollTo(i))}
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
                      onClick={() => (isActive ? open(card, o) : scrollTo(i))}
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
        <button
          type="button"
          className="home-arrow home-arrow-next"
          onClick={() => scrollTo(Math.min(CARDS.length - 1, active + 1))}
          disabled={active === CARDS.length - 1}
          aria-label={t('home.next')}
        >
          ‹
        </button>
      </div>

      <div className="home-dots" role="tablist" aria-label={t('home.instruments')}>
        {CARDS.map((card, i) => (
          <button
            key={card.key}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={t(card.titleKey)}
            className={i === active ? 'on' : ''}
            onClick={() => scrollTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
