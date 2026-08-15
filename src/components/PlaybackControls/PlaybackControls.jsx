import { useLanguage } from '../../i18n/LanguageContext';
import './PlaybackControls.css';

export function PlaybackControls({ autoPlay, onToggleAutoPlay, onPlay, disabled }) {
  const { t } = useLanguage();

  return (
    <div className="playback-controls">
      <label className="autoplay-switch">
        <input
          type="checkbox"
          checked={autoPlay}
          onChange={(e) => onToggleAutoPlay(e.target.checked)}
        />
        <span className="switch-track">
          <span className="switch-thumb" />
        </span>
        {t('playbackControls.autoPlay')}
      </label>

      <button type="button" className="play-button" onClick={onPlay} disabled={disabled}>
        {t('playbackControls.play')}
      </button>
    </div>
  );
}
