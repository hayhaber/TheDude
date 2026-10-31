// First run (per profile): who you are, what you play, where you are, what
// you want — and, for guitarists who already play, a short mic check. The
// answers feed the Teacher and the Coach so neither asks again.
//
// Personal key 'dudestar-p-onboarding' (synced with the account):
// { done, at, skipped?, instrument, level: 'new'|'few'|'songs', goals: [],
//   style, minutes, heard: [chord…] }

import { saveIntake, recordPass } from '../teacher/teacherState';
import { activeGoal, loadCoach } from '../coach/engine';
import { chooseGoal, setIntake } from '../coach/useCoach';

export const ONBOARDING_KEY = 'dudestar-p-onboarding';

export const INSTRUMENTS = ['guitar', 'piano', 'bass', 'vocal'];
export const LEVELS = ['new', 'few', 'songs'];
export const GOALS = {
  guitar: ['songs', 'accompany', 'solo', 'write', 'theory', 'band'],
  piano: ['songs', 'accompany', 'read', 'write', 'theory'],
  bass: ['songs', 'band', 'theory', 'write'],
  vocal: ['songs', 'range', 'ear', 'write'],
};
export const STYLES = ['pop', 'rock', 'blues', 'israeli', 'folk', 'jazz', 'metal'];
export const MINUTES = [10, 15, 20, 30, 45, 60];
/** Open chords a guitarist can show in the check (teacher skills chord-<X>). */
export const CHECK_CHORDS = ['D', 'A', 'E', 'Em', 'Am', 'G', 'C'];

export function loadOnboarding() {
  try {
    const v = JSON.parse(localStorage.getItem(ONBOARDING_KEY));
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

function save(v) {
  try {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}

export const needsOnboarding = () => !loadOnboarding()?.done;

export function skipOnboarding() {
  save({ ...(loadOnboarding() ?? {}), done: true, skipped: true, at: Date.now() });
}

export function restartOnboarding() {
  try {
    localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    /* ignore */
  }
}

/** The home card the app opens on for this profile. */
export function homeCardFor(ob) {
  if (!ob?.done || ob.skipped) return 'guitar';
  if (ob.instrument === 'guitar') return ob.level === 'songs' ? 'guitar' : 'teacher';
  return ob.instrument ?? 'guitar';
}

const EXPERIENCE = { new: 'none', few: 'little', songs: 'some' };
const COACH_LEVEL = { new: 'new', few: 'beginner', songs: 'intermediate' };
const COACH_STYLE = { pop: 'pop', rock: 'rock', blues: 'blues', metal: 'metal', israeli: 'acoustic', folk: 'acoustic', jazz: 'blues' };
const TEACHER_GOALS = ['songs', 'accompany', 'solo', 'theory', 'band'];

/** The coach goal that fits the answers (null for a complete beginner). */
export function coachGoalFor({ level, goals = [], heard = [] }) {
  if (level === 'new') return null;
  if (goals.includes('solo')) return { key: 'pentatonic' };
  if (goals.includes('band')) return { key: 'timing' };
  if (goals.includes('theory') && !goals.includes('songs') && !goals.includes('accompany')) return { key: 'ear' };
  if (level === 'songs') return { key: 'barre' };
  const gcd = ['G', 'C', 'D'].every((c) => heard.includes(c));
  return { key: 'changes', params: { chordSet: gcd ? 'pop' : 'ADE' } };
}

/** Saves the answers and hands them to the Teacher and the Coach. */
export function finishOnboarding(answers) {
  const v = { ...answers, done: true, at: Date.now() };
  save(v);
  if (v.instrument !== 'guitar') return v;
  saveIntake({
    experience: EXPERIENCE[v.level] ?? 'none',
    can: [...(v.heard ?? [])],
    goals: (v.goals ?? []).filter((g) => TEACHER_GOALS.includes(g)),
    style: v.style,
    minutes: v.minutes,
    songs: '',
  });
  for (const c of v.heard ?? []) recordPass(`chord-${c}`);
  setIntake({ minutesPerDay: v.minutes, daysPerWeek: 5, level: COACH_LEVEL[v.level] ?? 'beginner', style: COACH_STYLE[v.style] ?? 'rock' });
  const goal = coachGoalFor(v);
  if (goal && !activeGoal(loadCoach())) chooseGoal(goal.key, goal.params ?? {});
  return v;
}
