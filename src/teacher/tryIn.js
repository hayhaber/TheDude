// Stage 6 of the redesign (guidance): "Try it in…" — where a finished
// lesson's skill is practised next, and which lesson teaches a chord.
// Specs are launchBus specs (App launchPractice), plus `name` for labels.
import { LESSONS } from './curriculum/guitar';

export const TRY_IN = {
  'g0-clean-notes': [{ tool: 'drill' }],
  'g0-first-chord': [{ tool: 'chordLibrary', root: 4, type: 'minor', name: 'Em' }],
  'g1-first-chords': [
    { tool: 'minuteChanges', chords: ['D', 'A'] },
    { tool: 'chordChanges', chords: ['D', 'A'], bpm: 60 },
    { tool: 'chordLibrary', root: 2, type: 'major', name: 'D' },
  ],
  'g3-arpeggios': [
    { tool: 'lick', lickId: 'arp-pop-1564', kind: 'arp' },
    { tool: 'chordLibrary', root: 0, type: 'major', name: 'C' },
  ],
  'g4-tapping': [{ tool: 'lick', lickId: 'tap-am-triplets', kind: 'tap' }],
};

/** The written lesson that teaches this open chord (e.g. 'Em'), or null. */
export function lessonForChord(name) {
  if (!name) return null;
  return LESSONS.find((l) => l.steps && l.skills?.includes(`chord-${name}`)) ?? null;
}
