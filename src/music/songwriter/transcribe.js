// Sung / played melody -> notes on the song's beat grid (Songwriter).
//
// Uses the Lick Trainer's offline analysis (spectral-flux attacks + McLeod
// pitch track + segmentation), then the parts singing needs on top:
//  - a singer is often consistently a bit sharp or flat: the take's own
//    tuning (circular mean of every frame's distance from the nearest
//    semitone) is removed before notes are rounded;
//  - vibrato can wobble across a semitone border: a short neighbour-tone
//    blip between two equal notes, with no new attack, is folded back;
//  - times are snapped to the grid from the count-in, ends stretched over a
//    gap smaller than one grid step (singers let go early).

import { rmsEnvelope, noiseFloorDb, spectralFlux, shortEnvelope, detectOnsets, pitchTrack, segmentEvents } from '../lickTrainer/analysis';

const MIN_NOTE_S = 0.07;

function circularMeanDev(values) {
  let x = 0;
  let y = 0;
  for (const v of values) {
    const a = 2 * Math.PI * (v - Math.round(v));
    x += Math.cos(a);
    y += Math.sin(a);
  }
  if (!values.length) return 0;
  return Math.atan2(y, x) / (2 * Math.PI);
}

/** The take's tuning offset in semitones (-0.5..0.5) — how sharp it was sung. */
export function tuningOffset(frames) {
  const ms = frames.filter((f) => f.midi != null).map((f) => f.midi);
  return circularMeanDev(ms);
}

function mergeEvents(events) {
  const out = [];
  for (const ev of events) {
    const prev = out[out.length - 1];
    // Same note again with no attack and (almost) no gap: one note.
    if (prev && !ev.hasOnset && ev.midi === prev.midi && ev.time - prev.endTime < 0.05) {
      prev.endTime = Math.max(prev.endTime, ev.endTime);
      continue;
    }
    out.push({ ...ev });
  }
  // A short neighbour tone (±1-2 semitones, no attack) between two equal
  // notes is vibrato or a scoop, not a note.
  const cleaned = [];
  for (let i = 0; i < out.length; i += 1) {
    const a = cleaned[cleaned.length - 1];
    const b = out[i];
    const c = out[i + 1];
    if (a && c && !b.hasOnset && !c.hasOnset && a.midi === c.midi && Math.abs(b.midi - a.midi) <= 2 && b.endTime - b.time < 0.16) {
      a.endTime = c.endTime;
      i += 1;
      continue;
    }
    cleaned.push(b);
  }
  return cleaned;
}

/**
 * samples/sampleRate: the take. `downbeat` = seconds into the take where the
 * line's beat 0 is (count-in end + latency), or null to put the first note
 * on beat 0. `clicks` = seconds into the take where count-in clicks were
 * heard (short events on them are dropped). Returns { notes: [{p, s, d}],
 * attacks: [bool], offset (semitones), events (raw, for tests) }.
 */
export function transcribe({ samples, sampleRate, bpm, beatsPerBar = 4, grid = 0.5, downbeat = null, clicks = [] }) {
  const env = rmsEnvelope(samples, sampleRate);
  const floor = noiseFloorDb(env);
  const onsets = detectOnsets(env, floor, spectralFlux(samples, sampleRate), shortEnvelope(samples, sampleRate));
  const raw = pitchTrack(samples, sampleRate, floor);
  const offset = tuningOffset(raw);
  const frames = raw.map((f) => (f.midi == null ? f : { ...f, midi: f.midi - offset }));
  let events = segmentEvents(frames, onsets).filter((ev) => ev.endTime - ev.time >= MIN_NOTE_S || (ev.hasOnset && ev.endTime - ev.time >= 0.05));
  events = events.filter((ev) => !clicks.some((c) => ev.time >= c - 0.02 && ev.time <= c + 0.06 && ev.endTime - ev.time < 0.12));
  events = mergeEvents(events);

  const spb = 60 / bpm;
  const zero = downbeat ?? (events[0]?.time ?? 0);
  // Nothing from before the last count-in bar (leaked clicks, a breath).
  events = events.filter((ev) => (ev.time - zero) / spb >= -beatsPerBar - 0.25);
  const hop = 256 / sampleRate;
  const snap = (b) => Math.round(b / grid) * grid;

  let notes = events.map((ev) => {
    const s = snap((ev.time - zero) / spb);
    const e = snap((ev.endTime + hop - zero) / spb);
    return { p: ev.midi, s, d: Math.max(grid, e - s), attack: ev.hasOnset };
  });
  // One note per grid slot: two snapped together keep the longer one's pitch.
  const bySlot = [];
  for (const n of notes) {
    const prev = bySlot[bySlot.length - 1];
    if (prev && prev.s === n.s) {
      if (n.d > prev.d) bySlot[bySlot.length - 1] = { ...n, attack: prev.attack || n.attack };
      continue;
    }
    bySlot.push(n);
  }
  notes = bySlot;
  for (let i = 0; i < notes.length; i += 1) {
    const next = notes[i + 1];
    if (!next) continue;
    const gap = next.s - (notes[i].s + notes[i].d);
    if (gap < 0) notes[i].d = Math.max(grid, next.s - notes[i].s);
    else if (gap <= grid + 1e-9) notes[i].d = next.s - notes[i].s;
  }
  return {
    notes: notes.map((n) => ({ p: n.p, s: n.s, d: n.d })),
    attacks: notes.map((n) => n.attack),
    offset,
    events,
  };
}
