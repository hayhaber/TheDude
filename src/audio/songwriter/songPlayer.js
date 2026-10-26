// Plays a song (or one section / line) from its notes and chords: the
// melody and the chords on the selected piano sound, scheduled ahead on the
// shared clock. Returns a handle with stop() and the timeline for the
// playhead.

import { getAudioContext } from '../audioContext';
import { schedulePianoNotes, preparePiano } from '../pianoPlayer';
import { chordMidis, songTimeline } from '../../music/songwriter/song';

export { preparePiano };

/**
 * opts: { only: { section, line }, melody = true, chords = true, from = 0 (s) }.
 * Returns { stop, startAt (ctx time of timeline 0), timeline } or null when
 * there's nothing to play.
 */
export function playSong(song, { only = null, melody = true, chords = true, from = 0 } = {}) {
  const tl = songTimeline(song, { only });
  if (!tl.notes.length && !tl.chords.length) return null;
  const ctx = getAudioContext();
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  const startAt = ctx.currentTime + 0.12 - from;
  const keep = (x) => x.start + x.dur > from;
  const stops = [];
  if (melody) {
    const ns = tl.notes.filter(keep).map((n) => ({ midi: n.midi, start: Math.max(n.start, from), dur: n.dur * 0.95 }));
    stops.push(schedulePianoNotes(ns, startAt, { velocity: 95 }));
  }
  if (chords) {
    const cs = [];
    for (const c of tl.chords.filter(keep)) {
      const ms = chordMidis(c.symbol);
      if (!ms) continue;
      // A gentle roll, held for the chord's length.
      ms.forEach((m, i) => cs.push({ midi: m, start: Math.max(c.start, from) + i * 0.012, dur: Math.max(0.3, c.dur - 0.05) }));
    }
    stops.push(schedulePianoNotes(cs, startAt, { velocity: melody ? 48 : 64 }));
  }
  return {
    stop: () => stops.forEach((s) => s()),
    startAt,
    timeline: tl,
    now: () => ctx.currentTime - startAt,
  };
}
