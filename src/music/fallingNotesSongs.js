import { SCALE_FAMILIES } from './scalesCurriculum';

// No licensed/commercial song content — every "song" here is generated
// straight from the same instrument-agnostic SCALE_FAMILIES table Studies
// already teaches from, so there's zero content-sourcing/copyright
// question (see the earlier declined YouTube/Ultimate-Guitar requests this
// session for why that line matters). A chord-progression-based generator
// (arpeggiating whatever's typed into Compose) is a natural follow-up, not
// built here.
export const FALLING_NOTES_SONGS = [
  { key: 'cMajorScale', labelKey: 'fallingNotes.song.cMajorScale', scaleKey: 'major', rootPitchClass: 0, bpm: 80 },
  { key: 'aMinorScale', labelKey: 'fallingNotes.song.aMinorScale', scaleKey: 'naturalMinor', rootPitchClass: 9, bpm: 80 },
  { key: 'gMajorPentascale', labelKey: 'fallingNotes.song.gPentascale', scaleKey: 'majorPentatonic', rootPitchClass: 7, bpm: 90 },
];

export function resolveFallingNotesSong(key) {
  return FALLING_NOTES_SONGS.find((s) => s.key === key) ?? FALLING_NOTES_SONGS[0];
}

// How long a note takes to fall from the top of the lane to the hit line —
// also used as the lead-in silence before note 0's hit time, so the very
// first note actually gets to fall into view instead of appearing already
// at the line.
export const FALL_TIME_S = 2.5;

export function generateFallingNotesSong(songDef) {
  const family = SCALE_FAMILIES[songDef.scaleKey];
  const beatSeconds = 60 / songDef.bpm;
  const rootMidi = 60 + songDef.rootPitchClass; // anchored near Middle C, same convention pianoChordTones.js uses
  const up = family.intervals.map((iv, i) => ({ midi: rootMidi + iv, time: FALL_TIME_S + i * beatSeconds }));
  const down = [...family.intervals]
    .slice(0, -1)
    .reverse()
    .map((iv, i) => ({ midi: rootMidi + iv, time: FALL_TIME_S + (family.intervals.length + i) * beatSeconds }));
  const notes = [...up, ...down].map((n, i) => ({ id: i, midi: n.midi, time: n.time }));
  const totalDuration = notes[notes.length - 1].time + FALL_TIME_S;
  const minMidi = Math.min(...notes.map((n) => n.midi));
  const maxMidi = Math.max(...notes.map((n) => n.midi));
  return { notes, totalDuration, beatSeconds, minMidi, maxMidi };
}
