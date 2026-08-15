import { useLanguage } from '../../i18n/LanguageContext';
import './PositionControls.css';

export function PositionControls({ currentIndex, positions, chordColor, onNext, onBack, onSelect }) {
  const { t, lang } = useLanguage();
  if (positions.length === 0) return null;

  const current = positions[currentIndex];

  return (
    <div className="position-controls">
      <div className="position-controls-nav" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <button type="button" onClick={onBack} disabled={positions.length < 2}>
          {t('positionControls.back')}
        </button>
        <span className="position-label">
          {t('positionControls.navLabel', { index: currentIndex + 1, total: positions.length, shape: current.shapeName })}
        </span>
        <button type="button" onClick={onNext} disabled={positions.length < 2}>
          {t('positionControls.next')}
        </button>
      </div>

      {positions.length > 1 && (
        <div className="position-chips">
          {positions.map((position, i) => {
            const isActive = i === currentIndex;
            return (
              <button
                key={i}
                type="button"
                className={'position-chip' + (isActive ? ' active' : '')}
                style={isActive ? { background: chordColor } : undefined}
                onClick={() => onSelect(i)}
                title={position.shapeName}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
