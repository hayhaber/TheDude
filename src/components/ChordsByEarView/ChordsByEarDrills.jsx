import { useEffect, useRef, useState } from 'react';
import {
  generateQualityQuestion,
  generateFunctionalQuestion,
  generateProgressionQuestion,
  generateChangeQuestion,
  generateBassMotionQuestion,
  voicingForRootQuality,
} from '../../music/chordsByEar';
import {
  playChordVoicing,
  playFunctionalQuestionAudio,
  playProgression,
  playChangeDemo,
  playBassMotionDemo,
  playComparisonPair,
} from '../../audio/chordsByEarPlayer';
import { QUALITY_LABELS } from '../../music/harmonyCurriculum';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';

// Shared choice-row + feedback UI, reusing CircleOfFifthsQuiz.css's
// .circle-quiz-* classes (see ChordsByEarView.css's own comment on why) —
// every drill in this file renders the same shape: options -> pick one ->
// correct/incorrect highlight -> a Next button once answered. Exported for
// MixedReviewDrill.jsx, which reuses this same building block across every
// question kind rather than re-implementing choice rendering a 6th time.
export function QuizChoices({ choices, renderLabel, answered, correctChoiceKey, onChoose }) {
  const { t } = useLanguage();
  return (
    <>
      <div className="circle-quiz-options">
        {choices.map((c) => (
          <button
            key={c.key}
            type="button"
            className={
              'circle-quiz-choice' +
              (answered && c.key === correctChoiceKey ? ' correct' : '') +
              (answered && answered.choice === c.key && !answered.correct ? ' incorrect' : '')
            }
            onClick={() => onChoose(c.key)}
            disabled={!!answered}
          >
            {renderLabel(c)}
          </button>
        ))}
      </div>
      {answered && (
        <div className="circle-quiz-feedback">
          <span className={answered.correct ? 'circle-quiz-result correct' : 'circle-quiz-result incorrect'}>
            {answered.correct ? t('circleOfFifths.quiz.correct') : t('circleOfFifths.quiz.incorrect')}
          </span>
          <button type="button" className="circle-quiz-next" onClick={answered.next}>
            {t('circleOfFifths.quiz.next')}
          </button>
        </div>
      )}
    </>
  );
}

// Chord quality by ear — no root is ever shown, since quality is a "color"
// judgment, not a pitch-matching one (see cbe-quiz-quality's lesson text).
// `onPreviewChord` (all 5 drills below take it) pushes the chord currently
// sounding onto the shared Fretboard, so every drill — not just the
// teaching demos — is also "shown on the fretboard," per explicit request.
export function QualityDrill({ progress, lessonId, onPreviewChord }) {
  const { t, lang } = useLanguage();
  const [tier, setTier] = useState('full');
  const [question, setQuestion] = useState(() => generateQualityQuestion('full'));
  const [answered, setAnswered] = useState(null);

  function fresh(nextTier = tier) {
    const q = generateQualityQuestion(nextTier);
    setQuestion(q);
    setAnswered(null);
    playChordVoicing(q.notesToPlay);
    onPreviewChord?.(q.chordText);
    return q;
  }

  useEffect(() => {
    fresh(tier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  useEffect(() => () => onPreviewChord?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(key) {
    if (answered) return;
    const correct = key === question.correctChoiceKey;
    progress?.recordQuizResult(lessonId, correct);
    setAnswered({ choice: key, correct, next: () => fresh() });
  }

  return (
    <div className="cbe-drill">
      <div className="mode-toggle" role="group" aria-label={t('chordsByEar.tier')}>
        <button type="button" className={tier === 'foundation' ? 'active' : ''} onClick={() => setTier('foundation')}>
          {t('chordsByEar.tier.foundation')}
        </button>
        <button type="button" className={tier === 'full' ? 'active' : ''} onClick={() => setTier('full')}>
          {t('chordsByEar.tier.full')}
        </button>
      </div>
      <button
        type="button"
        className="play-button"
        onClick={() => {
          playChordVoicing(question.notesToPlay);
          onPreviewChord?.(question.chordText);
        }}
      >
        {t('chordsByEar.play')}
      </button>
      {answered && !answered.correct && (
        <button
          type="button"
          className="play-button"
          onClick={() =>
            playComparisonPair({
              voicingA: voicingForRootQuality(question.rootPitchClass, answered.choice),
              voicingB: question.notesToPlay,
            })
          }
        >
          {t('chordsByEar.compare')}
        </button>
      )}
      <QuizChoices
        choices={question.choices}
        renderLabel={(c) => localize(QUALITY_LABELS[c.qualityKey], lang)}
        answered={answered}
        correctChoiceKey={question.correctChoiceKey}
        onChoose={choose}
      />
    </div>
  );
}

// Functional hearing — reference tone + I chord establish "home," then the
// target chord plays; the answer is always relative (a scale degree/roman
// numeral), never an absolute note name. `allowedDegrees` restricts the
// pool (I/IV/V only for the "basic" lesson, all 7 for "full").
export function FunctionalDrill({ progress, lessonId, allowedDegrees, onPreviewChord }) {
  const { t } = useLanguage();
  const [question, setQuestion] = useState(() => generateFunctionalQuestion(allowedDegrees));
  const [answered, setAnswered] = useState(null);

  function play(q) {
    playFunctionalQuestionAudio(q);
    // Previews the reference (I) chord first, then the actual target once
    // its own note has had time to start — same 1600ms offset
    // playFunctionalQuestionAudio itself uses for the target's audio.
    onPreviewChord?.(q.referenceChordText);
    setTimeout(() => onPreviewChord?.(q.targetChordText), 1600);
  }

  function fresh() {
    const q = generateFunctionalQuestion(allowedDegrees);
    setQuestion(q);
    setAnswered(null);
    play(q);
    return q;
  }

  useEffect(() => {
    play(question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => onPreviewChord?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(key) {
    if (answered) return;
    const correct = key === question.correctChoiceKey;
    progress?.recordQuizResult(lessonId, correct);
    setAnswered({ choice: key, correct, next: () => fresh() });
  }

  return (
    <div className="cbe-drill">
      <p className="cbe-drill-key" dir="ltr">
        {t('chordsByEar.keyIs', { key: question.keyName })}
      </p>
      <button type="button" className="play-button" onClick={() => play(question)}>
        {t('chordsByEar.play')}
      </button>
      <QuizChoices
        choices={question.choices}
        renderLabel={(c) => c.roman}
        answered={answered}
        correctChoiceKey={question.correctChoiceKey}
        onChoose={choose}
      />
    </div>
  );
}

// Progression-pattern recognition — a whole common progression plays,
// transposed to a random key, and the answer is which of the 6 shapes it is.
export function ProgressionDrill({ progress, lessonId, onPreviewChord }) {
  const { t, lang } = useLanguage();
  const [question, setQuestion] = useState(() => generateProgressionQuestion());
  const [answered, setAnswered] = useState(null);
  const cancelRef = useRef(null);

  function play(q = question) {
    cancelRef.current?.();
    cancelRef.current = playProgression(q.chordVoicings, { bpm: 96, onStepChange: (i) => onPreviewChord?.(q.chords[i].chordText) });
  }

  function fresh() {
    const q = generateProgressionQuestion();
    setQuestion(q);
    setAnswered(null);
    play(q);
    return q;
  }

  useEffect(() => {
    play(question);
    return () => cancelRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => onPreviewChord?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(key) {
    if (answered) return;
    const correct = key === question.correctChoiceKey;
    progress?.recordQuizResult(lessonId, correct);
    setAnswered({ choice: key, correct, next: () => fresh() });
  }

  return (
    <div className="cbe-drill">
      <p className="cbe-drill-key" dir="ltr">
        {t('chordsByEar.keyIs', { key: question.keyName })}
      </p>
      <button type="button" className="play-button" onClick={() => play()}>
        {t('chordsByEar.play')}
      </button>
      <QuizChoices
        choices={question.choices}
        renderLabel={(c) => localize(c.name, lang)}
        answered={answered}
        correctChoiceKey={question.correctChoiceKey}
        onChoose={choose}
      />
      {answered && (
        <p className="cbe-hint" dir="ltr">
          {question.chords.map((c) => c.roman).join(' – ')}
        </p>
      )}
    </div>
  );
}

// Chord-change detection — chord A holds, then switches to chord B; the
// task is counting how many beats passed before the change, not naming
// either chord (see chordsByEar.js's generateChangeQuestion for why this is
// scored as a beat-count rather than a live tap-timing capture).
export function ChangeDrill({ progress, lessonId, onPreviewChord }) {
  const { t } = useLanguage();
  const [question, setQuestion] = useState(() => generateChangeQuestion());
  const [answered, setAnswered] = useState(null);
  const cancelRef = useRef(null);

  function play(q = question) {
    cancelRef.current?.();
    cancelRef.current = playChangeDemo({
      voicingA: q.voicingA,
      voicingB: q.voicingB,
      beatsBeforeChange: q.beatsBeforeChange,
      bpm: q.bpm,
      onStepChange: (which) => onPreviewChord?.(which === 'A' ? q.chordA.chordText : q.chordB.chordText),
    });
  }

  function fresh() {
    const q = generateChangeQuestion();
    setQuestion(q);
    setAnswered(null);
    play(q);
    return q;
  }

  useEffect(() => {
    play(question);
    return () => cancelRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => onPreviewChord?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(key) {
    if (answered) return;
    const correct = key === question.correctChoiceKey;
    progress?.recordQuizResult(lessonId, correct);
    setAnswered({ choice: key, correct, next: () => fresh() });
  }

  return (
    <div className="cbe-drill">
      <p className="cbe-hint">{t('chordsByEar.change.prompt')}</p>
      <button type="button" className="play-button" onClick={() => play()}>
        {t('chordsByEar.play')}
      </button>
      <QuizChoices
        choices={question.choices}
        renderLabel={(c) => c.beats}
        answered={answered}
        correctChoiceKey={question.correctChoiceKey}
        onChoose={choose}
      />
    </div>
  );
}

// Bass motion — chord A plays, then chord B; the task is only "did the
// bass go up or down," reinforcing the Strategy lesson's "try to hum the
// bass line" step as its own isolated skill.
export function BassMotionDrill({ progress, lessonId, onPreviewChord }) {
  const { t } = useLanguage();
  const [question, setQuestion] = useState(() => generateBassMotionQuestion());
  const [answered, setAnswered] = useState(null);
  const cancelRef = useRef(null);

  function play(q = question) {
    cancelRef.current?.();
    cancelRef.current = playBassMotionDemo({
      voicingA: q.voicingA,
      voicingB: q.voicingB,
      onStepChange: (which) => onPreviewChord?.(which === 'A' ? q.chordA.chordText : q.chordB.chordText),
    });
  }

  function fresh() {
    const q = generateBassMotionQuestion();
    setQuestion(q);
    setAnswered(null);
    play(q);
    return q;
  }

  useEffect(() => {
    play(question);
    return () => cancelRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => onPreviewChord?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(key) {
    if (answered) return;
    const correct = key === question.correctChoiceKey;
    progress?.recordQuizResult(lessonId, correct);
    setAnswered({ choice: key, correct, next: () => fresh() });
  }

  return (
    <div className="cbe-drill">
      <p className="cbe-hint">{t('chordsByEar.bassMotion.prompt')}</p>
      <button type="button" className="play-button" onClick={() => play()}>
        {t('chordsByEar.play')}
      </button>
      <QuizChoices
        choices={question.choices}
        renderLabel={(c) => t(`chordsByEar.bassMotion.${c.key}`)}
        answered={answered}
        correctChoiceKey={question.correctChoiceKey}
        onChoose={choose}
      />
    </div>
  );
}
