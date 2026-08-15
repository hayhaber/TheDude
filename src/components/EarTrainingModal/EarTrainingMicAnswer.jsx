import { useEffect } from 'react';
import { useMicAnswerDetector } from '../../hooks/useMicAnswerDetector';
import { useLanguage } from '../../i18n/LanguageContext';
import './EarTrainingMicAnswer.css';

// Alternative to clicking the fretboard/piano for 'pitch'/'callresponse'
// questions — the only two kinds answered by an exact note rather than a
// multiple-choice label, so the only ones a played note can grade. Play the
// note on a real guitar instead, detected via the same pitchy-based mic
// pipeline the Tuner already uses (see hooks/useMicAnswerDetector.js).
// Purely additive: clicking still works exactly as before, this is just
// another way to answer.
export function EarTrainingMicAnswer({ earTraining }) {
  const { t } = useLanguage();
  const { isListening, startListening, stopListening, currentNote, error } = useMicAnswerDetector(earTraining.submitMidiAnswer);

  // A stray detected note should never submit into a choice question it
  // can't answer — stop listening as soon as the quiz moves to one.
  useEffect(() => {
    if (!earTraining.isFretQuestion && isListening) stopListening();
  }, [earTraining.isFretQuestion, isListening, stopListening]);

  if (!earTraining.isFretQuestion) return null;

  return (
    <div className="ear-training-mic-answer">
      <div className="ear-training-mic-header">
        <span className="ear-training-mic-label" dir="auto">
          {t('earTraining.mic.label')}
        </span>
        <button
          type="button"
          className={'ear-training-mic-toggle' + (isListening ? ' active' : '')}
          onClick={isListening ? stopListening : startListening}
        >
          🎤 {isListening ? t('trainer.stop') : t('earTraining.mic.playIt')}
        </button>
      </div>

      {/* Always rendered (not gated on isListening) — same as GuitarTuner's
          own status line — so a permission denial actually surfaces to the
          user instead of the toggle silently reverting with no explanation. */}
      <p className="ear-training-mic-status" dir="auto">
        {error
          ? t('trainer.micError', { message: error })
          : !isListening
            ? t('earTraining.mic.permission')
            : currentNote
              ? t('earTraining.mic.heard', { note: currentNote.name })
              : t('trainer.silence')}
      </p>
    </div>
  );
}
