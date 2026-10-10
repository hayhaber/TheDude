// The coach's brain (pure functions over the performance log): measures a
// goal, finds the current rung, estimates the time to the goal, builds the
// day's session from a teacher's template, and spots weak points.
//
// Method notes (sources in goals.js):
//   • A rung counts as reached when its target is met on TWO different days
//     (retention, not a one-off) — or once in the placement test.
//   • Practice tempo: the rung tempo, or 10 % below it while accuracy is
//     under 80 % (accuracy before speed); never jump more than one rung.
//   • Session shares (JustinGuitar's template, research summary): warm-up
//     ~8 %, the goal ~45 %, a supporting skill ~15 %, real music ~30 %,
//     a break after 25 min of playing.

import { GOALS, REF_WEEKLY_GOAL_MIN, goalByKey, goalPairs, samePair, pairKey } from './goals';
import { localDay } from './perfLog';
import { LICKS } from '../music/lickTrainer/library';

export const COACH_KEY = 'dudestar-coach';
const L = (en, he) => ({ en, he });

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export function loadCoach() {
  try {
    const v = JSON.parse(localStorage.getItem(COACH_KEY));
    if (v && typeof v === 'object') return v;
  } catch {
    /* none yet */
  }
  return null;
}

export function saveCoach(state) {
  try {
    localStorage.setItem(COACH_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
  return state;
}

export function newCoachState(intake) {
  return { v: 1, createdAt: Date.now(), intake, goals: [], activeGoalId: null, days: {} };
}

export function activeGoal(state) {
  return state?.goals?.find((g) => g.id === state.activeGoalId) ?? null;
}

// ---------------------------------------------------------------------------
// Measuring a goal from the performance log
// ---------------------------------------------------------------------------

const isPlacement = (e) => String(e.coach?.blockId ?? '').startsWith('placement:');

function lickIds(genre, level) {
  return LICKS.filter((l) => l.genre === genre && (!level || l.level === level)).map((l) => l.id);
}

/** Entries that count for a rung, each mapped to {at, day, value, ok, placement}. */
export function rungRuns(goal, params, rung, perf) {
  const runs = [];
  const push = (e, value, ok) => runs.push({ at: e.at, day: e.day, value, ok, placement: isPlacement(e), item: e.item });
  switch (goal.measure) {
    case 'minuteChangesWeakestPair': {
      // Per pair; the caller combines pairs (weakest).
      for (const e of perf) {
        if (e.tool !== 'minuteChanges') continue;
        const v = e.metrics?.perMinute;
        if (Number.isFinite(v)) push(e, v, v >= rung.min);
      }
      break;
    }
    case 'rhythmAccuracy':
    case 'scaleAccuracy': {
      const tool = goal.measure === 'rhythmAccuracy' ? 'rhythm' : 'scale';
      const item = tool === 'rhythm' ? params.drillId : `minorPentatonic:${params.root ?? 9}:position:p${rung.position ?? 0}`;
      for (const e of perf) {
        if (e.tool !== tool || e.item !== item) continue;
        const acc = e.metrics?.accuracyPct;
        if (!Number.isFinite(acc) || (e.metrics?.total ?? (e.metrics?.hits ?? 0) + (e.metrics?.misses ?? 0)) < 6) continue;
        const atTempo = !rung.bpm || (e.bpm ?? 0) >= rung.bpm - 1;
        push(e, acc, atTempo && acc >= rung.min);
      }
      break;
    }
    case 'lickScore': {
      const ids = new Set(lickIds(params.genre ?? 'blues', rung.level));
      for (const e of perf) {
        if (e.tool !== 'lick' || !ids.has(e.item)) continue;
        const s = e.metrics?.score;
        if (!Number.isFinite(s)) continue;
        push(e, s, (e.metrics?.tempoPct ?? 0) >= (rung.tempoPct ?? 0) && s >= rung.min);
      }
      break;
    }
    case 'bendAccuracy': {
      for (const e of perf) {
        if (e.tool !== 'bending') continue;
        const acc = e.metrics?.accuracyPct;
        if (!Number.isFinite(acc) || (e.metrics?.steps ?? 0) < 3) continue;
        push(e, acc, acc >= rung.min);
      }
      break;
    }
    case 'earAccuracy': {
      for (const e of perf) {
        if (e.tool !== 'ear' || e.item !== (params.mode ?? 'interval')) continue;
        if (rung.difficulty && e.metrics?.difficulty !== rung.difficulty) continue;
        const acc = e.metrics?.accuracyPct;
        if (!Number.isFinite(acc) || (e.metrics?.total ?? 0) < 10) continue;
        push(e, acc, acc >= rung.min);
      }
      break;
    }
    default:
  }
  return runs;
}

const daysMet = (runs) => new Set(runs.filter((r) => r.ok).map((r) => r.day)).size;
const certified = (runs) => runs.some((r) => r.ok && r.placement) || daysMet(runs) >= 2;

/** Is a rung reached? For chord goals: every pair must be. */
export function rungReached(goal, params, rung, perf) {
  if (goal.measure === 'minuteChangesWeakestPair') {
    return goalPairs(goal, params).every(([a, b]) => {
      const runs = rungRuns(goal, params, rung, perf.filter((e) => e.tool === 'minuteChanges' && samePair(e.item, a, b)));
      return certified(runs);
    });
  }
  if (goal.measure === 'lickScore') {
    // At least two different licks (or all, if fewer exist) met on their own.
    const runs = rungRuns(goal, params, rung, perf);
    const ok = new Set(runs.filter((r) => r.ok).map((r) => r.item));
    const need = Math.min(2, lickIds(params.genre ?? 'blues', rung.level).length);
    return ok.size >= need;
  }
  return certified(rungRuns(goal, params, rung, perf));
}

/** Index of the first rung not reached (rungs.length = goal done). */
export function currentRungIndex(goal, params, perf) {
  for (let i = 0; i < goal.rungs.length; i += 1) if (!rungReached(goal, params, goal.rungs[i], perf)) return i;
  return goal.rungs.length;
}

/** The latest best value per chord pair (for chord goals). */
export function pairStats(goal, params, perf) {
  return goalPairs(goal, params).map(([a, b]) => {
    const runs = perf.filter((e) => e.tool === 'minuteChanges' && samePair(e.item, a, b) && Number.isFinite(e.metrics?.perMinute));
    const recent = runs.slice(-3);
    const best = runs.reduce((m, e) => Math.max(m, e.metrics.perMinute), 0);
    const latest = recent.length ? Math.max(...recent.map((e) => e.metrics.perMinute)) : null;
    // Direction balance (A→B vs B→A), from the latest run that has it.
    const last = runs[runs.length - 1];
    return { a, b, key: pairKey(a, b), runs: runs.length, best, latest, last };
  });
}

/**
 * One value per day for the progress chart, in the goal's own unit:
 * chord goals = weakest pair's best changes/min that day; tempo ladders =
 * the highest tempo played cleanly (≥ the rung's accuracy) that day;
 * scale ladder = positions × tempo reached (rung number); others = best.
 */
export function dailySeries(goal, params, perf) {
  const byDay = new Map();
  const put = (day, v) => byDay.set(day, Math.max(byDay.get(day) ?? -Infinity, v));
  if (goal.measure === 'minuteChangesWeakestPair') {
    const pairs = goalPairs(goal, params);
    const days = [...new Set(perf.filter((e) => e.tool === 'minuteChanges').map((e) => e.day))].sort();
    const latest = new Map(); // pair -> best so far
    for (const day of days) {
      for (const [a, b] of pairs) {
        const v = perf
          .filter((e) => e.day === day && e.tool === 'minuteChanges' && samePair(e.item, a, b))
          .reduce((m, e) => Math.max(m, e.metrics?.perMinute ?? 0), -1);
        if (v >= 0) latest.set(pairKey(a, b), Math.max(latest.get(pairKey(a, b)) ?? 0, v));
      }
      if (latest.size === pairs.length) byDay.set(day, Math.min(...latest.values()));
      else if (latest.size) byDay.set(day, Math.min(...latest.values()));
    }
  } else if (goal.measure === 'rhythmAccuracy') {
    const min = goal.rungs[0].min;
    for (const e of perf) {
      if (e.tool !== 'rhythm' || e.item !== params.drillId || !Number.isFinite(e.metrics?.accuracyPct)) continue;
      if (e.metrics.accuracyPct >= min) put(e.day, e.bpm ?? 0);
    }
  } else if (goal.measure === 'scaleAccuracy') {
    goal.rungs.forEach((rung, i) => {
      for (const r of rungRuns(goal, params, rung, perf)) if (r.ok) put(r.day, i + 1);
    });
  } else {
    // lickScore / bendAccuracy / earAccuracy: the day's best value at any rung.
    const seen = new Set();
    for (const rung of goal.rungs)
      for (const r of rungRuns(goal, params, rung, perf)) {
        const k = `${r.at}`;
        if (seen.has(k)) continue;
        seen.add(k);
        put(r.day, r.value);
      }
  }
  return [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, value]) => ({ day, value }));
}

/** What the chart's y axis means for this goal. */
export function seriesUnit(goal) {
  switch (goal.measure) {
    case 'minuteChangesWeakestPair':
      return L('changes / min (weakest pair)', 'החלפות לדקה (הזוג החלש)');
    case 'rhythmAccuracy':
      return L('fastest clean BPM', 'BPM הנקי הגבוה ביותר');
    case 'scaleAccuracy':
      return L('steps reached', 'שלבים שהושגו');
    case 'lickScore':
      return L('best lick score', 'ציון הליק הטוב');
    default:
      return L('best accuracy (%)', 'דיוק מיטבי (%)');
  }
}

/** The rung targets drawn as reference lines on the chart, in the series' unit. */
export function seriesTargets(goal) {
  switch (goal.measure) {
    case 'minuteChangesWeakestPair':
    case 'lickScore':
    case 'bendAccuracy':
    case 'earAccuracy':
      return [...new Set(goal.rungs.map((r) => r.min))];
    case 'rhythmAccuracy':
      return goal.rungs.map((r) => r.bpm);
    case 'scaleAccuracy':
      return [goal.rungs.length];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Time to the goal
// ---------------------------------------------------------------------------

export const GOAL_SHARE = 0.45;

/**
 * Weeks from rung `fromIndex` to the end, scaled to the student's time:
 * less time than the reference stretches it (not linearly — some learning
 * happens between sessions). Returns {weeks, low, high, date}.
 */
export function estimateTime(goal, fromIndex, intake, now = Date.now()) {
  const left = goal.rungs.slice(fromIndex).reduce((s, r) => s + r.weeks, 0);
  const weeklyGoal = Math.max(10, (intake?.minutesPerDay ?? 20) * (intake?.daysPerWeek ?? 5) * GOAL_SHARE);
  const factor = Math.max(0.5, Math.min(4, (REF_WEEKLY_GOAL_MIN / weeklyGoal) ** 0.8));
  const weeks = Math.max(left ? 1 : 0, Math.round(left * factor));
  const low = Math.max(left ? 1 : 0, Math.round(weeks * 0.75));
  const high = Math.round(weeks * 1.35) || weeks;
  return { weeks, low, high, date: new Date(now + weeks * 7 * 86400000).toISOString().slice(0, 10) };
}

/** On schedule? Compares rungs reached so far with where the plan expected. */
export function scheduleStatus(goalState, goal, rungIndex, intake, now = Date.now()) {
  const startEst = estimateTime(goal, goalState.startRung ?? 0, intake, goalState.createdAt);
  const total = goal.rungs.length - (goalState.startRung ?? 0);
  if (!startEst.weeks || !total) return { status: 'onTrack', expected: rungIndex };
  const weeksIn = (now - goalState.createdAt) / (7 * 86400000);
  const expected = (goalState.startRung ?? 0) + Math.min(total, Math.floor((weeksIn / startEst.weeks) * total));
  const status = rungIndex > expected ? 'ahead' : rungIndex + 1 < expected ? 'behind' : 'onTrack';
  return { status, expected };
}

// ---------------------------------------------------------------------------
// Weak points (last 14 days, all tools)
// ---------------------------------------------------------------------------

const DAY_MS = 86400000;

export function findWeaknesses(perf, now = Date.now()) {
  const recent = perf.filter((e) => now - e.at < 14 * DAY_MS);
  const out = [];

  // Slow / failed chord pairs (Chord Changes runs + one-minute tests).
  const pairs = new Map();
  for (const e of recent) {
    if (e.tool === 'chordChanges' && Array.isArray(e.metrics?.pairs)) {
      for (const p of e.metrics.pairs) {
        if (!p.from || !p.to || p.from === p.to) continue;
        const k = [p.from, p.to].sort().join('>');
        const s = pairs.get(k) ?? { n: 0, miss: 0, lat: [] };
        s.n += 1;
        if (!p.ok) s.miss += 1;
        if (Number.isFinite(p.latencyMs)) s.lat.push(p.latencyMs);
        pairs.set(k, s);
      }
    }
  }
  for (const [k, s] of pairs) {
    if (s.n >= 4 && s.miss / s.n >= 0.3) {
      const [a, b] = k.split('>');
      out.push({
        key: `pair:${k}`,
        severity: s.miss / s.n,
        title: L(`Slow change: ${a} ↔ ${b}`, `מעבר איטי: ${a} ↔ ${b}`),
        detail: L(
          `You missed ${Math.round((s.miss / s.n) * 100)} % of the ${a}↔${b} changes in Chord Changes.`,
          `פספסתם ${Math.round((s.miss / s.n) * 100)}% מהמעברים ${a}↔${b} ב"החלפת אקורדים".`
        ),
        remedy: L(
          'One-minute changes on just this pair; find a finger that stays (anchor) or moves least, and move the others together as one shape.',
          'החלפות בדקה רק על הזוג הזה; מצאו אצבע שנשארת במקום (עוגן) או זזה הכי מעט, והזיזו את השאר יחד כצורה אחת.'
        ),
        block: { tool: 'minuteChanges', chords: [a, b], minutes: 3 },
      });
    }
  }

  // One-minute changes: one direction clearly slower.
  const lastMinute = [...recent].reverse().find((e) => e.tool === 'minuteChanges' && (e.metrics?.count ?? 0) >= 10);
  if (lastMinute) {
    const { aToB = 0, bToA = 0 } = lastMinute.metrics;
    const [a, b] = String(lastMinute.item).split('>');
    if (a && b && Math.max(aToB, bToA) > 0 && Math.min(aToB, bToA) / Math.max(aToB, bToA) < 0.8) {
      const slow = aToB < bToA ? [a, b] : [b, a];
      out.push({
        key: `dir:${slow.join('>')}`,
        severity: 0.4,
        title: L(`${slow[0]} → ${slow[1]} is the slow direction`, `${slow[0]} ← ${slow[1]}: הכיוון האיטי`.replace('←', '→')),
        detail: L('One direction of the change takes longer than the other.', 'כיוון אחד של המעבר לוקח יותר זמן מהשני.'),
        remedy: L(
          `Practise just ${slow[0]} → ${slow[1]}: form ${slow[1]} in the air first, then place all fingers at once.`,
          `תרגלו רק ${slow[0]} → ${slow[1]}: בנו את ${slow[1]} באוויר ורק אז הניחו את כל האצבעות יחד.`
        ),
        block: { tool: 'minuteChanges', chords: slow, minutes: 2 },
      });
    }
  }

  // Timing bias from Lick Trainer takes (the only calibrated timing).
  const offs = recent.filter((e) => e.tool === 'lick' && Number.isFinite(e.metrics?.meanOffsetMs)).slice(-6);
  if (offs.length >= 3) {
    const mean = offs.reduce((s, e) => s + e.metrics.meanOffsetMs, 0) / offs.length;
    if (Math.abs(mean) >= 25) {
      const late = mean > 0;
      out.push({
        key: late ? 'timing:drag' : 'timing:rush',
        severity: Math.min(1, Math.abs(mean) / 80),
        title: late ? L('You tend to play behind the beat', 'נטייה לנגן אחרי הפעמה') : L('You tend to rush ahead of the beat', 'נטייה להקדים את הפעמה'),
        detail: L(
          `On average ${Math.round(Math.abs(mean))} ms ${late ? 'late' : 'early'} over your last ${offs.length} takes.`,
          `בממוצע ${Math.round(Math.abs(mean))} מילישניות ${late ? 'באיחור' : 'מוקדם'} ב-${offs.length} הניסיונות האחרונים.`
        ),
        remedy: L(
          'Slow, subdivided practice: count "1-&-2-&" out loud, and set the click to beats 2 and 4 only, so you have to feel 1 and 3 yourself.',
          'תרגול איטי עם חלוקה: ספרו בקול "1-ו-2-ו", ושימו את הקליק רק על פעמות 2 ו-4 — כך את 1 ו-3 תצטרכו להרגיש בעצמכם.'
        ),
        block: { tool: 'rhythm', drillId: 'spider-walk-1234', bpm: 60, minutes: 4 },
      });
    }
  }

  // Bends flat / sharp.
  const bends = recent.filter((e) => e.tool === 'bending' && Number.isFinite(e.metrics?.meanCents)).slice(-4);
  if (bends.length >= 2) {
    const mean = bends.reduce((s, e) => s + e.metrics.meanCents, 0) / bends.length;
    if (Math.abs(mean) >= 12) {
      const flat = mean < 0;
      out.push({
        key: flat ? 'bend:flat' : 'bend:sharp',
        severity: Math.min(1, Math.abs(mean) / 40),
        title: flat ? L('Bends fall short (flat)', 'הכפיפות לא מגיעות (נמוכות)') : L('Bends go too far (sharp)', 'הכפיפות עוברות את הצליל (גבוהות)'),
        detail: L(`Average ${Math.round(mean)} cents from the target.`, `בממוצע ${Math.round(mean)} סנט מהצליל.`),
        remedy: L(
          'Play the target note at the higher fret first, then bend up to match it. Support the bending finger with the fingers behind it.',
          'נגנו קודם את צליל היעד בשריג הגבוה, ואז כופפו עד שתגיעו אליו. תמכו באצבע הכופפת עם האצבעות שמאחוריה.'
        ),
        block: { tool: 'bending', minutes: 4 },
      });
    }
  }

  // Wrong notes in licks while timing is fine → too fast.
  const licks = recent.filter((e) => e.tool === 'lick' && Number.isFinite(e.metrics?.pitchScore)).slice(-5);
  if (licks.length >= 3) {
    const p = licks.reduce((s, e) => s + e.metrics.pitchScore, 0) / licks.length;
    if (p < 70) {
      out.push({
        key: 'lick:pitch',
        severity: (70 - p) / 70,
        title: L('Wrong notes in licks', 'תווים שגויים בליקים'),
        detail: L(`Only ${Math.round(p)} % of lick notes were right lately.`, `רק ${Math.round(p)}% מתווי הליקים היו נכונים לאחרונה.`),
        remedy: L(
          'Drop the tempo until a take is clean, then raise it 5 % at a time. Errors practised fast get practised in.',
          'הורידו טמפו עד שהביצוע נקי, ואז העלו 5% בכל פעם. טעויות שמתרגלים מהר — נחרטות.'
        ),
        block: null,
      });
    }
  }

  // Ear training: a mode under 70 %.
  const ear = new Map();
  for (const e of recent)
    if (e.tool === 'ear' && (e.metrics?.total ?? 0) >= 5) {
      const s = ear.get(e.item) ?? { c: 0, t: 0 };
      s.c += e.metrics.correct ?? 0;
      s.t += e.metrics.total ?? 0;
      ear.set(e.item, s);
    }
  for (const [mode, s] of ear) {
    if (s.t >= 15 && s.c / s.t < 0.7)
      out.push({
        key: `ear:${mode}`,
        severity: 0.3,
        title: L(`Ear: ${mode} below 70 %`, `שמיעה: ${mode} מתחת ל-70%`),
        detail: L(`${Math.round((s.c / s.t) * 100)} % correct over ${s.t} answers.`, `${Math.round((s.c / s.t) * 100)}% נכון מתוך ${s.t} תשובות.`),
        remedy: L('Short daily doses beat long sessions: 5 minutes, sing each answer before you click.', 'מנות קצרות יומיות עדיפות על מפגש ארוך: 5 דקות, ושירו כל תשובה לפני שלוחצים.'),
        block: { tool: 'ear', mode, difficulty: 'beginner', minutes: 4 },
      });
  }

  // Practice / scale runs under 80 % → too fast.
  for (const tool of ['rhythm', 'scale']) {
    const runs = recent.filter((e) => e.tool === tool && Number.isFinite(e.metrics?.accuracyPct)).slice(-4);
    if (runs.length >= 3 && runs.reduce((s, e) => s + e.metrics.accuracyPct, 0) / runs.length < 75)
      out.push({
        key: `${tool}:fast`,
        severity: 0.35,
        title: tool === 'rhythm' ? L('Rhythm runs below 75 %', 'תרגילי קצב מתחת ל-75%') : L('Scale runs below 75 %', 'סולמות מתחת ל-75%'),
        detail: L('Most notes are being missed at this tempo.', 'רוב התווים מתפספסים בטמפו הזה.'),
        remedy: L('Go 10–15 % slower until you get five clean runs in a row, then step up.', 'האטו ב-10–15% עד חמש הרצות נקיות ברצף, ואז עלו בהדרגה.'),
        block: null,
      });
  }

  return out.sort((a, b) => b.severity - a.severity);
}

// ---------------------------------------------------------------------------
// The day's session
// ---------------------------------------------------------------------------

/** Minutes per part for a daily budget (teacher template, scaled). */
export function sessionTemplate(minutes) {
  const m = Math.max(10, Math.min(90, minutes || 20));
  const warm = m <= 15 ? 2 : m <= 30 ? 3 : m <= 45 ? 4 : 5;
  const brk = m >= 45 ? 3 : 0;
  const rest = m - warm - brk;
  const goal = Math.round(rest * 0.5);
  const support = m >= 20 ? Math.round(rest * 0.18) : 0;
  const music = rest - goal - support;
  return { warm, goal, support, music, brk, total: m };
}

const rhythmTempo = (rung, perf, item) => {
  if (!rung?.bpm) return null;
  const last = [...perf].reverse().find((e) => e.item === item && Number.isFinite(e.metrics?.accuracyPct));
  // Accuracy before speed: 10 % under the rung tempo until runs reach 80 %.
  if (last && last.metrics.accuracyPct < 80) return Math.round(rung.bpm * 0.9);
  return rung.bpm;
};

function pickLick(genre, level, perf) {
  const ids = lickIds(genre, level);
  if (!ids.length) return null;
  // The least-practised / lowest-scoring lick first.
  const score = (id) => {
    const runs = perf.filter((e) => e.tool === 'lick' && e.item === id);
    return runs.length ? Math.max(...runs.map((e) => e.metrics?.score ?? 0)) : -1;
  };
  return [...ids].sort((a, b) => score(a) - score(b))[0];
}

/** Technique blocks for the goal at its current rung (fills `minutes`). */
function goalBlocks(goal, params, rung, perf, minutes) {
  const b = [];
  switch (goal.key) {
    case 'changes':
    case 'barre': {
      const stats = pairStats(goal, params, perf).sort((x, y) => (x.latest ?? -1) - (y.latest ?? -1));
      const weakest = stats[0];
      const second = stats[1];
      const slow = goal.key === 'barre' ? 50 : 60;
      b.push({
        kind: 'goal',
        title: L(`Chord perfect: ${weakest.a} and ${weakest.b}`, `אקורד מושלם: ${weakest.a} ו-${weakest.b}`),
        how:
          goal.key === 'barre'
            ? L(
                'Fingers 2-3-4 first, then lay the barre. Roll the index slightly onto its side, keep the wrist straight and pull the arm back instead of squeezing. Check each string rings; relax between attempts.',
                'קודם אצבעות 2-3-4, ואז הברה. גלגלו מעט את האצבע המורה על הצד, שמרו על שורש כף יד ישר ומשכו את היד לאחור במקום ללחוץ. בדקו שכל מיתר מצלצל; הרפו בין ניסיונות.'
              )
            : L(
                'Slowly, four beats per chord: place all fingers together, check every string rings, and find the finger that can stay or slide (anchor).',
                'לאט, ארבע פעמות לאקורד: הניחו את כל האצבעות יחד, בדקו שכל מיתר מצלצל, ומצאו אצבע שיכולה להישאר או להחליק (עוגן).'
              ),
        minutes: Math.max(2, Math.round(minutes * 0.4)),
        launch: { tool: 'chordChanges', chords: [weakest.a, weakest.b], bpm: slow, beatsPerChord: 4 },
        measure: { tool: 'chordChanges', field: 'accuracyPct', target: 80 },
      });
      b.push({
        kind: 'goal',
        title: L(`One-minute changes: ${weakest.a} ↔ ${weakest.b}`, `החלפות בדקה: ${weakest.a} ↔ ${weakest.b}`),
        how: L(
          `Two rounds. Target ${rung.min}/min. One strum per chord; don't stop to fix — speed comes from not hesitating.`,
          `שני סבבים. יעד ${rung.min} לדקה. פריטה אחת לכל אקורד; אל תעצרו לתקן — המהירות באה מחוסר היסוס.`
        ),
        minutes: 3,
        launch: { tool: 'minuteChanges', chords: [weakest.a, weakest.b] },
        measure: { tool: 'minuteChanges', field: 'perMinute', target: rung.min },
      });
      if (second && minutes - Math.round(minutes * 0.4) - 3 >= 3)
        b.push({
          kind: 'goal',
          title: L(`One-minute changes: ${second.a} ↔ ${second.b}`, `החלפות בדקה: ${second.a} ↔ ${second.b}`),
          how: L(`Target ${rung.min}/min.`, `יעד ${rung.min} לדקה.`),
          minutes: 3,
          launch: { tool: 'minuteChanges', chords: [second.a, second.b] },
          measure: { tool: 'minuteChanges', field: 'perMinute', target: rung.min },
        });
      break;
    }
    case 'timing':
    case 'speed': {
      const bpm = rhythmTempo(rung, perf, params.drillId);
      b.push({
        kind: 'goal',
        title: L(`Clean run at ${bpm} BPM`, `הרצה נקייה ב-${bpm} BPM`),
        how:
          goal.key === 'timing'
            ? L(
                `Count out loud, land each note exactly on the click. Aim: ${rung.min} % on time. Five clean runs in a row before the tempo goes up.`,
                `ספרו בקול ונחתו כל תו בדיוק על הקליק. יעד: ${rung.min}% בזמן. חמש הרצות נקיות ברצף לפני שהטמפו עולה.`
              )
            : L(
                `Small, relaxed picking motion, even volume. Aim: ${rung.min} % clean. Then 2–3 short bursts of 4 notes at about 10 % faster — fast is how you find the right motion.`,
                `תנועת פריטה קטנה ורפויה, עוצמה אחידה. יעד: ${rung.min}% נקי. אחר כך 2–3 "פרצים" קצרים של 4 תווים בכ-10% מהר יותר — במהירות מגלים את התנועה הנכונה.`
              ),
        minutes: goal.key === 'timing' && minutes >= 8 ? Math.round(minutes * 0.65) : minutes,
        launch: { tool: 'rhythm', drillId: params.drillId, bpm },
        measure: { tool: 'rhythm', field: 'accuracyPct', target: rung.min, bpm: rung.bpm },
      });
      if (goal.key === 'timing' && minutes >= 8)
        b.push({
          kind: 'goal',
          title: L('Strumming with the click on 2 and 4', 'פריטה עם קליק על 2 ו-4'),
          how: L(
            `Any two chords, steady down-up eighths. Set the metronome to half tempo (${Math.round((bpm || 80) / 2)}) and hear each click as beats 2 and 4 — you supply 1 and 3. If you drift, stop and count in again.`,
            `שני אקורדים כלשהם, פריטה קבועה למטה-למעלה בשמיניות. כוונו את המטרונום לחצי טמפו (${Math.round((bpm || 80) / 2)}) ושמעו כל קליק כפעמה 2 או 4 — את 1 ו-3 אתם מספקים. אם סטיתם, עצרו וספרו מחדש.`
          ),
          minutes: minutes - Math.round(minutes * 0.65),
          launch: null,
          measure: null,
          metronomeBpm: Math.round((bpm || 80) / 2),
        });
      break;
    }
    case 'pentatonic': {
      const p = rung.position ?? 0;
      const bpm = rhythmTempo(rung, perf, `minorPentatonic:${params.root ?? 9}:position:p${p}`) ?? 70;
      b.push({
        kind: 'goal',
        title: L(`Pentatonic position ${p + 1} at ${bpm} BPM`, `פנטטוני פוזיציה ${p + 1} ב-${bpm} BPM`),
        how: L(
          'Up and down the box, one note per click, saying the root (A) each time you pass it. Five clean runs before you speed up.',
          'למעלה ולמטה בקופסה, תו לכל קליק, ואמרו "לה" בכל פעם שאתם עוברים על השורש. חמש הרצות נקיות לפני שמאיצים.'
        ),
        minutes: p > 0 ? Math.round(minutes * 0.65) : minutes,
        launch: { tool: 'scale', scaleKey: 'minorPentatonic', root: params.root ?? 9, mode: 'position', positionIndex: p, bpm },
        measure: { tool: 'scale', field: 'accuracyPct', target: rung.min, bpm: rung.bpm },
      });
      if (p > 0)
        b.push({
          kind: 'goal',
          title: L(`Connect position ${p} → ${p + 1}`, `חיבור פוזיציה ${p} ← ${p + 1}`.replace('←', '→')),
          how: L('Slide between the two boxes on one string, so the neck becomes one map.', 'החליקו בין שתי הקופסאות על מיתר אחד, כדי שהצוואר יהפוך למפה אחת.'),
          minutes: minutes - Math.round(minutes * 0.65),
          launch: { tool: 'scale', scaleKey: 'minorPentatonic', root: params.root ?? 9, mode: 'transition', positionIndex: p - 1, bpm: 70 },
          measure: null,
        });
      break;
    }
    case 'blues': {
      const lick = pickLick(params.genre ?? 'blues', rung.level, perf);
      b.push({
        kind: 'goal',
        title: L(`Blues lick at ${rung.tempoPct} % tempo`, `ליק בלוז ב-${rung.tempoPct}% טמפו`),
        how: L(
          `Listen first, then record. Aim: score ${rung.min}. Bends must reach the pitch; vibrato even. Fix the one spot the trainer marks, not the whole lick.`,
          `הקשיבו קודם, ואז הקליטו. יעד: ציון ${rung.min}. כפיפות חייבות להגיע לצליל; ויברטו אחיד. תקנו את הנקודה שהמאמן מסמן, לא את כל הליק.`
        ),
        minutes: Math.round(minutes * 0.6),
        launch: lick ? { tool: 'lick', lickId: lick, tempoPct: rung.tempoPct } : null,
        measure: { tool: 'lick', field: 'score', target: rung.min },
      });
      b.push({
        kind: 'goal',
        title: L('Your own phrases (call & answer)', 'משפטים משלכם (שאלה ותשובה)'),
        how: L(
          'Over the backing: play a short phrase, leave a bar of space, then answer it ending on A. Use the lick you just learned as raw material.',
          'מעל הליווי: נגנו משפט קצר, השאירו תיבה של שקט, ואז ענו עליו וסיימו על לה. השתמשו בליק שלמדתם כחומר גלם.'
        ),
        minutes: minutes - Math.round(minutes * 0.6),
        launch: { tool: 'soloOpener', bars: 4, bpm: 80 },
        measure: null,
      });
      break;
    }
    case 'bending':
      b.push({
        kind: 'goal',
        title: L('Bends to the target pitch', 'כפיפות אל צליל היעד'),
        how: L(
          `Before each bend play the target note (the fret shown), then bend up to it and hold. Aim: ${rung.min} % in tune.`,
          `לפני כל כפיפה נגנו את צליל היעד (השריג המסומן), ואז כופפו אליו והחזיקו. יעד: ${rung.min}% מדויק.`
        ),
        minutes,
        launch: { tool: 'bending' },
        measure: { tool: 'bending', field: 'accuracyPct', target: rung.min },
      });
      break;
    case 'ear':
      b.push({
        kind: 'goal',
        title: L('Interval ear training', 'אימון שמיעה — מרווחים'),
        how: L(
          `Sing each interval back before answering; link it to a song you know. Aim: ${rung.min} %.`,
          `שירו כל מרווח לפני שעונים; קשרו אותו לשיר מוכר. יעד: ${rung.min}%.`
        ),
        minutes,
        launch: { tool: 'ear', mode: params.mode ?? 'interval', difficulty: rung.difficulty ?? 'beginner', practiceMode: 'standard' },
        measure: { tool: 'ear', field: 'accuracyPct', target: rung.min },
      });
      break;
    default:
  }
  return b;
}

const STYLE_GENRE = { rock: 'rock', blues: 'blues', metal: 'metal', pop: null, acoustic: null };
const STYLE_SONG = {
  pop: ['G', 'D', 'Em', 'C'],
  acoustic: ['G', 'C', 'D', 'G'],
  rock: ['E', 'A', 'D', 'A'],
  blues: ['A', 'D', 'E', 'A'],
  metal: ['Em', 'C', 'D', 'Em'],
};

/** Build the blocks of a day's session. */
export function buildSession(state, perf, weaknesses = findWeaknesses(perf), day = localDay()) {
  const intake = state.intake ?? {};
  const g = activeGoal(state);
  const goal = g && goalByKey(g.goalKey);
  const t = sessionTemplate(intake.minutesPerDay);
  const level = intake.level ?? 'beginner';
  const blocks = [];
  const add = (block) => blocks.push({ id: `${day}:${blocks.length}`, done: false, ...block });

  add({
    kind: 'warm',
    title: L('Spider walk', 'הליכת העכביש'),
    how: L(
      'Slow and relaxed, one finger per fret, every note clean. Loosen the hands and shoulders first — no strain.',
      'לאט ורפוי, אצבע לכל שריג, כל תו נקי. קודם שחררו ידיים וכתפיים — בלי מאמץ.'
    ),
    minutes: t.warm,
    launch: { tool: 'drill', drillId: 'spider-walk-1234', bpm: level === 'advanced' ? 90 : 60 },
    measure: null,
  });

  if (goal) {
    const ri = currentRungIndex(goal, g.params, perf);
    const rung = goal.rungs[Math.min(ri, goal.rungs.length - 1)];
    goalBlocks(goal, g.params, rung, perf, t.goal).forEach((b) => add({ ...b, goalId: g.id }));
  }

  // Supporting skill: the top weak point if there's one with a block,
  // otherwise timing (or ear, when timing is the goal).
  if (t.support) {
    const w = weaknesses.find((x) => x.block);
    if (w) {
      const { minutes: _m, ...launch } = w.block;
      add({ kind: 'fix', title: w.title, how: w.remedy, minutes: t.support, launch, measure: null, weakness: w.key });
    } else if (goal?.key !== 'timing') {
      add({
        kind: 'support',
        title: L('Time feel', 'תחושת זמן'),
        how: L('Play exactly with the click at a comfortable tempo; count out loud.', 'נגנו בדיוק עם הקליק בטמפו נוח; ספרו בקול.'),
        minutes: t.support,
        launch: { tool: 'rhythm', drillId: 'spider-walk-1234', bpm: 70 },
        measure: null,
      });
    } else {
      add({
        kind: 'support',
        title: L('Ear: intervals', 'שמיעה: מרווחים'),
        how: L('Five minutes a day is enough — sing each answer first.', 'חמש דקות ביום מספיקות — שירו כל תשובה קודם.'),
        minutes: t.support,
        launch: { tool: 'ear', mode: 'interval', difficulty: 'beginner', practiceMode: 'standard' },
        measure: null,
      });
    }
  }

  if (t.brk) add({ kind: 'break', title: L('Break', 'הפסקה'), how: L('Stand up, shake out the hands, drink water. Rest is when the brain consolidates what you practised.', 'קומו, נערו את הידיים, שתו מים. בזמן המנוחה המוח מקבע את מה שתרגלתם.'), minutes: t.brk, launch: null, measure: null });

  // Real music in the student's style.
  const style = intake.style ?? 'rock';
  const genre = STYLE_GENRE[style];
  const lickLevel = level === 'advanced' ? 'advanced' : level === 'intermediate' ? 'intermediate' : 'beginner';
  const lick = genre && level !== 'new' ? pickLick(genre, lickLevel, perf) ?? pickLick(genre, 'beginner', perf) : null;
  if (lick && goal?.key !== 'blues') {
    add({
      kind: 'music',
      title: L(`${style[0].toUpperCase()}${style.slice(1)} lick`, `ליק ${{ rock: 'רוק', blues: 'בלוז', metal: 'מטאל' }[style] ?? ''}`),
      how: L('Learn it phrase by phrase at 70 %, then play it with the band. Musicality over speed.', 'למדו אותו משפט אחרי משפט ב-70%, ואז נגנו עם הלהקה. מוזיקליות לפני מהירות.'),
      minutes: t.music,
      launch: { tool: 'lick', lickId: lick, tempoPct: 70 },
      measure: null,
    });
  } else {
    const chords = STYLE_SONG[style] ?? STYLE_SONG.pop;
    add({
      kind: 'music',
      title: L(`Song progression: ${chords.join(' ')}`, `מהלך שיר: ${chords.join(' ')}`),
      how: L('Strum along, two beats per chord when you can; keep the right hand moving even while changing.', 'פרטו לאורך המהלך, שתי פעמות לאקורד כשאפשר; היד הימנית ממשיכה לזוז גם בזמן המעבר.'),
      minutes: t.music,
      launch: { tool: 'chordChanges', chords, bpm: level === 'new' ? 60 : 80, beatsPerChord: level === 'new' ? 4 : 2 },
      measure: null,
    });
  }
  return blocks;
}

/** The placement tests for a goal (one or a short ladder). */
export function placementTests(goal, params) {
  const L2 = L;
  switch (goal.key) {
    case 'changes':
    case 'barre':
      return goalPairs(goal, params)
        .slice(0, 3)
        .map(([a, b]) => ({
          title: L2(`One-minute changes: ${a} ↔ ${b}`, `החלפות בדקה: ${a} ↔ ${b}`),
          how: L2('Strum once per chord and switch as fast as you can while staying clean, for one minute.', 'פריטה אחת לכל אקורד, והחליפו מהר ככל שאפשר בלי ללכלך, במשך דקה.'),
          launch: { tool: 'minuteChanges', chords: [a, b] },
          measure: { tool: 'minuteChanges', field: 'perMinute' },
        }));
    case 'timing':
    case 'speed':
      return goal.rungs.slice(0, 3).map((r) => ({
        title: L2(`Run at ${r.bpm} BPM`, `הרצה ב-${r.bpm} BPM`),
        how: L2('Play the exercise once through with the click.', 'נגנו את התרגיל פעם אחת עם הקליק.'),
        launch: { tool: 'rhythm', drillId: params.drillId, bpm: r.bpm },
        measure: { tool: 'rhythm', field: 'accuracyPct', target: r.min, bpm: r.bpm },
        stopIfFailed: true,
      }));
    case 'pentatonic':
      return [0, 1].map((p) => ({
        title: L2(`Pentatonic position ${p + 1} at 70 BPM`, `פנטטוני פוזיציה ${p + 1} ב-70 BPM`),
        how: L2("Play it if you know it — or skip: 'not yet' is a perfectly good answer.", 'נגנו אם אתם מכירים — או דלגו: "עוד לא" היא תשובה טובה לגמרי.'),
        launch: { tool: 'scale', scaleKey: 'minorPentatonic', root: params.root ?? 9, mode: 'position', positionIndex: p, bpm: 70 },
        measure: { tool: 'scale', field: 'accuracyPct', target: 90, bpm: 70 },
        stopIfFailed: true,
      }));
    case 'blues': {
      const lick = lickIds('blues', 'beginner')[0];
      return [
        {
          title: L2('A beginner blues lick at 70 %', 'ליק בלוז למתחילים ב-70%'),
          how: L2('Listen, then record one take.', 'הקשיבו, ואז הקליטו ניסיון אחד.'),
          launch: { tool: 'lick', lickId: lick, tempoPct: 70 },
          measure: { tool: 'lick', field: 'score', target: 80 },
        },
      ];
    }
    case 'bending':
      return [
        {
          title: L2('One round of bends', 'סבב כפיפות אחד'),
          how: L2('Bend to each target and hold it until it locks in.', 'כופפו לכל יעד והחזיקו עד שהוא ננעל.'),
          launch: { tool: 'bending' },
          measure: { tool: 'bending', field: 'accuracyPct' },
        },
      ];
    case 'ear':
      return [
        {
          title: L2('10 intervals (beginner set)', '10 מרווחים (סט מתחילים)'),
          how: L2('Answer at least 10, then press Finish.', 'ענו על 10 לפחות, ואז לחצו סיום.'),
          launch: { tool: 'ear', mode: params.mode ?? 'interval', difficulty: 'beginner', practiceMode: 'standard' },
          measure: { tool: 'ear', field: 'accuracyPct', target: 90 },
        },
      ];
    default:
      return [];
  }
}

/** A new goal record. */
export function makeGoal(goalKey, params, perf) {
  const goal = goalByKey(goalKey);
  const p = { ...goal.params, ...params };
  return {
    id: `g${Date.now().toString(36)}`,
    goalKey,
    params: p,
    createdAt: Date.now(),
    startRung: currentRungIndex(goal, p, perf),
    status: 'placement', // placement | active | done
    rungLog: [],
  };
}

/** Record newly reached rungs with their date; mark the goal done. */
export function refreshGoal(g, perf, now = Date.now()) {
  const goal = goalByKey(g.goalKey);
  if (!goal) return g;
  const ri = currentRungIndex(goal, g.params, perf);
  const log = [...(g.rungLog ?? [])];
  for (let i = 0; i < ri; i += 1) if (!log.some((x) => x.rung === i)) log.push({ rung: i, at: now });
  const status = ri >= goal.rungs.length ? 'done' : g.status === 'done' ? 'active' : g.status;
  return { ...g, rungLog: log, status, ...(status === 'done' && !g.doneAt ? { doneAt: now } : {}) };
}

/** Minutes practised per local day (from coach blocks + logged durations). */
export function minutesByDay(state, perf, days = 14, now = Date.now()) {
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = localDay(now - i * DAY_MS);
    const logged = perf.filter((e) => e.day === day).reduce((s, e) => s + (e.durationMs ?? 0), 0) / 60000;
    const blocks = (state?.days?.[day]?.blocks ?? []).filter((b) => b.done).reduce((s, b) => s + (b.spentMin ?? b.minutes ?? 0), 0);
    out.push({ day, minutes: Math.round(Math.max(logged, blocks)) });
  }
  return out;
}

export { GOALS };
