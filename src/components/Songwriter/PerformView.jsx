import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { parseLine } from '../../music/songwriter/lyrics';
import { songTimeline } from '../../music/songwriter/song';
import { Icon } from './icons';

// Perform mode (a teleprompter, as in Spit Notes / OnSong): the whole song
// big, chords over the words, on a black stage; the line being sung is lit
// and kept in the middle of the screen. Two clocks drive it: Play = the
// song's own playback (the band or the piano), Scroll = the same timing in
// silence (sing to your own guitar). Tap a line = start from there. The
// screen stays awake (Wake Lock) while this is open.

const SIZE_KEY = 'dudestar-sw-perform-size';
const SIZES = [22, 26, 30, 36, 42, 50];

function loadSize() {
  try {
    const v = Number(localStorage.getItem(SIZE_KEY));
    return SIZES.includes(v) ? v : 30;
  } catch {
    return 30;
  }
}

/** Keep the screen on while mounted (re-asked when the page comes back). */
function useWakeLock() {
  useEffect(() => {
    let lock = null;
    let alive = true;
    const ask = async () => {
      try {
        if (alive && document.visibilityState === 'visible' && navigator.wakeLock) lock = await navigator.wakeLock.request('screen');
      } catch {
        /* not allowed / not supported (older iOS) */
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
  }, []);
}

export function PerformView({ song, audio, onClose }) {
  const { t, lang } = useLanguage();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const [size, setSize] = useState(loadSize);
  const [scroll, setScroll] = useState(null); // { t0 (performance ms), from (s) } — the silent clock
  const [silentPos, setSilentPos] = useState(null);
  const stageRef = useRef(null);
  useWakeLock();

  const tl = useMemo(() => songTimeline(song), [song]);
  const lineTimes = useMemo(() => new Map(tl.lines.map((l) => [l.id, l])), [tl]);

  // The silent clock.
  useEffect(() => {
    if (!scroll) return undefined;
    let raf;
    const step = () => {
      const p = scroll.from + (performance.now() - scroll.t0) / 1000;
      if (p > tl.duration + 0.5) {
        setScroll(null);
        setSilentPos(null);
        return;
      }
      setSilentPos(p);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [scroll, tl.duration]);

  const playingSong = audio.playing?.scope === 'perform';
  const pos = playingSong ? audio.pos : scroll ? silentPos : null;
  const active = pos != null ? tl.lines.find((l) => pos >= l.start && pos < l.end) : null;

  // Keep the sung line in the middle.
  const lastId = useRef(null);
  useEffect(() => {
    if (!active || active.id === lastId.current) return;
    lastId.current = active.id;
    stageRef.current?.querySelector(`[data-pline="${active.id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [active]);

  const stopAll = () => {
    if (playingSong) audio.play(song, 'perform');
    setScroll(null);
    setSilentPos(null);
  };
  const close = () => {
    stopAll();
    onClose();
  };
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingSong]);
  // Leaving perform mode (unmount) stops what it started.
  useEffect(() => () => setScroll(null), []);

  const playFrom = (from = 0) => {
    setScroll(null);
    setSilentPos(null);
    audio.play(song, 'perform', null, from, true);
  };
  const scrollFrom = (from = 0) => {
    if (playingSong) audio.play(song, 'perform');
    setScroll({ t0: performance.now(), from });
  };
  const onLine = (id) => {
    const l = lineTimes.get(id);
    if (!l) return;
    if (playingSong) playFrom(l.start);
    else scrollFrom(l.start);
  };
  const changeSize = (d) => {
    const i = Math.max(0, Math.min(SIZES.length - 1, SIZES.indexOf(size) + d));
    setSize(SIZES[i]);
    try {
      localStorage.setItem(SIZE_KEY, String(SIZES[i]));
    } catch {
      /* private mode */
    }
  };

  const kindCount = {};
  const sections = song.sections
    .map((sec) => ({ sec, lines: sec.lines.filter((l) => parseLine(l.raw).text.trim()) }))
    .filter((x) => x.lines.length);

  return createPortal(
    <div className="sw-perform" dir={dir} role="dialog" aria-modal="true" aria-label={t('sw.perform')} style={{ '--pf-size': size + 'px' }}>
      <div className="sw-perform-top">
        <button type="button" className="sw-pf-round" onClick={close} aria-label={t('sw.perform.close')}>
          <Icon name="close" />
        </button>
        <div className="sw-perform-title" dir="auto">
          {song.title || t('sw.untitled')}
        </div>
        <div className="sw-pf-size" dir="ltr">
          <button type="button" className="sw-pf-round" onClick={() => changeSize(-1)} disabled={size === SIZES[0]} aria-label={t('sw.perform.smaller')}>
            <span className="sw-pf-a is-small">A</span>
          </button>
          <button type="button" className="sw-pf-round" onClick={() => changeSize(1)} disabled={size === SIZES[SIZES.length - 1]} aria-label={t('sw.perform.bigger')}>
            <span className="sw-pf-a">A</span>
          </button>
        </div>
      </div>

      <div className="sw-perform-stage" ref={stageRef}>
        {sections.length === 0 && <p className="sw-perform-empty">{t('sw.perform.empty')}</p>}
        {sections.map(({ sec, lines }) => {
          kindCount[sec.kind] = (kindCount[sec.kind] ?? 0) + 1;
          return (
            <section key={sec.id} className="sw-pf-sec">
              <h2>
                {t('sw.kind.' + sec.kind)}
                {kindCount[sec.kind] > 1 ? ` ${kindCount[sec.kind]}` : ''}
              </h2>
              {lines.map((l) => {
                const { text, chords } = parseLine(l.raw);
                const ws = [...text.matchAll(/\S+/g)];
                const hasChords = chords.length > 0;
                const isActive = active?.id === l.id;
                const past = pos != null && lineTimes.get(l.id) && pos >= lineTimes.get(l.id).end;
                return (
                  <button
                    type="button"
                    key={l.id}
                    data-pline={l.id}
                    className={'sw-pf-line' + (isActive ? ' is-active' : '') + (past ? ' is-past' : '') + (hasChords ? ' has-chords' : '')}
                    onClick={() => onLine(l.id)}
                    dir="auto"
                  >
                    {ws.map((w, i) => {
                      const c = chords.find((x) => x.at >= w.index && x.at < w.index + w[0].length);
                      return (
                        <span key={i} className="sw-pf-word">
                          {hasChords && (
                            <span className="sw-pf-chord" dir="ltr">
                              {c?.symbol ?? ' '}
                            </span>
                          )}
                          <span>{w[0]}</span>
                        </span>
                      );
                    })}
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>

      <div className="sw-perform-bar" dir="ltr">
        <button type="button" className={'sw-pf-key' + (scroll ? ' is-on' : '')} onClick={() => (scroll ? stopAll() : scrollFrom(active?.start ?? 0))} disabled={!tl.lines.length}>
          <Icon name={scroll ? 'pause' : 'scroll'} />
          <span>{scroll ? t('sw.perform.pause') : t('sw.perform.scroll')}</span>
        </button>
        <button type="button" className={'sw-pf-key is-primary' + (playingSong ? ' is-on' : '')} onClick={() => (playingSong ? stopAll() : playFrom(active?.start ?? 0))} disabled={!tl.lines.length}>
          <Icon name={playingSong ? 'stop' : 'play'} />
          <span>{playingSong ? t('sw.stop') : t('sw.play')}</span>
        </button>
      </div>
    </div>,
    document.body
  );
}
