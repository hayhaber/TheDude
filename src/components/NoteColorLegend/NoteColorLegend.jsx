import { NOTE_FUNCTION_COLORS } from '../../styles/colors';
import { useLanguage } from '../../i18n/LanguageContext';
import './NoteColorLegend.css';

const ENTRIES = [
  { role: 'root', labelKey: 'noteColorLegend.root' },
  { role: 'third', labelKey: 'noteColorLegend.third' },
  { role: 'fifth', labelKey: 'noteColorLegend.fifth' },
  { role: 'seventh', labelKey: 'noteColorLegend.seventh' },
  { role: 'extension', labelKey: 'noteColorLegend.extension' },
  { role: 'passing', labelKey: 'noteColorLegend.passing' },
];

// Small color-key row shown alongside Chord Tone Highlighting so the
// root/3rd/5th/7th/extension/passing colors are legible at a glance.
export function NoteColorLegend() {
  const { t } = useLanguage();

  return (
    <div className="note-color-legend" aria-label={t('noteColorLegend.label')}>
      {ENTRIES.map(({ role, labelKey }) => (
        <span key={role} className="note-color-legend-item">
          <span className="note-color-legend-swatch" style={{ background: NOTE_FUNCTION_COLORS[role] }} />
          {t(labelKey)}
        </span>
      ))}
    </div>
  );
}
