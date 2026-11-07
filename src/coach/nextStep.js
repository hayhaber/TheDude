// The teacher's "what next" for the home cards' primary button (v1.0.160,
// user: "the teacher watches everything the player does and sends him to
// strengthen each weakness it finds"). Pure: reads the performance log.
//
// weakSpot(inst, perf)   — the worst recent weakness on THIS instrument that
//                          wasn't already worked on today, with how to train it.
// bassNext(level, perf)  — the next bass exercise for the student's level not
//                          yet played clean.
import { findWeaknesses } from './engine';
import { localDay } from './perfLog';
import { EXERCISES, CATEGORIES } from '../music/bass/bassPractice';

const DAY_MS = 24 * 60 * 60 * 1000;
// Entries logged before v1.0.160 carry no instrument: these tools exist on one
// instrument only; the rest were guitar.
const ONLY_ON = { chordRhythm: 'piano', fallingNotes: 'piano', bass: 'bass', bassFree: 'bass' };
export const instOf = (e) => e.instrument ?? ONLY_ON[e.tool] ?? 'guitar';

// A weakness's training block -> the perf-log tools that count as "worked on it".
const BLOCK_TOOLS = { minuteChanges: ['minuteChanges'], rhythm: ['rhythm'], bending: ['bending'], ear: ['ear'], chordChanges: ['chordChanges'] };

const playedToday = (mine, tools, today) => mine.some((e) => e.day === today && tools.includes(e.tool));

/**
 * The weakness to work on now, or null.
 *   guitar / piano ear: engine.findWeaknesses (only those with a training block)
 *     -> {source:'coach', title:{en,he}, launch: block}
 *   piano chord rhythm / flow, bass exercises: the last runs of one item
 *     -> {source:'runs', tool, item, kind:'notes'|'late'|'early'|'timing', pct, ms}
 */
export function weakSpot(inst, perf, now = Date.now()) {
  const today = localDay(now);
  const mine = perf.filter((e) => instOf(e) === inst);
  if (inst === 'guitar' || inst === 'piano') {
    for (const w of findWeaknesses(mine, now)) {
      if (!w.block) continue;
      if (inst === 'piano' && w.block.tool !== 'ear') continue;
      if (playedToday(mine, BLOCK_TOOLS[w.block.tool] ?? [w.block.tool], today)) continue;
      return { source: 'coach', key: w.key, title: w.title, launch: w.block };
    }
  }
  const tools = inst === 'piano' ? ['chordRhythm', 'fallingNotes'] : inst === 'bass' ? ['bass'] : [];
  const recent = mine.filter((e) => tools.includes(e.tool) && now - e.at < 14 * DAY_MS && Number.isFinite(e.metrics?.accuracyPct));
  const byItem = new Map();
  for (const e of recent) {
    const k = `${e.tool}|${e.item}`;
    if (!byItem.has(k)) byItem.set(k, []);
    byItem.get(k).push(e);
  }
  let best = null;
  for (const runs of byItem.values()) {
    const last = runs.slice(-4);
    if (last.length < 3) continue;
    const { tool, item } = last[0];
    if (playedToday(mine.filter((e) => e.item === item), [tool], today)) continue;
    const avg = (f) => {
      const v = last.map(f).filter(Number.isFinite);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    };
    const acc = avg((e) => e.metrics.accuracyPct);
    const timing = avg((e) => e.metrics.timingPct);
    const off = avg((e) => e.metrics.meanOffsetMs);
    let spot = null;
    if (acc < 75) spot = { kind: 'notes', pct: Math.round(acc), severity: (75 - acc) / 75 + 0.5 };
    else if (Number.isFinite(off) && Math.abs(off) >= 40) spot = { kind: off > 0 ? 'late' : 'early', ms: Math.round(Math.abs(off)), severity: Math.min(1, Math.abs(off) / 120) };
    else if (Number.isFinite(timing) && timing < 60) spot = { kind: 'timing', pct: Math.round(timing), severity: (60 - timing) / 60 };
    if (spot && (!best || spot.severity > best.severity)) best = { source: 'runs', tool, item, ...spot };
  }
  return best;
}

const RANGE = { 1: [0, 1], 2: [1, 2], 3: [2, 3] }; // exercise level -> student levels (as BassPracticeView)

/** Bass item id as BassPracticeView logs it. */
export const bassItem = (ex, key, rootString) => (ex.keyed ? `${ex.id}@${key}:${rootString}` : ex.id);

/** The first bass exercise made for this level, in the library's order, not yet played clean (>= 90 %). */
export function bassNext(level, perf, { key = 7, rootString = 0 } = {}, now = Date.now()) {
  const lv = level ?? 0;
  const today = localDay(now);
  const runs = perf.filter((e) => e.tool === 'bass' && e.metrics?.mode === 'play');
  for (const c of CATEGORIES) {
    for (const ex of EXERCISES.filter((e) => e.cat === c.key).sort((a, b) => a.level - b.level)) {
      const [lo, hi] = RANGE[ex.level];
      if (lv < lo || lv > hi) continue;
      const item = bassItem(ex, key, rootString);
      const mineRuns = runs.filter((e) => e.item === item);
      if (mineRuns.some((e) => (e.metrics.accuracyPct ?? 0) >= 90)) continue;
      if (mineRuns.some((e) => e.day === today)) continue; // worked on today: move on
      return { ex, item, key, rootString };
    }
  }
  return null;
}

/** Parses a bass item `<id>@<key>:<rootString>` (or a plain id). */
export function parseBassItem(item) {
  const m = String(item).match(/^([^@]+)(?:@(\d+):(\d+))?$/);
  return m ? { id: m[1], key: m[2] != null ? Number(m[2]) : null, rootString: m[3] != null ? Number(m[3]) : null } : null;
}
