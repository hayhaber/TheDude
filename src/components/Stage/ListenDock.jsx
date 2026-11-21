import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { addListenHost, closeListen, listenNow, subscribeListen } from '../../music/sheets/listenStore';
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
  useEffect(() => setMini(false), [now?.n]);
  if (!now) return null;
  const emb = embedOf(now.link);
  const url = cleanLink(now.link);
  if (!emb || !url) return null;
  const svc = serviceOf(url);
  return createPortal(
    <div className={'stg-dock glass is-' + emb.kind + (mini ? ' is-mini' : '')} dir={lang === 'he' ? 'rtl' : 'ltr'} role="region" aria-label={t('stage.listen.player')}>
      <div className="stg-dock-head">
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
          src={emb.src}
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
