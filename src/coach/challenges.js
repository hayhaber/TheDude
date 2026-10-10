// Daily + weekly challenges (pure logic). Daily: three short, measurable targets a day,
// different every day, chosen for the student's level and (when there is
// one) leaning towards the coach's active goal — the game loop of
// Rocksmith+ (3 daily challenges, one re-roll a day) and Yousician.
//
// Everything is computed from the performance log (perfLog.js). A day's
// set is built only from entries BEFORE that day, so it doesn't drift while
// the student plays; the caller still stores the specs (useChallenges.js,
// key 'dudestar-coach-challenges', per profile) so past days keep exactly
// the challenges they had (XP bonuses are recomputed from them).
//
// spec      = { id, tpl, tool, params }            (plain data, stored)
// challenge = materialize(spec) = spec + { title, launch, check(entriesOfDay) }
//             check -> { done, progress 0..1, value?, at? (ms when done) }
//
// Weekly (bottom of the file): ONE bigger target per week (Sunday..Saturday,
// local), made of 2 measurable parts, tailored to the coach goal / level —
// e.g. "30 min of chord changes + 3 one-minute tests at 30/min".
//
// Text is inline {en, he} (like goals.js); {v} values in titles are numbers
// or names, so nothing here needs t().

import { DRILLS } from '../music/drills';
import { LICKS } from '../music/lickTrainer/library';
import { goalByKey, goalPairs, samePair } from './goals';

const L = (en, he) => ({ en, he });
const DAY_MS = 86400000;
export const LEVELS = ['new', 'beginner', 'intermediate', 'advanced'];

// ---------------------------------------------------------------------------
// Seeded randomness (deterministic per profile + day)
// ---------------------------------------------------------------------------

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rngFrom(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashString(String(seed));
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pickOne = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
const round5 = (v) => Math.round(v / 5) * 5;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const num = (v) => (Number.isFinite(v) ? v : null);

// ---------------------------------------------------------------------------
// The student's level (0 new .. 3 advanced)
// ---------------------------------------------------------------------------

/**
 * The coach's intake level when there is one; otherwise estimated from the
 * last 30 days of the log (lick levels played well, clean rhythm tempos).
 */
export function estimateLevel(perf, { intakeLevel, now = Date.now() } = {}) {
  const fromIntake = LEVELS.indexOf(intakeLevel);
  if (fromIntake >= 0) return fromIntake;
  const recent = perf.filter((e) => now - e.at < 30 * DAY_MS);
  if (!recent.length) return perf.length ? 1 : 0;
  let lvl = 1;
  const lickLevel = new Map(LICKS.map((l) => [l.id, LEVELS.indexOf(l.level)]));
  for (const e of recent) {
    if (e.tool === 'lick' && (e.metrics?.score ?? 0) >= 80) lvl = Math.max(lvl, lickLevel.get(e.item) ?? 1);
    if ((e.tool === 'rhythm' || e.tool === 'scale') && (e.metrics?.accuracyPct ?? 0) >= 90) {
      if ((e.bpm ?? 0) >= 110) lvl = Math.max(lvl, 3);
      else if ((e.bpm ?? 0) >= 85) lvl = Math.max(lvl, 2);
    }
    if (e.tool === 'minuteChanges' && (e.metrics?.perMinute ?? 0) >= 45) lvl = Math.max(lvl, 2);
  }
  return lvl;
}

// ---------------------------------------------------------------------------
// Helpers over a day's entries
// ---------------------------------------------------------------------------

/** The first entry (by time) satisfying ok, or null. */
function firstOk(entries, ok) {
  let best = null;
  for (const e of entries) if (ok(e) && (!best || e.at < best.at)) best = e;
  return best;
}

// A run with some substance (not a 2-second tap-through): ~45 s or more,
// or enough notes / answers judged. For the "variety" targets.
export const substantial = (e) => (num(e.durationMs) ?? 0) >= 45000 || judged(e) >= 5 || (num(e.metrics?.score) != null && (num(e.metrics?.total) ?? 0) >= 3);

const sumMinutes = (entries) => entries.reduce((s, e) => s + (num(e.durationMs) ?? 0), 0) / 60000;

/** Running total over time: when did `value(entries so far)` first reach `need`? */
function reachedAt(entries, need, add) {
  let acc = 0;
  for (const e of [...entries].sort((a, b) => a.at - b.at)) {
    acc += add(e);
    if (acc >= need) return e.at;
  }
  return null;
}

// Notes actually judged in a run (rhythm/scale `total` is the exercise's
// length, not what was played — an early Stop judges fewer).
export const judged = (e) => (Number.isFinite(e.metrics?.hits) ? e.metrics.hits + (num(e.metrics?.misses) ?? 0) : num(e.metrics?.total) ?? 0);

/** A tempo + accuracy target on one exercise (rhythm / scale). */
function tempoAccuracyCheck(tool, item, bpm, min) {
  return (entries) => {
    const runs = entries.filter((e) => e.tool === tool && e.item === item && Number.isFinite(e.metrics?.accuracyPct) && judged(e) >= 6);
    const okRun = (e) => (e.bpm ?? 0) >= bpm - 1 && e.metrics.accuracyPct >= min;
    const done = firstOk(runs, okRun);
    if (done) return { done: true, progress: 1, value: done.metrics.accuracyPct, at: done.at };
    const progress = runs.reduce((m, e) => Math.max(m, Math.min(1, e.metrics.accuracyPct / min) * Math.min(1, (e.bpm ?? 0) / bpm) * 0.95), 0);
    const value = runs.length ? Math.max(...runs.map((e) => e.metrics.accuracyPct)) : null;
    return { done: false, progress, value };
  };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const GENRE_NAME = { blues: L('blues', 'בלוז'), rock: L('rock', 'רוק'), metal: L('metal', 'מטאל') };
const STYLE_GENRE = { rock: 'rock', blues: 'blues', metal: 'metal' };
const PAIRS_BY_LEVEL = [
  [['A', 'D'], ['D', 'E'], ['A', 'E'], ['Em', 'Am']],
  [['G', 'C'], ['C', 'D'], ['G', 'D'], ['Em', 'C'], ['Am', 'Dm']],
  [['C', 'F'], ['G', 'Bm'], ['Am', 'F'], ['D', 'Bm']],
  [['F', 'Bb'], ['Bm', 'F#m'], ['C', 'F'], ['G', 'Bm']],
];
const PROGRESSIONS = [
  ['G', 'D', 'Em', 'C'],
  ['A', 'D', 'E', 'A'],
  ['C', 'Am', 'F', 'G'],
  ['E', 'A', 'D', 'A'],
  ['Em', 'C', 'D', 'Em'],
];
const DRILL_DIFF = [['Beginner'], ['Beginner'], ['Intermediate', 'Beginner'], ['Advanced', 'Intermediate']];
const EAR_MODES = {
  interval: L('intervals', 'מרווחים'),
  chord: L('chords', 'אקורדים'),
  triad: L('triads', 'משולשים'),
  direction: L('melodic direction', 'כיוון מלודי'),
  scaledegree: L('scale degrees', 'דרגות סולם'),
  pitch: L('notes on the neck', 'תווים על הצוואר'),
};

function lickGenre(ctx) {
  const fromStyle = STYLE_GENRE[ctx.style];
  if (fromStyle) return fromStyle;
  const counts = {};
  for (const e of ctx.perf) if (e.tool === 'lick') {
    const l = LICKS.find((x) => x.id === e.item);
    if (l) counts[l.genre] = (counts[l.genre] ?? 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top?.[0] === 'metal' ? 'rock' : top?.[0] ?? 'blues';
}

/**
 * Each template: tool, meta (time / variety — not a skill), make(ctx, rng)
 * -> params | null, title(params), launch(params), check(params) -> fn.
 */
export const TEMPLATES = {
  lickScore: {
    tool: 'lick',
    make(ctx, rng) {
      const genre = ctx.goal?.key === 'blues' ? 'blues' : lickGenre(ctx);
      const level = LEVELS[clamp(ctx.level, 1, 3)];
      let ids = LICKS.filter((l) => l.genre === genre && l.level === level).map((l) => l.id);
      if (!ids.length) ids = LICKS.filter((l) => l.genre === genre && l.level === 'beginner').map((l) => l.id);
      if (!ids.length) return null;
      const all = new Set(LICKS.filter((l) => l.genre === genre).map((l) => l.id));
      const recentBest = ctx.perf
        .filter((e) => e.tool === 'lick' && all.has(e.item) && ctx.now - e.at < 14 * DAY_MS)
        .reduce((m, e) => Math.max(m, e.metrics?.score ?? 0), 0);
      const base = [70, 70, 80, 85][ctx.level];
      const min = recentBest ? clamp(round5(recentBest), base, 95) : base;
      return { genre, min, lickId: pickOne(rng, ids), tempoPct: ctx.level <= 1 ? 70 : 100 };
    },
    title: (p) => L(`Score ${p.min}+ on any ${GENRE_NAME[p.genre].en} lick`, `ציון ${p.min}+ בליק ${GENRE_NAME[p.genre].he} כלשהו`),
    launch: (p) => ({ tool: 'lick', lickId: p.lickId, tempoPct: p.tempoPct }),
    check: (p) => {
      const ids = new Set(LICKS.filter((l) => l.genre === p.genre).map((l) => l.id));
      return (entries) => {
        const runs = entries.filter((e) => e.tool === 'lick' && ids.has(e.item) && Number.isFinite(e.metrics?.score));
        const done = firstOk(runs, (e) => e.metrics.score >= p.min);
        const best = runs.reduce((m, e) => Math.max(m, e.metrics.score), 0);
        return done ? { done: true, progress: 1, value: done.metrics.score, at: done.at } : { done: false, progress: Math.min(0.95, best / p.min), value: runs.length ? best : null };
      };
    },
  },

  minuteBeat: {
    tool: 'minuteChanges',
    make(ctx, rng) {
      let pairs = [];
      const g = ctx.goal && goalByKey(ctx.goal.key);
      if (g?.measure === 'minuteChangesWeakestPair') pairs = goalPairs(g, ctx.goal.params);
      if (!pairs.length) {
        const seen = [...new Set(ctx.perf.filter((e) => e.tool === 'minuteChanges' && /^[^>]+>[^>]+$/.test(e.item)).slice(-20).map((e) => e.item))];
        pairs = seen.map((k) => k.split('>'));
      }
      if (!pairs.length) pairs = PAIRS_BY_LEVEL[ctx.level];
      const [a, b] = pickOne(rng, pairs);
      const best = ctx.perf
        .filter((e) => e.tool === 'minuteChanges' && samePair(e.item, a, b))
        .reduce((m, e) => Math.max(m, e.metrics?.perMinute ?? 0), 0);
      const target = best ? Math.min(best + 1, 80) : [15, 20, 30, 40][ctx.level];
      return { a, b, best: best || null, target };
    },
    title: (p) =>
      p.best
        ? L(`One-minute changes: beat your best on ${p.a} ↔ ${p.b} (${p.best})`, `החלפות בדקה: לשבור את השיא ב-${p.a} ↔ ${p.b} (${p.best})`)
        : L(`One-minute changes: ${p.target}/min on ${p.a} ↔ ${p.b}`, `החלפות בדקה: ${p.target} לדקה ב-${p.a} ↔ ${p.b}`),
    launch: (p) => ({ tool: 'minuteChanges', chords: [p.a, p.b] }),
    check: (p) => (entries) => {
      const runs = entries.filter((e) => e.tool === 'minuteChanges' && samePair(e.item, p.a, p.b) && Number.isFinite(e.metrics?.perMinute));
      const done = firstOk(runs, (e) => e.metrics.perMinute >= p.target);
      const best = runs.reduce((m, e) => Math.max(m, e.metrics.perMinute), 0);
      return done ? { done: true, progress: 1, value: done.metrics.perMinute, at: done.at } : { done: false, progress: Math.min(0.95, best / p.target), value: runs.length ? best : null };
    },
  },

  ear: {
    tool: 'ear',
    make(ctx, rng) {
      const mode = ctx.goal?.key === 'ear' ? ctx.goal.params?.mode ?? 'interval' : ctx.level === 0 ? pickOne(rng, ['direction', 'interval']) : pickOne(rng, ['interval', 'interval', 'chord', 'triad', 'scaledegree']);
      return {
        mode,
        n: [10, 10, 15, 20][ctx.level],
        pct: [70, 80, 80, 85][ctx.level],
        difficulty: ['beginner', 'beginner', 'intermediate', 'advanced'][ctx.level],
      };
    },
    title: (p) => {
      const m = EAR_MODES[p.mode] ?? EAR_MODES.interval;
      return L(`Ear: ${p.n} ${m.en} at ${p.pct} %`, `שמיעה: ${p.n} ${m.he} ב-${p.pct}%`);
    },
    launch: (p) => ({ tool: 'ear', mode: p.mode, difficulty: p.difficulty, practiceMode: 'standard' }),
    check: (p) => (entries) => {
      const runs = entries.filter((e) => e.tool === 'ear' && e.item === p.mode && Number.isFinite(e.metrics?.total)).sort((a, b) => a.at - b.at);
      let total = 0;
      let correct = 0;
      for (const e of runs) {
        total += e.metrics.total;
        correct += e.metrics.correct ?? 0;
        if (total >= p.n && (correct / total) * 100 >= p.pct) return { done: true, progress: 1, value: Math.round((correct / total) * 100), at: e.at };
      }
      if (!total) return { done: false, progress: 0, value: null };
      const acc = (correct / total) * 100;
      return { done: false, progress: Math.min(0.95, Math.min(1, total / p.n) * Math.min(1, acc / p.pct)), value: Math.round(acc) };
    },
  },

  rhythm: {
    tool: 'rhythm',
    make(ctx, rng) {
      let drillId = ctx.goal && ['timing', 'speed'].includes(ctx.goal.key) ? ctx.goal.params?.drillId : null;
      if (!drillId) {
        const pool = DRILLS.filter((d) => DRILL_DIFF[ctx.level].includes(d.difficulty) && ['warmup', 'speed'].includes(d.category));
        drillId = pickOne(rng, pool.length ? pool : DRILLS).id;
      }
      const clean = ctx.perf.filter((e) => e.tool === 'rhythm' && e.item === drillId && (e.metrics?.accuracyPct ?? 0) >= 90).reduce((m, e) => Math.max(m, e.bpm ?? 0), 0);
      const bpm = clean ? clamp(round5(clean + 5), 50, 200) : [60, 70, 85, 100][ctx.level];
      return { drillId, bpm, min: 90 };
    },
    title: (p) => {
      const d = DRILLS.find((x) => x.id === p.drillId);
      return L(`Rhythm Practice: ${p.min} % at ${p.bpm} BPM — ${d?.title.en ?? ''}`, `תרגול קצב: ${p.min}% ב-${p.bpm} BPM — ${d?.title.he ?? ''}`);
    },
    launch: (p) => ({ tool: 'rhythm', drillId: p.drillId, bpm: p.bpm }),
    check: (p) => tempoAccuracyCheck('rhythm', p.drillId, p.bpm, p.min),
  },

  scale: {
    tool: 'scale',
    make(ctx) {
      if (ctx.level === 0) return null;
      const root = ctx.goal?.key === 'pentatonic' ? ctx.goal.params?.root ?? 9 : 9;
      const bpm = [60, 70, 80, 95][ctx.level];
      const item = (p) => `minorPentatonic:${root}:position:p${p}`;
      let pos = 0;
      for (; pos < 4; pos += 1) {
        const ok = ctx.perf.some((e) => e.tool === 'scale' && e.item === item(pos) && (e.metrics?.accuracyPct ?? 0) >= 90 && (e.bpm ?? 0) >= bpm - 1);
        if (!ok) break;
      }
      return { root, position: pos, bpm, min: 90 };
    },
    title: (p) => L(`Pentatonic position ${p.position + 1}: ${p.min} % at ${p.bpm} BPM`, `פנטטוני פוזיציה ${p.position + 1}: ${p.min}% ב-${p.bpm} BPM`),
    launch: (p) => ({ tool: 'scale', scaleKey: 'minorPentatonic', root: p.root, mode: 'position', positionIndex: p.position, bpm: p.bpm }),
    check: (p) => tempoAccuracyCheck('scale', `minorPentatonic:${p.root}:position:p${p.position}`, p.bpm, p.min),
  },

  bends: {
    tool: 'bending',
    make(ctx) {
      if (ctx.level === 0) return null;
      return { n: [5, 8, 10, 15][ctx.level] };
    },
    title: (p) => L(`Land ${p.n} bends in tune`, `${p.n} כפיפות מדויקות`),
    launch: () => ({ tool: 'bending' }),
    check: (p) => (entries) => {
      const runs = entries.filter((e) => e.tool === 'bending');
      const hits = runs.reduce((s, e) => s + (e.metrics?.hits ?? 0), 0);
      const at = reachedAt(runs, p.n, (e) => e.metrics?.hits ?? 0);
      return at != null ? { done: true, progress: 1, value: hits, at } : { done: false, progress: Math.min(0.95, hits / p.n), value: runs.length ? hits : null };
    },
  },

  chordCombo: {
    tool: 'chordChanges',
    make(ctx, rng) {
      return {
        chords: pickOne(rng, PROGRESSIONS),
        pct: 85,
        combo: [6, 10, 16, 24][ctx.level],
        bpm: [60, 70, 80, 100][ctx.level],
        beats: ctx.level <= 1 ? 4 : 2,
      };
    },
    title: (p) => L(`Chord changes ${p.chords.join(' ')}: ${p.pct} % with a ${p.combo}-chord streak`, `החלפות אקורדים ${p.chords.join(' ')}: ${p.pct}% עם רצף של ${p.combo}`),
    launch: (p) => ({ tool: 'chordChanges', chords: p.chords, bpm: p.bpm, beatsPerChord: p.beats }),
    check: (p) => (entries) => {
      // Only runs of THIS progression (Start sets it as the custom chords).
      const want = p.chords.join(' ');
      const runs = entries.filter(
        (e) => e.tool === 'chordChanges' && Number.isFinite(e.metrics?.accuracyPct) && String(e.metrics?.chords ?? '').trim().split(/\s+/).join(' ') === want
      );
      const done = firstOk(runs, (e) => e.metrics.accuracyPct >= p.pct && (e.metrics.maxCombo ?? 0) >= p.combo);
      if (done) return { done: true, progress: 1, value: done.metrics.maxCombo, at: done.at };
      const progress = runs.reduce((m, e) => Math.max(m, Math.min(1, e.metrics.accuracyPct / p.pct) * Math.min(1, (e.metrics.maxCombo ?? 0) / p.combo) * 0.95), 0);
      return { done: false, progress, value: runs.length ? Math.max(...runs.map((e) => e.metrics.maxCombo ?? 0)) : null };
    },
  },

  drillTime: {
    tool: 'drill',
    make(ctx, rng) {
      const pool = DRILLS.filter((d) => DRILL_DIFF[ctx.level].includes(d.difficulty));
      const d = pickOne(rng, pool.length ? pool : DRILLS);
      const bpm = ctx.level <= 1 ? round5((d.bpmSuggested ?? 80) * 0.8) : d.bpmSuggested ?? 80;
      return { drillId: d.id, bpm, minutes: 3 };
    },
    title: (p) => {
      const d = DRILLS.find((x) => x.id === p.drillId);
      return L(`${p.minutes} minutes of ${d?.title.en ?? 'drills'} at ${p.bpm} BPM`, `${p.minutes} דקות של ${d?.title.he ?? 'תרגיל'} ב-${p.bpm} BPM`);
    },
    launch: (p) => ({ tool: 'drill', drillId: p.drillId, bpm: p.bpm }),
    check: (p) => (entries) => {
      const runs = entries.filter((e) => e.tool === 'drill' && e.item === p.drillId && (e.bpm ?? 0) >= p.bpm - 1);
      const mins = sumMinutes(runs);
      const at = reachedAt(runs, p.minutes * 60000, (e) => num(e.durationMs) ?? 0);
      return at != null ? { done: true, progress: 1, value: Math.round(mins), at } : { done: false, progress: Math.min(0.95, mins / p.minutes), value: runs.length ? Math.round(mins) : null };
    },
  },

  minutes: {
    tool: 'time',
    meta: true,
    make(ctx) {
      const m = Number.isFinite(ctx.minutesPerDay) ? clamp(round5(ctx.minutesPerDay * 0.75), 10, 45) : [10, 15, 20, 30][ctx.level];
      return { minutes: m };
    },
    title: (p) => L(`Practise ${p.minutes} minutes today`, `לתרגל ${p.minutes} דקות היום`),
    launch: () => null,
    check: (p) => (entries) => {
      const mins = sumMinutes(entries);
      const at = reachedAt(entries, p.minutes * 60000, (e) => num(e.durationMs) ?? 0);
      return at != null ? { done: true, progress: 1, value: Math.round(mins), at } : { done: false, progress: Math.min(0.95, mins / p.minutes), value: Math.round(mins) };
    },
  },

  variety: {
    tool: 'variety',
    meta: true,
    make: () => ({ n: 3 }),
    title: (p) => L(`Use ${p.n} different practice tools today`, `להשתמש היום ב-${p.n} כלי תרגול שונים`),
    launch: () => null,
    check: (p) => (entries) => {
      const seen = new Set();
      for (const e of [...entries].filter(substantial).sort((a, b) => a.at - b.at)) {
        seen.add(e.tool);
        if (seen.size >= p.n) return { done: true, progress: 1, value: seen.size, at: e.at };
      }
      return { done: false, progress: Math.min(0.95, seen.size / p.n), value: seen.size };
    },
  },
};

// The coach goal -> the template it prefers.
const GOAL_TEMPLATE = { changes: 'minuteBeat', barre: 'minuteBeat', timing: 'rhythm', speed: 'rhythm', pentatonic: 'scale', blues: 'lickScore', bending: 'bends', ear: 'ear' };
const TOOL_OF_TEMPLATE = Object.fromEntries(Object.entries(TEMPLATES).map(([k, v]) => [k, v.tool]));

/** spec -> challenge (title, launch, check). Unknown template -> null. */
export function materialize(spec) {
  const tpl = spec && TEMPLATES[spec.tpl];
  if (!tpl) return null;
  return { ...spec, tool: tpl.tool, meta: !!tpl.meta, title: tpl.title(spec.params), launch: tpl.launch(spec.params), check: tpl.check(spec.params) };
}

/**
 * The generation context: entries strictly before `day`, the level, the
 * coach's active goal (if any) and the tools used lately.
 */
export function challengeContext({ perf, day, coach = null, now }) {
  const before = perf.filter((e) => e.day < day);
  const g = coach?.goals?.find((x) => x.id === coach.activeGoalId) ?? null;
  const goal = g && g.status !== 'done' ? { key: g.goalKey, params: g.params ?? {} } : null;
  const at = now ?? Date.parse(`${day}T12:00:00`);
  const recentTools = new Set(before.filter((e) => at - e.at < 14 * DAY_MS).map((e) => e.tool));
  return {
    perf: before,
    day,
    now: at,
    level: estimateLevel(before, { intakeLevel: coach?.intake?.level, now: at }),
    style: coach?.intake?.style ?? null,
    minutesPerDay: coach?.intake?.minutesPerDay,
    goal,
    recentTools,
  };
}

function weightOf(key, ctx) {
  const tpl = TEMPLATES[key];
  let w = tpl.meta ? 0.7 : 1;
  if (ctx.goal && GOAL_TEMPLATE[ctx.goal.key] === key) w *= 3;
  if (ctx.recentTools.has(tpl.tool)) w *= 1.6;
  if (ctx.level === 0 && (key === 'lickScore' || key === 'drillTime')) w *= 0.5;
  return w;
}

function weightedPick(rng, items) {
  const total = items.reduce((s, x) => s + x.w, 0);
  let r = rng() * total;
  for (const x of items) {
    r -= x.w;
    if (r <= 0) return x;
  }
  return items[items.length - 1];
}

/** Candidates not clashing with `taken` (tools) / one meta at most. */
function candidates(ctx, rng, { takenTools, hasMeta, exclude = [] }) {
  const out = [];
  for (const key of Object.keys(TEMPLATES)) {
    const tpl = TEMPLATES[key];
    if (exclude.includes(key) || takenTools.has(tpl.tool) || (tpl.meta && hasMeta)) continue;
    const params = tpl.make(ctx, rng);
    if (params) out.push({ key, params, w: weightOf(key, ctx) });
  }
  return out;
}

/**
 * The day's three challenges (specs). Deterministic for (seedKey, day,
 * entries before the day, coach state).
 */
export function generateDaily({ perf, day, coach = null, seedKey = '' }) {
  const ctx = challengeContext({ perf, day, coach });
  const rng = rngFrom(`${seedKey}|${day}`);
  const specs = [];
  const takenTools = new Set();
  let hasMeta = false;
  // The goal's own challenge first, when the student has a coach goal.
  const goalKey = ctx.goal && GOAL_TEMPLATE[ctx.goal.key];
  if (goalKey) {
    const params = TEMPLATES[goalKey].make(ctx, rng);
    if (params) {
      specs.push({ id: `${day}:${goalKey}`, tpl: goalKey, params });
      takenTools.add(TEMPLATES[goalKey].tool);
    }
  }
  while (specs.length < 3) {
    const list = candidates(ctx, rng, { takenTools, hasMeta });
    if (!list.length) break;
    const c = weightedPick(rng, list);
    specs.push({ id: `${day}:${c.key}`, tpl: c.key, params: c.params });
    takenTools.add(TEMPLATES[c.key].tool);
    if (TEMPLATES[c.key].meta) hasMeta = true;
  }
  // Skill challenges first, the time / variety one last.
  return specs.sort((a, b) => Number(!!TEMPLATES[a.tpl].meta) - Number(!!TEMPLATES[b.tpl].meta));
}

/** Re-roll slot `index` (a different template, tool not used by the others). */
export function rerollSpec({ specs, index, perf, day, coach = null, seedKey = '' }) {
  const ctx = challengeContext({ perf, day, coach });
  const rng = rngFrom(`${seedKey}|${day}|swap${index}`);
  const others = specs.filter((_, i) => i !== index);
  const takenTools = new Set(others.map((s) => TOOL_OF_TEMPLATE[s.tpl]));
  const hasMeta = others.some((s) => TEMPLATES[s.tpl]?.meta);
  const list = candidates(ctx, rng, { takenTools, hasMeta, exclude: [specs[index]?.tpl] });
  if (!list.length) return specs;
  // A swap shouldn't push the goal again: plain weights.
  const c = weightedPick(rng, list.map((x) => ({ ...x, w: TEMPLATES[x.key].meta ? 0.7 : 1 })));
  return specs.map((s, i) => (i === index ? { id: `${day}:${c.key}:swap`, tpl: c.key, params: c.params, swapped: true } : s));
}

/** Status of each spec against that day's entries. */
export function evaluate(specs, entriesOfDay) {
  return specs
    .map(materialize)
    .filter(Boolean)
    .map((c) => ({ ...c, status: c.check(entriesOfDay) }));
}

// ===========================================================================
// Weekly challenge
// ===========================================================================

/** 'YYYY-MM-DD' (local) -> the Sunday that starts its week, 'YYYY-MM-DD'. */
export function weekKeyOf(day) {
  const d = new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)), 12);
  d.setDate(d.getDate() - d.getDay());
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The 7 local days of a week key. */
export function weekDays(weekKey) {
  const d = new Date(Number(weekKey.slice(0, 4)), Number(weekKey.slice(5, 7)) - 1, Number(weekKey.slice(8, 10)), 12);
  const p = (n) => String(n).padStart(2, '0');
  const out = [];
  for (let i = 0; i < 7; i += 1) {
    out.push(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// Part checkers: each -> (entries of the week) -> {done, progress, value, need, at?}
function minutesPart(tools, need) {
  return (entries) => {
    const runs = entries.filter((e) => tools.includes(e.tool));
    const mins = sumMinutes(runs);
    const at = reachedAt(runs, need * 60000, (e) => num(e.durationMs) ?? 0);
    return { done: at != null, progress: Math.min(1, mins / need), value: Math.floor(mins), need, at: at ?? undefined };
  };
}

function countPart(ok, need) {
  return (entries) => {
    const runs = entries.filter(ok).sort((a, b) => a.at - b.at);
    const done = runs.length >= need;
    return { done, progress: Math.min(1, runs.length / need), value: runs.length, need, at: done ? runs[need - 1].at : undefined };
  };
}

function distinctPart(ok, keyOf, need) {
  return (entries) => {
    const seen = new Set();
    let at;
    for (const e of entries.filter(ok).sort((a, b) => a.at - b.at)) {
      seen.add(keyOf(e));
      if (at == null && seen.size >= need) at = e.at;
    }
    return { done: at != null, progress: Math.min(1, seen.size / need), value: seen.size, need, at };
  };
}

const daysPart = (ok, need) => distinctPart(ok, (e) => e.day, need);

const cleanRhythm = (tool, min) => (e) => e.tool === tool && (e.metrics?.accuracyPct ?? 0) >= min && judged(e) >= 6;

export const WEEKLY_TEMPLATES = {
  changes: {
    make(ctx, rng) {
      let pairs = [];
      const g = ctx.goal && goalByKey(ctx.goal.key);
      if (g?.measure === 'minuteChangesWeakestPair') pairs = goalPairs(g, ctx.goal.params);
      if (!pairs.length) pairs = PAIRS_BY_LEVEL[ctx.level];
      const [a, b] = pickOne(rng, pairs);
      const recent = ctx.perf
        .filter((e) => e.tool === 'minuteChanges' && ctx.now - e.at < 30 * DAY_MS && Number.isFinite(e.metrics?.perMinute))
        .sort((x, y) => x.at - y.at)
        .slice(-5)
        .map((e) => e.metrics.perMinute);
      const typical = recent.length ? recent.reduce((s, v) => s + v, 0) / recent.length : 0;
      // Reachable but a stretch: a little above the recent typical result
      // (three times), never below the level's base.
      const per = clamp(Math.max([15, 20, 30, 40][ctx.level], round5(typical) + 5), 15, 60);
      return { a, b, minutes: [15, 20, 30, 40][ctx.level], tests: 3, per };
    },
    title: () => L('Chord-change week', 'שבוע החלפות אקורדים'),
    parts: (p) => [
      { label: L(`${p.minutes} min of chord changes`, `${p.minutes} דקות של החלפות אקורדים`), check: minutesPart(['chordChanges', 'minuteChanges'], p.minutes) },
      {
        label: L(`${p.tests} one-minute tests at ${p.per}/min or more`, `${p.tests} מבחני דקה של ${p.per} לדקה ומעלה`),
        check: countPart((e) => e.tool === 'minuteChanges' && (e.metrics?.perMinute ?? 0) >= p.per, p.tests),
      },
    ],
    launch: (p) => ({ tool: 'minuteChanges', chords: [p.a, p.b] }),
  },

  licks: {
    make(ctx, rng) {
      if (ctx.level === 0) return null;
      const genre = ctx.goal?.key === 'blues' ? 'blues' : lickGenre(ctx);
      const level = LEVELS[clamp(ctx.level, 1, 3)];
      let ids = LICKS.filter((l) => l.genre === genre && l.level === level).map((l) => l.id);
      if (!ids.length) ids = LICKS.filter((l) => l.genre === genre).map((l) => l.id);
      if (!ids.length) return null;
      return { genre, n: ctx.level >= 2 ? 5 : 3, min: 85, days: 3, lickId: pickOne(rng, ids), tempoPct: ctx.level <= 1 ? 70 : 100 };
    },
    title: (p) => L(`${GENRE_NAME[p.genre].en[0].toUpperCase()}${GENRE_NAME[p.genre].en.slice(1)} lick week`, `שבוע ליקים של ${GENRE_NAME[p.genre].he}`),
    parts: (p) => [
      {
        label: L(`${p.n} different licks scored ${p.min}+`, `${p.n} ליקים שונים בציון ${p.min}+`),
        check: distinctPart((e) => e.tool === 'lick' && !e.metrics?.solo && (e.metrics?.score ?? 0) >= p.min, (e) => e.item, p.n),
      },
      { label: L(`Lick Trainer on ${p.days} different days`, `מאמן הליקים ב-${p.days} ימים שונים`), check: daysPart((e) => e.tool === 'lick', p.days) },
    ],
    launch: (p) => ({ tool: 'lick', lickId: p.lickId, tempoPct: p.tempoPct }),
  },

  timing: {
    make(ctx, rng) {
      let drillId = ctx.goal && ['timing', 'speed'].includes(ctx.goal.key) ? ctx.goal.params?.drillId : null;
      if (!drillId) {
        const pool = DRILLS.filter((d) => DRILL_DIFF[ctx.level].includes(d.difficulty) && ['warmup', 'speed'].includes(d.category));
        drillId = pickOne(rng, pool.length ? pool : DRILLS).id;
      }
      const clean = ctx.perf.filter((e) => e.tool === 'rhythm' && e.item === drillId && (e.metrics?.accuracyPct ?? 0) >= 90).reduce((m, e) => Math.max(m, e.bpm ?? 0), 0);
      return { drillId, runs: 6, min: 90, days: 3, bpm: clean ? clamp(round5(clean), 50, 200) : [60, 70, 85, 100][ctx.level] };
    },
    title: () => L('Timing week', 'שבוע תזמון'),
    parts: (p) => [
      { label: L(`${p.runs} Rhythm Practice runs at ${p.min} %+`, `${p.runs} סבבי תרגול קצב ב-${p.min}%+`), check: countPart(cleanRhythm('rhythm', p.min), p.runs) },
      { label: L(`…spread over ${p.days} days`, `…על פני ${p.days} ימים`), check: daysPart(cleanRhythm('rhythm', p.min), p.days) },
    ],
    launch: (p) => ({ tool: 'rhythm', drillId: p.drillId, bpm: p.bpm }),
  },

  ear: {
    make(ctx) {
      const mode = ctx.goal?.key === 'ear' ? ctx.goal.params?.mode ?? 'interval' : ctx.level === 0 ? 'direction' : 'interval';
      return { mode, answers: [40, 60, 80, 100][ctx.level], pct: 80, days: 3, difficulty: ['beginner', 'beginner', 'intermediate', 'advanced'][ctx.level] };
    },
    title: () => L('Ear week', 'שבוע שמיעה'),
    parts: (p) => [
      {
        label: L(`${p.answers} ear-training answers at ${p.pct} %+ overall`, `${p.answers} תשובות באימון שמיעה ב-${p.pct}%+ בסך הכול`),
        check: (entries) => {
          const runs = entries.filter((e) => e.tool === 'ear' && Number.isFinite(e.metrics?.total)).sort((a, b) => a.at - b.at);
          let total = 0;
          let correct = 0;
          let at;
          for (const e of runs) {
            total += e.metrics.total;
            correct += e.metrics.correct ?? 0;
            if (at == null && total >= p.answers && (correct / total) * 100 >= p.pct) at = e.at;
          }
          const acc = total ? (correct / total) * 100 : 0;
          const done = total >= p.answers && acc >= p.pct;
          return { done, progress: done ? 1 : Math.min(0.99, total / p.answers) * (total ? Math.min(1, acc / p.pct) : 1), value: total, need: p.answers, at: done ? at ?? runs[runs.length - 1]?.at : undefined };
        },
      },
      { label: L(`Ear training on ${p.days} different days`, `אימון שמיעה ב-${p.days} ימים שונים`), check: daysPart((e) => e.tool === 'ear', p.days) },
    ],
    launch: (p) => ({ tool: 'ear', mode: p.mode, difficulty: p.difficulty, practiceMode: 'standard' }),
  },

  scale: {
    make(ctx) {
      if (ctx.level === 0) return null;
      const root = ctx.goal?.key === 'pentatonic' ? ctx.goal.params?.root ?? 9 : 9;
      return { root, minutes: [10, 15, 20, 25][ctx.level], positions: 2, min: 90, bpm: [60, 70, 80, 95][ctx.level] };
    },
    title: () => L('Pentatonic week', 'שבוע פנטטוני'),
    parts: (p) => [
      { label: L(`${p.minutes} min of Scale Practice`, `${p.minutes} דקות של תרגול סולמות`), check: minutesPart(['scale'], p.minutes) },
      {
        label: L(`${p.positions} pentatonic positions at ${p.min} % (${p.bpm} BPM)`, `${p.positions} פוזיציות פנטטוניות ב-${p.min}% (${p.bpm} BPM)`),
        check: distinctPart(
          (e) => e.tool === 'scale' && String(e.item).startsWith('minorPentatonic:') && (e.bpm ?? 0) >= p.bpm - 1 && cleanRhythm('scale', p.min)(e),
          (e) => String(e.item).split(':')[3] ?? e.item,
          p.positions
        ),
      },
    ],
    launch: (p) => ({ tool: 'scale', scaleKey: 'minorPentatonic', root: p.root, mode: 'position', positionIndex: 0, bpm: p.bpm }),
  },

  bends: {
    make(ctx) {
      if (ctx.level === 0) return null;
      return { hits: [20, 25, 40, 60][ctx.level], days: 3 };
    },
    title: () => L('Bending week', 'שבוע כפיפות'),
    parts: (p) => [
      {
        label: L(`${p.hits} bends in tune`, `${p.hits} כפיפות מדויקות`),
        check: (entries) => {
          const runs = entries.filter((e) => e.tool === 'bending');
          const hits = runs.reduce((s, e) => s + (e.metrics?.hits ?? 0), 0);
          const at = reachedAt(runs, p.hits, (e) => e.metrics?.hits ?? 0);
          return { done: at != null, progress: Math.min(1, hits / p.hits), value: hits, need: p.hits, at: at ?? undefined };
        },
      },
      { label: L(`Bending on ${p.days} different days`, `כפיפות ב-${p.days} ימים שונים`), check: daysPart((e) => e.tool === 'bending', p.days) },
    ],
    launch: () => ({ tool: 'bending' }),
  },

  steady: {
    meta: true,
    make(ctx) {
      const days = clamp(Math.round(ctx.daysPerWeek ?? 4), 3, 6);
      return { days, minutes: Number.isFinite(ctx.minutesPerDay) ? clamp(round5(ctx.minutesPerDay * 0.5), 10, 30) : 10 };
    },
    title: () => L('Steady week', 'שבוע רצוף'),
    parts: (p) => [
      {
        label: L(`Practise ${p.minutes}+ min on ${p.days} days`, `לתרגל ${p.minutes}+ דקות ב-${p.days} ימים`),
        check: (entries) => {
          const byDay = new Map();
          for (const e of [...entries].sort((a, b) => a.at - b.at)) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);
          const good = [];
          for (const [, list] of byDay) {
            const at = reachedAt(list, p.minutes * 60000, (e) => num(e.durationMs) ?? 0);
            if (at != null) good.push(at);
          }
          good.sort((a, b) => a - b);
          const done = good.length >= p.days;
          return { done, progress: Math.min(1, good.length / p.days), value: good.length, need: p.days, at: done ? good[p.days - 1] : undefined };
        },
      },
      { label: L('Use 3 different practice tools', 'להשתמש ב-3 כלי תרגול שונים'), check: distinctPart(substantial, (e) => e.tool, 3) },
    ],
    launch: () => null,
  },
};

const GOAL_WEEKLY = { changes: 'changes', barre: 'changes', timing: 'timing', speed: 'timing', pentatonic: 'scale', blues: 'licks', bending: 'bends', ear: 'ear' };
const WEEKLY_TOOL = { changes: 'minuteChanges', licks: 'lick', timing: 'rhythm', ear: 'ear', scale: 'scale', bends: 'bending', steady: 'time' };

/** The week's challenge spec, built from entries before the week starts. */
export function generateWeekly({ perf, weekKey, coach = null, seedKey = '' }) {
  const ctx = challengeContext({ perf, day: weekKey, coach });
  ctx.daysPerWeek = coach?.intake?.daysPerWeek;
  const rng = rngFrom(`${seedKey}|week|${weekKey}`);
  const goalTpl = ctx.goal && GOAL_WEEKLY[ctx.goal.key];
  let key = null;
  let params = null;
  // With a coach goal, the week works on it most weeks (3 out of 4).
  if (goalTpl && rng() < 0.75) {
    params = WEEKLY_TEMPLATES[goalTpl].make(ctx, rng);
    if (params) key = goalTpl;
  }
  if (!key) {
    const items = [];
    for (const k of Object.keys(WEEKLY_TEMPLATES)) {
      const p = WEEKLY_TEMPLATES[k].make(ctx, rng);
      if (!p) continue;
      let w = WEEKLY_TEMPLATES[k].meta ? 0.8 : 1;
      if (ctx.recentTools.has(WEEKLY_TOOL[k])) w *= 1.8;
      items.push({ key: k, params: p, w });
    }
    const c = weightedPick(rng, items);
    key = c.key;
    params = c.params;
  }
  return { id: `${weekKey}:${key}`, tpl: key, params, week: weekKey };
}

/** Weekly spec + the week's entries -> {title, parts[{label, ...status}], launch, status}. */
export function evaluateWeekly(spec, entriesOfWeek) {
  const tpl = spec && WEEKLY_TEMPLATES[spec.tpl];
  if (!tpl) return null;
  const parts = tpl.parts(spec.params).map((pt) => ({ label: pt.label, ...pt.check(entriesOfWeek) }));
  const done = parts.every((x) => x.done);
  const progress = parts.reduce((s, x) => s + x.progress, 0) / parts.length;
  return {
    ...spec,
    meta: !!tpl.meta,
    title: tpl.title(spec.params),
    launch: tpl.launch(spec.params),
    parts,
    status: { done, progress: done ? 1 : Math.min(0.99, progress), at: done ? Math.max(...parts.map((x) => x.at ?? 0)) : undefined },
  };
}
