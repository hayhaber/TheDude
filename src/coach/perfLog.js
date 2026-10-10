// The personal performance log: one entry per measured run of any tool
// (a Lick Trainer take, a Rhythm Practice run, a Chord Changes run, a
// bending round, an ear-training session, a one-minute-changes test…).
// The coach reads it for placement, progress charts and weak spots.
// Stored per profile (the key is in profileStorage's personal list).
//
// entry = {
//   id, at (ms), day ('YYYY-MM-DD', LOCAL date),
//   tool: 'lick' | 'rhythm' | 'scale' | 'chordChanges' | 'bending' | 'ear'
//         | 'drill' | 'minuteChanges' | 'soloOpener',
//   item: string            // what was practised (lick id, drill id, 'G>C', ear mode…)
//   bpm?: number, durationMs?: number,
//   metrics: { ... }        // tool-specific numbers, see each caller
//   coach?: { blockId }     // set while a coach block is running
// }

const KEY = 'dudestar-perf-log';
const MAX = 3000;
const listeners = new Set();
let activeBlock = null; // the coach block a run belongs to (set by the coach)

export function localDay(ts = Date.now()) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function loadPerf() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function logPerf({ tool, item, metrics = {}, bpm, durationMs }) {
  if (!tool) return null;
  const at = Date.now();
  const entry = {
    id: `${at.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at,
    day: localDay(at),
    tool,
    item: item == null ? '' : String(item),
    ...(Number.isFinite(bpm) ? { bpm: Math.round(bpm) } : {}),
    ...(Number.isFinite(durationMs) ? { durationMs: Math.round(durationMs) } : {}),
    metrics,
    ...(activeBlock ? { coach: { blockId: activeBlock } } : {}),
  };
  const all = loadPerf();
  all.push(entry);
  if (all.length > MAX) all.splice(0, all.length - MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage full / unavailable */
  }
  listeners.forEach((fn) => fn(entry));
  return entry;
}

/** Subscribe to new entries (returns unsubscribe). */
export function onPerf(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setActiveCoachBlock(blockId) {
  activeBlock = blockId || null;
}

export function perfFor({ tool, item, since = 0 } = {}) {
  return loadPerf().filter((e) => (!tool || e.tool === tool) && (item == null || e.item === item) && e.at >= since);
}
