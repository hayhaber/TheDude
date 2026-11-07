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

export function ScoreView({ xml, title = '' }) {
  const { t } = useLanguage();
  const hostRef = useRef(null);
  const apiRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const api = new alphaTab.AlphaTabApi(hostRef.current, {
      core: { engine: 'svg', fontDirectory: '/font/', useWorkers: false, enableLazyLoading: false },
      display: { staveProfile: 'Score', layoutMode: 'Page', scale: 0.95 },
      player: { enablePlayer: false, enableCursor: false },
    });
    api.error.on((e) => setError(e?.message ?? String(e)));
    api.renderFinished.on(() => setError(null));
    api.postRenderFinished.on(() => fixHebrew(hostRef.current));
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

  return (
    <div className="sw-score">
      {title && (
        <h2 className="sw-score-title" dir="auto">
          {title}
        </h2>
      )}
      {error && <p className="sw-muted">{t('sw.score.error')}</p>}
      <div ref={hostRef} className="sw-score-host" dir="ltr" />
    </div>
  );
}
