import { KEY_NAMES } from '../../music/scaleAnalyzer';
import { useLanguage } from '../../i18n/LanguageContext';

// Shared root-note <select>, reused by every demo widget in the Harmony
// course — same KEY_NAMES pitch-class list ScalesView's own Key selector
// already uses, for the same "sharp-only, app-wide simplified spelling"
// consistency scalesCurriculum.js explicitly calls out.
export function HarmonyRootPicker({ rootPitchClass, onChange }) {
  const { t } = useLanguage();
  return (
    <label className="harmony-field">
      {t('harmony.root')}
      <select value={rootPitchClass} onChange={(e) => onChange(Number(e.target.value))}>
        {KEY_NAMES.map((name, i) => (
          <option key={name} value={i}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
