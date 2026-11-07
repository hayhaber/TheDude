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
  'g1-chord-E': [
    { tool: 'minuteChanges', chords: ['A', 'E'] },
    { tool: 'chordLibrary', root: 4, type: 'major', name: 'E' },
  ],
  'g1-strumming': [{ tool: 'chordChanges', chords: ['A', 'D'], bpm: 60 }],
  'g1-first-song': [{ tool: 'chordChanges', chords: ['A', 'D', 'E'], bpm: 70 }],
  'g2-minor-chords': [
    { tool: 'minuteChanges', chords: ['Am', 'Dm'] },
    { tool: 'chordLibrary', root: 9, type: 'minor', name: 'Am' },
  ],
  'g2-G-C': [
    { tool: 'minuteChanges', chords: ['G', 'C'] },
    { tool: 'chordChanges', chords: ['G', 'D', 'Em', 'C'], bpm: 70 },
  ],
  'g2-minor-pent': [{ tool: 'scale', scaleKey: 'minorPentatonic', root: 9, mode: 'position', positionIndex: 0, bpm: 60 }],
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
