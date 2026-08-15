import { useEffect, useState } from 'react';
import { TECHNIQUE_MASTERS_ARTISTS, filterTechniqueMasters } from '../../music/techniqueMastersCurriculum';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import './TechniqueMastersView.css';

const STEP_DURATION_MS = 900;

// One exercise card, including its own Visualize/Play controls — a separate
// component (not inlined in the .map() below) because the animation timer
// effect needs to run per-exercise, and hooks can't be called conditionally
// inside a loop in the same component instance.
function TechniqueExerciseCard({ ex, lang, t, visualizer }) {
  const totalSteps = new Set(ex.fretboardMapping.positions.map((p) => p.step)).size;
  const isActive = visualizer.exerciseId === ex.id;

  useEffect(() => {
    if (!isActive || !visualizer.isPlaying) return undefined;
    const id = setInterval(() => visualizer.advance(totalSteps), STEP_DURATION_MS);
    return () => clearInterval(id);
  }, [isActive, visualizer.isPlaying, visualizer, totalSteps]);

  return (
    <div className="technique-masters-card">
      <div className="technique-masters-card-header">
        <h3 className="technique-masters-card-title" dir="auto">
          {localize(ex.title, lang)}
        </h3>
        <span className="technique-masters-focus">{localize(ex.focusArea, lang)}</span>
      </div>
      <p className="technique-masters-description" dir="auto">
        {localize(ex.description, lang)}
      </p>
      <div className="technique-masters-routine">
        <h4 className="technique-masters-routine-label">{t('techniqueMasters.routineLabel')}</h4>
        <p dir="auto">{localize(ex.practiceRoutine, lang)}</p>
      </div>

      <div className="technique-masters-visualize">
        <button type="button" className={'technique-masters-visualize-btn' + (isActive ? ' active' : '')} onClick={() => visualizer.toggleExercise(ex.id)}>
          {isActive ? t('techniqueMasters.hideVisualization') : t('techniqueMasters.visualize')}
        </button>

        {isActive && (
          <div className="technique-masters-visualize-controls">
            <button type="button" onClick={() => (visualizer.isPlaying ? visualizer.pause() : visualizer.play())}>
              {visualizer.isPlaying ? t('techniqueMasters.pause') : t('techniqueMasters.play')}
            </button>
            <span className="technique-masters-step-count">
              {t('techniqueMasters.stepCount', { current: visualizer.activeStep + 1, total: totalSteps })}
            </span>
          </div>
        )}
      </div>

      {isActive && <p className="technique-masters-visualize-hint">{t('techniqueMasters.visualizeHint')}</p>}
    </div>
  );
}

// Studies' third course: artist-specific technique breakdowns, filtered by
// an Artist dropdown rather than a lesson list — a dropdown (not a toggle)
// per this app's own >3-options rule, but also because the whole point is
// supporting more guitarists over time (TECHNIQUE_MASTERS_ARTISTS growing
// past today's single entry) without any UI change, just new data.
export function TechniqueMastersView({ visualizer }) {
  const { t, lang } = useLanguage();
  const [artist, setArtist] = useState(TECHNIQUE_MASTERS_ARTISTS[0] ?? null);
  const exercises = filterTechniqueMasters({ artist });

  return (
    <div className="technique-masters-view">
      <label className="technique-masters-field">
        {t('techniqueMasters.artistLabel')}
        <select value={artist ?? ''} onChange={(e) => setArtist(e.target.value || null)}>
          {TECHNIQUE_MASTERS_ARTISTS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      <div className="technique-masters-list">
        {exercises.length === 0 && <p className="technique-masters-empty">{t('techniqueMasters.empty')}</p>}
        {exercises.map((ex) => (
          <TechniqueExerciseCard key={ex.id} ex={ex} lang={lang} t={t} visualizer={visualizer} />
        ))}
      </div>
    </div>
  );
}
