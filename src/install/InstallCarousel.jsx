// The picture under the install guide (user's choice 2026-10-21): a small
// copy of the home screen's card wheel — Guitar, Piano, Tools (art + name
// only), three in view (the middle one flat, the neighbours turned), turning
// by itself every 3 s until touched. Touch only turns it: a swipe moves one
// card, a tap on a side card brings it to the middle, a tap on the middle
// one moves on — nothing opens.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { INSTRUMENT_ART } from '../components/HomeMenu/instrumentArt';

const CARDS = [
  { key: 'guitar', title: 'home.guitar.title' },
  { key: 'piano', title: 'home.piano.title' },
  { key: 'tools', title: 'home.tools.title' },
];
// Two laps of the three cards on the ring, so the card that wraps round
// does it out of sight behind the others.
const SLOTS = [...CARDS, ...CARDS];
const N = SLOTS.length;
const STEP = 0.8; // neighbour offset, in card widths
const TURN = 33; // degrees, like the home screen
const SHRINK = 0.14;
const FADE = 0.45;
const ANIM_MS = 520;
const AUTO_MS = 3000;
const IDLE_MS = 7000; // auto-turn resumes this long after a touch

function ringDist(i, pos) {
  let d = (i - pos) % N;
  if (d < -N / 2) d += N;
  if (d >= N / 2) d -= N;
  return d;
}
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function InstallCarousel() {
  const { t, lang } = useLanguage();
  const trackRef = useRef(null);
  const cardRefs = useRef([]);
  const posRef = useRef(0);
  const animRef = useRef(0);
  const touchedAt = useRef(0);
  const drag = useRef(null);
  const [active, setActive] = useState(0);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const dir = lang === 'he' ? -1 : 1; // RTL: the next card waits on the left

  const draw = useCallback(() => {
    const pos = posRef.current;
    const w = cardRefs.current[0]?.offsetWidth || 1;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const d = ringDist(i, pos);
      const a = Math.min(1, Math.abs(d));
      const x = dir * d * w * STEP;
      const turn = reduceMotion ? 0 : Math.max(-1.4, Math.min(1.4, d)) * -dir * TURN;
      el.style.transform = `translateX(${x.toFixed(1)}px) perspective(900px) rotateY(${turn.toFixed(2)}deg) scale(${(1 - a * SHRINK).toFixed(4)})`;
      el.style.opacity = Math.abs(d) > 1.6 ? '0' : (1 - a * FADE).toFixed(3);
      el.style.zIndex = String(10 - Math.round(Math.abs(d) * 3));
    });
    setActive(((Math.round(pos) % CARDS.length) + CARDS.length) % CARDS.length);
  }, [dir, reduceMotion]);

  const animateTo = useCallback(
    (target) => {
      cancelAnimationFrame(animRef.current);
      const from = posRef.current;
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / ANIM_MS);
        posRef.current = from + (target - from) * easeInOut(k);
        draw();
        if (k < 1) animRef.current = requestAnimationFrame(tick);
        else posRef.current = ((target % N) + N) % N;
      };
      animRef.current = requestAnimationFrame(tick);
    },
    [draw]
  );

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    if (trackRef.current) ro.observe(trackRef.current);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  // Turn by itself until the visitor touches it (then again after a pause).
  useEffect(() => {
    if (reduceMotion) return undefined;
    const id = setInterval(() => {
      if (document.hidden || drag.current || Date.now() - touchedAt.current < IDLE_MS) return;
      animateTo(Math.round(posRef.current) + 1);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [animateTo, reduceMotion]);

  const onPointerDown = (e) => {
    touchedAt.current = Date.now();
    cancelAnimationFrame(animRef.current);
    drag.current = { x: e.clientX, t: performance.now(), pos: posRef.current, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 6) d.moved = true;
    const w = cardRefs.current[0]?.offsetWidth || 1;
    const shift = Math.max(-1, Math.min(1, (-dir * dx) / (w * STEP)));
    posRef.current = d.pos + shift;
    draw();
  };
  const onPointerUp = (e) => {
    const d = drag.current;
    drag.current = null;
    touchedAt.current = Date.now();
    if (!d) return;
    const base = Math.round(d.pos);
    if (!d.moved) {
      // a tap: a side card comes to the middle, the middle one moves on
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const hit = cardRefs.current.findIndex((el) => el && under && el.contains(under));
      const rd = hit >= 0 ? Math.round(ringDist(hit, base)) : 0;
      animateTo(base + (rd === 0 ? 1 : rd));
      return;
    }
    const dx = e.clientX - d.x;
    const speed = Math.abs(dx) / Math.max(1, performance.now() - d.t);
    const w = cardRefs.current[0]?.offsetWidth || 1;
    const share = Math.abs(dx) / (w * STEP);
    const step = share > 0.15 || speed > 0.35 ? -dir * Math.sign(dx) : 0;
    animateTo(base + step);
  };

  const goTo = (i) => {
    touchedAt.current = Date.now();
    const base = Math.round(posRef.current);
    const cur = ((base % CARDS.length) + CARDS.length) % CARDS.length;
    let delta = i - cur;
    if (delta > 1) delta -= 3;
    if (delta < -1) delta += 3;
    animateTo(base + delta);
  };

  return (
    <div className="inst-wheel">
      <div
        className="inst-wheel-track"
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-hidden="true"
      >
        {SLOTS.map((card, i) => (
          <div key={i} ref={(el) => (cardRefs.current[i] = el)} className={`inst-wheel-card is-${card.key}`}>
            <span className="inst-wheel-art" dangerouslySetInnerHTML={{ __html: INSTRUMENT_ART[card.key] }} />
            <b>{t(card.title)}</b>
          </div>
        ))}
      </div>
      <div className="inst-wheel-dots" role="tablist" aria-label="DudeStar">
        {CARDS.map((c, i) => (
          <button key={c.key} type="button" role="tab" aria-selected={i === active} aria-label={t(c.title)} className={i === active ? 'on' : ''} onClick={() => goTo(i)} />
        ))}
      </div>
    </div>
  );
}
