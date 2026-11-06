import { useLanguage } from '../../i18n/LanguageContext';
import { useInfoTooltipsEnabled } from '../../hooks/useInfoTooltipsEnabled';
import './SettingsPanel.css';

/** An iOS switch row (`.set-row.is-switch`). */
export function SwitchRow({ label, sub, checked, onChange }) {
  return (
    <label className="set-row is-switch">
      <span className="set-row-text">
        <span className="set-row-label">{label}</span>
        {sub && <span className="set-row-sub">{sub}</span>}
      </span>
      <input type="checkbox" className="set-switch" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

/** The ⓘ explanations switch (was its own round button in the top bar). */
export function InfoSwitchRow() {
  const { t } = useLanguage();
  const { enabled, setEnabled } = useInfoTooltipsEnabled();
  return <SwitchRow label={t('settings.explanations')} sub={t('settings.explanationsSub')} checked={!!enabled} onChange={(v) => setEnabled(v)} />;
}
