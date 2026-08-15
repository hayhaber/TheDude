import { useEffect, useRef, useState } from 'react';
import { generateFindKeyQuestion } from '../../music/chordsByEar';
import { fivePositionWindows } from '../../music/scaleShapes';
import { playProgression } from '../../audio/chordsByEarPlayer';
import { useMicAnswerDetector } from '../../hooks/useMicAnswerDetector';
import { noteNameForMidi } from '../../music/earTraining';
import { KEY_NAMES } from '../../music/scaleAnalyzer';
import { mod } from '../../music/notes';
import { useLanguage } from '../../i18n/LanguageContext';

const LOW_E_PITCH_CLASS = 4;
// One candidate per fret of the low E string, 0-11 (a full octave — every
// possible root) — the exact "slide the shape up and down the neck until
// you find home" interaction from Step 1, just answered by picking a fret
// instead of a fully-automatic (and, with only monophonic pitch detection,
// not honestly buildable) "no dissonance" auto-stop.
const CANDIDATES = Array.from({ length: 12 }, (_, fret) => ({
  fret,
  pitchClass: mod(LOW_E_PITCH_CLASS + fret, 12),
}));

function eShapeWindow(rootPitchClass) {
  return fivePositionWindows(rootPitchClass).find((w) => w.shapeName === 'E-shape');
}

// Step 1 practice — a clear I-IV-V-I cadence establishes "home" in a random
// key; the user slides a candidate root along the low E string (each pick
// previews that root's movable major-scale shape live on the Fretboard, via
// onPreviewScale) and submits their guess. After answering, an optional
// mic-based "play the real root to confirm" step closes the loop between
// the visual/aural guess and actually finding the note on a real
// instrument — reuses the exact same useMicAnswerDetector pipeline
// SingRootDrill.jsx already uses, not a second pitch-detection path.
export function FindKeyDrill({ progress, lessonId, onPreviewScale }) {
  const { t } = useLanguage();
  const [question, setQuestion] = useState(() => generateFindKeyQuestion());
  const [guessPitchClass, setGuessPitchClass] = useState(null);
  const [answered, setAnswered] = useState(null); // { correct } | null
  const [confirmed, setConfirmed] = useState(false);
  const cancelRef = useRef(null);

  const { isListening, startListening, stopListening, currentNote, error } = useMicAnswerDetector((midi) => {
    if (mod(midi, 12) === question.rootPitchClass) setConfirmed(true);
    stopListening();
  });

  function play(q = question) {
    cancelRef.current?.();
    cancelRef.current = playProgression(q.chordVoicings, { bpm: 90 });
  }

  useEffect(() => {
    play(question);
    return () => cancelRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => onPreviewScale(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  function selectCandidate(pitchClass) {
    if (answered) return;
    setGuessPitchClass(pitchClass);
    const w = eShapeWindow(pitchClass);
    onPreviewScale(w ? { rootPitchClass: pitchClass, fretStart: w.fretStart, fretEnd: w.fretEnd } : null);
  }

  function submit() {
    if (guessPitchClass == null || answered) return;
    const correct = guessPitchClass === question.rootPitchClass;
    progress?.recordQuizResult(lessonId, correct);
    setAnswered({ correct });
  }

  function next() {
    if (isListening) stopListening();
    cancelRef.current?.();
    const q = generateFindKeyQuestion();
    setQuestion(q);
    setGuessPitchClass(null);
    setAnswered(null);
    setConfirmed(false);
    onPreviewScale(null);
    play(q);
  }

  return (
    <div className="cbe-drill">
      <button type="button" className="play-button" onClick={() => play()}>
        {t('chordsByEar.play')}
      </button>

      <p className="cbe-hint">{t('chordsByEar.findKey.prompt')}</p>

      <div className="cbe-fret-row">
        {CANDIDATES.map((c) => (
          <button
            key={c.fret}
            type="button"
            className={
              'cbe-fret-btn' +
              (guessPitchClass === c.pitchClass ? ' picked' : '') +
              (answered && c.pitchClass === question.rootPitchClass ? ' correct' : '') +
              (answered && guessPitchClass === c.pitchClass && !answered.correct ? ' incorrect' : '')
            }
            onClick={() => selectCandidate(c.pitchClass)}
            disabled={!!answered}
          >
            <span className="cbe-fret-num">{c.fret}</span>
            <span dir="ltr">{KEY_NAMES[c.pitchClass]}</span>
          </button>
        ))}
      </div>

      {!answered && (
        <button type="button" className="circle-quiz-next" onClick={submit} disabled={guessPitchClass == null}>
          {t('chordsByEar.findKey.submit')}
        </button>
      )}

      {answered && (
        <div className="circle-quiz-feedback">
          <span className={answered.correct ? 'circle-quiz-result correct' : 'circle-quiz-result incorrect'}>
            {answered.correct ? t('circleOfFifths.quiz.correct') : t('chordsByEar.findKey.theKeyWas', { key: KEY_NAMES[question.rootPitchClass] })}
          </span>

          <div className="ear-training-mic-answer">
            <div className="ear-training-mic-header">
              <span className="ear-training-mic-label" dir="auto">
                {t('chordsByEar.findKey.confirmLabel')}
              </span>
              <button
                type="button"
                className={'ear-training-mic-toggle' + (isListening ? ' active' : '')}
                onClick={isListening ? stopListening : startListening}
                disabled={confirmed}
              >
                🎤 {isListening ? t('trainer.stop') : t('chordsByEar.singRoot.sing')}
              </button>
            </div>
            <p className="ear-training-mic-status" dir="auto">
              {error
                ? t('trainer.micError', { message: error })
                : confirmed
                  ? t('chordsByEar.findKey.confirmed')
                  : !isListening
                    ? t('earTraining.mic.permission')
                    : currentNote
                      ? t('earTraining.mic.heard', { note: noteNameForMidi(currentNote.midi) })
                      : t('trainer.silence')}
            </p>
          </div>

          <button type="button" className="circle-quiz-next" onClick={next}>
            {t('circleOfFifths.quiz.next')}
          </button>
        </div>
      )}
    </div>
  );
}
