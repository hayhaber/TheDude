import { useState } from 'react';
import { DRILL_CATEGORIES, DIFFICULTIES, filterDrills } from '../../music/drills';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import './ExerciseDrawer.css';

// `variant='inline'` renders the exact same filters/list in normal document
// flow (no fixed positioning, no backdrop, no close button) for embedding
// directly inside a tab — e.g. PracticeView's Drills tab. `variant='drawer'`
// (default) keeps the original slide-in-over-everything behavior.
export function ExerciseDrawer({ open = true, onClose, onLoadExercise, variant = 'drawer' }) {
  const [category, setCategory] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const { t, lang } = useLanguage();

  if (variant === 'drawer' && !open) return null;

  const exercises = filterDrills({ category, difficulty });
  const isInline = variant === 'inline';

  return (
    <>
      {!isInline && <div className="exercise-drawer-backdrop" onClick={onClose} />}
      <div className={isInline ? 'exercise-drawer exercise-drawer-inline' : 'exercise-drawer'}>
        <div className="exercise-drawer-header">
          <h2 className="exercise-drawer-title">{t('exerciseDrawer.title')}</h2>
          {!isInline && (
            <button type="button" className="exercise-drawer-close" onClick={onClose} aria-label={t('exerciseDrawer.close')}>
              ×
            </button>
          )}
        </div>

        <div className="exercise-drawer-filters">
          {/* Each has more than 3 options (All + 4 categories, Any + 3
              difficulties), so per the app's control-pattern rule these are
              dropdowns, not toggles/segmented controls (reserved for ≤3
              choices) — same filterDrills() state, just a <select> instead
              of a button group. */}
          <label className="exercise-drawer-field">
            {t('exerciseDrawer.categoryLabel')}
            <select value={category ?? ''} onChange={(e) => setCategory(e.target.value || null)}>
              <option value="">{t('exerciseDrawer.all')}</option>
              {DRILL_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {localize(c.label, lang)}
                </option>
              ))}
            </select>
          </label>

          <label className="exercise-drawer-field">
            {t('exerciseDrawer.difficultyLabel')}
            <select value={difficulty ?? ''} onChange={(e) => setDifficulty(e.target.value || null)}>
              <option value="">{t('exerciseDrawer.any')}</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {t(`difficulty.${d}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="exercise-drawer-list">
          {exercises.length === 0 && <p className="exercise-drawer-empty">{t('exerciseDrawer.empty')}</p>}
          {exercises.map((ex) => (
            <div key={ex.id} className="exercise-card">
              <div className="exercise-card-header">
                <h3 className="exercise-card-title" dir="auto">
                  {localize(ex.title, lang)}
                </h3>
                <span className="exercise-card-difficulty">{t(`difficulty.${ex.difficulty}`)}</span>
              </div>
              <p className="exercise-card-source">{ex.source}</p>
              <p className="exercise-card-description" dir="auto">
                {localize(ex.description, lang)}
              </p>
              <div className="exercise-card-footer">
                <span className="exercise-card-bpm">{t('exerciseDrawer.bpm', { bpm: ex.bpmSuggested })}</span>
                <button
                  type="button"
                  className="play-button"
                  onClick={() => {
                    onLoadExercise(ex);
                    onClose?.();
                  }}
                >
                  {t('exerciseDrawer.load')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
