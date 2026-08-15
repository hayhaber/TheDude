import { degreeLabel, functionReason } from '../../music/noteFunction';
import { NOTE_FUNCTION_COLORS } from '../../styles/colors';
import { useLanguage } from '../../i18n/LanguageContext';
import './NoteInfoPanel.css';

const FUNCTION_TITLE_KEY = {
  root: 'noteColorLegend.root',
  third: 'noteColorLegend.third',
  fifth: 'noteColorLegend.fifth',
  seventh: 'noteColorLegend.seventh',
  extension: 'noteColorLegend.extension',
  passing: 'heatMapLegend.passing',
  bass: 'noteInfo.bassNote',
};

// Shows the last-clicked fretboard note's name, scale degree, chord
// function, and a short reason it works — "Explain Every Note".
export function NoteInfoPanel({ note }) {
  const { t, lang } = useLanguage();
  if (!note) return null;

  const color = NOTE_FUNCTION_COLORS[note.role] ?? 'var(--accent)';
  const titleKey = FUNCTION_TITLE_KEY[note.role];

  return (
    <div className="note-info-panel">
      <span className="note-info-dot" style={{ background: color }} aria-hidden="true">
        {note.label}
      </span>
      <div className="note-info-text">
        <p className="note-info-title">
          {note.label} — {titleKey ? t(titleKey) : note.role}
        </p>
        <p className="note-info-degree" dir="auto">
          {degreeLabel(note.role, note.degree, lang)}
        </p>
        <p className="note-info-reason" dir="auto">
          {functionReason(note.role, lang)}
        </p>
      </div>
    </div>
  );
}
