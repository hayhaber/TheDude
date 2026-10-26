import { useEffect, useRef, useState } from 'react';
import * as alphaTab from '@coderline/alphatab';
import { useLanguage } from '../../i18n/LanguageContext';

/**
 * The song as notation (melody, lyrics under the notes, chord names above):
 * the MusicXML lead sheet rendered by alphaTab. Display only — playback is
 * the Songwriter's own (same sound as the lyric view).
 */
export function ScoreView({ xml }) {
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
      {error && <p className="sw-muted">{t('sw.score.error')}</p>}
      <div ref={hostRef} className="sw-score-host" dir="ltr" />
    </div>
  );
}
