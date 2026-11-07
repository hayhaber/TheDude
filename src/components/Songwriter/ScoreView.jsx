import { useEffect, useRef, useState } from 'react';
import * as alphaTab from '@coderline/alphatab';
import { useLanguage } from '../../i18n/LanguageContext';

/**
 * The song as notation (melody, lyrics under the notes, chord names above):
 * the MusicXML lead sheet rendered by alphaTab. Display only — playback is
 * the Songwriter's own (same sound as the lyric view).
 */
// WebKit (iPad / iPhone) draws Hebrew inside an SVG <text> letter-reversed
// (seen on the lesson pictures, v1.0.118). So the title is HTML above the
// score (alphaTab gets none), and every Hebrew text alphaTab draws (the
// lyric syllables) is marked right-to-left.
const HEBREW = /[\u0590-\u05FF]/;
export function fixHebrew(host) {
  host?.querySelectorAll('text').forEach((el) => {
    if (HEBREW.test(el.textContent || '') && el.getAttribute('direction') !== 'rtl') {
      el.setAttribute('direction', 'rtl');
      el.setAttribute('unicode-bidi', 'embed');
    }
  });
}

export function ScoreView({ xml, title = '', beat = null, bpb = 4 }) {
  const { t } = useLanguage();
  const hostRef = useRef(null);
  const apiRef = useRef(null);
  const [error, setError] = useState(null);
  const [mark, setMark] = useState(null); // {bar, note, cursor} boxes in score pixels
  const [layoutN, setLayoutN] = useState(0); // a new render = new positions
  const cursorRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const api = new alphaTab.AlphaTabApi(hostRef.current, {
      core: { engine: 'svg', fontDirectory: '/font/', useWorkers: false, enableLazyLoading: false },
      display: { staveProfile: 'Score', layoutMode: 'Page', scale: 0.95 },
      player: { enablePlayer: false, enableCursor: false },
    });
    api.error.on((e) => setError(e?.message ?? String(e)));
    api.renderFinished.on(() => setError(null));
    api.postRenderFinished.on(() => {
      fixHebrew(hostRef.current);
      setLayoutN((n) => n + 1);
    });
    apiRef.current = api;
    return () => {
      api.destroy();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    const api = apiRef.current;
    if (!api || !xml) return;
    try {
      api.load(new TextEncoder().encode(xml));
    } catch (e) {
      setError(e?.message ?? String(e));
    }
  }, [xml]);

  // What is sounding now (playback from the editor): the bar tinted, the
  // note (or rest) being played boxed, a cursor line through the staff —
  // found in alphaTab's bounds lookup from the score beat.
  useEffect(() => {
    const api = apiRef.current;
    const bl = api?.boundsLookup ?? api?.renderer?.boundsLookup;
    if (beat == null || !bl || !api.score) {
      setMark(null);
      return;
    }
    const m = Math.floor(beat / bpb);
    const mb = m >= 0 ? bl.findMasterBarByIndex?.(m) : null;
    const masterBar = api.score.masterBars?.[m];
    if (!mb || !masterBar) {
      setMark(null);
      return;
    }
    const frac = Math.max(0, Math.min(1, (beat - m * bpb) / bpb));
    const tick = frac * masterBar.calculateDuration();
    let cand = null;
    for (const bb of mb.bars?.[0]?.beats ?? []) if (bb.beat.playbackStart <= tick + 1) cand = bb;
    const sys = mb.staffSystemBounds?.realBounds ?? mb.realBounds;
    const vb = mb.visualBounds;
    const nb = cand?.visualBounds;
    setMark({
      bar: { x: vb.x, y: vb.y, w: vb.w, h: vb.h },
      note: nb && !cand.beat.isRest ? { x: nb.x - 3, y: nb.y - 3, w: nb.w + 6, h: nb.h + 6 } : null,
      cursor: { x: nb ? nb.x + nb.w / 2 : vb.x + frac * vb.w, y: sys.y, h: sys.h },
    });
  }, [beat, bpb, layoutN]);

  // keep the sounding line in view
  const markLine = mark ? Math.round(mark.cursor.y) : null;
  useEffect(() => {
    if (markLine != null) cursorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [markLine]);

  return (
    <div className="sw-score">
      {title && (
        <h2 className="sw-score-title" dir="auto">
          {title}
        </h2>
      )}
      {error && <p className="sw-muted">{t('sw.score.error')}</p>}
      <div className="sw-score-stage">
        <div ref={hostRef} className="sw-score-host" dir="ltr" />
        {mark && (
          <div className="sw-score-marks" aria-hidden="true">
            <span className="sw-score-bar" style={{ left: mark.bar.x, top: mark.bar.y, width: mark.bar.w, height: mark.bar.h }} />
            {mark.note && <span className="sw-score-note" style={{ left: mark.note.x, top: mark.note.y, width: mark.note.w, height: mark.note.h }} />}
            <span ref={cursorRef} className="sw-score-cursor" style={{ left: mark.cursor.x - 1, top: mark.cursor.y, height: mark.cursor.h }} />
          </div>
        )}
      </div>
    </div>
  );
}
