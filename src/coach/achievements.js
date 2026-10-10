// Rewards (pure logic): XP + levels, the practice streak, and achievements
// (badges) — all computed from the performance log (perfLog.js), the coach
// state (engine.js) and the challenge record (useChallenges.js).
//
// Design rule (from the competitor review — Yousician / Rocksmith+ / Gibson
// users say XP motivates, but warn it can reward speed over technique):
// XP pays for QUALITY and CONSISTENCY, not volume.
//   • every measured run: a little (RUN)
//   • a clean run (≥ 85 % / score 85+, enough notes judged): CLEAN
//   • a new personal best on that exercise (accuracy at the same or a faster
//     tempo — never speed alone): BEST
//     -> these three are capped per day (RUN_CAP), so grinding doesn't pay
//   • a practice day (10+ measured minutes or 3+ runs): DAY, plus a streak
//     bonus that grows a little each consecutive day (STREAK_STEP, max STREAK_MAX)
//   • daily challenge done: DAILY each (+ DAILY_ALL for all three);
//     weekly challenge: WEEKLY
//   • coach: a session block done (on a day with measured practice), a rung
//     reached (not the ones placement found), a goal completed
// Levels: level n -> n+1 needs 100 + 40·(n-1) XP (gentle: ~1 level / 1–2
// days at first, ~1 / week after a few months of steady practice).

import { judged, substantial } from './challenges';

const DAY_MS = 86400000;

export const XP = {
  RUN: 2,
  CLEAN: 8,
  BEST: 10,
  RUN_CAP: 60,
  DAY: 10,
  STREAK_STEP: 5,
  STREAK_MAX: 25,
  DAILY: 15,
  DAILY_ALL: 10,
  WEEKLY: 100,
  BLOCK: 5,
  RUNG: 40,
  GOAL: 150,
};

const num = (v) => (Number.isFinite(v) ? v : null);

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

export const xpForStep = (level) => 100 + 40 * (level - 1);

/** total XP -> {level, into (XP inside this level), need (XP for the next), total} */
export function levelFor(total) {
  let level = 1;
  let left = Math.max(0, Math.floor(total));
  while (left >= xpForStep(level)) {
    left -= xpForStep(level);
    level += 1;
  }
  return { level, into: left, need: xpForStep(level), total: Math.max(0, Math.floor(total)) };
}

// ---------------------------------------------------------------------------
// Days and streaks
// ---------------------------------------------------------------------------

function dayAdd(day, n) {
  const d = new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)), 12);
  d.setDate(d.getDate() + n);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Streak over a set of practice days. `current` counts back from today, or
 * from yesterday when today has nothing yet (the streak is still alive).
 * Also returns the longest run ever and, per day, its position in its run.
 */
export function streakInfo(daySet, today) {
  const days = [...daySet].sort();
  const position = new Map();
  let best = 0;
  let bestEndAt = null;
  let run = 0;
  let prev = null;
  for (const d of days) {
    run = prev && dayAdd(prev, 1) === d ? run + 1 : 1;
    position.set(d, run);
    if (run > best) {
      best = run;
      bestEndAt = d;
    }
    prev = d;
  }
  let current = 0;
  let cursor = daySet.has(today) ? today : dayAdd(today, -1);
  while (daySet.has(cursor)) {
    current += 1;
    cursor = dayAdd(cursor, -1);
  }
  return { current, best, bestEndAt, position, practisedToday: daySet.has(today) };
}

// ---------------------------------------------------------------------------
// Quality of one run
// ---------------------------------------------------------------------------

/** A clean run: accurate enough, on enough notes, to count as quality practice. */
export function isClean(e) {
  const m = e.metrics ?? {};
  switch (e.tool) {
    case 'lick':
      return (m.score ?? 0) >= 85;
    case 'rhythm':
    case 'scale':
    case 'chordChanges':
      return (m.accuracyPct ?? 0) >= 85 && judged(e) >= 8;
    case 'bending':
      return (m.accuracyPct ?? 0) >= 85 && (m.steps ?? 0) >= 5;
    case 'ear':
      return (m.accuracyPct ?? 0) >= 85 && (m.total ?? 0) >= 10;
    case 'minuteChanges':
      return (m.perMinute ?? 0) >= 15 && (m.wrong ?? 0) <= 2;
    default:
      // No accuracy to judge (drills, solo opener, wait mode): focused time.
      return (num(e.durationMs) ?? 0) >= 3 * 60000;
  }
}

/** What a personal best is compared on, per exercise (null = no PBs for this tool). */
function pbKey(e) {
  switch (e.tool) {
    case 'lick':
    case 'rhythm':
    case 'scale':
    case 'bending':
      return `${e.tool}|${e.item}`;
    case 'ear':
      return (e.metrics?.total ?? 0) >= 10 ? `ear|${e.item}` : null;
    case 'chordChanges':
      return `cc|${String(e.metrics?.chords ?? e.item).trim()}`;
    case 'minuteChanges': {
      const [a, b] = String(e.item).split('>');
      return `mc|${[a, b].sort().join('>')}`;
    }
    default:
      return null;
  }
}

/**
 * Is `e` a personal best against `prev` (the best record so far for its
 * key)? Accuracy only counts at the same or a faster tempo, and a faster
 * tempo only counts when it's clean — never speed alone.
 * Returns the updated record.
 */
function pbStep(e, prev) {
  const m = e.metrics ?? {};
  const bpm = e.bpm ?? 0;
  let value;
  let better = false;
  if (e.tool === 'lick') {
    // Wait-mode runs carry no score — never a record (and never a baseline).
    if (m.mode === 'wait' || !Number.isFinite(m.score)) return { better: false, rec: prev };
    value = m.score;
    // Score at full tempo beats any score at a slower tempo.
    const t = m.tempoPct ?? 100;
    const rec = { value, t };
    if (prev) better = (t > prev.t && value >= 85) || (t >= prev.t && value > prev.value && value >= 70);
    return { better, rec: better || !prev ? rec : prev };
  }
  if (e.tool === 'rhythm' || e.tool === 'scale' || e.tool === 'chordChanges') {
    if (judged(e) < 6) return { better: false, rec: prev };
    value = m.accuracyPct ?? 0;
    const rec = { value, bpm };
    if (prev) better = (bpm > prev.bpm + 1 && value >= 90) || (bpm >= prev.bpm - 1 && value > prev.value && value >= 70);
    if (!prev || better) return { better, rec: prev && bpm < prev.bpm ? prev : rec };
    return { better, rec: prev };
  }
  if (e.tool === 'minuteChanges') value = m.perMinute ?? 0;
  else value = m.accuracyPct ?? 0; // bending, ear
  if (prev) better = value > prev.value && (e.tool === 'minuteChanges' || value >= 70);
  return { better, rec: !prev || value > prev.value ? { value } : prev };
}

// ---------------------------------------------------------------------------
// XP
// ---------------------------------------------------------------------------

/** The log in time order, split by day, with each run's quality flags. */
export function annotate(perf) {
  const sorted = [...perf].filter((e) => e && e.day && Number.isFinite(e.at)).sort((a, b) => a.at - b.at);
  const best = new Map();
  const out = [];
  for (const e of sorted) {
    const key = pbKey(e);
    let pb = false;
    if (key) {
      const { better, rec } = pbStep(e, best.get(key));
      pb = better;
      if (rec) best.set(key, rec);
    }
    out.push({ e, clean: isClean(e), pb });
  }
  return out;
}

/**
 * XP per day. `challengeDays` = {day: [{done}]} (today's three, from the
 * challenge record), `weeklyDone` = [{at}] of finished weekly challenges.
 * Returns {byDay: Map(day -> {xp, parts}), practiceDays: Set}.
 */
export function xpByDay({ perf, coach = null, challengeDays = {}, weeklyDone = [], extraDays = [] }) {
  const ann = annotate(perf);
  const byDay = new Map();
  const get = (day) => {
    if (!byDay.has(day)) byDay.set(day, { runs: 0, minutes: 0, run: 0, day: 0, streak: 0, challenge: 0, coach: 0 });
    return byDay.get(day);
  };
  for (const { e, clean, pb } of ann) {
    const d = get(e.day);
    d.runs += 1;
    d.minutes += (num(e.durationMs) ?? 0) / 60000;
    d.run += XP.RUN + (clean ? XP.CLEAN : 0) + (pb ? XP.BEST : 0);
  }
  const practiceDays = new Set([...byDay.keys(), ...extraDays]);
  const streak = streakInfo(practiceDays, [...practiceDays].sort().pop() ?? '9999-12-31');
  for (const [day, d] of byDay) {
    d.run = Math.min(d.run, XP.RUN_CAP);
    if (d.minutes >= 10 || d.runs >= 3) {
      d.day = XP.DAY;
      d.streak = Math.min(XP.STREAK_MAX, XP.STREAK_STEP * ((streak.position.get(day) ?? 1) - 1));
    }
  }
  for (const [day, list] of Object.entries(challengeDays)) {
    const done = list.filter((c) => c.done).length;
    if (!done) continue;
    get(day).challenge += done * XP.DAILY + (done === list.length && list.length >= 3 ? XP.DAILY_ALL : 0);
  }
  for (const w of weeklyDone) if (w.day) get(w.day).challenge += XP.WEEKLY;
  if (coach) {
    for (const [day, s] of Object.entries(coach.days ?? {})) {
      // Ticking blocks off only pays on a day with real measured practice.
      const n = (s.blocks ?? []).filter((b) => b.done).length;
      if (n && byDay.get(day)?.runs) get(day).coach += n * XP.BLOCK;
    }
    for (const g of coach.goals ?? []) {
      for (const r of g.rungLog ?? []) {
        if (r.rung < (g.startRung ?? 0) || !Number.isFinite(r.at)) continue;
        get(dayOf(r.at)).coach += XP.RUNG;
      }
      if (g.status === 'done' && Number.isFinite(g.doneAt)) get(dayOf(g.doneAt)).coach += XP.GOAL;
    }
  }
  for (const d of byDay.values()) d.xp = d.run + d.day + d.streak + d.challenge + d.coach;
  return { byDay, practiceDays };
}

export function dayOf(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Total XP: past days use the banked value when there is one (the perf log
 * is capped, so old entries eventually drop out — the bank keeps their XP),
 * today is always live. Returns {total, today, bank (updated, past days only)}.
 */
export function totalXp(byDay, bank = {}, today) {
  const nextBank = { ...bank };
  let total = 0;
  const days = new Set([...Object.keys(bank), ...byDay.keys()]);
  for (const day of days) {
    const live = byDay.get(day)?.xp ?? 0;
    if (day < today) {
      const v = Math.max(bank[day] ?? 0, live);
      if (v > 0) nextBank[day] = v;
      total += v;
    } else total += live;
  }
  return { total, today: byDay.get(today)?.xp ?? 0, bank: nextBank };
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

const L = (en, he) => ({ en, he });

/** First entry (time order) passing ok -> {done, at}; else progress from `prog`. */
function firstWhere(sorted, ok) {
  for (const e of sorted) if (ok(e)) return e.at;
  return null;
}

const pentaPos = (e) => {
  const m = /^minorPentatonic:(\d+):position:p(\d)$/.exec(String(e.item));
  return m ? { root: m[1], pos: Number(m[2]) } : null;
};

/**
 * Each: {id, icon, group, title, desc (the criterion), check(ctx) -> {done,
 * at?, progress 0..1, value?, need?}}. ctx = {sorted perf, ann, streak,
 * practiceDays (with their first entry time), coach, challenges}.
 */
export const ACHIEVEMENTS = [
  {
    id: 'first',
    icon: '🎯',
    group: 'start',
    title: L('First take', 'הטייק הראשון'),
    desc: L('Finish your first measured run in any practice tool.', 'לסיים סבב מדוד ראשון בכלי תרגול כלשהו.'),
    check: (c) => (c.sorted.length ? { done: true, at: c.sorted[0].at, progress: 1 } : { done: false, progress: 0 }),
  },
  {
    id: 'streak3',
    icon: '🔥',
    group: 'habit',
    title: L('Three in a row', 'שלושה ברצף'),
    desc: L('Practise 3 days in a row.', 'לתרגל 3 ימים ברצף.'),
    check: (c) => streakCheck(c, 3),
  },
  {
    id: 'streak7',
    icon: '📅',
    group: 'habit',
    title: L('A full week', 'שבוע שלם'),
    desc: L('Practise 7 days in a row.', 'לתרגל 7 ימים ברצף.'),
    check: (c) => streakCheck(c, 7),
  },
  {
    id: 'streak30',
    icon: '🏔️',
    group: 'habit',
    title: L('Thirty days', 'שלושים יום'),
    desc: L('Practise 30 days in a row.', 'לתרגל 30 ימים ברצף.'),
    check: (c) => streakCheck(c, 30),
  },
  {
    id: 'hours10',
    icon: '⏱️',
    group: 'habit',
    title: L('Ten hours', 'עשר שעות'),
    desc: L('10 hours of measured practice.', '10 שעות של תרגול מדוד.'),
    check: (c) => minutesCheck(c, 600),
  },
  {
    id: 'hours50',
    icon: '⌛',
    group: 'habit',
    title: L('Fifty hours', 'חמישים שעות'),
    desc: L('50 hours of measured practice.', '50 שעות של תרגול מדוד.'),
    check: (c) => minutesCheck(c, 3000),
  },
  {
    id: 'changes30',
    icon: '🔁',
    group: 'chords',
    title: L('Smooth changes', 'החלפות חלקות'),
    desc: L('30 one-minute changes on a chord pair.', '30 החלפות בדקה על זוג אקורדים.'),
    check: (c) => valueCheck(c, (e) => e.tool === 'minuteChanges', (e) => e.metrics?.perMinute, 30),
  },
  {
    id: 'changes60',
    icon: '⚡',
    group: 'chords',
    title: L('Changes mastered', 'שליטה בהחלפות'),
    desc: L('60 one-minute changes on a chord pair — the teachers’ “mastered”.', '60 החלפות בדקה על זוג אקורדים — “שליטה” לפי המורים.'),
    check: (c) => valueCheck(c, (e) => e.tool === 'minuteChanges', (e) => e.metrics?.perMinute, 60),
  },
  {
    id: 'chordClean',
    icon: '🎼',
    group: 'chords',
    title: L('In the pocket', 'בתוך הגרוב'),
    desc: L('Chord Changes: 90 % or more with a 16-chord streak.', 'החלפות אקורדים: 90% ומעלה עם רצף של 16.'),
    check: (c) => {
      const at = firstWhere(c.sorted, (e) => e.tool === 'chordChanges' && (e.metrics?.accuracyPct ?? 0) >= 90 && (e.metrics?.maxCombo ?? 0) >= 16);
      if (at != null) return { done: true, at, progress: 1 };
      const best = c.sorted.filter((e) => e.tool === 'chordChanges').reduce((m, e) => Math.max(m, Math.min(1, (e.metrics?.accuracyPct ?? 0) / 90) * Math.min(1, (e.metrics?.maxCombo ?? 0) / 16)), 0);
      return { done: false, progress: best };
    },
  },
  {
    id: 'timing100',
    icon: '🥁',
    group: 'timing',
    title: L('Locked in', 'נעול על הקליק'),
    desc: L('Rhythm Practice: 90 % or more at 100 BPM or faster.', 'תרגול קצב: 90% ומעלה ב-100 BPM ומעלה.'),
    check: (c) => {
      const ok = (e) => e.tool === 'rhythm' && (e.metrics?.accuracyPct ?? 0) >= 90 && judged(e) >= 8 && (e.bpm ?? 0) >= 99;
      const at = firstWhere(c.sorted, ok);
      if (at != null) return { done: true, at, progress: 1 };
      const best = c.sorted.filter((e) => e.tool === 'rhythm' && (e.metrics?.accuracyPct ?? 0) >= 90).reduce((m, e) => Math.max(m, e.bpm ?? 0), 0);
      return { done: false, progress: Math.min(0.95, best / 100), value: best || null, need: 100 };
    },
  },
  {
    id: 'clean10',
    icon: '✨',
    group: 'timing',
    title: L('Clean ten', 'עשרה נקיים'),
    desc: L('10 clean runs (85 %+) in Rhythm or Scale Practice.', '10 סבבים נקיים (85%+) בתרגול קצב או סולמות.'),
    check: (c) => countCheck(c, (a) => (a.e.tool === 'rhythm' || a.e.tool === 'scale') && a.clean, 10),
  },
  {
    id: 'penta1',
    icon: '🧭',
    group: 'scales',
    title: L('Box one', 'הקופסה הראשונה'),
    desc: L('Pentatonic position 1 at 90 %+ at 90 BPM.', 'פנטטוני פוזיציה 1 ב-90%+ ב-90 BPM.'),
    check: (c) => {
      const at = firstWhere(c.sorted, (e) => e.tool === 'scale' && pentaPos(e)?.pos === 0 && pentaOk(e));
      return at != null ? { done: true, at, progress: 1 } : { done: false, progress: 0 };
    },
  },
  {
    id: 'penta5',
    icon: '🗺️',
    group: 'scales',
    title: L('The whole neck', 'כל הצוואר'),
    desc: L('All 5 pentatonic positions at 90 %+ at 90 BPM (in one key).', 'כל 5 הפוזיציות הפנטטוניות ב-90%+ ב-90 BPM (באותו סולם).'),
    check: (c) => {
      const byRoot = new Map();
      let bestCount = 0;
      for (const e of c.sorted) {
        const p = e.tool === 'scale' && pentaOk(e) ? pentaPos(e) : null;
        if (!p) continue;
        const s = byRoot.get(p.root) ?? new Set();
        s.add(p.pos);
        byRoot.set(p.root, s);
        bestCount = Math.max(bestCount, s.size);
        if (s.size >= 5) return { done: true, at: e.at, progress: 1 };
      }
      return { done: false, progress: bestCount / 5, value: bestCount, need: 5 };
    },
  },
  {
    id: 'lick1',
    icon: '🎸',
    group: 'licks',
    title: L('First lick', 'הליק הראשון'),
    desc: L('Score 85 or more on a lick.', 'ציון 85 ומעלה בליק.'),
    check: (c) => {
      const at = firstWhere(c.sorted, (e) => e.tool === 'lick' && !e.metrics?.solo && (e.metrics?.score ?? 0) >= 85);
      return at != null ? { done: true, at, progress: 1 } : { done: false, progress: 0 };
    },
  },
  {
    id: 'licks10',
    icon: '📚',
    group: 'licks',
    title: L('Lick vocabulary', 'אוצר ליקים'),
    desc: L('10 different licks scored 85+.', '10 ליקים שונים בציון 85+.'),
    check: (c) => distinctCheck(c, (e) => e.tool === 'lick' && !e.metrics?.solo && (e.metrics?.score ?? 0) >= 85, (e) => e.item, 10),
  },
  {
    id: 'lickFull',
    icon: '🚀',
    group: 'licks',
    title: L('Full speed', 'במהירות מלאה'),
    desc: L('A lick at 100 % tempo scored 90+.', 'ליק במהירות 100% בציון 90+.'),
    check: (c) => {
      const at = firstWhere(c.sorted, (e) => e.tool === 'lick' && !e.metrics?.solo && (e.metrics?.tempoPct ?? 100) >= 100 && (e.metrics?.score ?? 0) >= 90);
      return at != null ? { done: true, at, progress: 1 } : { done: false, progress: 0 };
    },
  },
  {
    id: 'solo',
    icon: '🎤',
    group: 'licks',
    title: L('Solo section', 'קטע סולו'),
    desc: L('A solo section at 100 % tempo scored 85+.', 'קטע מסולו במהירות 100% בציון 85+.'),
    check: (c) => {
      const at = firstWhere(c.sorted, (e) => e.tool === 'lick' && (e.metrics?.solo || String(e.item).includes('#')) && (e.metrics?.tempoPct ?? 100) >= 100 && (e.metrics?.score ?? 0) >= 85);
      return at != null ? { done: true, at, progress: 1 } : { done: false, progress: 0 };
    },
  },
  {
    id: 'bends',
    icon: '〰️',
    group: 'technique',
    title: L('In-tune bends', 'כפיפות מדויקות'),
    desc: L('A bending round with 85 %+ of the bends in tune.', 'סבב כפיפות עם 85%+ כפיפות מדויקות.'),
    check: (c) => {
      const at = firstWhere(c.sorted, (e) => e.tool === 'bending' && (e.metrics?.accuracyPct ?? 0) >= 85 && (e.metrics?.steps ?? 0) >= 5);
      if (at != null) return { done: true, at, progress: 1 };
      const best = c.sorted.filter((e) => e.tool === 'bending').reduce((m, e) => Math.max(m, e.metrics?.accuracyPct ?? 0), 0);
      return { done: false, progress: Math.min(0.95, best / 85) };
    },
  },
  {
    id: 'ear90',
    icon: '👂',
    group: 'ear',
    title: L('Sharp ears', 'אוזן חדה'),
    desc: L('Ear training: 90 %+ on 20 or more answers in one session.', 'אימון שמיעה: 90%+ על 20 תשובות ומעלה בסבב אחד.'),
    check: (c) => {
      const at = firstWhere(c.sorted, (e) => e.tool === 'ear' && (e.metrics?.total ?? 0) >= 20 && (e.metrics?.accuracyPct ?? 0) >= 90);
      return at != null ? { done: true, at, progress: 1 } : { done: false, progress: 0 };
    },
  },
  {
    id: 'ear500',
    icon: '🎧',
    group: 'ear',
    title: L('500 answers', '500 תשובות'),
    desc: L('500 ear-training answers in total.', '500 תשובות באימון שמיעה בסך הכול.'),
    check: (c) => {
      let n = 0;
      for (const e of c.sorted) {
        if (e.tool !== 'ear') continue;
        n += e.metrics?.total ?? 0;
        if (n >= 500) return { done: true, at: e.at, progress: 1 };
      }
      return { done: false, progress: n / 500, value: n, need: 500 };
    },
  },
  {
    id: 'allRound',
    icon: '🧩',
    group: 'habit',
    title: L('All-rounder', 'רב-גוני'),
    desc: L('Use 5 different practice tools in one week.', 'להשתמש ב-5 כלי תרגול שונים בשבוע אחד.'),
    check: (c) => {
      let best = 0;
      const win = [];
      for (const e of c.sorted) {
        if (!substantial(e)) continue;
        win.push(e);
        while (win.length && e.at - win[0].at > 7 * DAY_MS) win.shift();
        const n = new Set(win.map((x) => x.tool)).size;
        best = Math.max(best, n);
        if (n >= 5) return { done: true, at: e.at, progress: 1 };
      }
      return { done: false, progress: best / 5, value: best, need: 5 };
    },
  },
  {
    id: 'rung',
    icon: '🪜',
    group: 'coach',
    title: L('A step up', 'שלב קדימה'),
    desc: L('Reach a new rung of a coach goal.', 'להגיע לשלב חדש ביעד של המאמן.'),
    check: (c) => {
      const ats = (c.coach?.goals ?? []).flatMap((g) => (g.rungLog ?? []).filter((r) => r.rung >= (g.startRung ?? 0)).map((r) => r.at)).filter(Number.isFinite);
      return ats.length ? { done: true, at: Math.min(...ats), progress: 1 } : { done: false, progress: 0 };
    },
  },
  {
    id: 'goal',
    icon: '🏆',
    group: 'coach',
    title: L('Goal reached', 'היעד הושג'),
    desc: L('Complete a coach goal.', 'להשלים יעד של המאמן.'),
    check: (c) => {
      const ats = (c.coach?.goals ?? []).filter((g) => g.status === 'done').map((g) => g.doneAt).filter(Number.isFinite);
      return ats.length ? { done: true, at: Math.min(...ats), progress: 1 } : { done: false, progress: 0 };
    },
  },
  {
    id: 'daily7',
    icon: '⭐',
    group: 'challenge',
    title: L('Challenger', 'אוהבי אתגרים'),
    desc: L('Complete 7 daily challenges.', 'להשלים 7 אתגרים יומיים.'),
    check: (c) => {
      const ats = c.dailyDoneAts;
      return ats.length >= 7 ? { done: true, at: ats[6], progress: 1 } : { done: false, progress: ats.length / 7, value: ats.length, need: 7 };
    },
  },
  {
    id: 'weekly1',
    icon: '🌟',
    group: 'challenge',
    title: L('Week won', 'שבוע מנצח'),
    desc: L('Complete a weekly challenge.', 'להשלים אתגר שבועי.'),
    check: (c) => (c.weeklyDoneAts.length ? { done: true, at: c.weeklyDoneAts[0], progress: 1 } : { done: false, progress: c.weeklyProgress ?? 0 }),
  },
];

function pentaOk(e) {
  return (e.metrics?.accuracyPct ?? 0) >= 90 && (e.bpm ?? 0) >= 89 && judged(e) >= 8;
}

function streakCheck(c, n) {
  for (const day of c.daysSorted) {
    if ((c.streak.position.get(day) ?? 0) >= n) return { done: true, at: c.dayFirstAt.get(day) ?? Date.parse(`${day}T12:00:00`), progress: 1 };
  }
  return { done: false, progress: Math.min(0.99, Math.max(c.streak.current, 0) / n), value: c.streak.current, need: n };
}

function minutesCheck(c, need) {
  let acc = c.bankedMinutes ?? 0;
  if (acc >= need) return { done: true, at: c.sorted[0]?.at ?? Date.now(), progress: 1 };
  for (const e of c.sorted) {
    acc += (num(e.durationMs) ?? 0) / 60000;
    if (acc >= need) return { done: true, at: e.at, progress: 1 };
  }
  return { done: false, progress: acc / need, value: Math.floor(acc / 60), need: need / 60 };
}

function valueCheck(c, ok, valueOf, need) {
  let best = 0;
  for (const e of c.sorted) {
    if (!ok(e)) continue;
    const v = valueOf(e) ?? 0;
    if (v >= need) return { done: true, at: e.at, progress: 1 };
    best = Math.max(best, v);
  }
  return { done: false, progress: Math.min(0.99, best / need), value: best || null, need };
}

function countCheck(c, ok, need) {
  let n = 0;
  for (const a of c.ann) {
    if (!ok(a)) continue;
    n += 1;
    if (n >= need) return { done: true, at: a.e.at, progress: 1 };
  }
  return { done: false, progress: n / need, value: n, need };
}

function distinctCheck(c, ok, keyOf, need) {
  const seen = new Set();
  for (const e of c.sorted) {
    if (!ok(e)) continue;
    seen.add(keyOf(e));
    if (seen.size >= need) return { done: true, at: e.at, progress: 1 };
  }
  return { done: false, progress: seen.size / need, value: seen.size, need };
}

/**
 * Everything the Rewards page shows, in one pass.
 * input: {perf, coach, challengeDays: {day: [status]}, weekly: [{week, status}],
 *         bank: {xpDays}, unlocked: {id: at}, today}
 */
export function computeRewards({ perf, coach = null, challengeDays = {}, dailyDoneAts = [], weeklyDone = [], weeklyProgress = 0, bank = {}, unlocked = {}, today, bankedMinutes = 0 }) {
  // Banked past days (their entries may have left the capped log) still
  // count as practice days for the streak.
  const extraDays = Object.entries(bank).filter(([, v]) => v > 0).map(([d]) => d);
  const { byDay, practiceDays } = xpByDay({ perf, coach, challengeDays, weeklyDone, extraDays });
  const xp = totalXp(byDay, bank, today);
  const streak = streakInfo(practiceDays, today);
  const sorted = [...perf].filter((e) => e && Number.isFinite(e.at)).sort((a, b) => a.at - b.at);
  const ann = annotate(perf);
  const dayFirstAt = new Map();
  for (const e of sorted) if (!dayFirstAt.has(e.day)) dayFirstAt.set(e.day, e.at);
  const ctx = {
    sorted,
    ann,
    streak,
    daysSorted: [...practiceDays].sort(),
    dayFirstAt,
    coach,
    dailyDoneAts: [...dailyDoneAts].sort((a, b) => a - b),
    weeklyDoneAts: weeklyDone.map((w) => w.at).filter(Number.isFinite).sort((a, b) => a - b),
    weeklyProgress,
    bankedMinutes,
  };
  const achievements = ACHIEVEMENTS.map((a) => {
    let st;
    try {
      st = a.check(ctx);
    } catch {
      st = { done: false, progress: 0 };
    }
    // Once unlocked, always unlocked (with its first date) — even if the
    // capped log no longer shows why.
    const stored = unlocked[a.id];
    if (stored) return { ...a, status: { ...st, done: true, progress: 1, at: stored } };
    return { ...a, status: st };
  });
  const todayRec = byDay.get(today);
  return {
    xp: xp.total,
    xpToday: xp.today,
    todayParts: todayRec ?? null,
    bank: xp.bank,
    level: levelFor(xp.total),
    streak,
    achievements,
    unlockedCount: achievements.filter((a) => a.status.done).length,
  };
}
