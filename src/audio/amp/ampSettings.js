// The amp tool's settings: one plain object (every knob 0..10), the
// built-in presets and the user's own presets (this device only).

export const VOICINGS = ['clean', 'crunch', 'lead'];

export const AMP_KNOBS = ['gain', 'bass', 'mid', 'treble', 'presence', 'volume'];

// Pedal order on the board = signal order. Compressor and drive sit in
// front of the amp; chorus, delay and reverb in its effects loop (after the
// cabinet), where a real rig puts them — a delay in front of a distorted
// amp turns to mush.
export const PEDALS = [
  { id: 'comp', knobs: ['sustain', 'level'], loop: false },
  { id: 'drive', knobs: ['drive', 'tone', 'level'], loop: false },
  { id: 'chorus', knobs: ['rate', 'depth', 'mix'], loop: true },
  { id: 'delay', knobs: ['time', 'feedback', 'mix'], loop: true },
  { id: 'reverb', knobs: ['decay', 'tone', 'mix'], loop: true },
];

export const DEFAULT_SETTINGS = {
  voicing: 'clean',
  gate: 3,
  amp: { gain: 4, bass: 5, mid: 5, treble: 6, presence: 5, volume: 3 },
  pedals: {
    comp: { on: false, sustain: 5, level: 5 },
    drive: { on: false, drive: 5, tone: 5, level: 5 },
    chorus: { on: false, rate: 3, depth: 5, mix: 5 },
    delay: { on: false, time: 4, feedback: 3, mix: 3 },
    reverb: { on: true, decay: 4, tone: 5, mix: 2.5 },
  },
};

// Master volume never starts above this — speakers + an open mic squeal.
export const SAFE_START_VOLUME = 3;

function pedals(over) {
  const out = {};
  for (const p of PEDALS) out[p.id] = { ...DEFAULT_SETTINGS.pedals[p.id], on: false, ...(over[p.id] || {}) };
  return out;
}

// Presets leave the master Volume alone (a preset should never jump the
// level in your ears); `amp.volume` here is ignored when applied.
export const BUILTIN_PRESETS = [
  {
    id: 'clean',
    settings: {
      voicing: 'clean',
      gate: 2,
      amp: { gain: 3, bass: 5, mid: 5, treble: 6.5, presence: 5.5 },
      pedals: pedals({ comp: { on: true, sustain: 4, level: 5 }, reverb: { on: true, decay: 4, tone: 6, mix: 2.5 } }),
    },
  },
  {
    id: 'blues',
    settings: {
      voicing: 'crunch',
      gate: 3,
      amp: { gain: 3.5, bass: 5, mid: 6.5, treble: 5.5, presence: 5 },
      pedals: pedals({ drive: { on: true, drive: 3.5, tone: 5, level: 6 }, reverb: { on: true, decay: 3.5, tone: 5, mix: 2.5 } }),
    },
  },
  {
    id: 'crunch',
    settings: {
      voicing: 'crunch',
      gate: 4,
      amp: { gain: 6.5, bass: 6, mid: 6, treble: 6, presence: 6 },
      pedals: pedals({ reverb: { on: true, decay: 3, tone: 5, mix: 1.5 } }),
    },
  },
  {
    id: 'lead',
    settings: {
      voicing: 'lead',
      gate: 5,
      amp: { gain: 6, bass: 5.5, mid: 7, treble: 5.5, presence: 6 },
      pedals: pedals({
        drive: { on: true, drive: 2, tone: 5.5, level: 7 },
        delay: { on: true, time: 4.5, feedback: 3, mix: 2.5 },
        reverb: { on: true, decay: 5, tone: 5, mix: 2 },
      }),
    },
  },
  {
    // High gain, tight: a clean boost (drive low, level high) in front of
    // the lead channel cuts the flub, scooped mids, a firm gate.
    id: 'heavy',
    settings: {
      voicing: 'lead',
      gate: 6,
      amp: { gain: 8.5, bass: 6.5, mid: 3.5, treble: 6.5, presence: 6.5 },
      pedals: pedals({
        drive: { on: true, drive: 1, tone: 6, level: 7.5 },
        reverb: { on: true, decay: 2.5, tone: 4.5, mix: 1.2 },
      }),
    },
  },
  {
    id: 'ambient',
    settings: {
      voicing: 'clean',
      gate: 2,
      amp: { gain: 3, bass: 4.5, mid: 4.5, treble: 6.5, presence: 6 },
      pedals: pedals({
        comp: { on: true, sustain: 6, level: 5 },
        chorus: { on: true, rate: 2, depth: 6, mix: 5 },
        delay: { on: true, time: 6.5, feedback: 6, mix: 4 },
        reverb: { on: true, decay: 9, tone: 4, mix: 5 },
      }),
    },
  },
];

const clamp10 = (v, d) => (Number.isFinite(v) ? Math.min(10, Math.max(0, v)) : d);

/** Fill any gaps / bad values from the defaults (old or hand-edited saves). */
export function normalizeSettings(s) {
  const src = s && typeof s === 'object' ? s : {};
  const out = {
    voicing: VOICINGS.includes(src.voicing) ? src.voicing : DEFAULT_SETTINGS.voicing,
    gate: clamp10(src.gate, DEFAULT_SETTINGS.gate),
    amp: {},
    pedals: {},
  };
  for (const k of AMP_KNOBS) out.amp[k] = clamp10(src.amp?.[k], DEFAULT_SETTINGS.amp[k]);
  for (const p of PEDALS) {
    const d = DEFAULT_SETTINGS.pedals[p.id];
    const v = src.pedals?.[p.id] || {};
    out.pedals[p.id] = { on: typeof v.on === 'boolean' ? v.on : d.on };
    for (const k of p.knobs) out.pedals[p.id][k] = clamp10(v[k], d[k]);
  }
  return out;
}

/** A preset's sound on top of the current settings, keeping the volume. */
export function applyPreset(current, presetSettings) {
  const next = normalizeSettings({ ...presetSettings, amp: { ...presetSettings.amp, volume: current.amp.volume } });
  return next;
}

const CURRENT_KEY = 'amp-settings';
const PRESETS_KEY = 'amp-presets';

export function loadCurrentSettings() {
  let s;
  try {
    s = normalizeSettings(JSON.parse(localStorage.getItem(CURRENT_KEY)));
  } catch {
    s = normalizeSettings(null);
  }
  // Every visit starts quiet.
  s.amp.volume = Math.min(s.amp.volume, SAFE_START_VOLUME);
  return s;
}

export function saveCurrentSettings(s) {
  try {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(s));
  } catch {
    /* storage full / blocked: not worth bothering anyone */
  }
}

/** [{ id, name, settings }] — the user's saved presets. */
export function loadUserPresets() {
  try {
    const list = JSON.parse(localStorage.getItem(PRESETS_KEY));
    if (!Array.isArray(list)) return [];
    return list
      .filter((p) => p && typeof p.name === 'string' && p.settings)
      .map((p) => ({ id: String(p.id || p.name), name: p.name, settings: normalizeSettings(p.settings) }));
  } catch {
    return [];
  }
}

export function saveUserPresets(list) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

// Headphones confirmed once on this device: the amp's output is unmuted.
const PHONES_KEY = 'amp-headphones-ok';

export function headphonesConfirmed() {
  try {
    return localStorage.getItem(PHONES_KEY) === '1';
  } catch {
    return false;
  }
}

export function setHeadphonesConfirmed(on) {
  try {
    if (on) localStorage.setItem(PHONES_KEY, '1');
    else localStorage.removeItem(PHONES_KEY);
  } catch {
    /* ignore */
  }
}

/** Same sound (volume ignored)? — to mark a preset as edited. */
export function sameSound(a, b) {
  const strip = (s) => JSON.stringify({ ...s, amp: { ...s.amp, volume: 0 } });
  return strip(normalizeSettings(a)) === strip(normalizeSettings(b));
}
