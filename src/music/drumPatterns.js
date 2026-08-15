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
