import { useLanguage } from '../../i18n/LanguageContext';
import { translatePositionLabel, translateTransitionLabel } from '../../i18n/roadmapLabels';
import './PositionRoadmapPanel.css';

// Text form of the roadmap (the fretboard gets the visual pins/lines) — a
// readable "Position 5 -> Slide -> Position 8" chain, per the spec's own
// example format. Each chord chip is tinted with step.color, computed once
// in positionRoadmap.js (see its own comment) so it always matches the same
// step's pin color on the fretboard, and so two adjacent chips never land on
// near-identical shades of the same hue.
export function PositionRoadmapPanel({ roadmap }) {
  const { t } = useLanguage();
  if (!roadmap || roadmap.steps.length < 2) return null;

  return (
    <div className="position-roadmap-panel">
      <p className="position-roadmap-title">{t('positionRoadmap.title')}</p>
      <div className="position-roadmap-chain">
        {roadmap.steps.map((step, i) => (
          <span key={i} className="position-roadmap-step-group">
            <span className="position-roadmap-step" style={{ '--chord-color': step.color }}>
              <span className="position-roadmap-chord">
                <span className="position-roadmap-swatch" aria-hidden="true" />
                {step.chordText}
              </span>
              <span className="position-roadmap-position">
                {translatePositionLabel(t, step.baseFret)}
                {step.shapeName ? ` (${step.shapeName})` : ''}
              </span>
            </span>
            {roadmap.transitions[i] && (
              <span className={'position-roadmap-transition ' + roadmap.transitions[i].label.toLowerCase()}>
                {translateTransitionLabel(t, roadmap.transitions[i].label)}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
