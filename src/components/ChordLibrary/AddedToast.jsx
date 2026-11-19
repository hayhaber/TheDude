import { createPortal } from 'react-dom';
import { useLanguage } from '../../i18n/LanguageContext';

// After "+ Compose" in a chord library (v1.0.220; user: "I don't understand
// what Add does"): a glass HUD under the top controls says where the chord
// went — "Am7 added to Compose" — with ONE action, Open, that goes there.
export function AddedToast({ added, onOpen, onClose }) {
  const { t, lang } = useLanguage();
  if (!added) return null;
  return createPortal(
    <div className="cl-added" role="status" key={added.n} dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <span className="cl-added-text">
        <bdi dir="ltr">{added.symbol}</bdi> {t('chordlib.added')}
      </span>
      {onOpen && (
        <button
          type="button"
          className="cl-added-open"
          onClick={() => {
            onClose();
            onOpen();
          }}
        >
          {t('chordlib.goCompose')}
        </button>
      )}
    </div>,
    document.body,
  );
}
