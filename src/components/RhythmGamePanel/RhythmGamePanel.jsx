import { ExerciseDrawer } from '../ExerciseDrawer/ExerciseDrawer';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import { PlayAlong } from '../PlayAlong/PlayAlong';
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

  const { exercise } = rhythmGame;

  return (
    <div className="rhythm-game-panel">
      <div className="rhythm-game-header">
        <div>
          <h2 className="rhythm-game-title" dir="auto">
            {localize(exercise.title, lang)}
          </h2>
        </div>
        <button type="button" className="rhythm-game-exit" onClick={rhythmGame.exit}>
          {t('rhythmGame.pickAnother')}
        </button>
      </div>

      <PlayAlong game={rhythmGame} metronome={metronome} />

      <p className="rhythm-game-hint" dir="auto">
        {t('rhythmGame.hint')}
      </p>
    </div>
  );
}
