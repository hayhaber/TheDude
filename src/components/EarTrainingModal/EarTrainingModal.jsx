import { useLanguage } from '../../i18n/LanguageContext';
import { useInstrument } from '../../instruments/useInstrument';
import { Fretboard } from '../Fretboard/Fretboard';
import { PianoKeyboard } from '../PianoKeyboard/PianoKeyboard';
import { EarTrainingMicAnswer } from './EarTrainingMicAnswer';
import './EarTrainingModal.css';

// question.prompt/choices[].label come from music/earTraining.js as fixed
// English strings (also used internally there for nothing beyond display),
// so they're not read directly here — this reconstructs the same text from
// translated pieces instead, keeping the engine itself untouched.
function promptFor(t, question) {
  if (question.kind === 'pitch') return t('earTraining.prompt.pitch');
  if (question.kind === 'chord') return t(question.needsRoot ? 'earTraining.prompt.chordRootQuality' : 'earTraining.prompt.chord');
  if (question.kind === 'interval') return t('earTraining.prompt.interval');
  if (question.kind === 'callresponse') return t('earTraining.prompt.callresponse', { length: question.targetMidiSequence.length });
  if (question.kind === 'triad') return t('earTraining.prompt.triad');
  if (question.kind === 'scaleid') return t('earTraining.prompt.scaleid');
  return question.prompt;
}

function choiceLabel(t, question, choice) {
  if (question.kind === 'triad' || question.kind === 'chord') {
    const qualityText = t(`quality.${choice.label}`);
    // rootLetter only present on the intermediate tier's combo choices (e.g.
    // "C Major") — note letters are shown as plain, untranslated letters
    // everywhere else in the app too, so only the quality half is translated.
    return choice.rootLetter ? `${choice.rootLetter} ${qualityText}` : qualityText;
  }
  if (question.kind === 'interval') return t(`interval.${choice.label}`);
  if (question.kind === 'scaleid') return t(choice.labelKey);
  return choice.label;
}

// Owns the quiz UI (mode/difficulty pills, scoreboard, prompt, choices) but
// not the neck itself — the quiz's cells/reveal markers/feedback come from
// useEarTraining and are rendered by the one shared Stage Fretboard (see
// App.jsx's stageFretboardProps resolver), the same neck every other
// section uses. "Exit Quiz" just calls onClose.
// `variant='inline'` embeds the same quiz UI directly in a tab (PracticeView)
// instead of as a fixed modal over everything. A quiz still needs an
// explicit "Start Quiz" tap either way — that's the user gesture that
// unlocks the AudioContext for the very first sound, so it can't be
// skipped/auto-started even inline.
export function EarTrainingModal({ earTraining, onClose, variant = 'modal' }) {
  const isInline = variant === 'inline';
  const { t } = useLanguage();
  const { instrument } = useInstrument();

  if (!earTraining.open) {
    if (!isInline) return null;
    return (
      <div className="ear-training-start-card">
        <p className="ear-training-start-copy" dir="auto">
          {t('earTraining.startCopy')}
        </p>
        <button type="button" className="play-button" onClick={earTraining.start}>
          {t('earTraining.startQuiz')}
        </button>
      </div>
    );
  }

  const {
    modeKey,
    setModeKey,
    modes,
    difficultyKey,
    setDifficultyKey,
    difficulties,
    question,
    progress,
    feedback,
    answeredChoiceKey,
    score,
    accuracyPct,
    incorrectCount,
    streak,
    bestStreak,
    practiceMode,
    setPracticeMode,
    practiceModes,
    timeRemaining,
    isTimedOver,
    answered,
    autoAdvancePaused,
    next,
    replay,
    handleChoice,
    skip,
    isFretQuestion,
    quizCells,
    quizRevealCells,
    quizPianoKeys,
    quizRevealPianoKeys,
    handleFretClick,
    handlePianoKeyClick,
  } = earTraining;

  const isChoiceQuestion = !!question?.choices;
  const isTimed = practiceMode === 'timed';
  const isChordQuiz = question?.kind === 'chord';
  // Chord Recognition gets the exact same self-flowing treatment as the
  // fret quiz (see useEarTraining's AUTO_ADVANCE_QUESTION_KINDS) — this is
  // the one flag both the Next-button logic below and the inline-instrument
  // choice share.
  const isAutoFlowQuestion = isFretQuestion || isChordQuiz;

  // For pitch / call-&-response / chord questions, the instrument is
  // rendered right here in the card (App.jsx drops the pinned Stage
  // instrument while one of these is active — see `earTrainingOwnsInstrument`
  // there) instead of being pinned far away at the bottom, disconnected from
  // the prompt. For fret questions it's also the answer input; for chord
  // questions it's just where the revealed voicing appears once answered.
  const showInlineInstrument = isAutoFlowQuestion && !!question;
  // Chord Recognition names the actual chord (e.g. "Bb") above the neck,
  // positioned over its shape, styled like every other chord-name label
  // this app already draws there (Fretboard's roadmap-chord-label — see
  // Fretboard.jsx's own comment on quizChordLabel) — shown only once
  // answered, same timing as the revealed voicing itself.
  const quizChordLabel =
    isChordQuiz && answeredChoiceKey && question.chordText
      ? { text: question.chordText, fret: question.chordBaseFret ?? 0 }
      : null;
  const inlineInstrument = !showInlineInstrument ? null : instrument === 'piano' ? (
    <div className="ear-training-instrument">
      <PianoKeyboard
        notes={[]}
        quizKeys={quizPianoKeys}
        quizRevealKeys={quizRevealPianoKeys}
        quizFeedbackKey={
          feedback?.cell?.midi != null ? { midi: feedback.cell.midi, correct: feedback.correct } : null
        }
        onQuizKeyClick={handlePianoKeyClick}
      />
    </div>
  ) : (
    <div className="ear-training-instrument">
      <Fretboard
        position={null}
        quizCells={quizCells}
        quizRevealCells={quizRevealCells}
        quizFeedbackCell={feedback?.cell ? feedback : null}
        quizChordLabel={quizChordLabel}
        onQuizCellClick={handleFretClick}
      />
    </div>
  );

  if (isTimed && isTimedOver) {
    return (
      <div className={isInline ? 'ear-training-modal ear-training-modal-inline' : 'ear-training-modal'} onClick={(e) => e.stopPropagation()}>
        <div className="ear-training-header">
          <h2 className="ear-training-title">{t('earTraining.title')}</h2>
          <button type="button" className="ear-training-exit" onClick={onClose}>
            {t('earTraining.exit')}
          </button>
        </div>
        <div className="ear-training-summary">
          <h3>{t('earTraining.timedSummary.title')}</h3>
          <div className="ear-training-summary-stats">
            <span>
              {t('earTraining.timedSummary.correct')} <strong>{score.correct}</strong>
            </span>
            <span>
              {t('earTraining.timedSummary.attempts')} <strong>{score.total}</strong>
            </span>
            <span>
              {t('earTraining.timedSummary.accuracy')} <strong>{accuracyPct === null ? '—' : `${accuracyPct}%`}</strong>
            </span>
          </div>
          <button type="button" className="play-button" onClick={earTraining.start}>
            {t('vocal.again')}
          </button>
        </div>
      </div>
    );
  }

  const content = (
    <div className={isInline ? 'ear-training-modal ear-training-modal-inline' : 'ear-training-modal'} onClick={(e) => e.stopPropagation()}>
        <div className="ear-training-header">
          <h2 className="ear-training-title">{t('earTraining.title')}</h2>
          <button type="button" className="ear-training-exit" onClick={onClose}>
            {t('earTraining.exit')}
          </button>
        </div>

        <div className="ear-training-controls">
          {/* 4 modes — over the 3-option limit for a toggle, so this is a
              dropdown instead (same setModeKey state as before). */}
          <label className="ear-training-mode-field">
            {t('earTraining.modeLabel')}
            <select value={modeKey} onChange={(e) => setModeKey(e.target.value)}>
              {modes.map((m) => (
                <option key={m.key} value={m.key}>
                  {t(m.labelKey)}
                </option>
              ))}
            </select>
          </label>
          {/* Was a 3-button toggle — every other Practice difficulty filter
              (Drills' ExerciseDrawer included) is a dropdown, so this was the
              one inconsistent case. */}
          <label className="ear-training-mode-field">
            {t('earTraining.difficultyLabel')}
            <select value={difficultyKey} onChange={(e) => setDifficultyKey(e.target.value)}>
              {difficulties.map((d) => (
                <option key={d.key} value={d.key}>
                  {t(`difficulty.${d.label}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="mode-toggle" role="group" aria-label={t('earTraining.practiceModeLabel')}>
            {practiceModes.map((m) => (
              <button
                key={m.key}
                type="button"
                className={practiceMode === m.key ? 'active' : ''}
                onClick={() => setPracticeMode(m.key)}
              >
                {t(m.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="ear-training-scoreboard">
          <span>
            {t('earTraining.correct')} <strong>{score.correct}</strong>
          </span>
          <span>
            {t('earTraining.incorrect')} <strong>{incorrectCount}</strong>
          </span>
          <span>
            {t('earTraining.streak')} <strong>{streak}</strong>
          </span>
          <span>
            {t('earTraining.accuracy')} <strong>{accuracyPct === null ? '—' : `${accuracyPct}%`}</strong>
          </span>
          <span>
            {t('earTraining.bestStreak')} <strong>{bestStreak}</strong>
          </span>
        </div>

        {question && (
          <>
            <p className={'ear-training-prompt' + (feedback ? feedback.correct ? ' correct' : ' incorrect' : '')} dir="auto">
              {promptFor(t, question)}
            </p>

            {/* Names the actual answer in text once answered — previously
                the only confirmation was which choice button turned green,
                with no written "that was: X" anywhere despite the fretboard
                already revealing the notes. Triad questions also get their
                inversion here, its genuinely useful place (after the
                quality is known) rather than leaked in the prompt before
                anything is visible to correlate it against. */}
            {isChoiceQuestion && answeredChoiceKey && (
              <p className="ear-training-reveal" dir="auto">
                {t('earTraining.reveal', {
                  answer: choiceLabel(t, question, question.choices.find((c) => c.key === question.correctChoiceKey)),
                })}
                {question.kind === 'triad' && ` (${t(`earTraining.inversion.${question.inversionLabel}`)})`}
              </p>
            )}

            {inlineInstrument}

            <div className="ear-training-actions">
              <button type="button" className="play-button" onClick={replay}>
                {t('earTraining.replay')}
              </button>
              {question.kind === 'callresponse' && progress.length > 0 && (
                <span className="ear-training-progress-label">
                  {t('earTraining.progressLabel', { done: progress.length, total: question.targetMidiSequence.length })}
                </span>
              )}
              <div className="ear-training-trailing">
                {/* Fret/chord questions flow on their own (a tap on the neck
                    jumps ahead for fret questions). Pressing "Play again"
                    after answering pauses that and brings back a Next
                    button so you can re-listen/study as long as you want. */}
                {answered && ((isAutoFlowQuestion && autoAdvancePaused) || (!isTimed && !isAutoFlowQuestion)) && (
                  <button type="button" className="ear-training-next" onClick={next}>
                    {t('earTraining.next')}
                  </button>
                )}
                {!answered && (
                  <button type="button" className="ear-training-skip" onClick={skip}>
                    {t('earTraining.skip')}
                  </button>
                )}
              </div>
            </div>

            {/* Directly below Skip/Next, matching its right edge — a
                separate line, not sharing the actions row. */}
            {isTimed && (
              <div className={'ear-training-timer-inline' + (timeRemaining <= 10 ? ' danger' : '')} dir="auto">
                {t('earTraining.timeLeft')} {timeRemaining}
              </div>
            )}

            {/* Answering by playing the note on a real guitar is a
                secondary path — tucked into a collapsed disclosure so it
                doesn't crowd out the neck (which is the primary way to
                answer) or push it down the page. */}
            {!isChoiceQuestion && (
              <details className="ear-training-mic-disclosure">
                <summary>{t('earTraining.mic.label')}</summary>
                <EarTrainingMicAnswer earTraining={earTraining} />
              </details>
            )}

            {isChoiceQuestion && (
              <div className="ear-training-choices">
                {question.choices.map((c) => {
                  const isAnswered = !!answeredChoiceKey;
                  const isCorrectChoice = c.key === question.correctChoiceKey;
                  const isPickedChoice = c.key === answeredChoiceKey;
                  const cls =
                    isAnswered && isCorrectChoice
                      ? 'correct'
                      : isAnswered && isPickedChoice
                        ? 'incorrect'
                        : '';
                  return (
                    <button
                      key={c.key}
                      type="button"
                      className={`ear-training-choice ${cls}`.trim()}
                      onClick={() => handleChoice(c.key)}
                      disabled={isAnswered && !isTimed}
                    >
                      {choiceLabel(t, question, c)}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
    </div>
  );

  if (isInline) return content;

  return (
    <div className="ear-training-backdrop" onClick={onClose}>
      {content}
    </div>
  );
}
