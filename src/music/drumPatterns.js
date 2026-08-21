// Drum groove definitions for the Drum Machine metronome mode.
//
// Each style is a 4-beat "cell": one array of hits per beat-role (role 0-3 =
// beats 1-4), and each beat-role is itself an array of `stepsPerBeat` steps
// (the beat subdivided evenly — e.g. stepsPerBeat 2 = straight 8ths,
// 3 = triplet/swing feel, 4 = 16ths). A hit entry maps instrument key to a
// 0-1 velocity; a step can hit multiple instruments at once.
//
// Time signatures other than 4/4 cycle through the same 4 roles via
// `beatIndex % 4`, so e.g. 3/4 plays beats 1-2-3 of the cell and 6/8 plays
// beats 1-2-3-4-1-2 — not authentic to every genre in every meter, but keeps
// every groove musically sensible (kick/backbeat roles stay put) without a
// bespoke pattern per time signature.
//
// `fill` (optional) — an alternate set of hits for just the LAST beat of a
// measure, swapped in for that one beat every FILL_INTERVAL_BARS measures
// (see drumEngine.js) when fills are turned on. Shaped as one beat-role's
// worth of steps (same `stepsPerBeat` as the style itself), not a whole
// extra cell — the groove for every other beat in that measure plays
// completely unchanged, only the last beat becomes a short pickup/roll
// leading back into beat 1. Only kick/snare/hi-hat exist as sounds (see
// drumSounds.js — no toms/crash), so every fill below is built as a
// snare-roll pickup or a kick+snare buildup hit, whichever reads as a
// genuine fill for that genre within that constraint.
export const DRUM_STYLES = {
  rock: {
    label: 'Rock / Pop',
    stepsPerBeat: 2, // straight 8th-note hi-hat drive
    cell: [
      [{ kick: 1, hihatClosed: 0.85 }, { hihatClosed: 0.5 }],
      [{ snare: 1, hihatClosed: 0.85 }, { hihatClosed: 0.5 }],
      [{ kick: 1, hihatClosed: 0.85 }, { hihatClosed: 0.5 }],
      [{ snare: 1, hihatClosed: 0.85 }, { hihatOpen: 0.55 }],
    ],
    // Two-eighth snare pickup — the standard rock "let's go" fill into beat 1.
    fill: [{ snare: 0.85 }, { snare: 1 }],
  },
  blues: {
    label: 'Blues / Shuffle',
    stepsPerBeat: 3, // triplet grid, middle triplet skipped for the swing feel
    cell: [
      [{ kick: 1, hihatClosed: 0.85 }, {}, { hihatClosed: 0.5 }],
      [{ snare: 1, hihatClosed: 0.85 }, {}, { hihatClosed: 0.5 }],
      [{ kick: 1, hihatClosed: 0.85 }, {}, { kick: 0.5, hihatClosed: 0.5 }],
      [{ snare: 1, hihatClosed: 0.85 }, {}, { hihatClosed: 0.5 }],
    ],
    // Triplet snare roll, filling in the middle triplet the groove normally
    // leaves silent — a classic shuffle turnaround.
    fill: [{ snare: 0.7 }, { snare: 0.85 }, { snare: 1 }],
  },
  funk: {
    label: 'Funk',
    stepsPerBeat: 4, // 16th-note grid, syncopated kick + ghost-note snare
    cell: [
      [{ kick: 1, hihatClosed: 0.75 }, { hihatClosed: 0.3 }, { snare: 0.25, hihatClosed: 0.45 }, { kick: 0.6, hihatClosed: 0.3 }],
      [{ snare: 1, hihatClosed: 0.75 }, { hihatClosed: 0.3 }, { hihatClosed: 0.45 }, { kick: 0.55, hihatClosed: 0.3 }],
      [{ kick: 1, hihatClosed: 0.75 }, { snare: 0.2, hihatClosed: 0.3 }, { hihatClosed: 0.45 }, { hihatClosed: 0.3 }],
      [{ snare: 1, hihatClosed: 0.75 }, { kick: 0.55, hihatClosed: 0.3 }, { hihatClosed: 0.45 }, { snare: 0.25, hihatOpen: 0.4 }],
    ],
    // 16th-note snare crescendo, ghost-note-to-full-hit — the syncopated
    // funk equivalent of a pickup fill.
    fill: [{ snare: 0.5 }, { snare: 0.65 }, { snare: 0.8 }, { snare: 1 }],
  },
  metal: {
    label: 'Metal / Hard Rock',
    stepsPerBeat: 4, // driving 16th-note double-kick
    cell: [
      [{ kick: 1, hihatClosed: 0.9 }, { kick: 0.85 }, { kick: 0.95 }, { kick: 0.85 }],
      [{ kick: 1, snare: 1, hihatClosed: 0.9 }, { kick: 0.85 }, { kick: 0.95 }, { kick: 0.85 }],
      [{ kick: 1, hihatClosed: 0.9 }, { kick: 0.85 }, { kick: 0.95 }, { kick: 0.85 }],
      [{ kick: 1, snare: 1, hihatClosed: 0.9 }, { kick: 0.85 }, { kick: 0.95 }, { kick: 0.85 }],
    ],
    // Keeps the driving double-kick going (dropping it would read as a
    // breakdown, not a fill) and stacks a snare accent crescendo on top.
    fill: [{ kick: 1, snare: 0.7 }, { kick: 1 }, { kick: 1, snare: 0.85 }, { kick: 1, snare: 1 }],
  },
  jazz: {
    label: 'Jazz / Swing',
    stepsPerBeat: 3, // ride-style swing pattern (hi-hat closed stands in for ride)
    cell: [
      [{ kick: 0.4, hihatClosed: 0.8 }, {}, { hihatClosed: 0.5 }],
      [{ hihatClosed: 0.9 }, {}, { snare: 0.3, hihatClosed: 0.5 }],
      [{ kick: 0.4, hihatClosed: 0.8 }, {}, { hihatClosed: 0.5 }],
      [{ hihatClosed: 0.9 }, {}, { snare: 0.3, hihatClosed: 0.5 }],
    ],
    // Soft triplet snare roll under a thinned-out hi-hat — a brushed-snare
    // turnaround, not a loud accent, matching the style's own dynamics.
    fill: [{ snare: 0.55, hihatClosed: 0.3 }, { snare: 0.75 }, { snare: 0.95 }],
  },
  reggae: {
    label: 'Reggae',
    stepsPerBeat: 2, // straight 8ths, hi-hat accenting the off-beat "skank"
    // Classic "one drop": no kick/snare on beat 1 at all — kick and snare
    // land together on beat 3 (the "drop"), leaving beats 1-2 to breathe.
    cell: [
      [{ hihatClosed: 0.5 }, { hihatClosed: 0.75 }],
      [{ hihatClosed: 0.5 }, { hihatClosed: 0.75 }],
      [{ kick: 1, snare: 1, hihatClosed: 0.6 }, { hihatClosed: 0.75 }],
      [{ hihatClosed: 0.5 }, { hihatClosed: 0.75 }],
    ],
    // Stays laid-back on purpose — a small snare pickup landing on a
    // one-drop-style kick+snare hit, not a busy roll, since a loud fill
    // would fight the genre's own restraint.
    fill: [{ snare: 0.7 }, { kick: 1, snare: 0.95 }],
  },
  electro: {
    label: 'Electro (Four on the Floor)',
    stepsPerBeat: 2, // straight 8ths
    // Kick on every beat (the "four on the floor"), snare/clap backbeat on
    // 2 & 4, open hi-hat accenting the off-beat of 1 & 3 for the classic
    // house/electro lift.
    cell: [
      [{ kick: 1, hihatClosed: 0.7 }, { hihatOpen: 0.4 }],
      [{ kick: 1, snare: 1, hihatClosed: 0.7 }, { hihatClosed: 0.4 }],
      [{ kick: 1, hihatClosed: 0.7 }, { hihatOpen: 0.4 }],
      [{ kick: 1, snare: 1, hihatClosed: 0.7 }, { hihatClosed: 0.4 }],
    ],
    // A four-on-the-floor track's "fill" is a buildup hit, not a snare
    // roll — kick+snare together on both 8ths, opening the hi-hat on the
    // second for lift into the next downbeat.
    fill: [{ kick: 1, snare: 1, hihatClosed: 0.6 }, { kick: 1, snare: 1, hihatOpen: 0.7 }],
  },
};

export const DRUM_STYLE_OPTIONS = Object.entries(DRUM_STYLES).map(([key, style]) => ({
  key,
  label: style.label,
}));

export const SOUND_SOURCE_OPTIONS = [
  { key: 'standard', label: 'Standard Click' },
  { key: 'drum', label: 'Drum Machine' },
  { key: 'both', label: 'Both' },
];
