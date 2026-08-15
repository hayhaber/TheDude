import { useEffect, useRef, useState } from 'react';
import { generateSequenceQuestion, sequenceChordText, SEQUENCE_TIER_KEYS } from '../../music/chordsByEar';
import { playProgression } from '../../audio/chordsByEarPlayer';
import { parseChordSymbol, sanitizeChordInput } from '../../music/chordSymbolParser';
import { useLanguage } from '../../i18n/LanguageContext';

// Progression dictation — the "hear a sequence, write down every chord in
// it" drill this course was missing (every other quiz here tests ONE chord,
// a scale degree, or which of 6 NAMED shapes played; this is the first that
// asks for the actual sequence). Difficulty is 3 knobs turned together, same
// as any graded ear-training method: chord count, quality complexity, and
// how much the answer UI gives away — a 4-item dropdown (not a button row)
// per this app's own new-work UI convention for >2 options. Beginner/
// Intermediate/Advanced answer per chord slot via 4-option multiple choice
// ("American test" style, exactly one correct); Expert drops the safety net
// and asks for the whole sequence typed freeform, parsed through the exact
// same chord-symbol parser Compose's own progression field uses.
export function SequenceDrill({ progress, lessonId, onPreviewChord }) {
  const { t } = useLanguage();
  const [tierKey, setTierKey] = useState('beginner');
  const [question, setQuestion] = useState(() => generateSequenceQuestion('beginner'));
  const [slotAnswers, setSlotAnswers] = useState(() => new Array(question.chords.length).fill(null));
  const [freeText, setFreeText] = useState('');
  const [result, setResult] = useState(null);
  const cancelRef = useRef(null);

  function play(q = question) {
    cancelRef.current?.();
    cancelRef.current = playProgression(q.chordVoicings, {
      bpm: q.bpm,
      onStepChange: (i) => onPreviewChord?.(q.chords[i].chordText),
    });
  }

  function fresh(nextTier = tierKey) {
    const q = generateSequenceQuestion(nextTier);
    setQuestion(q);
    setSlotAnswers(new Array(q.chords.length).fill(null));
    setFreeText('');
    setResult(null);
    play(q);
    return q;
  }

  useEffect(() => {
    fresh(tierKey);
    return () => cancelRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierKey]);

  useEffect(() => () => onPreviewChord?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  function chooseSlot(slotIndex, optionKey) {
    if (result) return;
    setSlotAnswers((prev) => {
      const next = [...prev];
      next[slotIndex] = optionKey;
      return next;
    });
  }

  function grade(perChordCorrect) {
    const score = perChordCorrect.filter(Boolean).length;
    setResult({ perChordCorrect, score, total: question.chords.length });
    progress?.recordQuizResult(lessonId, score === question.chords.length);
  }

  function submitChoice() {
    if (slotAnswers.some((a) => a === null)) return;
    grade(question.slotChoices.map((sc, i) => slotAnswers[i] === sc.correctKey));
  }

  function submitFreeText() {
    const tokens = freeText.trim().split(/\s+/).filter(Boolean);
    grade(
      question.chords.map((c, i) => {
        const parsed = tokens[i] ? parseChordSymbol(tokens[i]) : null;
        return !!parsed && parsed.root.pitchClass === c.rootPitchClass && parsed.qualityKey === c.qualityKey;
      })
    );
  }

  return (
    <div className="cbe-drill">
      <label className="cbe-field">
        {t('chordsByEar.tier')}
        <select value={tierKey} onChange={(e) => setTierKey(e.target.value)} disabled={!result && slotAnswers.some((a) => a !== null)}>
          {SEQUENCE_TIER_KEYS.map((k) => (
            <option key={k} value={k}>
              {t(`chordsByEar.sequence.tier.${k}`)}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="play-button" onClick={() => play()}>
        {t('chordsByEar.play')}
      </button>

      {question.inputMode === 'choice' && (
        <div className="cbe-sequence-slots">
          {question.slotChoices.map((sc, slotIndex) => (
            <div key={slotIndex} className="cbe-sequence-slot">
              <p className="cbe-sequence-slot-label">{t('chordsByEar.sequence.chordN', { n: slotIndex + 1 })}</p>
              <div className="cbe-sequence-slot-options">
                {sc.options.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={
                      'circle-quiz-choice' +
                      (result && opt.key === sc.correctKey ? ' correct' : '') +
                      (result && slotAnswers[slotIndex] === opt.key && opt.key !== sc.correctKey ? ' incorrect' : '') +
                      (!result && slotAnswers[slotIndex] === opt.key ? ' selected' : '')
                    }
                    onClick={() => chooseSlot(slotIndex, opt.key)}
                    disabled={!!result}
                  >
                    {sequenceChordText(opt.rootPitchClass, opt.qualityKey)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {question.inputMode === 'freeText' && (
        <div className="cbe-sequence-freetext">
          <p className="cbe-hint" dir="auto">
            {t('chordsByEar.sequence.freeTextHint')}
          </p>
          <input
            type="text"
            className="cbe-sequence-input"
            dir="ltr"
            value={freeText}
            onChange={(e) => setFreeText(sanitizeChordInput(e.target.value))}
            disabled={!!result}
            placeholder={t('chordsByEar.sequence.placeholder')}
          />
          {result && (
            <div className="cbe-sequence-slots">
              {question.chords.map((c, i) => (
                <span key={i} className={'cbe-sequence-chip' + (result.perChordCorrect[i] ? ' correct' : ' incorrect')}>
                  {c.chordText}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {!result && (
        <button
          type="button"
          className="play-button cbe-sequence-submit"
          onClick={question.inputMode === 'choice' ? submitChoice : submitFreeText}
          disabled={question.inputMode === 'choice' ? slotAnswers.some((a) => a === null) : !freeText.trim()}
        >
          {t('chordsByEar.sequence.check')}
        </button>
      )}

      {result && (
        <div className="circle-quiz-feedback">
          <span className={result.score === result.total ? 'circle-quiz-result correct' : 'circle-quiz-result incorrect'}>
            {t('chordsByEar.sequence.score', { score: result.score, total: result.total })}
          </span>
          <button type="button" className="circle-quiz-next" onClick={() => fresh()}>
            {t('circleOfFifths.quiz.next')}
          </button>
        </div>
      )}
    </div>
  );
}
