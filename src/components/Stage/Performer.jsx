import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { loadPdfDocument } from '../../music/pdfTextExtractor';
import { getSheet, setSheetPrefs, sheetPrefs } from '../../music/sheets/sheetStore';
import { chordsOnPage, keyOf, transposeChord, flatsFor } from '../../music/sheets/chartChords';
import { fmtDur } from '../../music/sheets/setlists';
import { Page, useWakeLock } from '../GuitarPro/PdfSheetView';

// The Stage's performance screen (v1.0.176): one chart of a setlist at a
// time, full screen on black, the pages at the screen's width. Auto-scroll
// runs the chart from top to bottom in the SONG'S LENGTH (remembered per
// chart), the key can move up / down when the PDF holds its chords as text
// (the new chords are drawn over the old ones), Night inverts the pages.
// Songs: ‹ › keys, a sideways swipe, or a page-turn pedal past the last
// page. A tap on the sheet hides / shows the controls.

const GAP = 12;
const DEFAULT_DUR = 210; // 3:30
const NIGHT_KEY = 'dudestar-stage-night'; // device

function readNight() {
  try {
    return localStorage.getItem(NIGHT_KEY) === '1';
  } catch {
    return false;
  }
}

let measureCtx = null;
function measure(str, size) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font = `${size}px Helvetica, Arial, sans-serif`;
  return measureCtx.measureText(str).width;
}

/** The chords of every page as fractions of the page (for the overlay). */
async function findChords(doc) {
  const pages = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    try {
      const page = await doc.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const found = chordsOnPage(content.items, measure).map((c) => {
        const [vx, vy] = vp.convertToViewportPoint(c.x, c.y);
        return {
          text: c.text,
          left: vx / vp.width,
          top: (vy - c.size * 0.86) / vp.height,
          w: c.w / vp.width,
          h: (c.size * 1.12) / vp.height,
          font: c.size / vp.width,
        };
      });
      pages.push(found);
    } catch {
      pages.push([]);
    }
  }
  return pages;
}

function Icon({ d, size = 20, fill = false }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={d} fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Performer({ songs, startAt = 0, onClose }) {
  // songs = [{id, name}]
  const { t, lang } = useLanguage();
  const [idx, setIdx] = useState(Math.min(startAt, Math.max(0, songs.length - 1)));
  const song = songs[idx];
  const [doc, setDoc] = useState(null);
  const [sizes, setSizes] = useState([]);
  const [chords, setChords] = useState(null); // per page, null = still looking
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [night, setNight] = useState(readNight);
  const [dur, setDur] = useState(DEFAULT_DUR);
  const [tr, setTr] = useState(0);
  const [width, setWidth] = useState(0);
  const [scroller, setScroller] = useState(null);
  useWakeLock(true);

  // Open the song.
  useEffect(() => {
    if (!song) return undefined;
    let alive = true;
    let loaded = null;
    const prefs = sheetPrefs(song.id);
    setDur(prefs.dur ?? DEFAULT_DUR);
    setTr(prefs.tr ?? 0);
    setDoc(null);
    setSizes([]);
    setChords(null);
    setError(false);
    setPlaying(false);
    setAtEnd(false);
    (async () => {
      try {
        const rec = await getSheet(song.id);
        if (!rec) throw new Error('missing');
        const d = await loadPdfDocument(rec.blob);
        loaded = d;
        const out = [];
        for (let i = 1; i <= d.numPages; i += 1) {
          const v = (await d.getPage(i)).getViewport({ scale: 1 });
          out.push({ w: v.width, h: v.height });
        }
        if (!alive) return;
        setSizes(out);
        setDoc(d);
        const found = await findChords(d);
        if (alive) setChords(found);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
      loaded?.destroy?.();
    };
  }, [song]);

  // Back to the top for every song.
  useLayoutEffect(() => {
    if (scroller && doc) scroller.scrollTop = 0;
  }, [scroller, doc]);

  useLayoutEffect(() => {
    if (!scroller) return undefined;
    const fit = () => setWidth(Math.max(240, Math.min(scroller.clientWidth - 16, 1200)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [scroller]);

  // The whole page stays put under the sheet (no document scroll behind).
  useEffect(() => {
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = before;
    };
  }, []);

  const firstChord = useMemo(() => chords?.flat()[0]?.text ?? null, [chords]);
  const hasChords = !!firstChord;
  const flats = useMemo(() => (firstChord ? flatsFor(firstChord, tr) : false), [firstChord, tr]);

  const goSong = useCallback(
    (d) => {
      setIdx((i) => {
        const n = Math.max(0, Math.min(songs.length - 1, i + d));
        return n;
      });
    },
    [songs.length]
  );

  // Auto-scroll: the whole chart in the song's length.
  useEffect(() => {
    if (!playing || !scroller) return undefined;
    let raf;
    let last = performance.now();
    let carry = 0;
    const step = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const span = scroller.scrollHeight - scroller.clientHeight;
      carry += (span / Math.max(20, dur)) * dt;
      const move = Math.floor(carry);
      if (move >= 1) {
        carry -= move;
        const before = scroller.scrollTop;
        scroller.scrollTop = before + move;
        if (scroller.scrollTop <= before) {
          setPlaying(false);
          setAtEnd(true);
          setChrome(true);
          return;
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, scroller, dur]);

  // The reader at the bottom = the song is done (also when scrolled by hand).
  useEffect(() => {
    if (!scroller) return undefined;
    const on = () => setAtEnd(scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4);
    scroller.addEventListener('scroll', on, { passive: true });
    return () => scroller.removeEventListener('scroll', on);
  }, [scroller]);

  // A page down / up; past the last page = the next song (page-turn pedals).
  const turn = useCallback(
    (d) => {
      if (!scroller) return;
      const step = scroller.clientHeight * 0.85;
      const end = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
      if (d > 0 && end) {
        if (idx < songs.length - 1) goSong(1);
        return;
      }
      if (d < 0 && scroller.scrollTop <= 2) {
        if (idx > 0) goSong(-1);
        return;
      }
      scroller.scrollBy({ top: d * step, behavior: 'smooth' });
    },
    [scroller, idx, songs.length, goSong]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.target?.closest?.('input, select, textarea')) return;
      if (['ArrowDown', 'PageDown', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        turn(1);
      } else if (['ArrowUp', 'PageUp', 'ArrowLeft'].includes(e.key)) {
        e.preventDefault();
        turn(-1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setPlaying((v) => !v);
      } else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn, onClose]);

  // Touch: a finger stops the scroll; a sideways swipe changes the song;
  // a tap (no move) shows / hides the controls.
  useEffect(() => {
    if (!scroller) return undefined;
    let start = null;
    const down = (e) => {
      const p = e.touches?.[0] ?? e;
      start = { x: p.clientX, y: p.clientY, t: performance.now() };
    };
    const up = (e) => {
      if (!start) return;
      const p = e.changedTouches?.[0] ?? e;
      const dx = p.clientX - start.x;
      const dy = p.clientY - start.y;
      const dt = performance.now() - start.t;
      start = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6 && dt < 700) {
        goSong(dx < 0 ? 1 : -1);
        return;
      }
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 400) setChrome((v) => !v);
      else setPlaying(false);
    };
    const wheel = () => setPlaying(false);
    scroller.addEventListener('touchstart', down, { passive: true });
    scroller.addEventListener('touchend', up, { passive: true });
    scroller.addEventListener('mousedown', down);
    scroller.addEventListener('mouseup', up);
    scroller.addEventListener('wheel', wheel, { passive: true });
    return () => {
      scroller.removeEventListener('touchstart', down);
      scroller.removeEventListener('touchend', up);
      scroller.removeEventListener('mousedown', down);
      scroller.removeEventListener('mouseup', up);
      scroller.removeEventListener('wheel', wheel);
    };
  }, [scroller, goSong]);

  const changeDur = (d) => {
    const v = Math.max(30, Math.min(900, dur + d));
    setDur(v);
    setSheetPrefs(song.id, { dur: v });
  };
  const changeTr = (d) => {
    const v = ((tr + d + 18) % 12) - 6; // -5 .. +6
    setTr(v);
    setSheetPrefs(song.id, { tr: v });
  };
  // at the end, Scroll starts the chart again from the top
  const toggleScroll = () => {
    if (!playing && atEnd && scroller) {
      scroller.scrollTop = 0;
      setAtEnd(false);
    }
    setPlaying((v) => !v);
  };
  const toggleNight = () => {
    setNight((v) => {
      try {
        localStorage.setItem(NIGHT_KEY, v ? '0' : '1');
      } catch {
        /* private mode */
      }
      return !v;
    });
  };

  const next = songs[idx + 1];
  const keyName = hasChords ? keyOf(firstChord, tr) : null;
  const dir = lang === 'he' ? 'rtl' : 'ltr';

  if (!song) return null;

  return createPortal(
    <div className={'stage-perf' + (night ? ' is-night' : '') + (chrome ? '' : ' is-bare')} role="dialog" aria-label={song.name}>
      <div className="stage-perf-scroll" ref={setScroller}>
        {error && <p className="stage-perf-msg">{t(song.missing ? 'stage.missing' : 'stage.error')}</p>}
        {!error && !doc && <p className="stage-perf-msg">{t('stage.loading')}</p>}
        {doc &&
          sizes.map((s, i) => (
            <Page key={song.id + ':' + i} doc={doc} index={i} size={s} width={width} root={scroller}>
              {tr !== 0 && chords?.[i]?.length > 0 && (
                <div className="stage-chords" aria-hidden="true">
                  {chords[i].map((c, k) => (
                    <span
                      key={k}
                      className="stage-chord"
                      style={{
                        left: `${c.left * 100}%`,
                        top: `${c.top * 100}%`,
                        minWidth: `${c.w * 100}%`,
                        height: `${c.h * 100}%`,
                        fontSize: `${c.font * width}px`,
                      }}
                    >
                      {transposeChord(c.text, tr, flats)}
                    </span>
                  ))}
                </div>
              )}
            </Page>
          ))}
      </div>

      <header className="stage-perf-top glass" dir={dir}>
        <button type="button" className="stage-key is-round" onClick={onClose} aria-label={t('stage.close')} title={t('stage.close')}>
          <Icon d="M6 6l12 12M18 6L6 18" size={18} />
        </button>
        <div className="stage-perf-title">
          <strong dir="auto">{song.name}</strong>
          <span>
            {songs.length > 1 ? t('stage.of', { i: idx + 1, n: songs.length }) + ' · ' : ''}
            <bdi>{next ? t('stage.next', { name: next.name }) : songs.length > 1 ? t('stage.last') : ''}</bdi>
          </span>
        </div>
        <button type="button" className={'stage-key is-round' + (night ? ' is-on' : '')} onClick={toggleNight} aria-pressed={night} aria-label={t('stage.night')} title={t('stage.night')}>
          <Icon d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" size={18} />
        </button>
      </header>

      <div className="stage-perf-bar glass" dir="ltr">
        <div className="stage-group">
        <button type="button" className="stage-key is-round" onClick={() => goSong(-1)} disabled={idx <= 0} aria-label={t('stage.prevSong')} title={t('stage.prevSong')}>
          <Icon d="M15 5l-7 7 7 7" />
        </button>
        <button type="button" className={'stage-key is-primary' + (playing ? ' is-on' : '')} onClick={toggleScroll}>
          {playing ? <Icon d="M8 5v14M16 5v14" size={16} /> : <Icon d="M12 4v13M7 12l5 5 5-5M6 20h12" size={16} />}
          <span>{playing ? t('stage.pause') : t('stage.scroll')}</span>
        </button>
        <button type="button" className={'stage-key is-round' + (atEnd && next ? ' is-ready' : '')} onClick={() => goSong(1)} disabled={!next} aria-label={t('stage.nextSong')} title={t('stage.nextSong')}>
          <Icon d="M9 5l7 7-7 7" />
        </button>
        </div>
        <div className="stage-group">
        <span className="stage-stepper" title={t('stage.lengthHint')}>
          <button type="button" className="stage-key is-small" onClick={() => changeDur(-10)} aria-label={t('stage.shorter')}>
            −
          </button>
          <span className="stage-stepper-val" aria-label={t('stage.length')}>
            <small>{t('stage.length')}</small>
            {fmtDur(dur)}
          </span>
          <button type="button" className="stage-key is-small" onClick={() => changeDur(10)} aria-label={t('stage.longer')}>
            +
          </button>
        </span>
        <span className={'stage-stepper' + (hasChords ? '' : ' is-off')} title={hasChords ? '' : t('stage.noChords')}>
          <button type="button" className="stage-key is-small" onClick={() => changeTr(-1)} disabled={!hasChords} aria-label={t('stage.keyDown')}>
            −
          </button>
          <span className="stage-stepper-val">
            <small>{t('stage.key')}</small>
            {chords === null ? '…' : hasChords ? (
              <>
                {keyName}
                {tr !== 0 && <em>{tr > 0 ? `+${tr}` : tr}</em>}
              </>
            ) : (
              '—'
            )}
          </span>
          <button type="button" className="stage-key is-small" onClick={() => changeTr(1)} disabled={!hasChords} aria-label={t('stage.keyUp')}>
            +
          </button>
        </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
