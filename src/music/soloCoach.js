const ISSUE_PENALTY = 15;
const MIN_SCORE = 20;

// Unique (string, fret) pairs / total notes — low means the same physical
// note keeps recurring rather than the phrase moving somewhere new.
function pitchVarietyRatio(notes) {
  const keys = notes.map((n) => `${n.string}-${n.fret}`);
  return new Set(keys).size / keys.length;
}

// How many distinct note-durations are actually used — 1 means every note
// rings for exactly the same length the whole way through.
function rhythmVarietyCount(notes) {
  return new Set(notes.map((n) => n.durationMultiplier ?? 1)).size;
}

// Analyzes a generated solo (a Phrase Builder phrase's flattened notes, or a
// plain lick's notes as a fallback) and gives feedback + a 1-100 quality
// score, per the spec's own list of feedback types. `roadmap` (optional —
// see music/positionRoadmap.js, only meaningful for a multi-bar phrase)
// adds the "stayed in one position too long" check.
export function analyzeSolo({ notes, roadmap = null }) {
  if (!notes || notes.length === 0) return null;

  const issues = [];

  if (notes.length >= 5 && pitchVarietyRatio(notes) < 0.6) {
    issues.push('Too repetitive');
  }

  if (notes.length >= 8 && rhythmVarietyCount(notes) === 1) {
    issues.push('Too many repeated rhythms');
  }

  if (roadmap && roadmap.transitions.length > 0 && roadmap.transitions.every((t) => t.label === 'Stay')) {
    issues.push('Stayed in one position too long');
  }

  if (!notes.some((n) => n.technique === 'bend')) issues.push('No bends');
  if (!notes.some((n) => n.technique === 'vibrato')) issues.push('No vibrato');

  const last = notes[notes.length - 1];
  if (last.role === 'passing' || last.role === 'extension') {
    issues.push('Weak phrase ending');
  } else if (last.role !== 'root') {
    issues.push('Needs stronger resolution');
  }

  const score = Math.max(MIN_SCORE, 100 - issues.length * ISSUE_PENALTY);
  return { issues, score };
}
