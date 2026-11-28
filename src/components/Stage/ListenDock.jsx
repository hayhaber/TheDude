import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { addListenHost, closeListen, listenNow, openListen, reportYt, setYtSender, subscribeListen, ytInfo } from '../../music/sheets/listenStore';
import { cleanLink, embedOf, serviceOf } from '../../music/sheets/songLink';

// The in-app listening player (v1.0.229, user: "Play should play the song
// while I keep seeing the chart"): a floating Liquid Glass card with the
// service's own embedded player (YouTube video, Spotify / Apple Music
// player). It sits above the Band lists and above the Performer, so the
// song keeps playing while the chart or the words show. Fold = a small
// capsule (the audio goes on); × stops it; ↗ opens the service's app.
export function ListenDock() {
  const { t, lang } = useLanguage();
  const now = useSyncExternalStore(subscribeListen, listenNow, listenNow);
  const [mini, setMini] = useState(false);
  useEffect(() => addListenHost(), []);
  // playing along with the chart: start folded, the chart stays in view
  useEffect(() => setMini(!!now?.along), [now?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  // its height, so the Performer's end card can sit above it
  const dockRef = useRef(null);
  useEffect(() => {
    const el = dockRef.current;
    const html = document.documentElement;
    if (!el) return undefined;
    html.classList.add('has-listen-dock');
    const set = () => html.style.setProperty('--stage-dock-h', el.offsetHeight + 'px');
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => {
      ro.disconnect();
      html.classList.remove('has-listen-dock');
      html.style.removeProperty('--stage-dock-h');
    };
  }, [now?.n, !!now]); // eslint-disable-line react-hooks/exhaustive-deps
  // v1.0.302 (user: "can the YouTube player be dragged around the
  // screen?"): Picture-in-Picture style — drag it by its title bar, on
  // release it glides to the nearest corner (top / bottom × left / right),
  // kept per device. The iframe ignores the finger while dragging.
  const [corner, setCorner] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dudestar-listen-corner') || 'null');
    } catch {
      return null;
    }
  });
  const [dragging, setDragging] = useState(false);
  const flipRef = useRef(null);
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('listen-dock-top', corner?.y === 'top');
    return () => html.classList.remove('listen-dock-top');
  }, [corner]);
  useLayoutEffect(() => {
    const el = dockRef.current;
    const from = flipRef.current;
    if (!el || !from) return;
    flipRef.current = null;
    el.style.transition = 'none';
    el.style.transform = '';
    const to = el.getBoundingClientRect();
    el.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`;
    el.getBoundingClientRect(); // commit the start
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.style.transition = reduce ? 'none' : 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)';
    el.style.transform = '';
  }, [corner]);
  const startDrag = (e) => {
    if (e.button > 0 || e.target.closest('button, a')) return;
    const el = dockRef.current;
    if (!el) return;
    e.preventDefault();
    const x0 = e.clientX;
    const y0 = e.clientY;
    let moved = false;
    el.setPointerCapture?.(e.pointerId);
    el.style.transition = 'none';
    const move = (ev) => {
      const dx = ev.clientX - x0;
      const dy = ev.clientY - y0;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (!moved) {
        moved = true;
        setDragging(true);
      }
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      setDragging(false);
      if (!moved) return;
      const r = el.getBoundingClientRect();
      const next = {
        x: r.left + r.width / 2 < window.innerWidth / 2 ? 'left' : 'right',
        y: r.top + r.height / 2 < window.innerHeight / 2 ? 'top' : 'bottom',
      };
      flipRef.current = r;
      try {
        localStorage.setItem('dudestar-listen-corner', JSON.stringify(next));
      } catch {
        /* private mode */
      }
      if (next.x === corner?.x && next.y === corner?.y) {
        // same corner: glide back
        el.style.transition = 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)';
        el.style.transform = '';
        flipRef.current = null;
      } else setCorner(next);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
  const emb = now ? embedOf(now.link) : null;
  const frameRef = useRef(null);
  const loadedRef = useRef(null); // the link the YouTube player holds
  const videoRef = useRef(null); // the video the player says it holds
  const isYt = emb?.kind === 'youtube';
  // the iframe keeps the address it opened with; a reused player gets the
  // next song by loadVideoById, never by a new src (= a reload)
  const srcRef = useRef({ n: null, src: '' });
  if (now && emb && srcRef.current.n !== now.n) srcRef.current = { n: now.n, src: emb.src };

  // YouTube's iframe API by postMessage (no script to load): say we listen
  // until the player answers, then it sends infoDelivery (time, state …).
  useEffect(() => {
    if (!isYt) return undefined;
    const frame = frameRef.current;
    if (!frame) return undefined;
    loadedRef.current = now.link;
    videoRef.current = null; // a new player: nothing reported yet
    let heard = false;
    const post = (msg) => {
      try {
        frame.contentWindow?.postMessage(JSON.stringify(msg), '*');
      } catch {
        /* the frame is gone */
      }
    };
    const hello = () => post({ event: 'listening', id: 1, channel: 'widget' });
    const tick = setInterval(() => {
      if (heard) clearInterval(tick);
      else hello();
    }, 250);
    frame.addEventListener('load', hello);
    const onMsg = (e) => {
      if (e.source !== frame.contentWindow) return;
      if (!/(^|\.)youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
      let d = e.data;
      if (typeof d === 'string') {
        try {
          d = JSON.parse(d);
        } catch {
          return;
        }
      }
      if (!d || typeof d !== 'object') return;
      heard = true;
      if (d.event === 'onReady') reportYt({ ready: true });
      else if (d.event === 'onStateChange' && typeof d.info === 'number') reportYt({ state: d.info });
      else if ((d.event === 'infoDelivery' || d.event === 'initialDelivery') && d.info) {
        const i = d.info;
        const patch = { ready: true };
        if (typeof i.currentTime === 'number') patch.time = i.currentTime;
        if (typeof i.duration === 'number' && i.duration > 0) patch.dur = i.duration;
        if (typeof i.playerState === 'number') patch.state = i.playerState;
        if (i.videoData?.video_id) videoRef.current = i.videoData.video_id;
        reportYt(patch);
      }
    };
    window.addEventListener('message', onMsg);
    setYtSender((func, args) => post({ event: 'command', func, args }));
    return () => {
      clearInterval(tick);
      frame.removeEventListener('load', hello);
      window.removeEventListener('message', onMsg);
      setYtSender(null);
    };
  }, [isYt, now?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  // the next song in the SAME player (iOS plays it on without a new tap)
  useEffect(() => {
    if (!isYt || !now || loadedRef.current === now.link) return;
    loadedRef.current = now.link;
    const want = emb.id;
    const post = (func, args) => {
      try {
        frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
      } catch {
        /* the frame is gone */
      }
    };
    // positional arguments: the object form isn't passed on by every
    // player build over postMessage (v1.0.263 — the old song kept playing)
    post('loadVideoById', [want, emb.start || 0]);
    // still the old video (or nothing playing) after a moment: a fresh
    // player with the new song (it may need one tap on iOS)
    const check = setTimeout(() => {
      const st = ytInfo().state;
      // the player never said it holds the new video = treat it as the old
      // one (v1.0.268: a player that doesn't report its video kept playing
      // the previous song)
      if (videoRef.current !== want) {
        openListen(now.link, now.name, { along: now.along });
        return;
      }
      if (st === 5 || st === -1) post('playVideo', []);
    }, 2500);
    return () => clearTimeout(check);
  }, [isYt, now?.link]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!now) return null;
  const url = cleanLink(now.link);
  if (!emb || !url) return null;
  const svc = serviceOf(url);
  return createPortal(
    <div
      ref={dockRef}
      className={'stg-dock glass is-' + emb.kind + (mini ? ' is-mini' : '') + (corner ? ' at-' + corner.y + ' at-' + corner.x : '') + (dragging ? ' is-dragging' : '')}
      dir={lang === 'he' ? 'rtl' : 'ltr'}
      role="region"
      aria-label={t('stage.listen.player')}
    >
      <div className="stg-dock-head" onPointerDown={startDrag} title={t('stage.listen.drag')}>
        <span className="stg-dock-grab" aria-hidden="true" />
        <span className="stg-dock-title" dir="auto">
          <strong>{now.name}</strong>
          <span>{t('stage.listen.svc.' + svc)}</span>
        </span>
        <a className="stg-dock-key" href={url} target="_blank" rel="noopener noreferrer" aria-label={t('stage.listen.openApp')} title={t('stage.listen.openApp')}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </svg>
        </a>
        <button type="button" className="stg-dock-key" onClick={() => setMini((v) => !v)} aria-expanded={!mini} aria-label={mini ? t('stage.listen.show') : t('stage.listen.fold')} title={mini ? t('stage.listen.show') : t('stage.listen.fold')}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={mini ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
          </svg>
        </button>
        <button type="button" className="stg-dock-key" onClick={closeListen} aria-label={t('stage.listen.close')} title={t('stage.listen.close')}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="stg-dock-frame" style={emb.ratio ? { aspectRatio: String(emb.ratio) } : { height: emb.height }}>
        <iframe
          key={now.n}
          ref={frameRef}
          src={srcRef.current.src}
          title={now.name}
          allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          loading="eager"
        />
      </div>
    </div>,
    document.body
  );
}
