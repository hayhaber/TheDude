import { INSTRUMENTS } from '../../instruments/instrumentRegistry';
import { useInstrument } from '../../instruments/useInstrument';
import { useLanguage } from '../../i18n/LanguageContext';
import '../ModeToggle/ModeToggle.css';
import './InstrumentToggle.css';

// `icon` is either an emoji string or a component reference (see
// instrumentRegistry.js's own comment) — same one-line convention
// AppShell.jsx's SectionIcon already uses for nav icons.
function InstrumentIcon({ icon: Icon }) {
  return typeof Icon === 'string' ? Icon : <Icon />;
}

// Self-contained (reads/writes instrument via context), same segmented-
// control look and same "always visible, one click from anywhere" placement
// as LanguageToggle — the global instrument switch is exactly as
// fundamental a setting as language, not tucked into a Settings popover.
// Per explicit request, back to 3 individual pill buttons (not the
// button+dropdown-menu version this briefly became) — see
// InstrumentToggle.css's own comment for how the 3-pill row is kept from
// overflowing the narrow sidebar/mobile-settings drawer it renders in.
export function InstrumentToggle() {
  const { instrument, setInstrument } = useInstrument();
  const { t } = useLanguage();

  return (
    <div className="mode-toggle instrument-toggle" role="group" aria-label={t('instrument.label')}>
      {INSTRUMENTS.map((i) => (
        <button key={i.key} type="button" className={instrument === i.key ? 'active' : ''} onClick={() => setInstrument(i.key)}>
          <span className="instrument-toggle-icon" aria-hidden="true">
            <InstrumentIcon icon={i.icon} />
          </span>
          {t(i.labelKey)}
        </button>
      ))}
    </div>
  );
}
