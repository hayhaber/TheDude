// The player's SPEED LEVEL across exercises (user, 2026-11-07: "if the
// system knows I'm more skilled it mustn't start me slow in other
// exercises — it should keep learning"). Measured as the notes per second
// the player plays ACCURATELY (right notes + in time), from the performance
// log, so every tool that logs `metrics.nps` + `metrics.passed` feeds it and
// every tool can start from it.
import { loadPerf } from './perfLog';

const DAY = 86400000;

/** Did this run count as "played it right"? */
export function passed(e) {
  const m = e?.metrics ?? {};
  if (typeof m.passed === 'boolean') return m.passed;
  if (e.tool === 'lick') return m.mode !== 'wait' && (m.score ?? 0) >= 85;
  if (m.accuracyPct != null) return m.accuracyPct >= 90 && (m.timingPct ?? 100) >= 70;
  return false;
}

/** Notes per second of a run, when known. */
export function npsOf(e) {
  const m = e?.metrics ?? {};
  if (Number.isFinite(m.nps)) return m.nps;
  // one note per beat
  if ((e.tool === 'scale' || e.tool === 'rhythm') && Number.isFinite(e.bpm)) return e.bpm / 60;
  return null;
}

/**
 * The speed the player is fluent at (notes / s): the 2nd best passing run of
 * the last 60 days (one lucky take doesn't set the level), else 90 % of the
 * only one; null = nothing measured yet.
 */
export function fluentNps({ tools = null, days = 60, perf = loadPerf() } = {}) {
  const since = Date.now() - days * DAY;
  const v = perf
    .filter((e) => e.at >= since && (!tools || tools.includes(e.tool)) && passed(e))
    .map(npsOf)
    .filter((x) => Number.isFinite(x) && x > 0)
    .sort((a, b) => b - a);
  if (!v.length) return null;
  return v.length >= 2 ? v[1] : v[0] * 0.9;
}

/** The last tempo this exact item was played right at (bpm), or null. */
export function lastPassedBpm({ tool, item, perf = loadPerf() }) {
  for (let i = perf.length - 1; i >= 0; i -= 1) {
    const e = perf[i];
    if (e.tool === tool && e.item === item && passed(e) && Number.isFinite(e.bpm)) return e.bpm;
  }
  return null;
}

/**
 * Where a beat-based exercise starts: the item's last passed tempo; else the
 * player's fluent speed (a little under it, converted with the exercise's
 * notes per beat); never below the exercise's own suggestion.
 * Returns { bpm, why: 'item' | 'level' | 'default' }.
 */
export function startBpm({ tool, item, suggested, notesPerBeat = 1, min = 40, max = 220 }) {
  const clamp = (x) => Math.max(min, Math.min(max, Math.round(x)));
  const mine = lastPassedBpm({ tool, item });
  if (mine) return { bpm: clamp(mine), why: 'item' };
  const f = fluentNps();
  if (f) {
    const fromLevel = (f * 60 * 0.85) / notesPerBeat;
    if (fromLevel > suggested) return { bpm: clamp(fromLevel), why: 'level' };
  }
  return { bpm: clamp(suggested), why: 'default' };
}

/**
 * The next tempo after a run (adaptive practice): right + in time = up a
 * step, struggling = down a step, otherwise the same.
 * Returns { bpm, change: 'up' | 'down' | 'same' }.
 */
export function nextBpm({ bpm, notesPct, timingPct, min = 40, max = 220 }) {
  if (notesPct >= 90 && (timingPct ?? 100) >= 70) return { bpm: Math.min(max, Math.max(bpm + 4, Math.round(bpm * 1.08))), change: 'up' };
  if (notesPct < 75 || (timingPct != null && timingPct < 45)) return { bpm: Math.max(min, Math.min(bpm - 4, Math.round(bpm * 0.92))), change: 'down' };
  return { bpm, change: 'same' };
}
