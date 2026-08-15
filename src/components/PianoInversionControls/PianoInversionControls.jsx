import { useLanguage } from '../../i18n/LanguageContext';
import { CHORD_INVERSIONS } from '../../music/pianoInversions';
import '../PositionControls/PositionControls.css';

// Piano's equivalent of PositionControls (guitar's "← Back / Position N of
// M — shape / Next →" stepper) — same layout, same CSS classes, same
// numbered-chip row, reused wholesale rather than a second differently-
// styled control, per explicit request to match guitar's position picker
// exactly. Previously this was a <select> tucked inside the Display
// Options drawer; inversion is exactly as central to "what am I looking
// at" on piano as position is on guitar, so it gets the same prominent,
// always-visible placement (right after Playback Controls) instead.
export function PianoInversionControls({ inversion, setInversion, chordColor }) {
  const { t, lang } = useLanguage();
  const currentIndex = Math.max(0, CHORD_INVERSIONS.findIndex((inv) => inv.key === inversion));
  const current = CHORD_INVERSIONS[currentIndex];

  function step(delta) {
    const nextIndex = (currentIndex + delta + CHORD_INVERSIONS.length) % CHORD_INVERSIONS.length;
    setInversion(CHORD_INVERSIONS[nextIndex].key);
  }

  return (
    <div className="position-controls">
      <div className="position-controls-nav" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <button type="button" onClick={() => step(-1)}>
          {t('positionControls.back')}
        </button>
        <span className="position-label">
          {t('piano.inversion.navLabel', { index: currentIndex + 1, total: CHORD_INVERSIONS.length, name: t(current.labelKey) })}
        </span>
        <button type="button" onClick={() => step(1)}>
          {t('positionControls.next')}
        </button>
      </div>

      <div className="position-chips">
        {CHORD_INVERSIONS.map((inv, i) => {
          const isActive = i === currentIndex;
          return (
            <button
              key={inv.key}
              type="button"
              className={'position-chip' + (isActive ? ' active' : '')}
              style={isActive ? { background: chordColor } : undefined}
              onClick={() => setInversion(inv.key)}
              title={t(inv.labelKey)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
