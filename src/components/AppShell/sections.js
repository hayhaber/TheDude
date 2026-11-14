// Top-level destinations of an instrument. `icon` names a drawing in the
// shared LineIcon set (components/LineIcon) — the same pictures as the home
// cards' shortcuts; `pianoIcon` overrides it on the piano.
export const SECTIONS = [
  { key: 'compose', labelKey: 'nav.compose', icon: 'compose' },
  // Guitar only: every chord in every key, its voicings, inversions, slash chords.
  { key: 'chords', labelKey: 'nav.chords', icon: 'chords', pianoIcon: 'pianoChords' },
  { key: 'improvise', labelKey: 'nav.improvise', icon: 'improvise' },
  { key: 'practice', labelKey: 'nav.practice', icon: 'practice' },
  // Bass only: the bass's own practice (BassPracticeView) — same nav name.
  { key: 'bassPractice', labelKey: 'nav.practice', icon: 'practice' },
  // Guitar only: the teacher (lessons, homework, mastery) — the goal-based
  // practice Coach now lives inside it (Today -> Practice plan).
  { key: 'teacher', labelKey: 'nav.teacher', icon: 'teacher' },
  { key: 'studies', labelKey: 'nav.studies', icon: 'studies' },
  { key: 'songs', labelKey: 'nav.songs', icon: 'songs' },
  // Guitar Pro files: play the song with its band, practice its solo.
  { key: 'guitarpro', labelKey: 'nav.guitarpro', icon: 'guitarpro' },
  // The band's PDF charts + setlists, full screen with auto-scroll (v1.0.176).
  { key: 'stage', labelKey: 'nav.stage', icon: 'stage' },
  // Piano only: a big keyboard to play freely (pedal, live chord, recording).
  { key: 'freeplay', labelKey: 'nav.freeplay', icon: 'freeplay' },
  { key: 'vocal', labelKey: 'nav.vocal', icon: 'vocal' },
];

// The bar shows GROUPS, not sections (stage 2 of the Apple-style redesign,
// 2026-11-03: 8 tabs -> 5). A group is a goal; its sections are reached
// through a segmented control at the top of the screen. Groups with no
// section on this instrument are left out; a group with ONE section shows
// that section's own name and icon. `members` are in segmented-control
// order; the first visible one is the group's default. `also` = screens
// opened from inside the group (the Coach) that light its tab too.
export const NAV_GROUPS = [
  { key: 'learn', labelKey: 'nav.group.learn', icon: 'teacher', members: ['teacher', 'studies'], also: ['coach'] },
  { key: 'practice', labelKey: 'nav.practice', icon: 'practice', members: ['practice', 'bassPractice'] },
  { key: 'chords', labelKey: 'nav.chords', icon: 'chords', pianoIcon: 'pianoChords', members: ['chords'] },
  // Songs (finding chords / tabs / files on the web) is reached from
  // GuitarPro's ••• menu, not a segmented control of its own (flow review
  // 2026-11-06); it still lights the Play tab.
  { key: 'play', labelKey: 'nav.group.play', icon: 'play', members: ['guitarpro', 'stage'], also: ['songs'] },
  { key: 'create', labelKey: 'nav.group.create', icon: 'create', members: ['compose', 'improvise', 'freeplay'] },
];

export function groupOfSection(sectionKey) {
  return NAV_GROUPS.find((g) => g.members.includes(sectionKey)) ?? null;
}

// The last section opened in each group (device-wide), so a tab returns to
// where you were inside it.
const LAST_KEY = 'dudestar-nav-last';
export function lastSectionIn(groupKey) {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY) || '{}')[groupKey] ?? null;
  } catch {
    return null;
  }
}
export function rememberSection(sectionKey) {
  const g = groupOfSection(sectionKey);
  if (!g) return;
  try {
    const all = JSON.parse(localStorage.getItem(LAST_KEY) || '{}');
    all[g.key] = sectionKey;
    localStorage.setItem(LAST_KEY, JSON.stringify(all));
  } catch {
    /* private mode */
  }
}

// The last section opened on each instrument (device-wide) — the home card's
// "Continue" when this visit hasn't been inside that instrument yet.
const PLACE_KEY = 'dudestar-last-section';
export function rememberPlace(instrument, sectionKey) {
  if (!instrument || !sectionKey || sectionKey === 'vocal') return;
  try {
    const all = JSON.parse(localStorage.getItem(PLACE_KEY) || '{}');
    all[instrument] = sectionKey;
    localStorage.setItem(PLACE_KEY, JSON.stringify(all));
  } catch {
    /* private mode */
  }
}
export function lastPlace(instrument) {
  try {
    return JSON.parse(localStorage.getItem(PLACE_KEY) || '{}')[instrument] ?? null;
  } catch {
    return null;
  }
}
