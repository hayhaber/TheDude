import { useLanguage } from '../../i18n/LanguageContext';
import '../ModeToggle/ModeToggle.css';

// Same segmented-control look as ModeToggle/LabelModeToggle. Switches every
// fretboard dot (chord-shape dots and lick markers) between one color per
// chord (today's default) and one color per harmonic function — root/3rd/5th/
// 7th/extension/passing — per Chord Tone Highlighting.
export function ColorModeToggle({ colorMode, onChange }) {
  const { t } = useLanguage();

  return (
    <div className="mode-toggle" role="group" aria-label={t('colorModeToggle.label')}>
      <button
        type="button"
        className={colorMode === 'chord' ? 'active' : ''}
        onClick={() => onChange('chord')}
        title={t('colorModeToggle.chordHint')}
      >
        {t('colorModeToggle.chord')}
      </button>
      <button
        type="button"
        className={colorMode === 'function' ? 'active' : ''}
        onClick={() => onChange('function')}
        title={t('colorModeToggle.functionHint')}
      >
        {t('colorModeToggle.function')}
      </button>
    </div>
  );
}
