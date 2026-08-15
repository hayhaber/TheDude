// A tiny module-level mirror of the user's chosen audio INPUT settings
// (which mic/interface to record from, how much to boost its signal, and
// whether to treat it as a room mic or a direct instrument line) — same
// pattern as audioSettingsStore.js's guitar-sound-profile mirror. Every
// independent pitch-detection call site (Tuner, Ear Training's mic-answer
// mode, Guitar Practice Trainer, Rhythm Practice) goes through the one
// shared usePitchDetection.js hook, which reads this store at the moment it
// opens the mic — so a device/gain/mode choice made once in Settings
// applies everywhere automatically, with no prop threaded through any of
// those features.
//
// Initialized straight from localStorage (not left at a hardcoded default
// until some hook mounts) so it's correct even if the user never opens the
// Settings panel this session — hooks/useAudioInputSettings.js (the
// Settings UI's source of truth) reads its own initial state from here and
// writes back on every change, rather than owning a second copy that could
// drift out of sync.
const STORAGE_KEY = 'audio-input-settings';

const DEFAULTS = {
  deviceId: null, // null = browser default input device
  gain: 1.5, // linear multiplier applied to the raw signal before analysis; >1 boosts a quiet direct-line signal
  inputMode: 'direct', // 'direct' (echo/noise/AGC processing off — clean instrument signal) | 'microphone' (processing on — better for a room mic picking up an acoustic guitar)
};

function loadInitial() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || typeof stored !== 'object') return { ...DEFAULTS };
    return {
      deviceId: typeof stored.deviceId === 'string' ? stored.deviceId : DEFAULTS.deviceId,
      gain: Number.isFinite(stored.gain) ? stored.gain : DEFAULTS.gain,
      inputMode: stored.inputMode === 'microphone' ? 'microphone' : DEFAULTS.inputMode,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

let current = loadInitial();

export function getAudioInputSettings() {
  return current;
}

// Persists immediately (same localStorage-on-every-change pattern as
// useAudioSettings.js) so a setting made here survives a reload even if the
// owning hook happens to unmount right after (e.g. the Settings popover closing).
export function setAudioInputSettings(next) {
  current = { ...current, ...next };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}
