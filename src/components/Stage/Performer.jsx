import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { loadPdfDocument } from '../../music/pdfTextExtractor';
import { getSheet, setSheetPrefs, sheetPrefs } from '../../music/sheets/sheetStore';
import { chordsOnPage, keyOf, transposeChord, flatsFor } from '../../music/sheets/chartChords';
import { fmtDur } from '../../music/sheets/setlists';
import { Page, useWakeLock } from '../GuitarPro/PdfSheetView';
import { getAudioContext } from '../../audio/audioContext';
import { openBandLink } from '../../music/sheets/bandLink';

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
const MINI_KEY = 'dudestar-stage-bar-mini'; // device: the control bubble folded
const CLICK_KEY = 'dudestar-stage-click'; // device: a click under the count-in
const COUNT_BEATS = 4;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const clampZoom = (z) => Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z)) * 20) / 20;

function readFlag(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}
function writeFlag(key, on) {
  try {
    localStorage.setItem(key, on ? '1' : '0');
  } catch {
    /* private mode */
  }
}

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

export function Performer({ songs: initialSongs, startAt = 0, onClose, onReorder, band = null }) {
  // songs = [{id, name}]; the order can change on stage (drag in the list,
  // or the band's leader) — `onReorder(ids)` saves it to the setlist
  const { t, lang } = useLanguage();
  const [songs, setSongs] = useState(initialSongs);
  const [idx, setIdx] = useState(Math.min(startAt, Math.max(0, initialSongs.length - 1)));
  const song = songs[idx];
  const songsRef = useRef(songs);
  songsRef.current = songs;
  const idxRef = useRef(idx);
  idxRef.current = idx;
  const [doc, setDoc] = useState(null);
  const [sizes, setSizes] = useState([]);
  const [chords, setChords] = useState(null); // per page, null = still looking
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [night, setNight] = useState(readNight);
  const [mini, setMini] = useState(() => readFlag(MINI_KEY));
  const [zoom, setZoom] = useState(1); // the pages only, per chart
  const [zoomShown, setZoomShown] = useState(false); // the % badge
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const pagesRef = useRef(null);
  const anchorRef = useRef(null); // keep this spot under the fingers after a zoom
  const pinchedRef = useRef(false);
  const [dur, setDur] = useState(DEFAULT_DUR);
  const [tr, setTr] = useState(0);
  const [bpm, setBpm] = useState(null); // the song's tempo (count-in), null = none
  const [note, setNote] = useState(''); // stage notes: capo, who counts in…
  const [details, setDetails] = useState(false); // the song's details sheet
  const [click, setClick] = useState(() => readFlag(CLICK_KEY));
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
    setBpm(prefs.bpm ?? null);
    setNote(prefs.note ?? '');
    setZoom(clampZoom(prefs.zoom ?? 1));
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
    if (!scroller || !doc) return;
    scroller.scrollTop = 0;
    // a zoomed chart opens where it was placed sideways last time
    const panX = song ? sheetPrefs(song.id).panX : null;
    const room = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    scroller.scrollLeft = panX != null && room > 2 ? panX * room : 0;
    const pend = pendingPRef.current; // a followed leader's place in this song
    if (pend) {
      pendingPRef.current = null;
      scroller.scrollTop = pend.p * Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      if (pend.playing) setPlaying(true);
    }
  }, [scroller, doc]);

  // Remember the sideways place of a zoomed chart (this device only).
  useEffect(() => {
    if (!scroller || !doc || !song) return undefined;
    const id = song.id;
    let t = 0;
    const save = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (anchorRef.current) return;
        const room = scroller.scrollWidth - scroller.clientWidth;
        if (room <= 2) return;
        const panX = Math.round((scroller.scrollLeft / room) * 1000) / 1000;
        if (sheetPrefs(id).panX !== panX) setSheetPrefs(id, { panX });
      }, 300);
    };
    scroller.addEventListener('scroll', save, { passive: true });
    return () => {
      clearTimeout(t);
      scroller.removeEventListener('scroll', save);
    };
  }, [scroller, doc, song]);

  const [baseWidth, setBaseWidth] = useState(0);
  useLayoutEffect(() => {
    if (!scroller) return undefined;
    const fit = () => setBaseWidth(Math.max(240, Math.min(scroller.clientWidth - 16, 1200)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [scroller]);
  // the pages grow with the zoom; the controls never do
  useLayoutEffect(() => {
    setWidth(Math.round(baseWidth * zoom));
  }, [baseWidth, zoom]);

  // After a zoom: the spot that was under the fingers / the screen's centre
  // stays there.
  useLayoutEffect(() => {
    const a = anchorRef.current;
    const box = pagesRef.current;
    if (!a || !scroller || !box || !width) return;
    anchorRef.current = null;
    const r = a.to / a.from;
    scroller.scrollLeft = box.offsetLeft + a.x * r - a.cx;
    scroller.scrollTop = box.offsetTop + a.y * r - a.cy;
  }, [width, scroller]);

  const flashZoom = useRef(0);
  const showZoom = useCallback(() => {
    setZoomShown(true);
    clearTimeout(flashZoom.current);
    flashZoom.current = setTimeout(() => setZoomShown(false), 900);
  }, []);
  useEffect(() => () => clearTimeout(flashZoom.current), []);

  /** Zoom to z keeping the point (cx, cy) of the scroller's box in place. */
  const zoomTo = useCallback(
    (z, cx, cy) => {
      const box = pagesRef.current;
      const from = zoomRef.current;
      const to = clampZoom(z);
      if (!scroller || !box || to === from) return;
      const px = cx ?? scroller.clientWidth / 2;
      const py = cy ?? scroller.clientHeight / 2;
      anchorRef.current = {
        from,
        to,
        cx: px,
        cy: py,
        x: scroller.scrollLeft + px - box.offsetLeft,
        y: scroller.scrollTop + py - box.offsetTop,
      };
      setZoom(to);
      showZoom();
      if (song) setSheetPrefs(song.id, { zoom: to });
    },
    [scroller, song, showZoom]
  );

  // Pinch on the sheet = zoom the pages (never the whole app): the browser's
  // own page zoom is off here (touch-action + Safari's gesture events); while
  // the fingers move the pages are scaled by CSS, the new size is drawn when
  // they lift. Ctrl + wheel (a trackpad pinch on a computer) zooms too.
  useEffect(() => {
    if (!scroller) return undefined;
    let pinch = null;
    const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const start = (e) => {
      if (e.touches.length !== 2) return;
      const box = pagesRef.current;
      if (!box) return;
      const [a, b] = e.touches;
      const rect = scroller.getBoundingClientRect();
      const cx = (a.clientX + b.clientX) / 2 - rect.left;
      const cy = (a.clientY + b.clientY) / 2 - rect.top;
      pinch = {
        d0: dist(a, b),
        z0: zoomRef.current,
        f: 1,
        cx,
        cy,
        ox: scroller.scrollLeft + cx - box.offsetLeft,
        oy: scroller.scrollTop + cy - box.offsetTop,
      };
      pinchedRef.current = true;
      box.style.transformOrigin = `${pinch.ox}px ${pinch.oy}px`;
    };
    const move = (e) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const [a, b] = e.touches;
      const z = clampZoom((pinch.z0 * dist(a, b)) / pinch.d0);
      pinch.f = z / pinch.z0;
      const box = pagesRef.current;
      if (box) box.style.transform = `scale(${pinch.f})`;
    };
    const end = (e) => {
      if (!pinch || e.touches.length >= 2) return;
      const p = pinch;
      pinch = null;
      const box = pagesRef.current;
      if (box) {
        box.style.transform = '';
        box.style.transformOrigin = '';
      }
      const to = clampZoom(p.z0 * p.f);
      if (to !== p.z0) {
        anchorRef.current = { from: p.z0, to, cx: p.cx, cy: p.cy, x: p.ox, y: p.oy };
        setZoom(to);
        showZoom();
        if (song) setSheetPrefs(song.id, { zoom: to });
      }
    };
    const noGesture = (e) => e.preventDefault(); // iOS Safari's page zoom
    const wheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const rect = scroller.getBoundingClientRect();
      zoomTo(zoomRef.current * Math.exp(-e.deltaY * 0.004), e.clientX - rect.left, e.clientY - rect.top);
    };
    scroller.addEventListener('touchstart', start, { passive: true });
    scroller.addEventListener('touchmove', move, { passive: false });
    scroller.addEventListener('touchend', end, { passive: true });
    scroller.addEventListener('touchcancel', end, { passive: true });
    scroller.addEventListener('wheel', wheel, { passive: false });
    document.addEventListener('gesturestart', noGesture);
    document.addEventListener('gesturechange', noGesture);
    return () => {
      scroller.removeEventListener('touchstart', start);
      scroller.removeEventListener('touchmove', move);
      scroller.removeEventListener('touchend', end);
      scroller.removeEventListener('touchcancel', end);
      scroller.removeEventListener('wheel', wheel);
      document.removeEventListener('gesturestart', noGesture);
      document.removeEventListener('gesturechange', noGesture);
    };
  }, [scroller, song, zoomTo, showZoom]);

  // The whole page stays put under the sheet (no document scroll behind).
  useEffect(() => {
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = before;
    };
  }, []);

  // Reading guide (v1.0.183): where the song is NOW if it moves at an even
  // pace — the point of the chart at the share of the song played. A thin
  // line marks it (gliding from the chart's top down to ~60 % of the screen
  // over the song), the part already played above it is dimmed a little,
  // the song's title bubble fills with the share played (v1.0.184), and the bubble shows
  // the time left. Drawn straight in the DOM on every scroll (no renders).
  const lineRef = useRef(null);
  const dimRef = useRef(null);
  const progRef = useRef(null);
  const [left, setLeft] = useState(null); // seconds left, whole
  const leftRef = useRef(null);
  const paintGuide = useCallback(() => {
    const box = pagesRef.current;
    if (!scroller || !box) return;
    const span = scroller.scrollHeight - scroller.clientHeight;
    const p = span > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / span)) : 0;
    const contentH = box.offsetHeight;
    const y = Math.max(0, box.offsetTop + p * contentH - scroller.scrollTop);
    if (lineRef.current) lineRef.current.style.transform = `translateY(${y}px)`;
    if (dimRef.current) dimRef.current.style.height = `${y}px`;
    if (progRef.current) progRef.current.style.transform = `scaleX(${p})`;
    const l = Math.max(0, Math.round(dur * (1 - p)));
    if (l !== leftRef.current) {
      leftRef.current = l;
      setLeft(l);
    }
  }, [scroller, dur]);
  useEffect(() => {
    if (!scroller) return undefined;
    paintGuide();
    scroller.addEventListener('scroll', paintGuide, { passive: true });
    window.addEventListener('resize', paintGuide);
    return () => {
      scroller.removeEventListener('scroll', paintGuide);
      window.removeEventListener('resize', paintGuide);
    };
  }, [scroller, paintGuide, doc, width]);
  const started = playing || (left != null && left < dur - 1 && !atEnd);
  const leftText = left != null ? '−' + fmtDur(left) : '';

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
  const goTo = useCallback((i) => setIdx(Math.max(0, Math.min(songs.length - 1, i))), [songs.length]);

  // The setlist sheet (v1.0.188): every song of the set at one tap, to jump
  // to another one on stage.
  const [listOpen, setListOpen] = useState(false);
  const swallowTapRef = useRef(0);
  // the end-of-song card sits just above the control bubble, whatever its height
  const rootRef = useRef(null);
  const barRef = useCallback((el) => {
    if (!el) return;
    const set = () => rootRef.current?.style.setProperty('--stage-bar-h', el.offsetHeight + 'px');
    set();
    new ResizeObserver(set).observe(el);
  }, []);
  const listRef = useRef(null);
  useEffect(() => {
    if (!listOpen) return undefined;
    listRef.current?.querySelector('.is-current')?.scrollIntoView({ block: 'center' });
    const away = (e) => {
      if (!e.target.closest?.('.stage-list, .stage-list-key')) {
        swallowTapRef.current = performance.now(); // this tap only closes the list
        setListOpen(false);
      }
    };
    window.addEventListener('pointerdown', away, true);
    return () => window.removeEventListener('pointerdown', away, true);
  }, [listOpen]);
  useEffect(() => setListOpen(false), [song]);

  // ---- reorder (v1.0.189): drag a row by its grip ----
  const [dragId, setDragId] = useState(null);
  const reorderRef = useRef(onReorder);
  reorderRef.current = onReorder;
  const applyOrder = useCallback((next) => {
    const cur = songsRef.current[idxRef.current]?.id;
    setSongs(next);
    const at = next.findIndex((x) => x.id === cur);
    if (at >= 0) setIdx(at);
  }, []);
  const startDrag = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const rowH = e.currentTarget.closest('li')?.offsetHeight || 48;
    let y0 = e.clientY;
    setDragId(id);
    const move = (ev) => {
      const list = songsRef.current;
      const from = list.findIndex((x) => x.id === id);
      const dy = ev.clientY - y0;
      const to = Math.max(0, Math.min(list.length - 1, from + (dy > rowH / 2 ? 1 : dy < -rowH / 2 ? -1 : 0)));
      if (to !== from) {
        const next = [...list];
        const [x] = next.splice(from, 1);
        next.splice(to, 0, x);
        applyOrder(next);
        y0 += (to - from) * rowH;
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setDragId(null);
      const ids = songsRef.current.map((x) => x.id);
      reorderRef.current?.(ids);
      sendStateRef.current?.();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  // ---- count-in (v1.0.189): one bar at the song's tempo, then the scroll ----
  const [count, setCount] = useState(null); // the beat shown (1..4) or null
  const countRef = useRef(null); // {timers}
  const stopCount = useCallback(() => {
    countRef.current?.timers.forEach(clearTimeout);
    countRef.current = null;
    setCount(null);
  }, []);
  const clickRef = useRef(click);
  clickRef.current = click;
  const tick = (accent) => {
    try {
      const ctx = getAudioContext();
      if (ctx.state !== 'running') ctx.resume();
      const t0 = ctx.currentTime + 0.01;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = accent ? 2400 : 1800;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.08);
    } catch {
      /* no sound — the numbers still show */
    }
  };
  // `at` = when beat 1 falls (Date.now() clock — the band shares it)
  const startCount = useCallback(
    (tempo, at = Date.now() + 120) => {
      stopCount();
      const beat = 60000 / tempo;
      const timers = [];
      for (let k = 0; k < COUNT_BEATS; k += 1) {
        timers.push(
          setTimeout(() => {
            setCount(k + 1);
            if (clickRef.current) tick(k === 0);
          }, Math.max(0, at + k * beat - Date.now()))
        );
      }
      timers.push(
        setTimeout(() => {
          countRef.current = null;
          setCount(null);
          setPlaying(true);
        }, Math.max(0, at + COUNT_BEATS * beat - Date.now()))
      );
      countRef.current = { timers };
    },
    [stopCount]
  );
  useEffect(() => stopCount, [song, stopCount]);

  // ---- band sync (v1.0.189): one leads, the others follow ----
  const [role, setRole] = useState('off'); // off | lead | follow
  const [people, setPeople] = useState([]);
  const [leader, setLeader] = useState(null); // the leader's name, when heard
  const linkRef = useRef(null);
  const roleRef = useRef(role);
  roleRef.current = role;
  const playingRef = useRef(false);
  const scrollerRef = useRef(null);
  scrollerRef.current = scroller;
  const sendStateRef = useRef(null);
  const followRef = useRef(null);
  const pendingPRef = useRef(null);
  const progress = () => {
    const sc = scrollerRef.current;
    if (!sc) return 0;
    const span = sc.scrollHeight - sc.clientHeight;
    return span > 0 ? sc.scrollTop / span : 0;
  };
  sendStateRef.current = (extra = {}) => {
    if (roleRef.current !== 'lead' || !linkRef.current) return;
    const list = songsRef.current;
    linkRef.current.send({ order: list.map((x) => x.id), song: list[idxRef.current]?.id, playing: playingRef.current, p: progress(), ...extra });
  };
  followRef.current = (msg, name) => {
    if (roleRef.current !== 'follow' || !msg) return;
    if (name) setLeader(name);
    const list = songsRef.current;
    let next = list;
    if (Array.isArray(msg.order)) {
      const byId = new Map(list.map((x) => [x.id, x]));
      const known = msg.order.map((id) => byId.get(id)).filter(Boolean);
      const rest = list.filter((x) => !msg.order.includes(x.id));
      next = [...known, ...rest];
      if (next.some((x, i) => x !== list[i])) applyOrder(next);
    }
    const at = msg.song ? next.findIndex((x) => x.id === msg.song) : -1;
    const moved = at >= 0 && next[at] !== list[idxRef.current];
    if (moved) {
      setIdx(at);
      // the new chart still loads: its place + scroll come when it's drawn
      pendingPRef.current = { p: typeof msg.p === 'number' ? msg.p : 0, playing: !!msg.playing };
      return;
    }
    if (msg.count) {
      startCount(msg.count.bpm, msg.count.at);
      return;
    }
    if (typeof msg.playing === 'boolean' && !countRef.current) setPlaying(msg.playing);
    if (typeof msg.p === 'number') {
      const sc = scrollerRef.current;
      const span = sc ? sc.scrollHeight - sc.clientHeight : 0;
      const h = holdRef.current;
      if (sc && span > 0 && !h.touching && performance.now() >= h.until && Math.abs(progress() - msg.p) > 0.015) sc.scrollTop = msg.p * span;
    }
  };
  useEffect(() => {
    if (!band || role === 'off') return undefined;
    let alive = true;
    let link = null;
    openBandLink(band.id, {
      state: (msg, name) => followRef.current?.(msg, name),
      hello: () => sendStateRef.current?.(),
      people: (list) => alive && setPeople(list),
    })
      .then((l) => {
        if (!alive) return l.close();
        link = l;
        linkRef.current = l;
        l.setRole(roleRef.current);
        if (roleRef.current === 'follow') l.hello();
        else sendStateRef.current?.();
      })
      .catch(() => {});
    return () => {
      alive = false;
      link?.close();
      linkRef.current = null;
      setPeople([]);
    };
    // one channel while syncing; a role switch only re-tracks presence
  }, [band?.id, role === 'off']); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    linkRef.current?.setRole(role);
    if (role === 'follow') linkRef.current?.hello();
    if (role === 'lead') sendStateRef.current?.();
    if (role !== 'follow') setLeader(null);
  }, [role]);
  // the leader tells the band when the song or the scroll changes, and
  // the position every 2 s while it runs
  useEffect(() => {
    playingRef.current = playing;
    sendStateRef.current?.();
    if (!playing || role !== 'lead') return undefined;
    const iv = setInterval(() => sendStateRef.current?.(), 2000);
    return () => clearInterval(iv);
  }, [playing, song, role]);
  const followers = people.filter((x) => !x.me && x.role === 'follow').length;
  // who leads: the name in their messages, else from presence (a profile
  // with no name = "the leader")
  const leadPerson = people.find((x) => !x.me && x.role === 'lead');
  const leaderName = leader || (leadPerson ? leadPerson.name || t('stage.sync.theLeader') : null);

  // A finger / wheel on the sheet while it scrolls = the reader moves it by
  // hand: the auto-scroll HOLDS (doesn't stop) while the finger is down and
  // the page still glides, then goes on from wherever the reader left it.
  const holdRef = useRef({ touching: false, until: 0 });
  const listOpenRef = useRef(false);
  listOpenRef.current = listOpen;
  const detailsRef = useRef(false);
  detailsRef.current = details;
  useEffect(() => {
    if (!scroller) return undefined;
    const h = holdRef.current;
    const down = () => {
      h.touching = true;
    };
    const up = (e) => {
      if (e.touches?.length) return;
      h.touching = false;
      h.until = performance.now() + 220;
    };
    const glide = () => {
      // only while held: the auto-scroll's own moves don't count
      if (h.touching || performance.now() < h.until) h.until = Math.max(h.until, performance.now() + 160);
    };
    const wheel = (e) => {
      if (!e.ctrlKey) h.until = performance.now() + 350;
    };
    scroller.addEventListener('touchstart', down, { passive: true });
    scroller.addEventListener('touchend', up, { passive: true });
    scroller.addEventListener('touchcancel', up, { passive: true });
    scroller.addEventListener('scroll', glide, { passive: true });
    scroller.addEventListener('wheel', wheel, { passive: true });
    return () => {
      scroller.removeEventListener('touchstart', down);
      scroller.removeEventListener('touchend', up);
      scroller.removeEventListener('touchcancel', up);
      scroller.removeEventListener('scroll', glide);
      scroller.removeEventListener('wheel', wheel);
    };
  }, [scroller]);

  // Auto-scroll: the whole chart in the song's length.
  useEffect(() => {
    if (!playing || !scroller) return undefined;
    let raf;
    let last = performance.now();
    let carry = 0;
    const step = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const h = holdRef.current;
      if (h.touching || now < h.until) {
        carry = 0;
        raf = requestAnimationFrame(step);
        return;
      }
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
        toggleRef.current?.();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomTo(zoomRef.current + 0.25);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomTo(zoomRef.current - 0.25);
      } else if (e.key === 'Escape') {
        if (listOpenRef.current) setListOpen(false);
        else if (detailsRef.current) setDetails(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn, onClose, zoomTo]);

  // Touch: a sideways swipe changes the song;
  // a tap (no move) shows / hides the controls.
  useEffect(() => {
    if (!scroller) return undefined;
    let start = null;
    const down = (e) => {
      if (e.touches && e.touches.length > 1) return;
      if (e.touches) pinchedRef.current = false;
      const p = e.touches?.[0] ?? e;
      start = { x: p.clientX, y: p.clientY, t: performance.now() };
    };
    const up = (e) => {
      if (!start) return;
      if (e.touches?.length) return; // a finger is still down
      if (pinchedRef.current) {
        start = null;
        return;
      }
      const p = e.changedTouches?.[0] ?? e;
      const dx = p.clientX - start.x;
      const dy = p.clientY - start.y;
      const dt = performance.now() - start.t;
      start = null;
      const wide = scroller.scrollWidth > scroller.clientWidth + 2; // zoomed: sideways = pan
      if (!wide && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6 && dt < 700) {
        goSong(dx < 0 ? 1 : -1);
        return;
      }
      if (performance.now() - swallowTapRef.current < 700) return;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 400) setChrome((v) => !v);
    };
    scroller.addEventListener('touchstart', down, { passive: true });
    scroller.addEventListener('touchend', up, { passive: true });
    scroller.addEventListener('mousedown', down);
    scroller.addEventListener('mouseup', up);
    return () => {
      scroller.removeEventListener('touchstart', down);
      scroller.removeEventListener('touchend', up);
      scroller.removeEventListener('mousedown', down);
      scroller.removeEventListener('mouseup', up);
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
  // with a tempo, Scroll from the top counts one bar in first (v1.0.189)
  const toggleScroll = () => {
    if (count != null) {
      stopCount();
      sendStateRef.current?.({ playing: false });
      return;
    }
    if (!playing && atEnd && scroller) {
      scroller.scrollTop = 0;
      setAtEnd(false);
    }
    if (!playing && bpm && scroller && (scroller.scrollTop <= 2 || atEnd)) {
      const at = Date.now() + 250;
      if (clickRef.current) getAudioContext().resume?.();
      startCount(bpm, at);
      sendStateRef.current?.({ count: { bpm, at } });
      return;
    }
    setPlaying((v) => !v);
  };
  const toggleRef = useRef(null);
  toggleRef.current = toggleScroll;
  const changeBpm = (v) => {
    const n = v == null ? null : Math.max(30, Math.min(300, Math.round(v)));
    setBpm(n);
    setSheetPrefs(song.id, { bpm: n });
  };
  const saveNote = (v) => {
    const clean = v.slice(0, 300);
    setNote(clean);
    setSheetPrefs(song.id, { note: clean });
  };
  const toggleClick = () => {
    setClick((v) => {
      writeFlag(CLICK_KEY, !v);
      return !v;
    });
  };
  const toggleNight = () => {
    setNight((v) => {
      writeFlag(NIGHT_KEY, !v);
      return !v;
    });
  };
  const toggleMini = () => {
    setMini((v) => {
      writeFlag(MINI_KEY, !v);
      return !v;
    });
  };
  const zoomPct = Math.round(zoom * 100);

  const next = songs[idx + 1];
  const keyName = hasChords ? keyOf(firstChord, tr) : null;
  const dir = lang === 'he' ? 'rtl' : 'ltr';

  if (!song) return null;

  return createPortal(
    <div className={'stage-perf' + (night ? ' is-night' : '') + (chrome ? '' : ' is-bare') + (bpm || note ? ' has-note' : '')} role="dialog" aria-label={song.name} dir={dir} ref={rootRef}>
      <div className="stage-perf-scroll" ref={setScroller} dir="ltr">
        {error && <p className="stage-perf-msg">{t(song.missing ? 'stage.missing' : 'stage.error')}</p>}
        {!error && !doc && <p className="stage-perf-msg">{t('stage.loading')}</p>}
        {doc && (
          <div className="stage-perf-pages" ref={pagesRef}>
          {sizes.map((s, i) => (
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
        )}
      </div>

      <div className={'stage-guide' + (playing ? ' is-on' : '')} aria-hidden="true">
        <div className="stage-guide-dim" ref={dimRef} />
        <div className="stage-guide-line" ref={lineRef} />
      </div>

      {zoomShown && (
        <div className="stage-zoom-badge glass" aria-live="polite">
          {zoomPct}%
        </div>
      )}

      <header className="stage-perf-top glass" dir={dir}>
        <div className={'stage-top-fill' + (started ? ' is-on' : '')} ref={progRef} aria-hidden="true" />
        <button type="button" className="stage-key is-round" onClick={onClose} aria-label={t('stage.close')} title={t('stage.close')}>
          <Icon d="M6 6l12 12M18 6L6 18" size={18} />
        </button>
        <button type="button" className="stage-perf-title" onClick={() => setDetails(true)} aria-label={t('stage.details')} title={t('stage.details')}>
          <strong dir="auto">{song.name}</strong>
          <span>
            {role === 'lead' ? t('stage.sync.leadShort', { n: followers }) + ' · ' : role === 'follow' ? (leaderName ? t('stage.sync.followShort', { name: leaderName }) : t('stage.sync.waiting')) + ' · ' : ''}
            {songs.length > 1 ? t('stage.of', { i: idx + 1, n: songs.length }) + ' · ' : ''}
            <bdi>{next ? t('stage.next', { name: next.name }) : songs.length > 1 ? t('stage.last') : ''}</bdi>
          </span>
        </button>
        {songs.length > 1 && (
          <button
            type="button"
            className={'stage-key is-round stage-list-key' + (listOpen ? ' is-on' : '')}
            onClick={() => setListOpen((v) => !v)}
            aria-expanded={listOpen}
            aria-label={t('stage.setlist')}
            title={t('stage.setlist')}
          >
            <Icon d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" size={18} />
          </button>
        )}
        <button type="button" className={'stage-key is-round' + (night ? ' is-on' : '')} onClick={toggleNight} aria-pressed={night} aria-label={t('stage.night')} title={t('stage.night')}>
          <Icon d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" size={18} />
        </button>
      </header>

      {(bpm || note) && (
        <button type="button" className="stage-note glass" onClick={() => setDetails(true)} dir={dir}>
          {bpm && (
            <span className="stage-note-bpm">
              <span className={'stage-beat' + (playing || count != null ? ' is-on' : '')} style={{ animationDuration: `${60 / bpm}s` }} aria-hidden="true" />
              {bpm}
            </span>
          )}
          {note && <span className="stage-note-text" dir="auto">{note}</span>}
        </button>
      )}

      {count != null && (
        <div className="stage-count" aria-live="assertive">
          <span key={count} className="stage-count-num">
            {count}
          </span>
        </div>
      )}

      {details && (
        <div className="stage-sheet-scrim" onPointerDown={(e) => e.target === e.currentTarget && setDetails(false)}>
          <div className="stage-details glass" role="dialog" aria-label={t('stage.details')} dir={dir}>
            <div className="stage-list-head">
              <strong dir="auto">{song.name}</strong>
              <button type="button" className="stage-done" onClick={() => setDetails(false)}>
                {t('stage.done')}
              </button>
            </div>
            <div className="stage-field">
              <span className="stage-field-label">{t('stage.tempo')}</span>
              <span className="stage-stepper">
                <button type="button" className="stage-key is-small" onClick={() => changeBpm((bpm ?? 100) - 1)} aria-label={t('stage.slower')}>
                  −
                </button>
                <input
                  className="stage-bpm-input"
                  type="number"
                  inputMode="numeric"
                  min="30"
                  max="300"
                  placeholder="—"
                  value={bpm ?? ''}
                  onChange={(e) => changeBpm(e.target.value === '' ? null : Number(e.target.value) || null)}
                  aria-label={t('stage.tempo')}
                />
                <button type="button" className="stage-key is-small" onClick={() => changeBpm((bpm ?? 99) + 1)} aria-label={t('stage.faster')}>
                  +
                </button>
              </span>
            </div>
            <p className="stage-field-hint">{bpm ? t('stage.tempoOn') : t('stage.tempoHint')}</p>
            <label className="stage-field is-col">
              <span className="stage-field-label">{t('stage.notes')}</span>
              <textarea className="stage-notes-input" dir="auto" rows={3} maxLength={300} value={note} placeholder={t('stage.notesHint')} onChange={(e) => saveNote(e.target.value)} />
            </label>
            <div className="stage-field">
              <span className="stage-field-label">{t('stage.click')}</span>
              <button type="button" role="switch" aria-checked={click} className={'stage-switch' + (click ? ' is-on' : '')} onClick={toggleClick} aria-label={t('stage.click')}>
                <span />
              </button>
            </div>
          </div>
        </div>
      )}

      {listOpen && (
        <div className="stage-list glass" ref={listRef} role="dialog" aria-label={t('stage.setlist')} dir={dir}>
          <div className="stage-list-head">
            <strong>{t('stage.setlist')}</strong>
            <span>{t('stage.of', { i: idx + 1, n: songs.length })}</span>
          </div>
          {band && (
            <div className="stage-sync">
              <label className="stage-field">
                <span className="stage-field-label">{t('stage.sync.label', { band: band.name })}</span>
                <select className="stage-select" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="off">{t('stage.sync.off')}</option>
                  <option value="lead">{t('stage.sync.lead')}</option>
                  <option value="follow">{t('stage.sync.follow')}</option>
                </select>
              </label>
              <p className="stage-field-hint">
                {role === 'lead'
                  ? t('stage.sync.leadText', { n: followers })
                  : role === 'follow'
                    ? leaderName
                      ? t('stage.sync.followText', { name: leaderName })
                      : t('stage.sync.waitText')
                    : t('stage.sync.offText')}
              </p>
            </div>
          )}
          <ol className="stage-list-rows">
            {songs.map((s, i) => (
              <li key={s.id} className={dragId === s.id ? 'is-drag' : ''}>
                <button
                  type="button"
                  className={'stage-list-row' + (i === idx ? ' is-current' : '') + (i < idx ? ' is-done' : '')}
                  onClick={() => (i === idx ? setListOpen(false) : goTo(i))}
                  aria-current={i === idx ? 'true' : undefined}
                >
                  <span className="stage-list-num">
                    {i === idx ? <Icon d="M7 4.5v15l13-7.5z" size={12} fill /> : i + 1}
                  </span>
                  <span className="stage-list-name" dir="auto">
                    {s.name}
                  </span>
                  {sheetPrefs(s.id).dur && <span className="stage-list-dur">{fmtDur(sheetPrefs(s.id).dur)}</span>}
                </button>
                {songs.length > 1 && role !== 'follow' && (
                  <span className="stage-list-grip" onPointerDown={(e) => startDrag(e, s.id)} role="button" aria-label={t('stage.drag')} title={t('stage.drag')}>
                    <Icon d="M5 9h14M5 15h14" size={18} />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {atEnd && !playing && songs.length > 1 && (
        <div className="stage-endcard glass" dir={dir} role="status">
          <div className="stage-endcard-text">
            <small>{next ? t('stage.upNext') : t('stage.setDone')}</small>
            <strong dir="auto">{next ? next.name : t('stage.setDoneText')}</strong>
          </div>
          {next ? (
            <button type="button" className="stage-key is-primary" onClick={() => goSong(1)}>
              <span>{t('stage.nextBtn')}</span>
            </button>
          ) : (
            <button type="button" className="stage-key is-primary" onClick={onClose}>
              <span>{t('stage.finish')}</span>
            </button>
          )}
        </div>
      )}

      {mini ? (
        <div className="stage-perf-bar is-mini glass" dir="ltr" ref={barRef}>
          <button type="button" className={'stage-key is-round is-primary' + (playing ? ' is-on' : '')} onClick={toggleScroll} aria-label={playing ? t('stage.pause') : t('stage.scroll')} title={playing ? t('stage.pause') : t('stage.scroll')}>
            {playing ? <Icon d="M8 5v14M16 5v14" size={16} /> : <Icon d="M7 4.5v15l13-7.5z" size={16} fill />}
          </button>
          {started && (
            <span className="stage-left" aria-label={t('stage.left')}>
              {leftText}
            </span>
          )}
          <button type="button" className="stage-key is-round is-quiet" onClick={toggleMini} aria-label={t('stage.expand')} title={t('stage.expand')}>
            <Icon d="M6 15l6-6 6 6" size={18} />
          </button>
        </div>
      ) : (
      <div className="stage-perf-bar glass" dir="ltr" ref={barRef}>
        <div className="stage-group">
        <button type="button" className="stage-key is-round is-quiet" onClick={toggleMini} aria-label={t('stage.collapse')} title={t('stage.collapse')}>
          <Icon d="M6 9l6 6 6-6" size={18} />
        </button>
        <button type="button" className="stage-key is-round" onClick={() => goSong(-1)} disabled={idx <= 0} aria-label={t('stage.prevSong')} title={t('stage.prevSong')}>
          <Icon d="M15 5l-7 7 7 7" />
        </button>
        <button type="button" className={'stage-key is-primary' + (playing ? ' is-on' : '')} onClick={toggleScroll}>
          {playing ? <Icon d="M8 5v14M16 5v14" size={16} /> : <Icon d="M7 4.5v15l13-7.5z" size={16} fill />}
          <span>{playing ? t('stage.pause') : t('stage.scroll')}</span>
        </button>
        {started && (
          <span className="stage-left" aria-label={t('stage.left')}>
            {leftText}
          </span>
        )}
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
        <span className="stage-stepper" title={t('stage.zoomHint')}>
          <button type="button" className="stage-key is-small" onClick={() => zoomTo(zoom - 0.25)} disabled={zoom <= ZOOM_MIN} aria-label={t('stage.zoomOut')}>
            −
          </button>
          <span className="stage-stepper-val">
            <small>{t('stage.zoom')}</small>
            {zoomPct}%
          </span>
          <button type="button" className="stage-key is-small" onClick={() => zoomTo(zoom + 0.25)} disabled={zoom >= ZOOM_MAX} aria-label={t('stage.zoomIn')}>
            +
          </button>
        </span>
        </div>
      </div>
      )}
    </div>,
    document.body
  );
}
