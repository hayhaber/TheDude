import { useLanguage } from '../../i18n/LanguageContext';
import './HeatMapLegend.css';

// Explains the Heat Map's note-importance tiers. Chord tones aren't drawn
// by the heat map overlay itself (the normal fretboard dots already show
// them, full-size) — listed here anyway so the whole priority order reads
// as one scale, largest/brightest to smallest/faintest.
const ENTRIES = [
  { tier: 'chord', labelKey: 'heatMapLegend.chord', className: 'legend-chord' },
  { tier: 'scale', labelKey: 'heatMapLegend.scale', className: 'legend-scale' },
  { tier: 'passing', labelKey: 'heatMapLegend.passing', className: 'legend-passing' },
  { tier: 'avoid', labelKey: 'heatMapLegend.avoid', className: 'legend-avoid' },
];

export function HeatMapLegend() {
  const { t } = useLanguage();

  return (
    <div className="heat-map-legend" aria-label={t('heatMapLegend.label')}>
      {ENTRIES.map(({ tier, labelKey, className }) => (
        <span key={tier} className="heat-map-legend-item">
          <span className={`heat-map-legend-swatch ${className}`} />
          {t(labelKey)}
        </span>
      ))}
    </div>
  );
}
