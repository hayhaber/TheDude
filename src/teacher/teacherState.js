// The teacher's memory of one student (per profile, synced with the account):
// localStorage 'dudestar-p-teacher'.
//
// {
//   intake:  null | {experience, goals:[], style, minutes, songs, can:[], at}
//   lessons: {[lessonId]: {started, step, done?}}   step = furthest step reached
//   passes:  {[skillId]: [day, …]}                  days a measured check was passed
//   current: lessonId | null
// }
//
// Mastery (mastery.js) is DERIVED from passes + the performance log, so a
// skill is never "mastered" by a tap alone.
import { useCallback, useSyncExternalStore } from 'react';
import { localDay } from '../coach/perfLog';

const KEY = 'dudestar-p-teacher';
const EMPTY = { intake: null, lessons: {}, passes: {}, current: null };

let cache = null;
const listeners = new Set();

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return v && typeof v === 'object' ? { ...EMPTY, ...v } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export function getTeacher() {
  if (!cache) cache = read();
  return cache;
}

export function updateTeacher(fn) {
  const next = fn(getTeacher());
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full: keep it in memory */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useTeacher() {
  const state = useSyncExternalStore(subscribe, getTeacher);
  const update = useCallback((fn) => updateTeacher(fn), []);
  return [state, update];
}

// ---- small actions ---------------------------------------------------------

export const saveIntake = (intake) => updateTeacher((s) => ({ ...s, intake: { ...intake, at: Date.now() } }));

/** A measured check of a skill was passed today. */
export const recordPass = (skillId) =>
  updateTeacher((s) => {
    const day = localDay();
    const days = s.passes[skillId] ?? [];
    if (days.includes(day)) return s;
    return { ...s, passes: { ...s.passes, [skillId]: [...days, day].slice(-30) } };
  });

export const reachStep = (lessonId, step) =>
  updateTeacher((s) => {
    const l = s.lessons[lessonId] ?? { started: Date.now(), step: 0 };
    return { ...s, current: lessonId, lessons: { ...s.lessons, [lessonId]: { ...l, step: Math.max(l.step ?? 0, step), at: step } } };
  });

export const finishLesson = (lessonId) =>
  updateTeacher((s) => {
    const l = s.lessons[lessonId] ?? { started: Date.now(), step: 0 };
    return { ...s, lessons: { ...s.lessons, [lessonId]: { ...l, done: l.done ?? Date.now(), at: 0 } } };
  });

export const resetTeacher = () => updateTeacher(() => ({ ...EMPTY }));
