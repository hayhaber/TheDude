// Practice history for the Vocal section (this device): every finished
// exercise's score, per-day practice, and the daily-workout streak.

const STORAGE_KEY = 'dudestar-vocal-progress';
const LEVEL_KEY = 'dudestar-vocal-level';

function read() {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (p && Array.isArray(p.results)) return p;
  } catch {
    /* nothing saved yet */
  }
  return { results: [], workouts: [] };
}

function write(p) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

export function dayKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadProgress() {
  return read();
}

export function recordResult(exerciseId, score, seconds) {
  const p = read();
  p.results.push({ id: exerciseId, score, seconds: Math.round(seconds), at: Date.now(), day: dayKey() });
  p.results = p.results.slice(-500);
  write(p);
  return p;
}

export function recordWorkout() {
  const p = read();
  const today = dayKey();
  if (!p.workouts.includes(today)) p.workouts.push(today);
  p.workouts = p.workouts.slice(-400);
  write(p);
  return p;
}

/** Consecutive days (ending today or yesterday) with any practice. */
export function streak(p, now = new Date()) {
  const days = new Set(p.results.map((r) => r.day));
  let n = 0;
  const d = new Date(now);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** Last 7 days: minutes practised and average score per day. */
export function lastWeek(p, now = new Date()) {
  const out = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const rs = p.results.filter((r) => r.day === key);
    out.push({
      day: key,
      weekday: d.getDay(),
      minutes: Math.round(rs.reduce((a, r) => a + (r.seconds || 0), 0) / 60),
      score: rs.length ? Math.round(rs.reduce((a, r) => a + r.score, 0) / rs.length) : null,
    });
  }
  return out;
}

/** Best and latest score of one exercise. */
export function exerciseStats(p, id) {
  const rs = p.results.filter((r) => r.id === id);
  if (!rs.length) return null;
  return { best: Math.max(...rs.map((r) => r.score)), last: rs[rs.length - 1].score, count: rs.length };
}

export function loadLevel() {
  try {
    return Number(localStorage.getItem(LEVEL_KEY)) === 2 ? 2 : 1;
  } catch {
    return 1;
  }
}

export function saveLevel(level) {
  try {
    localStorage.setItem(LEVEL_KEY, String(level));
  } catch {
    /* storage unavailable */
  }
}
