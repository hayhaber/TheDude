import { useLanguage } from '../../i18n/LanguageContext';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import './TensionMeter.css';

const LABEL_CLASS = {
  Resolution: 'resolution',
  Relaxed: 'relaxed',
  Medium: 'medium',
  'High Tension': 'high',
};

const LABEL_KEY = {
  Resolution: 'tensionMeter.resolution',
  Relaxed: 'tensionMeter.relaxed',
  Medium: 'tensionMeter.medium',
  'High Tension': 'tensionMeter.high',
};

// Live Relaxed -> Medium -> High Tension -> Resolution meter — see
// music/tensionMeter.js for how the score is derived.
export function TensionMeter({ tension }) {
  const { t } = useLanguage();
  if (!tension) return null;

  return (
    <div className="tension-meter">
      <div className="tension-meter-header">
        <span className="tension-meter-title-row">
          <span className="tension-meter-title">{t('tensionMeter.title')}</span>
          <InfoTooltip text={t('tensionMeter.tooltip')} label={t('tensionMeter.tooltipLabel')} />
        </span>
        <span className={`tension-meter-label ${LABEL_CLASS[tension.label] ?? ''}`}>
          {LABEL_KEY[tension.label] ? t(LABEL_KEY[tension.label]) : tension.label}
        </span>
      </div>
      <div className="tension-meter-track">
        <div
          className={`tension-meter-fill ${LABEL_CLASS[tension.label] ?? ''}`}
          style={{ width: `${tension.score}%` }}
        />
      </div>
    </div>
  );
}
