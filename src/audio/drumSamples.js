// Real drum kits: recorded drum samples (GeneralUser GS's Standard / Power /
// Jazz kits, rendered to one FLAC per kit in public/drums — FLAC because it
// is sample-exact, with no encoder delay that would put hits late) instead of
// the synthesized hits in drumSounds.js, which stay as the "Electronic" kit
// and as the fallback until a kit has loaded.
//
// Real-drum behaviour on top of the samples: two velocity layers (a soft
// hit is a different recording, not just quieter), a little random gain /
// pitch per hit on cymbals and shakers (no machine-gun repeats), and the
// hi-hat CHOKE — a closed or pedal hat cuts the open hat, as on a kit.
import { getAudioContext } from './audioContext';
import { DRUM_KIT_MAPS } from './drumKitMaps';

export const DRUM_KITS = ['studio', 'rock', 'jazz', 'electronic'];
const KIT_KEY = 'dudestar-drum-kit'; // device setting
const VARY = new Set(['hihatClosed', 'hihatPedal', 'hihatOpen', 'ride', 'rideBell', 'shaker', 'tambourine', 'crash']);
const MASTER = 1.15;

let current = (() => {
  try {
    const k = localStorage.getItem(KIT_KEY);
    return DRUM_KITS.includes(k) ? k : 'studio';
  } catch {
    return 'studio';
  }
})();
const listeners = new Set();
const banks = {}; // kit -> { instrument: { '64': AudioBuffer, '112': AudioBuffer } }
const loading = {};

export function drumKit() {
  return current;
}

export function setDrumKit(kit) {
  if (!DRUM_KITS.includes(kit)) return;
  current = kit;
  try {
    localStorage.setItem(KIT_KEY, kit);
  } catch {
    /* private mode */
  }
  loadDrumKit(kit);
  listeners.forEach((fn) => fn(kit));
}

export function onDrumKitChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function drumKitReady(kit = current) {
  return kit === 'electronic' || !!banks[kit];
}

/** Fetches + decodes a kit once (shared by every context — an AudioBuffer works in any). */
export function loadDrumKit(kit = current) {
  if (kit === 'electronic' || banks[kit]) return Promise.resolve(true);
  if (loading[kit]) return loading[kit];
  const map = DRUM_KIT_MAPS[kit];
  if (!map) return Promise.resolve(false);
  loading[kit] = (async () => {
    try {
      const res = await fetch(`/drums/${kit}.flac`);
      if (!res.ok) throw new Error(res.status);
      const raw = await res.arrayBuffer();
      const ctx = getAudioContext();
      const all = await new Promise((resolve, reject) => ctx.decodeAudioData(raw, resolve, reject));
      const data = all.getChannelData(0);
      const scale = all.sampleRate / map.sr; // decoded at the context's rate
      const bank = {};
      for (const [inst, layers] of Object.entries(map.map)) {
        bank[inst] = {};
        for (const [vel, [start, len]] of Object.entries(layers)) {
          const s = Math.round(start * scale);
          const n = Math.max(1, Math.round(len * scale));
          const buf = ctx.createBuffer(1, n, all.sampleRate);
          buf.copyToChannel(data.subarray(s, s + n), 0);
          bank[inst][vel] = buf;
        }
      }
      banks[kit] = bank;
      return true;
    } catch {
      delete loading[kit];
      return false;
    }
  })();
  return loading[kit];
}

// open hi-hats still ringing, per context (a closed / pedal hat chokes them)
const openHats = new WeakMap();

/**
 * Plays a sampled hit; false when the chosen kit is the synth one or isn't
 * loaded yet (the caller then synthesizes the hit and the kit loads).
 */
export function playSampledHit(ctx, instrument, time, velocity, out) {
  if (current === 'electronic') return false;
  const bank = banks[current];
  if (!bank) {
    loadDrumKit(current);
    return false;
  }
  const layers = bank[instrument];
  if (!layers) return false;
  const soft = velocity < 0.62;
  const buf = layers[soft ? '64' : '112'] ?? layers['112'];
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  let gain = MASTER * (soft ? velocity / 0.57 : velocity);
  if (VARY.has(instrument)) {
    gain *= 0.92 + Math.random() * 0.16;
    src.detune.value = (Math.random() - 0.5) * 16;
  }
  g.gain.setValueAtTime(Math.min(2, gain), time);
  src.connect(g).connect(out);
  src.start(time);

  if (instrument === 'hihatClosed' || instrument === 'hihatPedal') {
    const list = openHats.get(ctx) ?? [];
    for (const h of list) {
      if (h.time < time) {
        try {
          h.gain.gain.setTargetAtTime(0, time, 0.012);
          h.src.stop(time + 0.08);
        } catch {
          /* already stopped */
        }
      }
    }
    openHats.set(ctx, []);
  } else if (instrument === 'hihatOpen') {
    const list = (openHats.get(ctx) ?? []).filter((h) => h.end > time);
    list.push({ src, gain: g, time, end: time + buf.duration });
    openHats.set(ctx, list);
  }
  return true;
}
