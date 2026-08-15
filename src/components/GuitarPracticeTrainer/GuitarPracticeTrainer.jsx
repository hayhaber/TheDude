import { useState } from 'react';
import { usePitchDetection } from '../../hooks/usePitchDetection';
import { GuitarNotation } from '../GuitarNotation/GuitarNotation';
import { STANDARD_TUNING } from '../../music/notes';
import { midiToNoteName } from '../../music/pitchUtils';
import { useLanguage } from '../../i18n/LanguageContext';
import './GuitarPracticeTrainer.css';

const IN_TUNE_CENTS = 15; // matches the +/-15 cents threshold from the spec
const CENTS_RANGE = 50; // pitchUtils.frequencyToNote already clamps to the nearest semitone, so cents is always within +/-50

// Full integration demo: usePitchDetection (mic -> note/cents) feeding
// GuitarNotation (VexFlow tab target) plus a tuner bar, cycling through
// standard tuning's six open strings one at a time.
export function GuitarPracticeTrainer() {
  const { t } = useLanguage();
  const [targetIndex, setTargetIndex] = useState(0);
  const { isListening, startListening, stopListening, currentNote, clarity, error } = usePitchDetection();

  const target = STANDARD_TUNING[targetIndex];
  const targetName = midiToNoteName(target.baseMidi);
  const targetNote = { stringNumber: target.stringNumber, fret: 0 };

  const isMatched = currentNote?.midi === target.baseMidi && Math.abs(currentNote.centsOff) <= IN_TUNE_CENTS;
  const cents = currentNote?.midi === target.baseMidi ? currentNote.centsOff : null;
  const needlePercent = cents == null ? 50 : 50 + (Math.max(-CENTS_RANGE, Math.min(CENTS_RANGE, cents)) / CENTS_RANGE) * 50;

  function goToString(delta) {
    setTargetIndex((i) => Math.max(0, Math.min(STANDARD_TUNING.length - 1, i + delta)));
  }

  return (
    <div className="guitar-practice-trainer">
      <p className="trainer-subtitle">{t('trainer.subtitle')}</p>

      <div className="trainer-controls">
        <button type="button" onClick={() => goToString(-1)} disabled={targetIndex === 0}>
          {t('trainer.prev')}
        </button>
        <span className="trainer-target">{t('trainer.target', { name: targetName })}</span>
        <button type="button" onClick={() => goToString(1)} disabled={targetIndex === STANDARD_TUNING.length - 1}>
          {t('trainer.next')}
        </button>
      </div>

      <GuitarNotation targetNote={targetNote} isMatched={isMatched} />

      <div className="trainer-tuner-bar">
        <div className="trainer-tuner-track">
          <div className="trainer-tuner-center" />
          <div
            className={`trainer-tuner-needle${isMatched ? ' matched' : ''}`}
            style={{ left: `${needlePercent}%` }}
          />
        </div>
        <p className="trainer-status" dir="auto">
          {error
            ? t('trainer.micError', { message: error })
            : !isListening
            ? t('trainer.micPermission')
            : currentNote
            ? isMatched
              ? t('trainer.inTune')
              : `${t('trainer.heard', { name: currentNote.name })} · ${t('trainer.cents', { cents: cents > 0 ? `+${cents}` : cents })}`
            : t('trainer.silence')}
        </p>
        {isListening && !error && <p className="trainer-clarity">{t('trainer.clarity', { value: Math.round(clarity * 100) })}</p>}
      </div>

      <button type="button" className="trainer-toggle" onClick={isListening ? stopListening : startListening}>
        {isListening ? t('trainer.stop') : t('trainer.start')}
      </button>
    </div>
  );
}
