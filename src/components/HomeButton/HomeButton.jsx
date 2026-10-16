import { useLanguage } from '../../i18n/LanguageContext';

/**
 * The round "Home" button — back to the main menu (the instrument cards).
 * Replaces the logo that used to sit at the top of every page (user's
 * request). Uses the shared .icon-circle-button chrome.
 */
export function HomeButton({ onClick, className = '' }) {
  const { t } = useLanguage();
  return (
    <button type="button" className={`home-button icon-circle-button ${className}`} onClick={onClick} aria-label={t('home.open')} title={t('home.open')}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M6.5 10v9h11v-9" />
        <path d="M10 19v-5h4v5" />
      </svg>
    </button>
  );
}
