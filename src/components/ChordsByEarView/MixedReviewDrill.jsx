import { useEffect, useRef, useState } from 'react';
import {
  generateQualityQuestion,
  generateFunctionalQuestion,
  generateProgressionQuestion,
  generateChangeQuestion,
  generateBassMotionQuestion,
} from '../../music/chordsByEar';
import { playChordVoicing, playFunctionalQuestionAudio, playProgression, playChangeDemo, playBassMotionDemo } from '../../audio/chordsByEarPlayer';
import { QuizChoices } from './ChordsByEarDrills';
import { QUALITY_LABELS } from '../../music/harmonyCurriculum';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';

// A real song mixes all of these at once — you don't get told in advance
// "the next question is about quality." This capstone before the
// Real-Song-Practice lesson randomly serves one of the previous 5 graded
// drills each round (reusing their own question generators + this course's
// shared QuizChoices UI, not a 6th separate implementation), the same
// "integrated cumulative review before applying it for real" structure a
// structured course/method book always ends its foundational section with.
const TYPES = ['quality', 'functionBasic', 'functionFull', 'pattern', 'change', 'bassMotion'];

function generateFor(type) {
  if (type === 'quality') return generateQualityQuestion('full');
  if (type === 'functionBasic') return generateFunctionalQuestion([0, 3, 4]);
  if (type === 'functionFull') return generateFunctionalQuestion([0, 1, 2, 3, 4, 5, 6]);
  if (type === 'pattern') return generateProgressionQuestion();
  if (type === 'change') return generateChangeQuestion();
  return generateBassMotionQuestion();
}

// `onPreviewChord`, when given, pushes whichever chord is currently
// sounding onto the shared Fretboard — same wiring ChordsByEarDrills.jsx's
// 5 individual drills each already do, reused here per round-type rather
// than a 6th copy of the same sync logic.
function playFor(type, q, onPreviewChord) {
  if (type === 'quality') {
    playChordVoicing(q.notesToPlay);
    onPreviewChord?.(q.chordText);
    return null;
  }
  if (type === 'functionBasic' || type === 'functionFull') {
    onPreviewChord?.(q.referenceChordText);
    setTimeout(() => onPreviewChord?.(q.targetChordText), 1600);
    return playFunctionalQuestionAudio(q);
  }
  if (type === 'pattern') {
    return playProgression(q.chordVoicings, { bpm: 96, onStepChange: (i) => onPreviewChord?.(q.chords[i].chordText) });
  }
  if (type === 'change') {
    return playChangeDemo({
      voicingA: q.voicingA,
      voicingB: q.voicingB,
      beatsBeforeChange: q.beatsBeforeChange,
      bpm: q.bpm,
      onStepChange: (which) => onPreviewChord?.(which === 'A' ? q.chordA.chordText : q.chordB.chordText),
    });
  }
  return playBassMotionDemo({
    voicingA: q.voicingA,
    voicingB: q.voicingB,
    onStepChange: (which) => onPreviewChord?.(which === 'A' ? q.chordA.chordText : q.chordB.chordText),
  });
}

export function MixedReviewDrill({ progress, lessonId, onPreviewChord }) {
  const { t, lang } = useLanguage();
  const [round, setRound] = useState(() => {
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    return { type, question: generateFor(type) };
  });
  const [answered, setAnswered] = useState(null);
  const cancelRef = useRef(null);

  function play(r = round) {
    cancelRef.current?.();
    cancelRef.current = playFor(r.type, r.question, onPreviewChord);
  }

  function fresh() {
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const r = { type, question: generateFor(type) };
    setRound(r);
    setAnswered(null);
    play(r);
    return r;
  }

  useEffect(() => {
    play(round);
    return () => cancelRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => onPreviewChord?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(key) {
    if (answered) return;
    const correct = key === round.question.correctChoiceKey;
    progress?.recordQuizResult(lessonId, correct);
    setAnswered({ choice: key, correct, next: () => fresh() });
  }

  function renderLabel(c) {
    if (round.type === 'quality') return localize(QUALITY_LABELS[c.qualityKey], lang);
    if (round.type === 'functionBasic' || round.type === 'functionFull') return c.roman;
    if (round.type === 'pattern') return localize(c.name, lang);
    if (round.type === 'change') return c.beats;
    return t(`chordsByEar.bassMotion.${c.key}`);
  }

  return (
    <div className="cbe-drill">
      <p className="cbe-hint" dir="auto">
        {t(`chordsByEar.mixed.typeLabel.${round.type}`)}
      </p>
      {(round.type === 'functionBasic' || round.type === 'functionFull' || round.type === 'pattern') && (
        <p className="cbe-drill-key" dir="ltr">
          {t('chordsByEar.keyIs', { key: round.question.keyName })}
        </p>
      )}
      <button type="button" className="play-button" onClick={() => play()}>
        {t('chordsByEar.play')}
      </button>
      <QuizChoices
        choices={round.question.choices}
        renderLabel={renderLabel}
        answered={answered}
        correctChoiceKey={round.question.correctChoiceKey}
        onChoose={choose}
      />
    </div>
  );
}
