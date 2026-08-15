import { useLanguage } from '../../i18n/LanguageContext';
import '../ModeToggle/ModeToggle.css';
import './LanguageToggle.css';

// EN/HE pill — lives inside the Settings drawer (SettingsPanel.jsx), per
// explicit request, alongside the other app-wide preferences (theme, sound,
// etc.) rather than as its own always-visible top-level control. Reuses the
// same segmented-control look as ModeToggle/LabelModeToggle/etc.
export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="mode-toggle language-toggle" role="group" aria-label={t('languageToggle.label')}>
      <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
        EN
      </button>
      <button type="button" className={lang === 'he' ? 'active' : ''} onClick={() => setLang('he')}>
        HE
      </button>
    </div>
  );
}
