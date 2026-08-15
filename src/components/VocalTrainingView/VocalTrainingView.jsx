import { useVocalTraining } from '../../hooks/useVocalTraining';
import {
  VOCAL_MODES,
  VOCAL_SCALE_OPTIONS,
  VOCAL_INTERVALS,
  VOCAL_PITCH_CLASSES,
  VOCAL_OCTAVES,
  VOCAL_DIFFICULTIES,
} from '../../music/vocalTraining';
import { useLanguage } from '../../i18n/LanguageContext';
import './VocalTrainingView.css';

// Self-contained top-level section — mirrors Songs' isolation (see
// sections.js): owns its own mic pipeline via useVocalTraining/
// usePitchDetection and never touches the shared Stage Fretboard/Piano,
// since singing doesn't map to either instrument's fretboard/keys.
export function VocalTrainingView() {
  const { t } = useLanguage();
  const vocal = useVocalTraining();

  const clampedCents = vocal.cents == null ? null : Math.max(-50, Math.min(50, vocal.cents));
  const needlePercent = clampedCents == null ? 50 : 50 + clampedCents;

  return (
    <div className="vocal-training-view">
      <div>
        <h1>{t('vocal.title')}</h1>
        <p className="subtitle">{t('vocal.subtitle')}</p>
      </div>

      <div className="vocal-controls">
        <label className="vocal-field">
          <span>{t('vocal.mode')}</span>
          <select value={vocal.mode} onChange={(e) => vocal.setMode(e.target.value)}>
            {VOCAL_MODES.map((m) => (
              <option key={m.key} value={m.key}>{t(`vocal.mode.${m.key}`)}</option>
            ))}
          </select>
        </label>

        <label className="vocal-field">
          <span>{t('vocal.startNote')}</span>
          <select value={vocal.pitchClass} onChange={(e) => vocal.setPitchClass(Number(e.target.value))}>
            {VOCAL_PITCH_CLASSES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="vocal-field">
          <span>{t('vocal.octave')}</span>
          <select value={vocal.octave} onChange={(e) => vocal.setOctave(Number(e.target.value))}>
            {VOCAL_OCTAVES.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>

        {vocal.mode === 'scale' && (
          <label className="vocal-field">
            <span>{t('vocal.scale')}</span>
            <select value={vocal.scaleKey} onChange={(e) => vocal.setScaleKey(e.target.value)}>
              {VOCAL_SCALE_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>{t(`vocal.scaleOption.${s.key}`)}</option>
              ))}
            </select>
          </label>
        )}

        {vocal.mode === 'interval' && (
          <label className="vocal-field">
            <span>{t('vocal.interval')}</span>
            <select value={vocal.intervalSemitones} onChange={(e) => vocal.setIntervalSemitones(Number(e.target.value))}>
              {VOCAL_INTERVALS.map((iv) => (
                <option key={iv.key} value={iv.semitones}>{t(`vocal.intervalOption.${iv.key}`)}</option>
              ))}
            </select>
          </label>
        )}

        <label className="vocal-field">
          <span>{t('vocal.difficulty')}</span>
          <select value={vocal.difficultyKey} onChange={(e) => vocal.setDifficultyKey(e.target.value)}>
            {VOCAL_DIFFICULTIES.map((d) => (
              <option key={d.key} value={d.key}>{t(`difficulty.${d.label}`)}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="vocal-session">
        <button type="button" className="vocal-toggle-btn" onClick={vocal.isListening ? vocal.stop : vocal.start}>
          {vocal.isListening ? t('vocal.stop') : t('vocal.start')}
        </button>

        {vocal.error && <p className="vocal-error">{vocal.error}</p>}

        {vocal.isListening && vocal.target && !vocal.isComplete && (
          <>
            <div className="vocal-target">
              <span className="vocal-target-label">{t('vocal.target')}</span>
              <span className="vocal-target-note">{vocal.target.name}</span>
            </div>

            <div className="vocal-meter">
              <div
                className="vocal-meter-zone"
                style={{ left: `${50 - vocal.difficulty.toleranceCents}%`, width: `${vocal.difficulty.toleranceCents * 2}%` }}
              />
              <div className="vocal-meter-center" />
              {clampedCents != null && (
                <div
                  className={`vocal-meter-needle${vocal.isMatched ? ' matched' : ''}`}
                  style={{ left: `${needlePercent}%` }}
                />
              )}
            </div>

            <div className="vocal-hold-bar">
              <div className="vocal-hold-fill" style={{ width: `${vocal.holdProgress * 100}%` }} />
            </div>

            <div className="vocal-sequence">
              {vocal.sequence.map((note, i) => (
                <span
                  key={i}
                  className={`vocal-seq-note${i < vocal.targetIndex ? ' done' : ''}${i === vocal.targetIndex ? ' current' : ''}`}
                >
                  {note.name}
                </span>
              ))}
            </div>

            <button type="button" className="vocal-skip-btn" onClick={vocal.skip}>{t('vocal.skip')}</button>
          </>
        )}

        {vocal.isListening && vocal.isComplete && (
          <div className="vocal-complete">
            <p>{t('vocal.complete')}</p>
            <button type="button" className="vocal-again-btn" onClick={vocal.restart}>{t('vocal.again')}</button>
          </div>
        )}

        {vocal.isListening && (
          <p className="vocal-score">{t('vocal.score')}: {vocal.score.hits} / {vocal.score.hits + vocal.score.misses}</p>
        )}
      </div>
    </div>
  );
}
