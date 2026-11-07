// The Songwriter's band: the song played the way a band would back it —
// drums (the drum machine's grooves), a bass line and a chord part (guitar
// strum / piano) in a style, plus the melody on the piano. Same handle as
// playSong(): { stop, startAt, timeline, now }.
//
// Bass lines are the standard patterns every bass method starts with:
// roots (half notes / driving eighths), root–fifth two-feel (country), the
// 1-3-5-6 boogie (blues), a one-drop line (reggae) and a walking line
// (jazz: 1-3-5 then a half-step approach into the next chord's root).
import { getAudioContext } from '../audioContext';
import { schedulePianoNotes, preparePiano } from '../pianoPlayer';
import { scheduleGuitarNotes, prepareGuitar } from '../chordPlayer';
import { scheduleBassNotes, preloadBassSamples } from '../bassPlayer';
import { playDrumHit } from '../drumSounds';
import { loadDrumKit } from '../drumSamples';
import { drumHits } from '../studio/drumTrack';
import { accompaniment, shapeOf, pianoVoicing } from './harmonyPlayer';
import { beatsPerBar, songTimeline } from '../../music/songwriter/song';

// drums = a DRUM_STYLES key; comp = how the chords are played.
export const BAND_STYLES = {
  pop: { drums: 'rock', bass: 'pop', comp: 'guitarStrum', drumLevel: 0.75 },
  rock: { drums: 'rock', bass: 'eighths', comp: 'guitarStrum', drumLevel: 0.95, fills: true },
  ballad: { drums: 'rock', bass: 'half', comp: 'pianoArp', drumLevel: 0.4 },
  country: { drums: 'country', bass: 'rootFifth', comp: 'guitarStrum', drumLevel: 0.75, fills: true },
  blues: { drums: 'blues', bass: 'boogie', comp: 'guitarBlock', drumLevel: 0.8, fills: true },
  reggae: { drums: 'reggae', bass: 'reggae', comp: 'pianoSkank', drumLevel: 0.8 },
  jazz: { drums: 'jazz', bass: 'walk', comp: 'pianoComp', drumLevel: 0.7 },
};
export const BAND_KEYS = Object.keys(BAND_STYLES);

/** Start loading the band's sounds (call when a style is chosen / the editor opens). */
export function prepareBand() {
  loadDrumKit();
  preparePiano();
  prepareGuitar();
  preloadBassSamples();
}

/** E1..D#2 — the bass's lowest octave, where root notes sit. */
function bassRoot(pc) {
  return 28 + ((pc - 4 + 12) % 12);
}

/** One chord span's bass notes (beats). */
export function bassLine(kind, symbol, from, to, barStart, bpb, nextSymbol) {
  const s = shapeOf(symbol);
  if (!s) return [];
  const r = bassRoot(s.bass);
  const fifth = r + 7 <= 43 ? r + 7 : r - 5;
  const third = r + s.third;
  const sixth = r + (s.third === 3 ? 10 : 9); // minor: the ♭7, major: the 6
  const out = [];
  const add = (beat, midi, dur, velocity = 100) => {
    if (beat >= from - 1e-6 && beat < to - 1e-6) out.push({ midi, start: beat, dur: Math.min(dur, to - beat), velocity });
  };
  const firstBar = Math.floor((from - barStart) / bpb);
  for (let bar = barStart + firstBar * bpb; bar < to - 1e-6; bar += bpb) {
    const b = (k) => bar + k;
    if (kind === 'half') {
      add(Math.max(b(0), from), r, 2, 90);
      if (bpb >= 4) add(b(2), r, 2, 80);
    } else if (kind === 'eighths') {
      for (let k = 0; k < bpb; k += 0.5) add(b(k), r, 0.45, k % 1 ? 85 : 100);
    } else if (kind === 'rootFifth') {
      add(b(0), r, 1, 100);
      if (bpb >= 4) add(b(2), fifth, 1, 90);
    } else if (kind === 'boogie') {
      [r, third, r + 7, sixth].slice(0, bpb).forEach((m, k) => add(b(k), m, 0.9, 95));
    } else if (kind === 'reggae') {
      add(b(0), r, 1, 100);
      add(b(1.5), r, 0.5, 80);
      if (bpb >= 3) add(b(2), fifth, 1, 90);
    } else if (kind === 'walk') {
      const next = nextSymbol ? shapeOf(nextSymbol) : null;
      const line = [r, third, r + 7, sixth];
      for (let k = 0; k < bpb; k += 1) {
        const at = b(k);
        // The last beat before a chord change: a half step under the next root.
        const last = at + 1 >= to - 1e-6;
        let m = line[k % line.length];
        if (last && next) {
          const nr = bassRoot(next.bass);
          m = nr - 1 >= 28 ? nr - 1 : nr + 1;
        }
        add(at, m, 0.9, k === 0 ? 100 : 85);
      }
    } else {
      // pop: 1, the "and" of 2, 3, 4
      add(b(0), r, 1.4, 100);
      add(b(1.5), r, 0.5, 80);
      if (bpb >= 3) add(b(2), r, 1, 92);
      if (bpb >= 4) add(b(3), fifth, 1, 85);
    }
  }
  return out;
}

/** Piano chord stabs at the given beats of each bar (reggae skank, jazz comp). */
function pianoHits(symbol, from, to, barStart, bpb, beatsInBar, dur) {
  const { rh } = pianoVoicing(symbol);
  const out = [];
  for (let bar = barStart; bar < to - 1e-6; bar += bpb) {
    for (const k of beatsInBar) {
      const at = bar + k;
      if (k >= bpb || at < from - 1e-6 || at >= to - 1e-6) continue;
      rh.forEach((m, i) => out.push({ midi: m, start: at + i * 0.008, dur }));
    }
  }
  return out;
}

/**
 * opts: { only, from (s), style (BAND_STYLES key), melody (bool) }.
 * Returns the playSong() handle, or null when there's nothing to play.
 */
export function playBand(song, { only = null, from = 0, style = 'pop', melody = true } = {}) {
  const tl = songTimeline(song, { only });
  if (!tl.lines.length) return null;
  const band = BAND_STYLES[style] ?? BAND_STYLES.pop;
  const ctx = getAudioContext();
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  const spb = 60 / (song.bpm || 90);
  const bpb = beatsPerBar(song.time);
  const startAt = ctx.currentTime + 0.15 - from;
  const origin = tl.lines[0].downbeat; // the first downbeat (after a pickup)
  const end = tl.duration;
  const stops = [];

  // Chords -> the comp part and the bass line (in beats, then seconds).
  const guitar = [];
  const piano = [];
  const bass = [];
  const toSec = (n) => ({ ...n, start: n.start * spb, dur: n.dur * spb });
  tl.chords.forEach((c, i) => {
    const fromB = c.start / spb;
    const toB = (c.start + c.dur) / spb;
    const o = origin / spb;
    const barStart = o + Math.floor((fromB - o) / bpb + 1e-6) * bpb;
    const next = tl.chords[i + 1];
    const nextSym = next && Math.abs(next.start - (c.start + c.dur)) < 0.05 ? next.symbol : null;
    bass.push(...bassLine(band.bass, c.symbol, fromB, toB, barStart, bpb, nextSym).map(toSec));
    if (band.comp === 'guitarStrum' || band.comp === 'guitarBlock') {
      guitar.push(...accompaniment(c.symbol, fromB, toB, barStart, { instrument: 'guitar', style: band.comp === 'guitarBlock' ? 'block' : 'strum', bpb }).map((n) => ({ ...toSec(n), velocity: Math.round((n.velocity ?? 80) * 0.85) })));
    } else if (band.comp === 'pianoArp') {
      piano.push(...accompaniment(c.symbol, fromB, toB, barStart, { instrument: 'piano', style: 'arp', bpb }).map(toSec));
    } else if (band.comp === 'pianoSkank') {
      piano.push(...pianoHits(c.symbol, fromB, toB, barStart, bpb, [1, 3], 0.28).map(toSec));
    } else {
      piano.push(...pianoHits(c.symbol, fromB, toB, barStart, bpb, [1, 2.5], 0.6).map(toSec));
    }
  });
  const keep = (n) => n.start + n.dur > from;
  const fromCut = (n) => ({ ...n, start: Math.max(n.start, from) });
  if (guitar.length) stops.push(scheduleGuitarNotes(guitar.filter(keep).map(fromCut), startAt));
  if (piano.length) stops.push(schedulePianoNotes(piano.filter(keep).map(fromCut), startAt, { velocity: 52 }));
  if (bass.length) stops.push(scheduleBassNotes(bass.filter((n) => n.start >= from - 0.01), startAt));
  if (melody) {
    const ns = tl.notes.filter(keep).map((n) => ({ midi: n.midi, start: Math.max(n.start, from), dur: n.dur * 0.95 }));
    if (ns.length) stops.push(schedulePianoNotes(ns, startAt, { velocity: 96 }));
  }

  // Drums: scheduled a little ahead while playing (thousands of synthesized
  // hits for a whole song would be a lot of nodes at once).
  const out = ctx.createGain();
  out.gain.value = band.drumLevel ?? 0.8;
  out.connect(ctx.destination);
  let scheduledTo = Math.max(origin, from);
  const pump = () => {
    const now = ctx.currentTime - startAt;
    const until = Math.min(end, now + 0.35);
    if (until <= scheduledTo) return;
    const hits = drumHits({ style: band.drums, fills: !!band.fills }, song.bpm || 90, bpb, scheduledTo - origin, until - origin);
    for (const h of hits) playDrumHit(ctx, h.instrument, startAt + origin + h.time, h.velocity, out);
    scheduledTo = until;
  };
  pump();
  const timer = setInterval(pump, 60);
  stops.push(() => {
    clearInterval(timer);
    try {
      out.disconnect();
    } catch {
      /* already gone */
    }
  });

  return {
    stop: () => stops.forEach((s) => s()),
    startAt,
    timeline: tl,
    now: () => ctx.currentTime - startAt,
  };
}
