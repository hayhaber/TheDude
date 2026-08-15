// music/positionRoadmap.js's positionName()/transitionLabel() return fixed
// English strings ('Open', 'Position 5', 'Stay'/'Shift'/'Slide') that are
// also used as-is for CSS class matching (PositionRoadmapPanel's
// `.position-roadmap-transition.slide` etc, keyed off transition.label
// lowercased) — so those underlying values can't change. These two helpers
// translate them for *display* only, shared by every place that renders a
// roadmap (Fretboard.jsx and PositionRoadmapPanel.jsx), so the mapping
// lives in exactly one spot.
const TRANSITION_KEY = {
  Stay: 'positionRoadmap.stay',
  Shift: 'positionRoadmap.shift',
  Slide: 'positionRoadmap.slide',
};

export function translateTransitionLabel(t, label) {
  const key = TRANSITION_KEY[label];
  return key ? t(key) : label;
}

export function translatePositionLabel(t, baseFret) {
  return baseFret === 0 ? t('positionRoadmap.open') : t('positionRoadmap.position', { fret: baseFret });
}
