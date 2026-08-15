import { useYoutubeApiKey } from '../../hooks/useYoutubeApiKey';
import { useLanguage } from '../../i18n/LanguageContext';

// Self-contained, same composition pattern as AudioInputSettings — owns its
// own state end-to-end via its hook, rather than SettingsPanel threading
// apiKey/setApiKey through as props. Only consumer today: Songs -> Video's
// "search YouTube for this Guitar Pro file" auto-search
// (music/youtubeSearch.js), which silently no-ops (falls back to manual
// paste) when this is empty — never required to use the rest of the app.
export function YoutubeApiKeySettings() {
  const { t } = useLanguage();
  const { apiKey, setApiKey } = useYoutubeApiKey();

  return (
    <label className="settings-field">
      {t('settings.youtubeApiKey')}
      {/* type="text" + -webkit-text-security (not type="password") — still
          masks the key with dots on screen once pasted, but avoids a real
          side effect of type="password": Chrome specifically watches
          password-typed inputs for its own "Save password?" prompt and
          ignores autocomplete="off" there (a deliberate browser override,
          not a bug), pairing this field with whatever text input was
          focused before it (e.g. the chord progression box) as a fake
          "login form." A plain text input styled to look like one doesn't
          trigger that heuristic at all. */}
      <input
        type="text"
        className="youtube-api-key-input"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={t('settings.youtubeApiKeyPlaceholder')}
        autoComplete="off"
        spellCheck={false}
      />
      <span className="settings-attribution">{t('settings.youtubeApiKeyHint')}</span>
    </label>
  );
}
