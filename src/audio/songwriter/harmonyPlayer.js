// Plays a line's melody with suggested chords (Songwriter "Chords"): the
// student's own recording (when it lines up with the beat) or the melody on
// the piano, plus the chords on guitar or piano as a strum, an arpeggio or
// held chords. Everything is scheduled ahead on the shared clock.
import { getAudioContext } from '../audioContext';
import { schedulePianoNotes } from '../pianoPlayer';
import { scheduleGuitarNotes } from '../chordPlayer';
import { getAudio } from './songAudioStore';
import { beatsPerBar, chordMidis } from '../../music/songwriter/song';

/** Root, 3rd, 5th, (7th) as semitones above the root, from the app's chord table. */
export function shapeOf(symbol) {
  const ms = chordMidis(symbol);
  if (!ms) return null;
  const tones = ms.slice(1);
  const root = tones[0] % 12;
  const iv = tones.map((m) => m - tones[0]);
  return { root, bass: ms[0] % 12, third: iv[1] ?? 4, fifth: iv[2] ?? 7, seventh: iv[3] ?? null };
}

/** A barre-chord "E shape" voicing, root on the low strings: R 5 R/7 3 5 R. */
export function guitarVoicing(symbol) {
  const s = shapeOf(symbol);
  if (!s) return [];
  const r = 40 + ((s.root - 4 + 12) % 12); // E2..D#3
  const v = [r, r + s.fifth, s.seventh != null ? r + s.seventh : r + 12, r + 12 + s.third, r + 12 + s.fifth, r + 24];
  const bass = s.bass !== s.root ? 40 + ((s.bass - 4 + 12) % 12) : null;
  if (bass != null) v[0] = bass;
  return v.filter((m) => m <= 72);
}

/** Left hand: the bass; right hand: the chord close around middle C. */
export function pianoVoicing(symbol) {
  const s = shapeOf(symbol);
  if (!s) return { lh: [], rh: [] };
  const lh = 36 + s.bass;
  const base = 60 + s.root > 67 ? 48 + s.root : 60 + s.root;
  const rh = [base, base + s.third, base + s.fifth, ...(s.seventh != null ? [base + s.seventh] : [])];
  return { lh: [lh, lh + 12 <= 52 ? lh + 12 : lh], rh };
}

// Eighth-note slots of one bar: D = down strum, U = up strum, '' = the hand passes.
const STRUM = { 4: ['D', '', 'D', 'U', '', 'U', 'D', 'U'], 3: ['D', '', 'D', 'U', 'D', 'U'], 2: ['D', '', 'D', 'U'], 6: ['D', '', 'U', 'D', '', 'U', 'D', '', 'U', 'D', '', 'U'] };

/** The accompaniment's notes ({midi, start (beats), dur (beats), velocity}) for one chord span. */
export function accompaniment(symbol, from, to, barStart, { instrument, style, bpb }) {
  const out = [];
  const len = to - from;
  if (len <= 0) return out;
  if (instrument === 'guitar') {
    const v = guitarVoicing(symbol);
    if (!v.length) return out;
    if (style === 'block') {
      v.forEach((m, i) => out.push({ midi: m, start: from + i * 0.03, dur: len, velocity: 85 }));
    } else if (style === 'arp') {
      const order = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1].map((i) => v[Math.min(i, v.length - 1)]);
      let k = 0;
      for (let b = from; b < to - 1e-6; b += 0.5, k += 1) out.push({ midi: order[k % order.length], start: b, dur: Math.min(1.5, to - b), velocity: 80 });
    } else {
      const pat = STRUM[bpb] ?? STRUM[4];
      for (let b = from; b < to - 1e-6; b += 0.5) {
        const slot = Math.round((b - barStart) * 2) % pat.length;
        const kind = pat[(slot + pat.length) % pat.length];
        if (!kind) continue;
        const notes = kind === 'D' ? v : [...v].reverse().slice(0, 4);
        const ring = Math.min(1, to - b);
        notes.forEach((m, i) => out.push({ midi: m, start: b + i * 0.012 * (kind === 'D' ? 1.4 : 1), dur: ring, velocity: kind === 'D' ? 88 : 62 }));
      }
    }
    return out;
  }
  const { lh, rh } = pianoVoicing(symbol);
  if (!rh.length) return out;
  if (style === 'block') {
    lh.forEach((m) => out.push({ midi: m, start: from, dur: len, velocity: 70 }));
    rh.forEach((m, i) => out.push({ midi: m, start: from + i * 0.01, dur: len, velocity: 62 }));
  } else if (style === 'arp') {
    const r = lh[0];
    const s = rh[1] - rh[0];
    const f = rh[2] - rh[0];
    const pat = [r, r + f, r + 12, r + 12 + s, r + 12 + f, r + 12 + s, r + 12, r + f];
    let k = 0;
    for (let b = from; b < to - 1e-6; b += 0.5, k += 1) out.push({ midi: pat[k % pat.length], start: b, dur: Math.min(1.2, to - b), velocity: 66 });
  } else {
    lh.forEach((m) => out.push({ midi: m, start: from, dur: len, velocity: 70 }));
    for (let b = from; b < to - 1e-6; b += 1) rh.forEach((m) => out.push({ midi: m, start: b, dur: 0.85, velocity: 58 }));
  }
  return out;
}

const bufferCache = new Map();
async function decodeTake(id) {
  if (bufferCache.has(id)) return bufferCache.get(id);
  const blob = await getAudio(id);
  if (!blob) return null;
  const ctx = getAudioContext();
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  bufferCache.set(id, buf);
  return buf;
}

/**
 * opts: { bpm, time, notes (the line's melody), chords [{symbol, beat, until}],
 * fromBeat, toBeat, instrument 'guitar'|'piano', style 'strum'|'arp'|'block',
 * voice { takeId, downbeat } | null (null = the melody on the piano) }.
 * Resolves to { stop, duration } .
 */
export async function playHarmony({ bpm, time, notes, chords, fromBeat = 0, toBeat, instrument = 'guitar', style = 'strum', voice = null }) {
  const ctx = getAudioContext();
  if (ctx.state !== 'running') await ctx.resume().catch(() => {});
  const spb = 60 / (bpm || 90);
  const bpb = beatsPerBar(time);
  const buf = voice ? await decodeTake(voice.takeId).catch(() => null) : null;
  const startAt = ctx.currentTime + 0.15;
  const at = (beat) => (beat - fromBeat) * spb;
  const stops = [];
  // the accompaniment
  const acc = [];
  for (const c of chords) {
    const from = Math.max(c.beat, fromBeat);
    const to = Math.min(c.until, toBeat);
    const barStart = Math.floor(c.beat / bpb) * bpb;
    for (const n of accompaniment(c.symbol, from, to, barStart, { instrument, style, bpb })) acc.push({ midi: n.midi, start: at(n.start), dur: n.dur * spb, velocity: n.velocity });
  }
  if (instrument === 'guitar') stops.push(scheduleGuitarNotes(acc, startAt));
  else stops.push(schedulePianoNotes(acc, startAt, { velocity: 60 }));
  // the melody
  if (buf && voice) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const offset = voice.downbeat + fromBeat * spb;
    const dur = (toBeat - fromBeat) * spb + 0.3;
    if (offset >= 0) src.start(startAt, offset, dur);
    else src.start(startAt - offset, 0, dur + offset);
    stops.push(() => {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    });
  } else {
    const mel = notes.filter((n) => n.s + n.d > fromBeat && n.s < toBeat).map((n) => ({ midi: n.p, start: Math.max(0, at(n.s)), dur: n.d * spb * 0.95 }));
    stops.push(schedulePianoNotes(mel, startAt, { velocity: 95 }));
  }
  return { stop: () => stops.forEach((s) => s()), duration: (toBeat - fromBeat) * spb + 0.4 };
}
