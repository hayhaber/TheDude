// The Practice library (stage 4 of the Apple-style redesign, 2026-11-03):
// every practice tool as a row in a grouped list — group, icon, the level
// range it is made for — and how the list adapts to the student.
import { supportsInstrument } from '../../instruments/featureCapabilities';
import { loadPerf, localDay } from '../../coach/perfLog';
import { estimateLevel, LEVELS } from '../../coach/challenges';
import { loadOnboarding } from '../../onboarding/onboardingState';

// Groups in list order; `color` = the icon tile (Apple system colours).
export const PRACTICE_GROUPS = [
  { key: 'chords', color: '#AF52DE' },
  { key: 'rhythm', color: '#FF9500' },
  { key: 'solo', color: '#007AFF' },
  { key: 'technique', color: '#30B0C7' },
  { key: 'ear', color: '#34C759' },
];

// `tab` = App's practiceTab; `feature` gates it per instrument (as the old
// tab row did); levels 0 new .. 3 advanced = who it is made for. A tool
// with its own level filter inside spans 0..3. `title`: draw the large title
// in the detail view (the tool has no heading of its own).
export const PRACTICE_ITEMS = [
  { tab: 'minuteChanges', group: 'chords', icon: 'stopwatch', feature: 'minuteChanges', min: 0, max: 1 },
  { tab: 'guitarChordRhythm', group: 'chords', icon: 'changes', feature: 'guitarChordRhythm', min: 0, max: 2 },
  { tab: 'chordRhythm', group: 'chords', icon: 'changes', feature: 'chordRhythm', min: 0, max: 2 },
  { tab: 'rhythm', group: 'rhythm', icon: 'metronome', feature: 'rhythmGame', min: 0, max: 3 },
  { tab: 'trainer', group: 'solo', icon: 'note', feature: 'pitchTrainer', min: 1, max: 3, title: true },
  { tab: 'scalePractice', group: 'solo', icon: 'path', feature: 'scalePractice', min: 1, max: 3 },
  { tab: 'bending', group: 'solo', icon: 'bend', feature: 'bendingTraining', min: 2, max: 3 },
  { tab: 'soloOpener', group: 'solo', icon: 'improvise', feature: 'soloOpener', min: 2, max: 3 },
  { tab: 'drills', group: 'technique', icon: 'hand', feature: 'drills', min: 0, max: 3 },
  { tab: 'piano', group: 'technique', icon: 'freeplay', feature: 'pianoPractice', min: 0, max: 3 },
  { tab: 'fallingNotes', group: 'technique', icon: 'falling', feature: 'fallingNotes', min: 0, max: 2 },
  { tab: 'ear-training', group: 'ear', icon: 'ear', feature: null, min: 0, max: 3 },
];

export const itemFor = (tab) => PRACTICE_ITEMS.find((i) => i.tab === tab) ?? null;
export const groupColor = (key) => PRACTICE_GROUPS.find((g) => g.key === key)?.color ?? '#8E8E93';

export function itemsFor(instrument) {
  return PRACTICE_ITEMS.filter((i) => !i.feature || supportsInstrument(i.feature, instrument));
}

function loadCoachState() {
  try {
    return JSON.parse(localStorage.getItem('dudestar-coach')) ?? null;
  } catch {
    return null;
  }
}

const ONB_LEVEL = { new: 0, few: 1, songs: 2 };

/** The student's level 0..3, or null when nothing is known yet. */
export function studentLevel() {
  const coach = loadCoachState();
  const perf = loadPerf();
  const intake = coach?.intake?.level;
  if (LEVELS.includes(intake)) return LEVELS.indexOf(intake);
  const ob = loadOnboarding();
  if (ob?.level in ONB_LEVEL) return Math.max(ONB_LEVEL[ob.level], perf.length ? estimateLevel(perf) : 0);
  return perf.length ? estimateLevel(perf) : null;
}

// The coach's active goal -> the tools that train it.
const GOAL_TOOLS = {
  changes: ['minuteChanges', 'guitarChordRhythm'],
  barre: ['guitarChordRhythm', 'minuteChanges'],
  timing: ['rhythm', 'guitarChordRhythm'],
  speed: ['drills', 'scalePractice'],
  pentatonic: ['scalePractice', 'trainer'],
  blues: ['trainer', 'bending'],
  bending: ['bending', 'trainer'],
  ear: ['ear-training'],
};
const LEVEL_TOOLS = [
  ['minuteChanges', 'rhythm', 'drills', 'piano', 'chordRhythm'],
  ['guitarChordRhythm', 'rhythm', 'drills', 'piano', 'ear-training'],
  ['trainer', 'scalePractice', 'rhythm', 'fallingNotes', 'ear-training'],
  ['soloOpener', 'bending', 'trainer', 'fallingNotes', 'ear-training'],
];

/** Up to three tools picked for this student (goal first, then level). */
export function forYou(instrument, level) {
  const avail = new Set(itemsFor(instrument).map((i) => i.tab));
  const coach = loadCoachState();
  const goal = coach?.goals?.find((g) => g.id === coach.activeGoalId);
  const picks = [...(GOAL_TOOLS[goal?.key] ?? []), ...LEVEL_TOOLS[level ?? 0]];
  return [...new Set(picks)].filter((t) => avail.has(t)).slice(0, 3);
}

/** Today's practice minutes and the run of consecutive days, from the log. */
export function practiceSummary() {
  const perf = loadPerf();
  if (!perf.length) return null;
  const today = localDay();
  const minutes = Math.round(perf.filter((e) => localDay(e.at) === today).reduce((s, e) => s + (Number(e.durationMs) || 0), 0) / 60000);
  const days = new Set(perf.map((e) => localDay(e.at)));
  let streak = 0;
  const d = new Date();
  if (!days.has(today)) d.setDate(d.getDate() - 1); // yesterday still counts
  while (days.has(localDay(d.getTime()))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return { minutes, streak };
}

// The last tool opened (per profile).
const LAST_KEY = 'dudestar-p-practice-last';
export function lastPracticeTab() {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}
export function rememberPracticeTab(tab) {
  try {
    if (itemFor(tab)) localStorage.setItem(LAST_KEY, tab);
  } catch {
    /* private mode */
  }
}
