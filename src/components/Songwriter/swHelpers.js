import { parseLine, syllables } from '../../music/songwriter/lyrics';
import { beatsPerBar, beatUnit, chordMidis, chordTimes, lineBeats, noteSyllables, sortNotes } from '../../music/songwriter/song';

export const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const MINOR = [0, 2, 3, 5, 7, 8, 10];

export const gridFor = (song) => song.grid ?? (beatUnit(song.time) === 8 ? 1 : 0.5);
export const scalePcs = (key) => (key ? (key.minor ? MINOR : MAJOR).map((s) => (s + key.pc) % 12) : null);
export const validChord = (s) => !!chordMidis(s) && /^[A-G][#b]?/.test(s);

/** The melody lane's props for a line (shared by the sheet and the editor). */
export function laneFor(song, line, extraBars = 0) {
  const notes = sortNotes(line.melody?.notes ?? []);
  const { text } = parseLine(line.raw);
  const syl = syllables(text, line.syl);
  const bpb = beatsPerBar(song.time);
  const minS = notes.length ? Math.min(0, ...notes.map((n) => n.s)) : 0;
  return {
    notes,
    syl,
    sylOf: noteSyllables(notes, syl.length),
    sylText: syl.map((s) => s.text),
    chords: chordTimes(line, song.time),
    beatsPerBar: bpb,
    fromBeat: Math.floor(minS / bpb) * bpb === minS ? minS : Math.floor(minS),
    toBeat: lineBeats(line, song.time) + extraBars * bpb,
    grid: gridFor(song),
  };
}

