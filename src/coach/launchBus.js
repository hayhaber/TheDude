// Programmatic launch of a practice tool with parameters — used by the
// coach (rendered inside App) to open "the right tool, set up for this
// block". App registers its launcher once (see App.jsx launchPractice);
// anything can then call launch(spec).
//
// spec shapes (tool = which practice tool):
//   {tool:'lick', lickId, tempoPct}
//   {tool:'rhythm', drillId, bpm}
//   {tool:'scale', scaleKey, root, mode, positionIndex, string, stringCount, bpm, blueNote}
//   {tool:'chordChanges', chords:['G','C'], bpm, beatsPerChord?}
//   {tool:'bending'}
//   {tool:'ear', mode, difficulty, practiceMode}
//   {tool:'drill', drillId, bpm}
//   {tool:'soloOpener', bars, bpm}
//   {tool:'minuteChanges', chords:[a, b]}   (spec parked in pendingMinuteChanges)

let launcher = null;

// The One-Minute Changes tool reads (and clears) this when it mounts.
export let pendingMinuteChanges = null;

export function setPendingMinuteChanges(spec) {
  pendingMinuteChanges = spec ?? null;
}

/** Returns the parked minute-changes spec and clears it. */
export function takePendingMinuteChanges() {
  const spec = pendingMinuteChanges;
  pendingMinuteChanges = null;
  return spec;
}

/** App registers its launcher; returns an unregister function. */
export function registerLauncher(fn) {
  launcher = fn;
  return () => {
    if (launcher === fn) launcher = null;
  };
}

/** Opens a practice tool with parameters. Returns false if nothing handled it. */
export function launch(spec) {
  if (!spec || !spec.tool || !launcher) return false;
  return launcher(spec) !== false;
}
