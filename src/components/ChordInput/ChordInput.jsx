import { sanitizeChordInput } from '../../music/chordSymbolParser';
import { useLanguage } from '../../i18n/LanguageContext';
import './ChordInput.css';

export function ChordInput({ value, onChange, inputRef }) {
  const { t } = useLanguage();

  return (
    <div className="chord-input">
      <input
        id="chord-progression"
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(sanitizeChordInput(e.target.value))}
        placeholder={t('chordInput.placeholder')}
        aria-label={t('chordInput.label')}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
