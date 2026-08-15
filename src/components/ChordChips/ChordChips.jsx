import { colorForChord } from '../../styles/colors';
import { useLanguage } from '../../i18n/LanguageContext';
import './ChordChips.css';

// Renders the chord-progression chip row plus Prev/Next chord controls.
// Both control the same `activeIndex` and always stay in sync: chips let you
// jump straight to any chord, Prev/Next steps through in order. This is a
// different concept from the fretboard's own Position Back/Next, which
// cycles shapes of whichever chord is active here.
export function ChordChips({ progression, activeIndex, onSelect, onPrev, onNext }) {
  const { t, lang } = useLanguage();
  if (progression.length === 0) return null;

  const active = progression[activeIndex];

  return (
    <div className="chord-chips">
      <div className="chord-chips-row">
        {progression.map((chord, i) => {
          const isActive = i === activeIndex;
          const isInvalid = !chord.parsed;
          const style = isActive && !isInvalid ? { background: colorForChord(chord.text) } : undefined;
          return (
            <button
              key={i}
              type="button"
              className={
                'chord-chip' + (isActive ? ' active' : '') + (isInvalid ? ' invalid' : '')
              }
              style={style}
              onClick={() => onSelect(i)}
              title={isInvalid ? t('chordChips.invalidTitle', { chord: chord.text }) : undefined}
            >
              {chord.text}
            </button>
          );
        })}
      </div>

      <div className="chord-chips-nav" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <button type="button" className="chord-chips-nav-button" onClick={onPrev} disabled={progression.length < 2}>
          {t('chordChips.prevChord')}
        </button>
        <span className="chord-chips-nav-label">
          {t('chordChips.navLabel', { index: activeIndex + 1, total: progression.length, name: active.text })}
        </span>
        <button type="button" className="chord-chips-nav-button" onClick={onNext} disabled={progression.length < 2}>
          {t('chordChips.nextChord')}
        </button>
      </div>
    </div>
  );
}
