// Daily + weekly challenges: the stored record + React hook over the pure
// logic in challenges.js.
//
// Record (per profile — the key starts with 'dudestar-coach'):
//   { v: 1, seed, days: { 'YYYY-MM-DD': { specs: [spec×3], rerolled } },
//     weeks: { '<Sunday YYYY-MM-DD>': spec } }
// A day's / week's specs are generated the first time they're needed and
// then kept, so they never drift while the student plays and past days
// keep exactly the challenges they had (XP and badges recompute from them).

import { useSyncExternalStore } from 'react';
import { generateDaily, rerollSpec, evaluate, generateWeekly, evaluateWeekly, weekKeyOf, weekDays } from './challenges';
import { loadPerf, onPerf, localDay } from './perfLog';
import { loadCoach } from './engine';
import { launch } from './launchBus';

export const CHALLENGES_KEY = 'dudestar-coach-challenges';
const KEEP_DAYS = 400;
const KEEP_WEEKS = 60;

let record = null;
let version = 0;
const listeners = new Set();
let perfUnsub = null;

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(CHALLENGES_KEY));
    if (v && typeof v === 'object' && v.days && v.weeks) return v;
  } catch {
    /* none yet */
  }
  return { v: 1, seed: Math.random().toString(36).slice(2, 10), days: {}, weeks: {} };
}

function load() {
  if (!record) record = read();
  if (!perfUnsub) perfUnsub = onPerf(() => bump());
  return record;
}

function prune(obj, keep) {
  const keys = Object.keys(obj).sort();
  if (keys.length <= keep) return obj;
  const out = {};
  for (const k of keys.slice(-keep)) out[k] = obj[k];
  return out;
}

function save(next) {
  record = { ...next, days: prune(next.days, KEEP_DAYS), weeks: prune(next.weeks, KEEP_WEEKS) };
  try {
    localStorage.setItem(CHALLENGES_KEY, JSON.stringify(record));
  } catch {
    /* storage unavailable */
  }
  // Async: specs are generated lazily while a view renders — notifying
  // React synchronously there would update a component mid-render.
  queueMicrotask(bump);
}

function bump() {
  version += 1;
  listeners.forEach((fn) => fn());
}

/** Today's three specs (generated and stored on first use). */
export function ensureDay(day = localDay(), perf = loadPerf()) {
  const r = load();
  if (r.days[day]?.specs?.length) return r.days[day];
  const specs = generateDaily({ perf, day, coach: loadCoach(), seedKey: r.seed });
  const rec = { specs, rerolled: false };
  save({ ...r, days: { ...r.days, [day]: rec } });
  return rec;
}

/** This week's spec (generated and stored on first use). */
export function ensureWeek(day = localDay(), perf = loadPerf()) {
  const r = load();
  const wk = weekKeyOf(day);
  if (r.weeks[wk]) return r.weeks[wk];
  const spec = generateWeekly({ perf, weekKey: wk, coach: loadCoach(), seedKey: r.seed });
  save({ ...r, weeks: { ...r.weeks, [wk]: spec } });
  return spec;
}

/** Swap one of today's challenges (once a day, not a finished one). */
export function rerollToday(index) {
  const day = localDay();
  const perf = loadPerf();
  const rec = ensureDay(day, perf);
  if (rec.rerolled) return false;
  const st = evaluate(rec.specs, perf.filter((e) => e.day === day))[index];
  if (!st || st.status.done) return false;
  const specs = rerollSpec({ specs: rec.specs, index, perf, day, coach: loadCoach(), seedKey: record.seed });
  if (specs === rec.specs) return false;
  save({ ...record, days: { ...record.days, [day]: { specs, rerolled: true } } });
  return true;
}

export function startChallenge(ch) {
  if (ch?.launch) return launch(ch.launch);
  return false;
}

/**
 * Every stored day / week evaluated against the log — for XP and badges.
 * -> {challengeDays: {day: [status]}, dailyDoneAts: [ms], weeklyDone: [{at, day, week}]}
 */
export function challengeHistory(perf = loadPerf()) {
  const r = load();
  const byDay = new Map();
  for (const e of perf) {
    if (!byDay.has(e.day)) byDay.set(e.day, []);
    byDay.get(e.day).push(e);
  }
  const challengeDays = {};
  const dailyDoneAts = [];
  for (const [day, rec] of Object.entries(r.days)) {
    const list = evaluate(rec.specs ?? [], byDay.get(day) ?? []).map((c) => c.status);
    challengeDays[day] = list;
    for (const s of list) if (s.done && Number.isFinite(s.at)) dailyDoneAts.push(s.at);
  }
  const weeklyDone = [];
  for (const [wk, spec] of Object.entries(r.weeks)) {
    const days = new Set(weekDays(wk));
    const ev = evaluateWeekly(spec, perf.filter((e) => days.has(e.day)));
    if (ev?.status.done) {
      const at = ev.status.at;
      weeklyDone.push({ week: wk, at, day: Number.isFinite(at) ? localDay(at) : wk });
    }
  }
  return { challengeDays, dailyDoneAts, weeklyDone };
}

/** Today's challenges + this week's, evaluated now. */
export function currentChallenges(perf = loadPerf(), day = localDay()) {
  const rec = ensureDay(day, perf);
  const week = ensureWeek(day, perf);
  const today = evaluate(rec.specs, perf.filter((e) => e.day === day));
  const days = weekDays(weekKeyOf(day));
  const weekly = evaluateWeekly(week, perf.filter((e) => days.includes(e.day)));
  const daysLeft = days.length - days.indexOf(day) - 1;
  return { day, today, rerolled: !!rec.rerolled, weekly, weekEnd: days[6], daysLeft };
}

// ---------------------------------------------------------------------------
// React
// ---------------------------------------------------------------------------

function subscribe(fn) {
  load();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const getVersion = () => version;

/** Re-renders on new perf entries and on challenge changes; returns the version. */
export function useChallengesVersion() {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}
