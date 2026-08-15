import { BEND_STATES } from '../../music/bendingTraining';
import { useLanguage } from '../../i18n/LanguageContext';
import './BendingPracticePanel.css';

const STATE_COLOR = {
  [BEND_STATES.IDLE]: '#8e8e93',
  [BEND_STATES.UNDERBENT]: '#ff9500',
  [BEND_STATES.TARGET_REACHED]: '#34c759',
  [BEND_STATES.OVERBENT]: '#ff3b30',
  [BEND_STATES.UNSTABLE_SUSTAIN]: '#ffcc00',
};

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 150;
const REST_Y = 100;
const MAX_DEFLECTION = 56;

// Point on the quadratic bezier P0->P1->P2 at parameter t (0-1) — used to
// walk the live pitch dot along the exact same arc the dashed guide path
// draws, rather than moving it on some other independent line.
function quadraticBezierPoint(p0, p1, p2, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

// Isolated fretboard+TAB visualization for one string's bend — deliberately
// NOT the shared Fretboard component (which renders all 6 strings across
// the full neck for chord/scale work). A bend drill only cares about one
// string moving in place, so this owns its own small SVG rather than adding
// a bend-specific rendering mode to a component many other sections depend on.
export function BendingPracticePanel({ bending }) {
  const { t } = useLanguage();
  const { step } = bending;

  const fretWindowStart = step.startFret - 1;
  const fretWindowEnd = step.targetFret + 1;
  const fretCount = fretWindowEnd - fretWindowStart;
  const spacing = VIEW_WIDTH / (fretCount + 1);
  const xForFret = (fret) => (fret - fretWindowStart) * spacing;

  const startX = xForFret(step.startFret);
  const targetX = xForFret(step.targetFret);
  const targetY = REST_Y - MAX_DEFLECTION;

  // The guide arc's control point — pulled up above the higher of the two
  // endpoints so the curve always arcs upward, the same reading direction
  // as "bend the pitch up to reach the target."
  const arcControl = { x: (startX + targetX) / 2, y: Math.min(REST_Y, targetY) - 24 };
  const p0 = { x: startX, y: REST_Y };
  const p2 = { x: targetX, y: targetY };
  const guidePath = `M ${p0.x} ${p0.y} Q ${arcControl.x} ${arcControl.y} ${p2.x} ${p2.y}`;

  const clampedProgress = Math.max(0, Math.min(1.3, bending.bendProgress));
  const currentY = REST_Y - clampedProgress * MAX_DEFLECTION;
  const color = STATE_COLOR[bending.bendState];
  const isSuccess = bending.bendState === BEND_STATES.TARGET_REACHED;

  // Live pitch dot walks the exact same arc the dashed guide path draws,
  // parameterized 0-1 (clamped — an overbent reading still shows at the
  // target end, not flying past it along the curve).
  const livePoint = bending.isListening
    ? quadraticBezierPoint(p0, arcControl, p2, Math.max(0, Math.min(1, clampedProgress)))
    : null;

  const stateLabelKey = {
    [BEND_STATES.IDLE]: 'bending.state.idle',
    [BEND_STATES.UNDERBENT]: 'bending.state.underbent',
    [BEND_STATES.TARGET_REACHED]: 'bending.state.targetReached',
    [BEND_STATES.OVERBENT]: 'bending.state.overbent',
    [BEND_STATES.UNSTABLE_SUSTAIN]: 'bending.state.unstable',
  }[bending.bendState];

  return (
    <div className="bending-panel">
      <div>
        <h1>{t('bending.title')}</h1>
        <p className="subtitle">{t('bending.subtitle')}</p>
      </div>

      <div className="bending-session">
        <div className="bending-primary-actions">
          <button type="button" className="play-button" onClick={bending.playDemo}>
            {t('earTraining.replay')}
          </button>
          <button type="button" className="bending-toggle-btn" onClick={bending.isListening ? bending.stop : bending.start}>
            {bending.isListening ? t('vocal.stop') : t('vocal.start')}
          </button>
        </div>

        {bending.error && <p className="bending-error">{bending.error}</p>}

        {bending.isListening && !bending.isComplete && (
          <>
            <div className="bending-meta">
              <span>{t('bending.progressLabel', { current: bending.stepIndex + 1, total: bending.totalSteps })}</span>
              <span>{t(`bending.type.${step.bendKey}`)}</span>
              <span>{t('bending.stringLabel', { number: step.stringNumber })}</span>
            </div>

            <div className="bending-tab-line">
              <span className="bending-tab-text">{step.tabText}</span>
              <span className="bending-tab-arrow">↑</span>
              <span className="bending-distance-badge">{t(`bending.badgeLabel.${step.bendKey}`)}</span>
            </div>

            <svg className="bending-svg" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="img" aria-label={t('bending.title')}>
              <defs>
                <marker id="bending-arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-secondary)" />
                </marker>
              </defs>

              {Array.from({ length: fretCount + 1 }, (_, i) => (
                <line key={i} x1={i * spacing} y1={10} x2={i * spacing} y2={VIEW_HEIGHT - 10} className="bending-fret-line" />
              ))}

              {/* Static dashed guide arc — always shows the full path from
                  start to target, independent of live progress, so the
                  bend's direction/shape is clear before the player even
                  starts. The live dot below walks this same curve. */}
              <path d={guidePath} className="bending-guide-arc" markerEnd="url(#bending-arrowhead)" />

              {/* Start note — solid filled marker with note name + fret. */}
              <circle cx={startX} cy={REST_Y} r={8} className="bending-start-dot" />
              <text x={startX} y={REST_Y + 4} textAnchor="middle" className="bending-start-dot-label">{step.startFret}</text>
              <text x={startX} y={REST_Y + 26} textAnchor="middle" className="bending-note-label">{step.startNoteName}</text>

              {/* Target pitch — dashed outline; gains a glowing green fill
                  the moment the live pitch is accurately holding there. */}
              <circle
                cx={targetX}
                cy={targetY}
                r={10}
                className={'bending-target-ring' + (isSuccess ? ' success' : '')}
              />
              <text x={targetX} y={targetY - 18} textAnchor="middle" className="bending-note-label">{step.targetNoteName}</text>
              <text x={targetX} y={targetY - 34} textAnchor="middle" className="bending-fret-label">{t('bending.targetFretLabel', { fret: step.targetFret })}</text>

              {/* Live pitch marker — moves smoothly along the guide arc as
                  the detected pitch approaches the target, colored the same
                  as the state label below. */}
              {livePoint && <circle cx={livePoint.x} cy={livePoint.y} r={7} className={'bending-live-dot' + (isSuccess ? ' success' : '')} fill={color} />}
            </svg>

            <p className="bending-state-label" style={{ color }}>{t(stateLabelKey)}</p>

            <div className="bending-hold-bar">
              <div className="bending-hold-fill" style={{ width: `${bending.holdProgress * 100}%` }} />
            </div>

            <button type="button" className="bending-skip-btn" onClick={bending.skip}>{t('vocal.skip')}</button>
          </>
        )}

        {bending.isListening && bending.isComplete && (
          <div className="bending-complete">
            <p>{t('vocal.complete')}</p>
            <button type="button" className="bending-again-btn" onClick={bending.restart}>{t('vocal.again')}</button>
          </div>
        )}

        {bending.isListening && (
          <p className="bending-score">{t('vocal.score')}: {bending.score.hits} / {bending.score.hits + bending.score.misses}</p>
        )}
      </div>
    </div>
  );
}
