// Mastery is derived, never stored: from the teacher's measured passes and
// the shared performance log (coach/perfLog.js). A skill is MASTERED when its
// check was met on 2 different days (a quiz / checklist: once), LEARNING
// when it was met once or practised, NEW otherwise.
import { localDay, perfFor } from '../coach/perfLog';
import { LESSONS, SKILLS, skillById } from './curriculum/guitar';

const DAYS_NEEDED = { chord: 2, changes: 2, quiz: 1, self: 1 };

/** One-minute-changes runs on a pair, either order. */
function changesRuns(pair, since = 0) {
  const [a, b] = pair;
  return [...perfFor({ tool: 'minuteChanges', item: `${a}>${b}`, since }), ...perfFor({ tool: 'minuteChanges', item: `${b}>${a}`, since })];
}
const perMinute = (e) => e.metrics?.perMinute ?? e.metrics?.count ?? 0;

export function skillStatus(skill, state) {
  const check = skill.check;
  let days = new Set(state.passes[skill.id] ?? []);
  let best = null;
  let tried = days.size > 0;
  if (check.kind === 'changes') {
    const runs = changesRuns(check.pair);
    tried = runs.length > 0;
    for (const r of runs) {
      best = Math.max(best ?? 0, perMinute(r));
      if (perMinute(r) >= check.min) days.add(r.day);
    }
  }
  const need = DAYS_NEEDED[check.kind] ?? 2;
  const status = days.size >= need ? 'mastered' : tried ? 'learning' : 'new';
  return { status, days: days.size, need, best };
}

export function allSkillStatus(state) {
  return Object.fromEntries(SKILLS.map((s) => [s.id, skillStatus(s, state)]));
}

/** Homework of a finished lesson: today's progress per item. */
export function homeworkStatus(item) {
  if (item.kind !== 'changes') return { kind: item.kind };
  const today = localDay();
  const week = Date.now() - 7 * 86400000;
  const runs = changesRuns(item.pair, week);
  const todayRuns = runs.filter((r) => r.day === today);
  const daysMet = new Set(runs.filter((r) => perMinute(r) >= item.min).map((r) => r.day)).size;
  const best = runs.length ? Math.max(...runs.map(perMinute)) : null;
  const bestToday = todayRuns.length ? Math.max(...todayRuns.map(perMinute)) : null;
  return { kind: 'changes', doneToday: todayRuns.length >= (item.perDay ?? 1), bestToday, best, daysMet };
}

/** The lesson to work on now: the one in progress, else the first not done. */
export function nextLesson(state) {
  const cur = state.current && LESSONS.find((l) => l.id === state.current);
  if (cur && !state.lessons[cur.id]?.done) return cur;
  return LESSONS.find((l) => !state.lessons[l.id]?.done) ?? null;
}

/** Homework still open: from finished lessons whose skills aren't all mastered. */
export function openHomework(state) {
  const out = [];
  for (const l of LESSONS) {
    if (!state.lessons[l.id]?.done || !l.homework) continue;
    const allMastered = l.skills.every((id) => skillStatus(skillById(id), state).status === 'mastered');
    if (allMastered) continue;
    for (const h of l.homework) out.push({ lesson: l, item: h });
  }
  return out;
}
