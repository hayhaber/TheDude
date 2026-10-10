// The coach's state as a small module-level store + React hook, over the
// pure engine (engine.js) and the performance log (perfLog.js).
//
// Persisted (per profile, key 'dudestar-coach'): the intake, the goals (with
// their placement results and rung log), each day's session
// (state.days[YYYY-MM-DD] = {blocks, createdAt}) and the running block
// (state.running), so a reload mid-block keeps the banner.
//
// Running block = {blockId, kind: 'block'|'placement', title, how, measure,
// minutes, startedAt, manual, placementIndex?, placementTotal?, goalId?,
// result?: {value, met, n, bpm}}. While it runs, perfLog stamps new entries
// with its id (setActiveCoachBlock); entries carrying it update its live
// result here. After it ends the stamp is kept for a short grace period, so
// a tool that only writes its run when it is left (Rhythm, Scale, Ear flush
// on leaving the tab) still credits the block it belonged to.

import { useSyncExternalStore } from 'react';
import {
  loadCoach,
  saveCoach,
  newCoachState,
  makeGoal,
  refreshGoal,
  buildSession,
  activeGoal,
  currentRungIndex,
  placementTests,
  COACH_KEY,
} from './engine';
import { goalByKey } from './goals';
import { loadPerf, onPerf, setActiveCoachBlock, localDay } from './perfLog';
import { launch } from './launchBus';

const GRACE_MS = 2500;
const KEEP_DAYS = 120;

let loaded = false;
let state = null;
let snap = { state: null, running: null, perfVersion: 0 };
const listeners = new Set();
let graceTimer = null;
let unsubscribePerf = null;

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  state = loadCoach();
  if (state?.running) setActiveCoachBlock(state.running.blockId);
  snap = { state, running: state?.running ?? null, perfVersion: 0 };
  if (!unsubscribePerf) unsubscribePerf = onPerf(handlePerf);
}

function emit(perfBump = false) {
  snap = { state, running: state?.running ?? null, perfVersion: snap.perfVersion + (perfBump ? 1 : 0) };
  listeners.forEach((fn) => fn());
}

function prune(days) {
  const keys = Object.keys(days ?? {}).sort();
  if (keys.length <= KEEP_DAYS) return days;
  const out = {};
  for (const k of keys.slice(-KEEP_DAYS)) out[k] = days[k];
  return out;
}

function commit(next, perfBump = false) {
  state = next ? { ...next, days: prune(next.days) } : null;
  if (state) saveCoach(state);
  emit(perfBump);
}

// ---------------------------------------------------------------------------
// Measuring a block's result from a perf entry
// ---------------------------------------------------------------------------

/** {value, met, bpm} of one entry against a measure, or null when it doesn't apply. */
export function measureEntry(measure, entry) {
  if (!measure || !entry || (measure.tool && entry.tool !== measure.tool)) return null;
  const value = entry.metrics?.[measure.field];
  if (!Number.isFinite(value)) return null;
  const atTempo = !measure.bpm || (entry.bpm ?? 0) >= measure.bpm - 1;
  const met = Number.isFinite(measure.target) ? atTempo && value >= measure.target : null;
  return { value, met, bpm: entry.bpm ?? null };
}

/** Folds a new measurement into a block's result: a met run beats an unmet one, then the higher value. */
function mergeResult(prev, m) {
  if (!m) return prev ?? null;
  if (!prev) return { ...m, n: 1 };
  const rank = (r) => (r.met === true ? 1 : 0);
  const pick = rank(m) > rank(prev) || (rank(m) === rank(prev) && m.value > prev.value) ? m : prev;
  return { value: pick.value, met: pick.met, bpm: pick.bpm ?? null, n: (prev.n ?? 1) + 1 };
}

function parsePlacementId(id) {
  const m = /^placement:([^:]+):(\d+)$/.exec(String(id ?? ''));
  return m ? { goalId: m[1], index: Number(m[2]) } : null;
}

function handlePerf(entry) {
  if (!state) {
    emit(true);
    return;
  }
  let next = state;
  const blockId = entry.coach?.blockId;
  if (blockId) {
    const run = next.running;
    if (run && run.blockId === blockId) {
      const result = mergeResult(run.result, measureEntry(run.measure, entry));
      next = { ...next, running: { ...run, result } };
    }
    const pl = parsePlacementId(blockId);
    if (pl) {
      next = {
        ...next,
        goals: next.goals.map((g) => {
          if (g.id !== pl.goalId) return g;
          const goal = goalByKey(g.goalKey);
          const test = goal ? placementTests(goal, g.params)[pl.index] : null;
          const m = measureEntry(test?.measure, entry);
          if (!m) return g;
          const prev = g.placement?.[pl.index];
          const result = mergeResult(prev?.result, m);
          const status = result.met === false ? 'failed' : 'done';
          return { ...g, placement: { ...(g.placement ?? {}), [pl.index]: { status, result } } };
        }),
      };
    } else {
      // A finished block of some day's session (the grace period after Done).
      const days = { ...next.days };
      let changed = false;
      for (const [day, s] of Object.entries(days)) {
        const i = s.blocks?.findIndex((b) => b.id === blockId) ?? -1;
        if (i < 0) continue;
        const b = s.blocks[i];
        if (b.done) {
          const result = mergeResult(b.result, measureEntry(b.measure, entry));
          if (result !== b.result) {
            const blocks = [...s.blocks];
            blocks[i] = { ...b, result };
            days[day] = { ...s, blocks };
            changed = true;
          }
        }
      }
      if (changed) next = { ...next, days };
    }
  }
  // New measurements can reach a rung.
  const perf = loadPerf();
  next = { ...next, goals: next.goals.map((g) => (g.status === 'placement' ? g : refreshGoal(g, perf))) };
  commit(next, true);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function todayKey() {
  return localDay();
}

/** Today's blocks are rebuilt lazily (no done block is ever lost). */
function dropTodayIfUntouched(s) {
  const day = todayKey();
  const today = s.days?.[day];
  if (!today || today.blocks.some((b) => b.done)) return s;
  const days = { ...s.days };
  delete days[day];
  return { ...s, days };
}

export function setIntake(intake) {
  ensureLoaded();
  if (!state) commit(newCoachState(intake));
  else commit(dropTodayIfUntouched({ ...state, intake: { ...state.intake, ...intake } }));
}

export function chooseGoal(goalKey, params = {}) {
  ensureLoaded();
  if (!goalByKey(goalKey)) return null;
  const base = state ?? newCoachState({});
  const g = makeGoal(goalKey, params, loadPerf());
  const goals = base.goals.map((x) => (x.id === base.activeGoalId && x.status !== 'done' ? { ...x, status: x.status === 'placement' ? 'dropped' : 'paused' } : x));
  commit(dropTodayIfUntouched({ ...base, goals: [...goals, { ...g, placement: {}, planSeen: false }], activeGoalId: g.id }));
  return g.id;
}

export function skipPlacement(index) {
  ensureLoaded();
  const g = activeGoal(state);
  if (!g) return;
  commit({
    ...state,
    goals: state.goals.map((x) => (x.id === g.id ? { ...x, placement: { ...(x.placement ?? {}), [index]: { status: 'skipped' } } } : x)),
  });
}

/** Clears a placement test's record (to run it again). */
export function retryPlacement(index) {
  ensureLoaded();
  const g = activeGoal(state);
  if (!g) return;
  const placement = { ...(g.placement ?? {}) };
  delete placement[index];
  commit({ ...state, goals: state.goals.map((x) => (x.id === g.id ? { ...x, placement } : x)) });
}

/** Placement over: the start rung comes from what was measured; the plan starts now. */
export function finishPlacement() {
  ensureLoaded();
  const g = activeGoal(state);
  if (!g) return;
  const goal = goalByKey(g.goalKey);
  const perf = loadPerf();
  const startRung = currentRungIndex(goal, g.params, perf);
  const now = Date.now();
  const refreshed = refreshGoal({ ...g, startRung, createdAt: now, status: 'active' }, perf, now);
  if (state.running?.kind === 'placement') endBlock();
  commit(dropTodayIfUntouched({ ...state, goals: state.goals.map((x) => (x.id === g.id ? refreshed : x)) }));
}

/** From the plan summary back to the placement list. */
export function reopenPlacement() {
  ensureLoaded();
  const g = activeGoal(state);
  if (!g) return;
  commit({ ...state, goals: state.goals.map((x) => (x.id === g.id ? { ...x, status: 'placement', planSeen: false } : x)) });
}

/** The student saw the plan summary and pressed Start. */
export function acceptPlan() {
  ensureLoaded();
  const g = activeGoal(state);
  if (!g) return;
  commit({ ...state, goals: state.goals.map((x) => (x.id === g.id ? { ...x, planSeen: true } : x)) });
  ensureToday();
}

/** Builds today's session if there's an active plan and none yet. */
export function ensureToday() {
  ensureLoaded();
  const g = activeGoal(state);
  if (!state || !g || !g.planSeen) return null;
  const day = todayKey();
  if (state.days?.[day]) return state.days[day];
  const blocks = buildSession(state, loadPerf(), undefined, day);
  const session = { blocks, createdAt: Date.now() };
  commit({ ...state, days: { ...(state.days ?? {}), [day]: session } });
  return session;
}

/** Rebuilds today's session; finished blocks stay. */
export function regenerateToday() {
  ensureLoaded();
  if (!state) return;
  const day = todayKey();
  const old = state.days?.[day];
  const done = (old?.blocks ?? []).filter((b) => b.done);
  const doneTitles = new Set(done.map((b) => `${b.kind}|${b.title?.en}`));
  const n = (old?.regen ?? 0) + 1;
  const fresh = buildSession(state, loadPerf(), undefined, day)
    .filter((b) => !doneTitles.has(`${b.kind}|${b.title?.en}`))
    .map((b, i) => ({ ...b, id: `${day}:r${n}:${i}` }));
  // Keep the template's order: done blocks where they were, the rest after.
  const order = ['warm', 'goal', 'fix', 'support', 'break', 'music'];
  const blocks = [...done, ...fresh].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  if (state.running && !blocks.some((b) => b.id === state.running.blockId) && state.running.kind === 'block') endBlock();
  commit({ ...state, days: { ...state.days, [day]: { blocks, createdAt: Date.now(), regen: n } } });
}

export function markBlockDone(blockId, { spentMin, result } = {}) {
  ensureLoaded();
  if (!state) return;
  const days = { ...state.days };
  for (const [day, s] of Object.entries(days)) {
    const i = s.blocks?.findIndex((b) => b.id === blockId) ?? -1;
    if (i < 0) continue;
    const blocks = [...s.blocks];
    const b = blocks[i];
    blocks[i] = {
      ...b,
      done: true,
      doneAt: Date.now(),
      spentMin: Number.isFinite(spentMin) ? spentMin : b.minutes,
      result: result ?? b.result ?? null,
    };
    days[day] = { ...s, blocks };
  }
  const wasRunning = state.running?.blockId === blockId;
  commit({ ...state, days });
  if (wasRunning) endBlock();
}

/** Re-opens a finished block (tapped Done by mistake). */
export function undoBlock(blockId) {
  ensureLoaded();
  if (!state) return;
  const days = { ...state.days };
  for (const [day, s] of Object.entries(days)) {
    if (!s.blocks?.some((b) => b.id === blockId)) continue;
    days[day] = { ...s, blocks: s.blocks.map((b) => (b.id === blockId ? { ...b, done: false, doneAt: undefined } : b)) };
  }
  commit({ ...state, days });
}

/**
 * Runs a block: stamps the perf log with its id and opens its tool (a block
 * without `launch` is a manual one — just a timer on the coach page).
 * opts: {kind: 'block'|'placement', placementIndex, placementTotal, goalId}
 */
export function startBlock(block, opts = {}) {
  ensureLoaded();
  if (!state || !block?.id) return;
  if (graceTimer) {
    clearTimeout(graceTimer);
    graceTimer = null;
  }
  const kind = opts.kind ?? (String(block.id).startsWith('placement:') ? 'placement' : 'block');
  const prev = state.running?.blockId === block.id ? state.running : null;
  const running = {
    blockId: block.id,
    kind,
    title: block.title,
    how: block.how,
    measure: block.measure ?? null,
    minutes: block.minutes ?? 1,
    startedAt: prev?.startedAt ?? Date.now(),
    manual: !block.launch,
    ...(kind === 'placement' ? { placementIndex: opts.placementIndex ?? 0, placementTotal: opts.placementTotal ?? 1, goalId: opts.goalId } : {}),
    ...(prev?.result ? { result: prev.result } : {}),
  };
  setActiveCoachBlock(block.id);
  commit({ ...state, running });
  if (block.launch) launch(block.launch);
}

/** Stops the running block (its perf stamp lingers briefly — see the header). */
export function endBlock() {
  ensureLoaded();
  if (!state?.running) return;
  const id = state.running.blockId;
  if (graceTimer) clearTimeout(graceTimer);
  graceTimer = setTimeout(() => {
    graceTimer = null;
    if (!state?.running) setActiveCoachBlock(null);
    else if (state.running.blockId !== id) setActiveCoachBlock(state.running.blockId);
  }, GRACE_MS);
  commit({ ...state, running: null });
}

/** Everything the coach knows about this profile goes (the perf log stays). */
export function resetCoach() {
  ensureLoaded();
  if (graceTimer) clearTimeout(graceTimer);
  graceTimer = null;
  setActiveCoachBlock(null);
  try {
    localStorage.removeItem(COACH_KEY);
  } catch {
    /* storage unavailable */
  }
  state = null;
  emit();
}

// ---------------------------------------------------------------------------
// React
// ---------------------------------------------------------------------------

function subscribe(fn) {
  ensureLoaded();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot() {
  ensureLoaded();
  return snap;
}

export function useCoach() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    state: s.state,
    running: s.running,
    perfVersion: s.perfVersion,
    today: s.state?.days?.[localDay()] ?? null,
    setIntake,
    chooseGoal,
    skipPlacement,
    retryPlacement,
    finishPlacement,
    reopenPlacement,
    acceptPlan,
    ensureToday,
    regenerateToday,
    markBlockDone,
    undoBlock,
    startBlock,
    endBlock,
    resetCoach,
  };
}
