import { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { ChordBox } from '../ChordLibrary/ChordBox';
import { fingerChord } from '../../music/chordLibrary';
import { useLeftHanded } from '../Fretboard/handedness';
import '../ChordLibrary/ChordLibraryView.css';
import { translatePositionLabel, translateTransitionLabel } from '../../i18n/roadmapLabels';
import './PositionRoadmapPanel.css';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';

// Text form of the roadmap (the fretboard gets the visual pins/lines) — a
// readable "Position 5 -> Slide -> Position 8" chain, per the spec's own
// example format. Each chord chip is tinted with step.color, computed once
// in positionRoadmap.js (see its own comment) so it always matches the same
// step's pin color on the fretboard, and so two adjacent chips never land on
// near-identical shades of the same hue.
//
// v1.0.175: with `shapesFor(i)` + `onPick(i, positionIndex)` (Compose,
// guitar) each chord is a button: it opens a card under the chain with the
// chord's other shapes NEAR its neighbours (positionRoadmap.nearbyShapes),
// as small chord diagrams; choosing one changes only that chord.
function boxProps(position) {
  const frets = position.strings.map((s) => s.fret);
  const fretted = frets.filter((f) => f != null && f > 0);
  const hi = fretted.length ? Math.max(...fretted) : 0;
  const lo = fretted.length ? Math.min(...fretted) : 0;
  const fg = fingerChord(frets);
  return {
    frets,
    fingers: fg?.fingers ?? frets.map(() => null),
    barre: fg?.barre ?? null,
    roles: position.strings.map((s) => (s.role === 'root' ? 'root' : s.role === 'bass' ? 'bass' : null)),
    names: position.strings.map((s) => s.label ?? ''),
    position: hi <= 4 ? 0 : lo,
  };
}

export function PositionRoadmapPanel({ roadmap, shapesFor, onPick }) {
  const { t } = useLanguage();
  const [leftHanded] = useLeftHanded();
  const [open, setOpen] = useState(null);
  if (!roadmap || roadmap.steps.length < 2) return null;
  const picking = typeof shapesFor === 'function' && typeof onPick === 'function';
  const openIdx = picking && open != null && open < roadmap.steps.length ? open : null;
  const shapes = openIdx != null ? shapesFor(openIdx) : [];

  return (
    <div className="position-roadmap-panel">
      <p className="position-roadmap-title">
        {t('positionRoadmap.title')}
        <InfoTooltip text={t('tip.compose.positionRoadmap')} />
      </p>
      <p className="position-roadmap-desc">
        {t('positionRoadmap.desc')}
        {picking ? ' ' + t('positionRoadmap.tapHint') : ''}
      </p>
      <div className="position-roadmap-chain">
        {roadmap.steps.map((step, i) => (
          <span key={i} className="position-roadmap-step-group">
            {(() => {
              const inner = (
                <>
                  <span className="position-roadmap-chord" dir="ltr">
                    <span className="position-roadmap-swatch" aria-hidden="true" />
                    {step.chordText}
                  </span>
                  <span className="position-roadmap-position">
                    {translatePositionLabel(t, step.baseFret)}
                    {step.shapeName ? ` (${step.shapeName})` : ''}
                  </span>
                </>
              );
              return picking ? (
                <button
                  type="button"
                  className={'position-roadmap-step is-button' + (openIdx === i ? ' is-open' : '')}
                  style={{ '--chord-color': step.color }}
                  aria-expanded={openIdx === i}
                  onClick={() => setOpen(openIdx === i ? null : i)}
                >
                  {inner}
                </button>
              ) : (
                <span className="position-roadmap-step" style={{ '--chord-color': step.color }}>
                  {inner}
                </span>
              );
            })()}
            {roadmap.transitions[i] && (
              <span className={'position-roadmap-transition ' + roadmap.transitions[i].label.toLowerCase()}>
                {translateTransitionLabel(t, roadmap.transitions[i].label)}
              </span>
            )}
          </span>
        ))}
      </div>
      {openIdx != null && (
        <div className="position-roadmap-shapes" role="group" aria-label={t('positionRoadmap.shapesFor', { chord: roadmap.steps[openIdx].chordText })}>
          <div className="position-roadmap-shapes-head">
            <span>{t('positionRoadmap.shapesFor', { chord: roadmap.steps[openIdx].chordText })}</span>
            <button type="button" className="position-roadmap-done" onClick={() => setOpen(null)}>
              {t('positionRoadmap.done')}
            </button>
          </div>
          {shapes.length <= 1 ? (
            <p className="position-roadmap-only">{t('positionRoadmap.onlyShape')}</p>
          ) : (
            <div className="position-roadmap-shape-row">
              {shapes.map((c) => (
                <button
                  key={c.index}
                  type="button"
                  className={'position-roadmap-shape' + (c.current ? ' is-current' : '')}
                  aria-pressed={c.current}
                  onClick={() => {
                    if (!c.current) onPick(openIdx, c.index);
                  }}
                >
                  <ChordBox {...boxProps(c.position)} leftHanded={leftHanded} showNames={false} />
                  <span className="position-roadmap-shape-pos">{translatePositionLabel(t, c.baseFret)}</span>
                  {c.current ? (
                    <span className="position-roadmap-tag is-now">{t('positionRoadmap.now')}</span>
                  ) : c.easiest ? (
                    <span className="position-roadmap-tag">{t('positionRoadmap.easiest')}</span>
                  ) : (
                    <span className="position-roadmap-tag is-empty" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
