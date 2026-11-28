// The piano teacher's logic (v1.0.294): which lesson is next, progress,
// mastery and homework — derived from the piano teacher's own store
// (teacherState.js pianoTeacherStore, personal key 'dudestar-p-teacher-piano').
import { localDay } from '../coach/perfLog';
import { PIANO_LESSONS, PIANO_LEVELS, pianoSkillById } from './curriculum/piano';

// Where the student starts (the teacher's one question): never played = the
// first lesson; C position and simple tunes = reading (level 1); both hands
// and chords = the scales (level 2).
export const START_AT = { none: 'p0-keyboard', little: 'p1-reading', some: 'p2-scale-c', more: 'p3-eighths' };
const startIndex = (state) => {
  const id = START_AT[state.intake?.experience] ?? START_AT.none;
  return Math.max(0, PIANO_LESSONS.findIndex((l) => l.id === id));
};

const DAYS = { play: 2, quiz: 1, self: 1 };

export function pianoSkillStatus(skill, state) {
  const days = (state.passes?.[skill.id] ?? []).length;
  const need = DAYS[skill.check.kind] ?? 2;
  return { status: days >= need ? 'mastered' : days > 0 ? 'learning' : 'new', days, need };
}

/** The lesson to work on now: one left in progress, else the first not done
    from the student's starting point. */
export function nextPianoLesson(state) {
  const cur = state.current && PIANO_LESSONS.find((l) => l.id === state.current);
  if (cur && !state.lessons?.[cur.id]?.done) return cur;
  const from = startIndex(state);
  return PIANO_LESSONS.slice(from).find((l) => !state.lessons?.[l.id]?.done) ?? PIANO_LESSONS.find((l) => !state.lessons?.[l.id]?.done) ?? null;
}

/** "Level 1 · lesson 2 of 4", and the share of the course done. */
export function pianoProgress(state) {
  const next = nextPianoLesson(state);
  const done = PIANO_LESSONS.filter((l) => state.lessons?.[l.id]?.done).length;
  const level = next?.level ?? PIANO_LEVELS[PIANO_LEVELS.length - 1].n;
  const inLevel = PIANO_LESSONS.filter((l) => l.level === level);
  const at = next ? inLevel.indexOf(next) + 1 : inLevel.length;
  return { next, level, at, of: inLevel.length, done, total: PIANO_LESSONS.length, share: done / PIANO_LESSONS.length };
}

/** Homework of finished lessons whose skill isn't mastered yet. */
export function pianoHomework(state) {
  const out = [];
  for (const lesson of PIANO_LESSONS) {
    if (!state.lessons?.[lesson.id]?.done) continue;
    for (const item of lesson.homework ?? []) {
      const skill = item.skill ? pianoSkillById(item.skill) : null;
      if (skill && pianoSkillStatus(skill, state).status === 'mastered') continue;
      out.push({ item, lesson });
    }
  }
  return out.slice(0, 4);
}

export function pianoHomeworkStatus(item, state) {
  const days = item.skill ? state.passes?.[item.skill] ?? [] : [];
  const week = new Set();
  for (let k = 0; k < 7; k++) week.add(localDay(Date.now() - k * 86400000));
  return { doneToday: days.includes(localDay()), daysMet: days.filter((d) => week.has(d)).length };
}
