import { useLanguage } from '../../i18n/LanguageContext';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
// Reuses EarTrainingModal's scoreboard/prompt/choices/exit-button styles
// directly (same pattern DisplayOptionsMenu.jsx already uses for
// SettingsPanel.css) — this is the exact same visual language (a choice-
// based ear-recognition quiz), not a coincidental lookalike worth
// duplicating.
import '../EarTrainingModal/EarTrainingModal.css';
import './PianoPracticePanel.css';
import { Select } from '../ui/Select';
import { Button, PlayGlyph } from '../ui/controls';

function choiceLabel(t, question, choice) {
  if (question.kind === 'inversionDrill') return t(choice.labelKey);
  return choice.label; // pentascale: a plain pitch-class letter, already uppercase
}

function promptFor(t, exercise, question) {
  if (exercise.key === 'pentascale') return t('pianoPractice.prompt.pentascale');
  if (exercise.key === 'inversionDrill') {
    return t('pianoPractice.prompt.inversionDrill', { root: question.rootLabel, quality: t(`quality.${question.qualityLabel}`) });
  }
  return '';
}

export function PianoPracticePanel({ pianoPractice }) {
  const { t } = useLanguage();
  const {
    open,
    start,
    exit,
    difficultyKey,
    difficulties,
    setDifficultyKey,
    exerciseKey,
    setExerciseKey,
    exercises,
    exercise,
    question,
    answeredChoiceKey,
    feedback,
    score,
    accuracyPct,
    streak,
    bestStreak,
    replay,
    heard,
    handleChoice,
    skip,
    next,
  } = pianoPractice;

  const exercisesInTier = exercises.filter((e) => e.difficultyKey === difficultyKey);

  if (!open) {
    return (
      <div className="piano-practice-start-card">
        <p className="piano-practice-start-copy" dir="auto">
          {t('pianoPractice.startCopy')}
        </p>
        <Button variant="filled" size="lg" icon={<PlayGlyph />} onClick={start}>
          {t('vocal.start')}
        </Button>
      </div>
    );
  }

  return (
    <div className="piano-practice-panel">
      <div className="piano-practice-controls">
        <label className="ear-training-mode-field">
          {t('pianoPractice.difficultyLabel')}
          <Select value={difficultyKey} onChange={(e) => setDifficultyKey(e.target.value)}>
            {difficulties.map((d) => (
              <option key={d.key} value={d.key}>
                {t(`difficulty.${d.label}`)}
              </option>
            ))}
          </Select>
        </label>

        <label className="ear-training-mode-field">
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {t('pianoPractice.exerciseLabel')}
            <InfoTooltip text={t('tip.practice.pianoExercise')} />
          </span>
          <Select value={exerciseKey} onChange={(e) => setExerciseKey(e.target.value)}>
            {exercisesInTier.map((ex) => (
              <option key={ex.key} value={ex.key}>
                {t(ex.labelKey)}
                {!ex.available ? ` (${t('pianoPractice.comingSoon')})` : ''}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {!exercise.available && <p className="piano-practice-coming-soon">{t('pianoPractice.comingSoonBody')}</p>}

      {exercise.available && question && (
        <>
          <p className={'ear-training-prompt' + (feedback ? (feedback.correct ? ' correct' : ' incorrect') : '')} dir="auto">
            {promptFor(t, exercise, question)}
          </p>

          <div className="ear-training-actions">
            {/* Not heard yet = the one filled primary "Play"; then a quiet
                "Play again". Answered = Next is the primary. */}
            <Button variant={heard ? 'tinted' : 'filled'} icon={<PlayGlyph />} onClick={replay}>
              {heard ? t('earTraining.replay').replace(/^▶\s*/, '') : t('earTraining.play')}
            </Button>
            <div className="ear-training-trailing">
              {answeredChoiceKey ? (
                <Button variant="filled" className="ear-training-next" onClick={next}>
                  {t('earTraining.next')}
                </Button>
              ) : (
                <Button variant="plain" className="ear-training-skip" onClick={skip}>
                  {t('earTraining.skip')}
                </Button>
              )}
            </div>
          </div>

          <div className="ear-training-choices">
            {question.choices.map((c) => {
              const isAnswered = !!answeredChoiceKey;
              const isCorrectChoice = c.key === question.correctChoiceKey;
              const isPickedChoice = c.key === answeredChoiceKey;
              const cls = isAnswered && isCorrectChoice ? 'correct' : isAnswered && isPickedChoice ? 'incorrect' : '';
              return (
                <button
                  key={c.key}
                  type="button"
                  className={`ear-training-choice ${cls}`.trim()}
                  onClick={() => handleChoice(c.key)}
                  disabled={isAnswered}
                  dir={question.kind === 'inversionDrill' ? undefined : 'ltr'}
                >
                  {choiceLabel(t, question, c)}
                </button>
              );
            })}
          </div>
        </>
      )}
      {/* Score at the END and only once there is one — appearing never
          moves the question (v1.0.218, as in ear training). */}
      {(score.total > 0 || bestStreak > 0) && (
      <div className="ear-training-scoreboard">
        <span>
          {t('earTraining.streak')} <strong>{streak}</strong>
        </span>
        <span>
          {t('earTraining.accuracy')} <strong>{accuracyPct === null ? '—' : `${accuracyPct}%`}</strong>
          {score.total > 0 && (
            <span className="ear-training-score-detail">
              {' '}
              ({score.correct}/{score.total})
            </span>
          )}
        </span>
        <span>
          {t('earTraining.bestStreak')} <strong>{bestStreak}</strong>
        </span>
      </div>
      )}
    </div>
  );
}
