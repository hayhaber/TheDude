import { useLanguage } from '../../i18n/LanguageContext';
import { shapeLabel } from '../../music/cagedCurriculum';
import { SHAPE_SHIFT_TEMPOS, SHAPE_SHIFT_BEATS_PER_SHAPE } from '../../hooks/useShapeShift';
// Same panel look as the Shape-Shift Workout.
import '../ShapeShiftPanel/ShapeShiftPanel.css';

// Studies -> CAGED -> "I-IV-V in One Area". `areas` comes from
// buildProgressionAreas (one per shape of the I chord); `player` is a
// useShapeShift instance stepping through the chosen area's I-IV-V-I.
export function ProgressionAreaPanel({ areas, areaIndex, onAreaChange, player }) {
  const { t, lang } = useLanguage();
  const { steps, current, stepIndex, isPlaying, bpm, setBpm, play, stop, next, previous, goTo } = player;
  if (!current || areas.length === 0) return null;

  const where = (fret) => (fret === 0 ? t('shapeShift.open') : t('shapeShift.fret', { fret }));
  const whereInline = (fret) => (fret === 0 ? t('studies.whereOpen') : t('studies.whereFret', { fret }));

  return (
    <div className="shape-shift-panel" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <label className="shape-shift-tempo shape-shift-area">
        <span>{t('progressionArea.area')}</span>
        <select value={areaIndex} onChange={(e) => onAreaChange(Number(e.target.value))}>
          {areas.map((a, i) => (
            <option key={i} value={i}>
              {t('progressionArea.areaOption', { shape: shapeLabel(a.anchorShape, lang), where: whereInline(a.anchorFret) })}
            </option>
          ))}
        </select>
      </label>

      <ol className="shape-shift-chain" dir="ltr" aria-label={t('progressionArea.chain')}>
        {steps.map((s, i) => (
          <li key={i} className={'shape-shift-chip' + (i === stepIndex ? ' active' : '')}>
            <button type="button" className="progression-chip-button" onClick={() => goTo(i)}>
              <span className="shape-shift-chip-fret">{s.numeral}</span>
              <span className="shape-shift-chip-letter">{s.chordText}</span>
              <span className="shape-shift-chip-fret">{shapeLabel(s.shapeName, lang)}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="shape-shift-now" aria-live="polite">
        <span className="shape-shift-now-title">
          <bdi dir="ltr">
            {current.numeral} · {current.chordText}
          </bdi>
        </span>
        <span className="shape-shift-now-meta">
          {shapeLabel(current.shapeName, lang)} · {where(current.baseFret)}
        </span>
      </div>

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
          <span>{t('progressionArea.tempo', { beats: SHAPE_SHIFT_BEATS_PER_SHAPE })}</span>
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
