import { useLanguage } from '../../i18n/LanguageContext';
import { TrainingIcon } from '../TrainingIcon/TrainingIcon';
import './TrainingHandoff.css';

// Compose -> Practice handoff: lets the player send the progression they
// just built (with every chord's own fretboard position, chord/triad mode,
// and Smooth setting) into "Chord Changes" to practice switching between
// exactly those shapes, rather than a random/typed one. Building one group
// at a time by re-using the SAME progression editor already on screen
// (banked via "+", editor cleared for the next one) rather than a second
// parallel editor per group — see App.jsx's buildCurrentTrainingGroup.
export function TrainingHandoff({ training, hasProgression }) {
  const { t } = useLanguage();
  const { groups, flowOpen, onOpen, onAddCurrent, onRemoveGroup, onSend, onCancel } = training;

  if (!flowOpen) {
    return (
      <div className="training-handoff">
        <button type="button" className="training-handoff-open" onClick={onOpen} disabled={!hasProgression}>
          <TrainingIcon /> {t('compose.training')}
        </button>
      </div>
    );
  }

  const canFinish = hasProgression || groups.length > 0;

  return (
    <div className="training-handoff">
      <div className="training-handoff-panel">
        <div className="training-handoff-header">
          <span>{t('compose.trainingPanelTitle')}</span>
          <button type="button" className="training-handoff-cancel" onClick={onCancel}>
            {t('compose.trainingCancel')}
          </button>
        </div>

        {groups.length > 0 && (
          <ul className="training-handoff-groups">
            {groups.map((group, i) => (
              <li key={group.id}>
                <span dir="ltr">
                  {t('compose.trainingGroupLabel', { n: i + 1 })}: {group.chordsText}
                </span>
                <button type="button" onClick={() => onRemoveGroup(group.id)} aria-label={t('compose.trainingRemoveGroup')}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="training-handoff-hint" dir="auto">
          {hasProgression ? t('compose.trainingHint') : t('compose.trainingHintTypeNext')}
        </p>

        <div className="training-handoff-actions">
          <button type="button" onClick={onAddCurrent} disabled={!hasProgression}>
            + {t('compose.trainingAddGroup')}
          </button>
          <button type="button" className="training-handoff-send" onClick={onSend} disabled={!canFinish}>
            ▶ {t('compose.trainingSend')}
          </button>
        </div>
      </div>
    </div>
  );
}
