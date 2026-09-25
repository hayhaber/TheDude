import { useLanguage } from '../../i18n/LanguageContext';
import { SHAPE_SHIFT_TEMPOS, SHAPE_SHIFT_BEATS_PER_SHAPE } from '../../hooks/useShapeShift';
import './ShapeShiftPanel.css';

// Studies -> CAGED -> Shape-Shift Workout controls. The shared Stage
// Fretboard shows the current shape (App.jsx resolves it from
// shapeShift.current); this panel shows where you are in the cycle and
// drives it.
//
// The sequence is one climb up the neck and back down (see
// buildShapeShiftSteps), so the chip row shows just the climb and maps
// each step on the way down back onto the same chip.
function chipIndexFor(stepIndex, total) {
  const upCount = (total + 2) / 2;
  return stepIndex < upCount ? stepIndex : total - stepIndex;
}

function fretText(t, baseFret) {
  return baseFret === 0 ? t('shapeShift.open') : t('shapeShift.fret', { fret: baseFret });
}

export function ShapeShiftPanel({ shapeShift, keyLabel }) {
  const { t, lang } = useLanguage();
  const { steps, current, stepIndex, isPlaying, bpm, setBpm, play, stop, next, previous } = shapeShift;
  if (!current) return null;

  const total = steps.length;
  const upCount = (total + 2) / 2;
  const chips = steps.slice(0, upCount);
  const activeChip = chipIndexFor(stepIndex, total);
  const nextStep = steps[(stepIndex + 1) % total];

  return (
    <div className="shape-shift-panel" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <ol className="shape-shift-chain" dir="ltr" aria-label={t('shapeShift.cycle')}>
        {chips.map((s, i) => (
          <li key={i} className={'shape-shift-chip' + (i === activeChip ? ' active' : '')}>
            <span className="shape-shift-chip-letter">{s.shapeName[0]}</span>
            <span className="shape-shift-chip-fret">{s.baseFret === 0 ? t('shapeShift.openShort') : s.baseFret}</span>
          </li>
        ))}
      </ol>

      <div className="shape-shift-now" aria-live="polite">
        <span className="shape-shift-now-title">
          <bdi>
            {keyLabel} · {current.shapeName}
          </bdi>
        </span>
        <span className="shape-shift-now-meta">
          {fretText(t, current.baseFret)} · {t(current.direction === 'up' ? 'shapeShift.up' : 'shapeShift.down')}
        </span>
      </div>

      <p className="shape-shift-hint">
        <span className="shape-shift-ring" aria-hidden="true" />
        {t('shapeShift.hint', { shape: nextStep.shapeName })}
      </p>

      <div className="shape-shift-controls">
        <button type="button" onClick={previous}>
          {t('shapeShift.back')}
        </button>
        <button type="button" className="primary" onClick={isPlaying ? stop : play}>
          {isPlaying ? t('shapeShift.stop') : t('shapeShift.play')}
        </button>
        <button type="button" onClick={next}>
          {t('shapeShift.next')}
        </button>
        <label className="shape-shift-tempo">
          <span>{t('shapeShift.tempo', { beats: SHAPE_SHIFT_BEATS_PER_SHAPE })}</span>
          <select value={bpm} onChange={(e) => setBpm(Number(e.target.value))}>
            {SHAPE_SHIFT_TEMPOS.map((v) => (
              <option key={v} value={v}>
                {v} BPM
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
