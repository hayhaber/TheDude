import * as alphaTab from '@coderline/alphatab';
import { parseMidiToChordTimeline } from './parseMidiChords';

// Headless-parses a Guitar Pro file's bytes into alphaTab's Score model —
// no AlphaTabApi/DOM container needed. Used by SongVideoPlayer's import
// path, which only needs the chord/tempo data, not a rendered tab (the
// standalone Tab viewer, TabViewer.jsx, uses a full AlphaTabApi instance
// instead, since it actually renders the score on screen).
export function loadGpScore(arrayBuffer) {
  return alphaTab.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(arrayBuffer), new alphaTab.Settings());
}

// Converts an already-loaded alphaTab Score into the exact same
// `{ time, chord }[]` timeline shape parseMidiChords.js's
// parseMidiToChordTimeline already produces from a raw MIDI file. Rather
// than re-implement tempo-map resolution and chord identification from the
// Score's own bar/beat model, this has alphaTab do what it already does
// internally for its own synth playback — resolve every bar's tempo
// automation into a real SMF1.0 MIDI file — and hands that straight to the
// exact same parser this app already uses for user-uploaded .mid files.
// Reuses 100% of that function's tempo-aware note-clustering/chord-
// identification logic, unchanged. Shared by both consumers: TabViewer.jsx
// (already has a live Score from its own AlphaTabApi instance) and
// parseGpToChordTimeline below (parses bytes into a Score first).
export async function scoreToChordTimeline(score) {
  const settings = new alphaTab.Settings();
  const midiFile = new alphaTab.midi.MidiFile();
  const handler = new alphaTab.midi.AlphaSynthMidiFileHandler(midiFile, true /* SMF1.0 */);
  new alphaTab.midi.MidiFileGenerator(score, settings, handler).generate();
  const bytes = midiFile.toBinary();
  return parseMidiToChordTimeline(bytes.buffer);
}

// Headless variant for a raw file's bytes (no Score object yet) — used by
// SongVideoPlayer's import path, which only needs the chord/tempo data, not
// a rendered tab.
export async function parseGpToChordTimeline(arrayBuffer) {
  const score = loadGpScore(arrayBuffer);
  const chords = await scoreToChordTimeline(score);
  return { chords, title: score.title || null, artist: score.artist || null };
}
