import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadPdfDocument } from '../../music/pdfTextExtractor';
import { getSheet, setSheetPrefs, sheetPrefs } from '../../music/sheets/sheetStore';
import './PdfSheetView.css';
import { Performer } from '../Stage/Performer';

// A sheet-music PDF, shown as it is (PianoPro / GuitarPro): the pages one
// under the other at the width of the screen, a reading place remembered
// per sheet, page turns (buttons, arrow / Page keys = Bluetooth page-turn
// pedals, Space = scroll), and AUTO-SCROLL at a chosen speed in seconds per
// page — it runs on across the page breaks. Full screen = the sheet alone
// on the screen (the controls float over it as Liquid Glass keys).

export const SPEEDS = [15, 20, 30, 40, 50, 60, 75, 90, 120, 150, 180, 240];
const GAP = 12; // px between pages

export function useWakeLock(on) {
  useEffect(() => {
    if (!on) return undefined;
    let lock = null;
    let alive = true;
    const ask = async () => {
      try {
        if (alive && document.visibilityState === 'visible' && navigator.wakeLock) lock = await navigator.wakeLock.request('screen');
      } catch {
        /* not supported / refused */
      }
    };
    ask();
    const onVis = () => document.visibilityState === 'visible' && ask();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVis);
      lock?.release?.().catch(() => {});
    };
  }, [on]);
}

/** One page: a placeholder of the right shape; drawn when it comes near.
 *  `children` = an overlay over the page (the Stage's transposed chords). */
// v1.0.253 (user: a Tab4u print came cut at the page's right edge, "can
// the system check the display and fix it by itself?"): some sites print
// their text flush against one side and use half the page (Tab4u: RTL, no
// right margin, the left half empty). The page's TEXT tells where the
// content really is, so each page is FRAMED to it before it's shown: the
// window = the text's extent + a 4 % margin on each side (content that
// spilled past the paper's edge comes back in), and the page fills the
// screen's width with it — on a phone a half-empty chart's text comes out
// twice as big. Pages that already use their width (> 88 %) are only
// centred when one side touches the edge. Scans / photos have no text =
// drawn as they are. Overlays (transposed chords) ride the same frame.
// Returns {w, h} = the page in points + {lo, cw} = the window's start and
// width in points (Page draws the window at the screen's width).
export async function pageFrame(page) {
  const v = page.getViewport({ scale: 1 });
  const W = v.width;
  const H = v.height;
  let lo = 0;
  let cw = W;
  try {
    const tc = await page.getTextContent();
    let a = Infinity;
    let b = -Infinity;
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const x = it.transform[4];
      a = Math.min(a, x);
      b = Math.max(b, x + (it.width || 0));
    }
    if (b > a) {
      const m = W * 0.04;
      const want = b - a + 2 * m;
      if (want < W * 0.88) {
        lo = a - m;
        cw = want;
      } else {
        const left = a;
        const right = W - b;
        if (Math.min(left, right) < m && Math.abs(left - right) > W * 0.08) lo = (left - right) / 2;
      }
    }
  } catch {
    lo = 0;
    cw = W;
  }
  return { w: W, h: H, lo, cw };
}

// How big a framed page is drawn: fill the width with the window, but not
// past ~1.8 css px per point of the screen's own width (a computer / iPad
// would blow a half-page chart up huge), never smaller than the plain page,
// and a zoomed width (the Size stepper) zooms as before.
const MAX_PX_PER_PT = 1.8;
function frameAt(size, width) {
  const W = size.w;
  const lo = size.lo || 0;
  const cw = size.cw || W;
  const screen = typeof document !== 'undefined' ? document.documentElement.clientWidth || width : width;
  const s = Math.min(width / cw, Math.max(width / W, (MAX_PX_PER_PT * width) / Math.max(1, screen)));
  const shown = width / s; // the window actually shown, in points (>= cw)
  return { s, lo: lo - (shown - cw) / 2, shown };
}

export function Page({ doc, index, size, width, root, children }) {
  const ref = useRef(null);
  const canvasRef = useRef(null);
  const [near, setNear] = useState(false);
  const f = width ? frameAt(size, width) : { s: 1, lo: 0, shown: size.w };
  useEffect(() => {
    const el = ref.current;
    if (!el || !root) return undefined;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { root, rootMargin: '150% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);
  useEffect(() => {
    if (!near || !width) return undefined;
    let task = null;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(index + 1);
      if (cancelled) return;
      const { s, lo } = frameAt(size, width);
      const cssH = size.h * s;
      // iOS draws nothing on a canvas over ~16.7 M pixels (a zoomed page)
      const dpr = Math.min(2.5, window.devicePixelRatio || 1, Math.sqrt(16e6 / Math.max(1, width * cssH)));
      const scale = s * dpr;
      const viewport = page.getViewport({ scale, offsetX: -lo * scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(cssH * dpr);
      task = page.render({ canvasContext: canvas.getContext('2d'), viewport });
      await task.promise.catch(() => {});
    })();
    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, [near, width, doc, index, size]);
  const h = width ? Math.round(size.h * f.s) : 0;
  const framed = Math.abs(f.lo) > 0.01 || Math.abs(f.shown - size.w) > 0.01;
  return (
    <div className="sheet-page" ref={ref} style={{ width, height: h }} data-page={index} dir="ltr">
      <canvas ref={canvasRef} aria-hidden="true" />
      {children &&
        (framed ? (
          // laid out on the full page (width x its height), then moved + scaled onto the window
          <div className="sheet-page-shift" style={{ width, height: (width * size.h) / size.w, transform: `scale(${size.w / f.shown}) translateX(${(-f.lo / size.w) * 100}%)` }}>
            {children}
          </div>
        ) : (
          children
        ))}
    </div>
  );
}

// v1.0.225 (user: "the song scroll here should be the same as the Band's"):
// the inline view is a preview with page turns; Scroll opens the Band's
// Performer on this chart — one scroll engine (song length, reading guide,
// zoom, key change, count-in) for both places.
export function PdfSheetView({ sheetId, name = '', t }) {
  const [perform, setPerform] = useState(false);
  const [doc, setDoc] = useState(null);
  const [sizes, setSizes] = useState([]);
  const [error, setError] = useState(false);
  const [full, setFull] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [secs, setSecs] = useState(() => sheetPrefs(sheetId).secs ?? 60);
  const [pageNow, setPageNow] = useState(1);
  const [width, setWidth] = useState(0);
  const [scroller, setScroller] = useState(null);
  const restored = useRef(false);
  useWakeLock(full || playing);

  // Open the file.
  useEffect(() => {
    let alive = true;
    let loaded = null;
    setDoc(null);
    setSizes([]);
    setError(false);
    setPlaying(false);
    restored.current = false;
    (async () => {
      try {
        const rec = await getSheet(sheetId);
        if (!rec) throw new Error('missing');
        const d = await loadPdfDocument(rec.blob);
        loaded = d;
        const out = [];
        for (let i = 1; i <= d.numPages; i += 1) {
          out.push(await pageFrame(await d.getPage(i)));
        }
        if (!alive) return;
        setSizes(out);
        setDoc(d);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
      loaded?.destroy?.();
    };
  }, [sheetId]);

  // Inline, the sheet fills the screen down to the tab bar (measured: the
  // page above it varies — a first-visit note, a warning).
  useLayoutEffect(() => {
    if (!scroller || full) return undefined;
    const size = () => {
      const top = scroller.getBoundingClientRect().top + (scroller.closest('.app-section-content')?.scrollTop ?? 0);
      const reserve = window.innerWidth < 900 ? 104 : 20;
      scroller.style.height = Math.max(320, Math.round(window.innerHeight - top - reserve)) + 'px';
    };
    size();
    window.addEventListener('resize', size);
    return () => {
      window.removeEventListener('resize', size);
      scroller.style.height = '';
    };
  }, [scroller, full]);

  // The pages take the scroller's width (capped so a wide screen isn't a
  // giant page; full screen goes wider).
  useLayoutEffect(() => {
    if (!scroller) return undefined;
    const fit = () => setWidth(Math.max(200, Math.min(scroller.clientWidth - 24, full ? 1400 : 1000)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [scroller, full]);

  const pageTops = useCallback(() => {
    const tops = [];
    let y = 0;
    for (const s of sizes) {
      tops.push(y);
      y += Math.round((width * s.h) / s.w) + GAP;
    }
    return tops;
  }, [sizes, width]);

  // Reading place as a float page (3.4 = 40 % down page 4) <-> scrollTop.
  const placeOf = useCallback(() => {
    if (!scroller || !sizes.length) return 0;
    const tops = pageTops();
    const y = scroller.scrollTop;
    let i = 0;
    while (i + 1 < tops.length && tops[i + 1] <= y + 1) i += 1;
    const h = (tops[i + 1] ?? tops[i] + (width * sizes[i].h) / sizes[i].w + GAP) - tops[i];
    return i + Math.max(0, Math.min(0.999, (y - tops[i]) / h));
  }, [scroller, sizes, width, pageTops]);
  const goPlace = useCallback(
    (place, smooth = false) => {
      if (!scroller || !sizes.length) return;
      const tops = pageTops();
      const i = Math.max(0, Math.min(sizes.length - 1, Math.floor(place)));
      const h = (tops[i + 1] ?? tops[i] + (width * sizes[i].h) / sizes[i].w + GAP) - tops[i];
      scroller.scrollTo({ top: tops[i] + (place - i) * h, behavior: smooth ? 'smooth' : 'auto' });
    },
    [scroller, sizes, width, pageTops]
  );

  // Back to where you stopped reading (also after full screen <-> page).
  const placeRef = useRef(sheetPrefs(sheetId).page ?? 0);
  useLayoutEffect(() => {
    if (!doc || !width || !scroller) return;
    goPlace(placeRef.current);
    restored.current = true;
  }, [doc, width, scroller, goPlace]);

  // Page counter + remembering the place.
  useEffect(() => {
    if (!scroller) return undefined;
    let timer = null;
    const on = () => {
      if (!restored.current) return;
      const p = placeOf();
      placeRef.current = p;
      // At the very bottom the last page is the one being read.
      const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      setPageNow(atEnd ? sizes.length : Math.floor(p + 0.15) + 1);
      clearTimeout(timer);
      timer = setTimeout(() => setSheetPrefs(sheetId, { page: Math.round(p * 100) / 100 }), 400);
    };
    scroller.addEventListener('scroll', on, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', on);
      clearTimeout(timer);
    };
  }, [scroller, placeOf, sheetId, sizes.length]);

  // Auto-scroll: the current page's height every `secs` seconds, across
  // page breaks; stops at the end.
  useEffect(() => {
    if (!playing || !scroller || !sizes.length) return undefined;
    let raf;
    let last = performance.now();
    let carry = 0;
    const step = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const i = Math.min(sizes.length - 1, Math.floor(placeOf()));
      const pageH = (width * sizes[i].h) / sizes[i].w + GAP;
      carry += (pageH / secs) * dt;
      const move = Math.floor(carry);
      if (move >= 1) {
        carry -= move;
        const before = scroller.scrollTop;
        scroller.scrollTop = before + move;
        if (scroller.scrollTop === before && before > 0) {
          setPlaying(false);
          return;
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    // A finger on the sheet = the reader takes over: pause.
    const stop = () => setPlaying(false);
    scroller.addEventListener('wheel', stop, { passive: true });
    scroller.addEventListener('touchstart', stop, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener('wheel', stop);
      scroller.removeEventListener('touchstart', stop);
    };
  }, [playing, scroller, sizes, width, secs, placeOf]);

  const turn = useCallback(
    (d) => {
      const p = placeOf();
      const target = d > 0 ? Math.floor(p + 0.02) + 1 : p - Math.floor(p) > 0.06 ? Math.floor(p) : Math.floor(p) - 1;
      goPlace(Math.max(0, Math.min(sizes.length - 1, target)), true);
    },
    [placeOf, goPlace, sizes.length]
  );

  // Keys: Bluetooth page-turn pedals send arrows / Page keys.
  useEffect(() => {
    const onKey = (e) => {
      if (perform) return; // the Performer has its own keys
      if (e.target?.closest?.('input, select, textarea, [contenteditable="true"]')) return;
      if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key)) {
        e.preventDefault();
        turn(1);
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        turn(-1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setPerform(true);
      } else if (e.key === 'Escape' && full) setFull(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn, full, perform]);

  const changeSecs = (v) => {
    setSecs(v);
    setSheetPrefs(sheetId, { secs: v });
  };

  if (error) return <p className="lt-warning">{t('sheet.error')}</p>;

  const body = (
    <div className={'sheet-view' + (full ? ' is-full' : '')}>
      <div className="sheet-scroll" ref={setScroller}>
        {!doc && <p className="sheet-loading">{t('sheet.loading')}</p>}
        {doc && sizes.map((s, i) => <Page key={i} doc={doc} index={i} size={s} width={width} root={scroller} />)}
      </div>
      {doc && (
        <div className="sheet-bar" dir="ltr">
          <button type="button" className="sheet-key is-round" onClick={() => turn(-1)} disabled={pageNow <= 1} aria-label={t('sheet.prev')}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="sheet-count" aria-live="polite">
            {pageNow} / {sizes.length}
          </span>
          <button type="button" className="sheet-key is-round" onClick={() => turn(1)} disabled={pageNow >= sizes.length} aria-label={t('sheet.next')}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="sheet-sep" aria-hidden="true" />
          <button type="button" className="sheet-key is-primary" onClick={() => setPerform(true)}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
            </svg>
            <span>{t('sheet.scroll')}</span>
          </button>
        </div>
      )}
    </div>
  );
  return (
    <>
      {full ? createPortal(body, document.body) : body}
      {perform && <Performer songs={[{ id: sheetId, name }]} onClose={() => setPerform(false)} />}
    </>
  );
}
