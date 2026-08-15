import { useLanguage } from '../../i18n/LanguageContext';
import './ModeToggle.css';

export function ModeToggle({ mode, onChange }) {
  const { t } = useLanguage();

  return (
    <div className="mode-toggle" role="group" aria-label={t('modeToggle.label')}>
      <button
        type="button"
        className={mode === 'chord' ? 'active' : ''}
        onClick={() => onChange('chord')}
        title={t('modeToggle.chordHint')}
      >
        {t('modeToggle.chord')}
      </button>
      <button
        type="button"
        className={mode === 'triad' ? 'active' : ''}
        onClick={() => onChange('triad')}
        title={t('modeToggle.triadHint')}
      >
        {t('modeToggle.triad')}
      </button>
    </div>
  );
}
