import { INSTRUMENTS } from '../../instruments/instrumentRegistry';
import { useInstrument } from '../../instruments/useInstrument';
import { useLanguage } from '../../i18n/LanguageContext';
import '../ModeToggle/ModeToggle.css';
import './InstrumentToggle.css';

// Self-contained (reads/writes instrument via context), same segmented-
// control look and same "always visible, one click from anywhere" placement
// as LanguageToggle — the global instrument switch is exactly as
// fundamental a setting as language, not tucked into a Settings popover.
// Only 2 instruments today (Guitar/Piano), so a toggle rather than a
// dropdown, per this app's own >3-options-get-a-dropdown rule.
export function InstrumentToggle() {
  const { instrument, setInstrument } = useInstrument();
  const { t } = useLanguage();

  return (
    <div className="mode-toggle instrument-toggle" role="group" aria-label={t('instrument.label')}>
      {INSTRUMENTS.map((i) => (
        <button key={i.key} type="button" className={instrument === i.key ? 'active' : ''} onClick={() => setInstrument(i.key)}>
          <span aria-hidden="true">{i.icon}</span> {t(i.labelKey)}
        </button>
      ))}
    </div>
  );
}
