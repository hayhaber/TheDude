import { useEffect, useState } from 'react';
import { generateSingRootQuestion } from '../../music/chordsByEar';
import { playChordVoicing } from '../../audio/chordsByEarPlayer';
import { noteNameForMidi } from '../../music/earTraining';
import { useMicAnswerDetector } from '../../hooks/useMicAnswerDetector';
import { mod } from '../../music/notes';
import { useLanguage } from '../../i18n/LanguageContext';

// The single most-recommended drill in certified relative-pitch methods
// (Kodály solfège, David Lucas Burge's Ear Training courses): actively
// SINGING a pitch back, not picking it from a list — a multiple-choice
// answer can be reached by elimination without truly hearing anything,
// singing can't. Reuses the app's existing mic pitch detector (the same
// pipeline the Tuner and Ear Training's own mic-answer mode already use —
// see useMicAnswerDetector.js) rather than building a second one, and
// grades PITCH CLASS only (mod 12), any octave — a singer's vocal range has
// nothing to do with which octave a guitar happens to voice the same chord.
export function SingRootDrill({ progress, lessonId }) {
  const { t } = useLanguage();
  const [question, setQuestion] = useState(() => generateSingRootQuestion());
  const [result, setResult] = useState(null); // { correct, detectedName } | null

  const { isListening, startListening, stopListening, currentNote, error } = useMicAnswerDetector((midi) => {
    const correct = mod(midi, 12) === question.rootPitchClass;
    progress?.recordQuizResult(lessonId, correct);
    setResult({ correct, detectedName: noteNameForMidi(midi) });
    stopListening();
  });

  useEffect(() => {
    playChordVoicing(question.notesToPlay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  function next() {
    if (isListening) stopListening();
    const q = generateSingRootQuestion();
    setQuestion(q);
    setResult(null);
    playChordVoicing(q.notesToPlay);
  }

  return (
    <div className="cbe-drill">
      <p className="cbe-hint" dir="auto">
        {t('chordsByEar.singRoot.instructions')}
      </p>
      <button type="button" className="play-button" onClick={() => playChordVoicing(question.notesToPlay)}>
        {t('chordsByEar.play')}
      </button>

      <div className="ear-training-mic-answer">
        <div className="ear-training-mic-header">
          <span className="ear-training-mic-label" dir="auto">
            {t('chordsByEar.singRoot.label')}
          </span>
          <button
            type="button"
            className={'ear-training-mic-toggle' + (isListening ? ' active' : '')}
            onClick={isListening ? stopListening : startListening}
            disabled={!!result}
          >
            🎤 {isListening ? t('trainer.stop') : t('chordsByEar.singRoot.sing')}
          </button>
        </div>
        <p className="ear-training-mic-status" dir="auto">
          {error
            ? t('trainer.micError', { message: error })
            : result
              ? ''
              : !isListening
                ? t('earTraining.mic.permission')
                : currentNote
                  ? t('earTraining.mic.heard', { note: currentNote.name })
                  : t('trainer.silence')}
        </p>
      </div>

      {result && (
        <div className="circle-quiz-feedback">
          <span className={result.correct ? 'circle-quiz-result correct' : 'circle-quiz-result incorrect'}>
            {result.correct ? t('circleOfFifths.quiz.correct') : t('chordsByEar.singRoot.heardInstead', { note: result.detectedName })}
          </span>
          <button type="button" className="circle-quiz-next" onClick={next}>
            {t('circleOfFifths.quiz.next')}
          </button>
        </div>
      )}
    </div>
  );
}
