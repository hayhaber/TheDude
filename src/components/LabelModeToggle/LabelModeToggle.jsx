import { useLanguage } from '../../i18n/LanguageContext';
import '../ModeToggle/ModeToggle.css';

// Same segmented-control look as ModeToggle (Full chord/Triad), reused here
// for switching what each fretboard dot's label shows.
export function LabelModeToggle({ labelMode, onChange }) {
  const { t } = useLanguage();

  return (
    <div className="mode-toggle" role="group" aria-label={t('labelModeToggle.label')}>
      <button
        type="button"
        className={labelMode === 'note' ? 'active' : ''}
        onClick={() => onChange('note')}
        title={t('labelModeToggle.noteHint')}
      >
        {t('labelModeToggle.note')}
      </button>
      <button
        type="button"
        className={labelMode === 'finger' ? 'active' : ''}
        onClick={() => onChange('finger')}
        title={t('labelModeToggle.fingerHint')}
      >
        {t('labelModeToggle.finger')}
      </button>
    </div>
  );
}
