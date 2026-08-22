import { useInstrument } from './useInstrument';
import { supportsInstrument } from './featureCapabilities';
import { useLanguage } from '../i18n/LanguageContext';
import { GuitarIcon } from '../components/GuitarIcon/GuitarIcon';
import './InstrumentGate.css';

// Wraps a guitar-specific (or, in the future, piano-specific) feature —
// renders its children only when the currently-selected instrument
// supports it (see featureCapabilities.js), otherwise a calm "not
// available in this mode" message instead of a broken/empty guitar UI.
export function InstrumentGate({ feature, children }) {
  const { instrument } = useInstrument();
  const { t } = useLanguage();

  if (supportsInstrument(feature, instrument)) return children;

  return (
    <div className="instrument-gate">
      <span className="instrument-gate-icon" aria-hidden="true">
        <GuitarIcon />
      </span>
      <p>{t('instrument.guitarOnly')}</p>
    </div>
  );
}
