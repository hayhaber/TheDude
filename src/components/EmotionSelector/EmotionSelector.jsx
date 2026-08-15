import { EMOTIONS, emotionProfile } from '../../music/emotionEngine';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import './EmotionSelector.css';

// Lets you pick an emotional target (spec #9) that adapts every
// lick/phrase/call-response generated afterward — pace, bend width,
// vibrato intensity, and note density — without changing which pitches are
// played (an emotion never fights the actual chord).
export function EmotionSelector({ emotionKey, onChange }) {
  const profile = emotionProfile(emotionKey);
  const { t, lang } = useLanguage();

  return (
    <label className="emotion-selector improvise-field">
      {t('emotionSelector.label')}
      <select value={emotionKey ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{t('emotionSelector.none')}</option>
        {EMOTIONS.map((e) => (
          <option key={e.key} value={e.key}>
            {localize(e.label, lang)}
          </option>
        ))}
      </select>
      {profile && (
        <span className="emotion-description" dir="auto">
          {localize(profile.description, lang)}
        </span>
      )}
    </label>
  );
}
