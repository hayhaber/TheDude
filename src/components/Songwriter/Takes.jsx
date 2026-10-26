import { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { hasAudio } from '../../audio/songwriter/songAudioStore';
import { Icon } from './icons';
import { fmt } from './LyricLine';

/** A line's recordings: play, use its melody (Notes), delete. */
export function Takes({ takes, melodyFrom, audio, onNotes, onDelete }) {
  const { t } = useLanguage();
  const [here, setHere] = useState(null);
  useEffect(() => {
    let live = true;
    hasAudio(takes.map((x) => x.id)).then((s) => live && setHere(s)).catch(() => live && setHere(new Set()));
    return () => {
      live = false;
    };
  }, [takes]);

  return (
    <ul className="sw-takes">
      {takes.map((take, i) => {
        const missing = here && !here.has(take.id);
        const playingThis = audio.playingTake === take.id;
        return (
          <li key={take.id} className={'sw-take' + (take.id === melodyFrom ? ' is-source' : '')}>
            <button
              type="button"
              className={'sw-icon-btn' + (playingThis ? ' is-on' : '')}
              onClick={() => audio.playTake(take.id)}
              disabled={missing}
              aria-label={playingThis ? t('sw.stop') : t('sw.play')}
            >
              <Icon name={playingThis ? 'stop' : 'play'} />
            </button>
            <span className="sw-take-name">
              {t('sw.take.n', { n: i + 1 })}
              <span className="sw-muted" dir="ltr">
                {' '}
                · {fmt(take.dur ?? 0)}
              </span>
              {take.id === melodyFrom && <span className="sw-take-badge">{t('sw.take.melody')}</span>}
              {missing && <span className="sw-muted"> · {t('sw.take.elsewhere')}</span>}
            </span>
            <Peaks peaks={take.peaks} />
            <button type="button" className="sw-btn is-small" onClick={() => onNotes(take)} disabled={missing}>
              {t('sw.notes')}
            </button>
            <button type="button" className="sw-icon-btn is-danger" onClick={() => onDelete(take)} aria-label={t('sw.delete')} title={t('sw.delete')}>
              <Icon name="trash" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function Peaks({ peaks }) {
  if (!peaks?.length) return <span className="sw-peaks" />;
  const max = Math.max(0.05, ...peaks);
  return (
    <svg className="sw-peaks" viewBox={`0 0 ${peaks.length} 20`} preserveAspectRatio="none" aria-hidden="true">
      {peaks.map((p, i) => {
        const h = Math.max(1, (p / max) * 18);
        return <rect key={i} x={i + 0.15} y={10 - h / 2} width={0.7} height={h} rx={0.3} />;
      })}
    </svg>
  );
}
