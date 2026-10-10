// Rewards store: XP / level / streak / achievements (pure logic in
// achievements.js) + the stored bits that must survive the capped perf log,
// and the event stream the app-wide toast listens to.
//
// Stored per profile (key starts with 'dudestar-coach'):
//   { unlocked: { [achievementId]: ms }, xpDays: { 'YYYY-MM-DD': xp } }
// `unlocked` keeps each badge's first date for good; `xpDays` banks finished
// days' XP (see totalXp).
//
// Events (subscribeRewardEvents): after each new perf entry the rewards are
// recomputed and compared with the state before it:
//   {type: 'daily', title}, {type: 'weekly', title}, {type: 'achievement', id, icon, title},
//   {type: 'level', level}
// Unlocks found on first load (history from before this feature) are stored
// silently — only a NEW run raises a toast.

import { computeRewards } from './achievements';
import { challengeHistory, currentChallenges } from './useChallenges';
import { loadPerf, onPerf, localDay } from './perfLog';
import { loadCoach } from './engine';

export const REWARDS_KEY = 'dudestar-coach-rewards';

function readStore() {
  try {
    const v = JSON.parse(localStorage.getItem(REWARDS_KEY));
    if (v && typeof v === 'object') return { unlocked: v.unlocked ?? {}, xpDays: v.xpDays ?? {} };
  } catch {
    /* none yet */
  }
  return { unlocked: {}, xpDays: {} };
}

function writeStore(s) {
  try {
    localStorage.setItem(REWARDS_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Computes everything (rewards + current challenges) and persists the bank
 * and any new unlock dates. Pure apart from that storage write.
 */
export function getRewards({ perf = loadPerf(), coach = loadCoach(), day = localDay() } = {}) {
  const store = readStore();
  const challenges = currentChallenges(perf, day);
  const hist = challengeHistory(perf);
  const r = computeRewards({
    perf,
    coach,
    challengeDays: hist.challengeDays,
    dailyDoneAts: hist.dailyDoneAts,
    weeklyDone: hist.weeklyDone,
    weeklyProgress: challenges.weekly?.status.progress ?? 0,
    bank: store.xpDays,
    unlocked: store.unlocked,
    today: day,
  });
  const unlocked = { ...store.unlocked };
  let changed = JSON.stringify(r.bank) !== JSON.stringify(store.xpDays);
  for (const a of r.achievements) {
    if (a.status.done && !unlocked[a.id]) {
      unlocked[a.id] = Number.isFinite(a.status.at) ? a.status.at : Date.now();
      changed = true;
    }
  }
  if (changed) writeStore({ unlocked, xpDays: r.bank });
  return { ...r, challenges };
}

// ---------------------------------------------------------------------------
// Events for the toast
// ---------------------------------------------------------------------------

const eventListeners = new Set();
let baseline = null;
let perfUnsub = null;

function snapshotOf(r) {
  return {
    day: r.challenges.day,
    daily: new Set(r.challenges.today.filter((c) => c.status.done).map((c) => c.id)),
    weekly: !!r.challenges.weekly?.status.done,
    badges: new Set(r.achievements.filter((a) => a.status.done).map((a) => a.id)),
    level: r.level.level,
  };
}

function handleEntry() {
  // Let the coach store (also an onPerf listener) commit first: rungs and
  // goals reached by this entry count for the badges.
  setTimeout(() => {
    let r;
    try {
      r = getRewards();
    } catch {
      return;
    }
    const now = snapshotOf(r);
    const before = baseline;
    baseline = now;
    if (!before) return;
    const events = [];
    const sameDay = before.day === now.day;
    for (const c of r.challenges.today) {
      if (c.status.done && (!sameDay || !before.daily.has(c.id))) events.push({ type: 'daily', title: c.title });
    }
    if (now.weekly && !before.weekly) events.push({ type: 'weekly', title: r.challenges.weekly.title });
    for (const a of r.achievements) {
      if (a.status.done && !before.badges.has(a.id)) events.push({ type: 'achievement', id: a.id, icon: a.icon, title: a.title });
    }
    if (now.level > before.level) events.push({ type: 'level', level: now.level });
    if (events.length) eventListeners.forEach((fn) => fn(events));
  }, 60);
}

/** Subscribe to reward events (arrays of events). Returns unsubscribe. */
export function subscribeRewardEvents(fn) {
  eventListeners.add(fn);
  if (!baseline) {
    try {
      baseline = snapshotOf(getRewards());
    } catch {
      baseline = null;
    }
  }
  if (!perfUnsub) perfUnsub = onPerf(handleEntry);
  return () => {
    eventListeners.delete(fn);
  };
}
