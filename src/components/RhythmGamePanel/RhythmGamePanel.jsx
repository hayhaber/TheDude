import { ExerciseDrawer } from '../ExerciseDrawer/ExerciseDrawer';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import './RhythmGamePanel.css';

// "Guitar Hero"-style rhythm practice — pick an exercise (same catalog
// Practice -> Drills already uses, via the same ExerciseDrawer component),
// then play its notes on a real guitar in time with the metronome. All
// game/timing logic lives in hooks/useRhythmGame.js; this component is just
// the picker + score/status chrome. The actual note highlighting and hit/
// miss flash render on the shared Stage Fretboard (App.jsx wires
// rhythmGame.stepIndex/feedbackCell into it the same way Practice Drills
// and Ear Training already feed their own state into that one neck).
export function RhythmGamePanel({ rhythmGame, metronome }) {
  const { t, lang } = useLanguage();

  if (!rhythmGame.exercise) {
    return (
      <div className="rhythm-game-panel">
        <p className="rhythm-game-intro" dir="auto">
          {t('rhythmGame.intro')}
        </p>
        <ExerciseDrawer variant="inline" onLoadExercise={(ex) => rhythmGame.loadExercise(ex)} />
      </div>
    );
  }

  const { exercise, stepIndex, isPlaying, ended, score, combo, maxCombo, accuracyPct, micIsListening, micError } = rhythmGame;
  const total = exercise.sequence.length;

  return (
    <div className="rhythm-game-panel">
      <div className="rhythm-game-header">
        <div>
          <h2 className="rhythm-game-title" dir="auto">
            {localize(exercise.title, lang)}
          </h2>
          <p className="rhythm-game-meta">
            {ended
              ? t('rhythmGame.sessionComplete')
              : t('rhythmGame.stepLabel', { index: Math.max(stepIndex + 1, isPlaying ? 1 : 0), total })}
            {' · '}
            {t('rhythmGame.bpm', { bpm: metronome.bpm })}
          </p>
        </div>
        <button type="button" className="rhythm-game-exit" onClick={rhythmGame.exit}>
          {t('rhythmGame.exit')}
        </button>
      </div>

      <div className="rhythm-game-scoreboard">
        <div className="rhythm-game-stat">
          <span className="rhythm-game-stat-value">{score.hits}</span>
          <span className="rhythm-game-stat-label">{t('rhythmGame.hits')}</span>
        </div>
        <div className="rhythm-game-stat">
          <span className="rhythm-game-stat-value">{score.misses}</span>
          <span className="rhythm-game-stat-label">{t('rhythmGame.misses')}</span>
        </div>
        <div className={'rhythm-game-stat' + (combo >= 5 ? ' hot' : '')}>
          <span className="rhythm-game-stat-value">{combo}</span>
          <span className="rhythm-game-stat-label">{t('rhythmGame.combo')}</span>
        </div>
        <div className="rhythm-game-stat">
          <span className="rhythm-game-stat-value">{accuracyPct === null ? '—' : `${accuracyPct}%`}</span>
          <span className="rhythm-game-stat-label">{t('rhythmGame.accuracy')}</span>
        </div>
      </div>

      {ended ? (
        <div className="rhythm-game-summary" dir="auto">
          <p className="rhythm-game-summary-line">
            {t('rhythmGame.finalScore', { hits: score.hits, total })}
          </p>
          <p className="rhythm-game-summary-line">{t('rhythmGame.bestCombo', { combo: maxCombo })}</p>
          <div className="rhythm-game-actions">
            <button type="button" className="play-button" onClick={rhythmGame.restart}>
              {t('rhythmGame.tryAgain')}
            </button>
            <button type="button" className="rhythm-game-exit" onClick={rhythmGame.exit}>
              {t('rhythmGame.pickAnother')}
            </button>
          </div>
        </div>
      ) : (
        <div className="rhythm-game-actions">
          <button
            type="button"
            className={'metronome-toggle' + (isPlaying ? ' running' : '')}
            onClick={() => (isPlaying ? rhythmGame.stop() : rhythmGame.play())}
          >
            {isPlaying ? t('rhythmGame.pause') : t('rhythmGame.play')}
          </button>
          {isPlaying && (
            <span className="rhythm-game-mic-status" dir="auto">
              {micError ? t('trainer.micError', { message: micError }) : micIsListening ? t('rhythmGame.listening') : t('earTraining.mic.permission')}
            </span>
          )}
        </div>
      )}

      <p className="rhythm-game-hint" dir="auto">
        {t('rhythmGame.hint')}
      </p>
    </div>
  );
}
