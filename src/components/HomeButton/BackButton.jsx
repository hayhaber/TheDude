import { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../i18n/LanguageContext';

// The round glass Back button (v1.0.211; iOS 26: a floating glass circle
// with a chevron only — the big title already says where you are). A screen
// renders <BackButton> where it likes; inside a shell that offers slots
// (AppShell: beside the Home button in the phone strip and in the desktop
// top bar; the Band screen beside its Home) it is portaled there, so it
// always sits next to Home. Without a slot (a sheet) it stays inline.
export const BackSlotContext = createContext(null);

function Circle({ label, onClick, className = '' }) {
  const { t, lang } = useLanguage();
  const name = label ? `${t('nav.back')} · ${label}` : t('nav.back');
  return (
    <button type="button" className={'back-button icon-circle-button ' + (lang === 'he' ? 'is-rtl ' : '') + className} onClick={onClick} disabled={!onClick} aria-label={name} title={name}>
      <svg viewBox="0 0 12 20" width="11" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 2L2 10l8 8" />
      </svg>
    </button>
  );
}

/** `label` = the screen it goes back to (read out, not shown). */
export function BackButton({ label, onClick }) {
  const slots = useContext(BackSlotContext);
  const targets = (slots ?? []).filter(Boolean);
  if (!targets.length) return <Circle label={label} onClick={onClick} className="is-inline" />;
  return targets.map((el, i) => createPortal(<Circle key={i} label={label} onClick={onClick} />, el));
}
