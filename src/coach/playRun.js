// Shared bits of a judged play-along run (piano Chord rhythm + Flow; the
// guitar useRhythmGame has the same logic inline): the result of a run and
// what the tempo does next (adaptive / find-my-speed).
import { nextBpm } from './skillLevel';

/**
 * total = items in the run, hits = right ones, onTime = right AND within
 * ±onTimeMs of their click, offsets = signed ms of every hit (− early).
 */
export function runResult({ bpm, total, hits, onTime, offsets, wrong = 0, maxCombo = 0, judged, onTimeMs }) {
  const mean = offsets.length ? offsets.reduce((a, b) => a + b, 0) / offsets.length : null;
  const spread = offsets.length >= 2 ? Math.sqrt(offsets.reduce((a, b) => a + (b - mean) ** 2, 0) / offsets.length) : null;
  const notesPct = total ? Math.round((hits / total) * 100) : 0;
  const timingPct = hits ? Math.round((onTime / hits) * 100) : null;
  const res = {
    bpm,
    total,
    hits,
    misses: total - hits,
    wrong,
    onTime,
    onTimeMs,
    notesPct,
    timingPct,
    meanOffsetMs: mean == null ? null : Math.round(mean),
    spreadMs: spread == null ? null : Math.round(spread),
    maxCombo,
    complete: judged >= total,
  };
  res.passed = res.complete && notesPct >= 90 && (timingPct ?? 0) >= 70;
  return res;
}

/**
 * The tempo after a run. find = "find my speed" running; best = its fastest
 * clean pass so far. Returns { tempo, bpm, again, best, stopFind }:
 * again = run once more at `bpm` (find-speed loop), stopFind = the loop ended.
 */
export function tempoAfter({ res, bpm, find, best, auto, min = 40, max = 220 }) {
  if (find) {
    if (res.passed) {
      const up = Math.min(max, Math.max(bpm + 4, Math.round(bpm * 1.08)));
      return { tempo: { change: 'speedUp', from: bpm, to: up }, bpm: up, again: true, best: bpm };
    }
    const settle = best ?? Math.max(min, Math.round(bpm * 0.92));
    return { tempo: { change: 'speedFound', from: bpm, to: settle, best: best ?? null }, bpm: settle, again: false, best, stopFind: true };
  }
  if (auto && res.complete) {
    const nb = nextBpm({ bpm, notesPct: res.notesPct, timingPct: res.timingPct, min, max });
    return { tempo: { change: nb.change, from: bpm, to: nb.bpm }, bpm: nb.bpm, again: false, best };
  }
  return { tempo: null, bpm, again: false, best };
}
