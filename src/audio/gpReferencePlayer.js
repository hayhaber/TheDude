import * as alphaTab from '@coderline/alphatab';
import { describeScore } from '../music/lickTrainer/gpImport';

const TICKS_PER_BEAT = 960;

// Reference playback of a Guitar Pro solo with alphaTab's own synthesizer —
// the same engine (and SONiVOX soundfont) Guitar Pro web readers such as
// gprotab.net use — so a solo sounds exactly like the file: every tie, let-
// ring, bend curve, grace note, dynamic and the track's own instrument.
// The Lick Trainer's own note-by-note voice (lickTrainerAudio.js) is kept
// for licks without a file.
//
// One hidden alphaTab instance is created on first use and reused; a file is
// only (re)loaded when a different one is requested.

let api = null;
let loadedKey = null;
let loading = null; // Promise resolving when the current file is ready to play
let listeners = { onTick: null, onEnd: null, endTick: Infinity };

function ensureApi() {
  if (api) return api;
  const host = document.createElement('div');
  // Off-screen, not display:none — alphaTab needs a laid-out element.
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;height:200px;overflow:hidden;pointer-events:none;';
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);
  api = new alphaTab.AlphaTabApi(host, {
    core: { engine: 'svg', fontDirectory: '/font/' },
    player: { enablePlayer: true, enableCursor: false, soundFont: '/soundfont/sonivox.sf2' },
  });
  // Finish once: detach the listeners first, since stopping makes alphaTab
  // report the position again (back at the range start).
  const finish = () => {
    const { onEnd } = listeners;
    listeners = { onTick: null, onEnd: null, endTick: Infinity };
    onEnd?.();
  };
  api.playerPositionChanged.on((e) => {
    if (e.currentTick >= listeners.endTick) {
      finish();
      api.stop();
      return;
    }
    listeners.onTick?.(e.currentTick);
  });
  api.playerFinished.on(finish);
  return api;
}

// Resolves on the next event. alphaTab's scoreLoaded replays the CURRENT
// score to a new listener, so `armed` lets the caller ignore anything that
// fires before the new file is actually handed to alphaTab.
function nextEvent(emitter, armed, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      emitter.off(handler);
      reject(new Error('Guitar Pro playback did not become ready'));
    }, timeoutMs);
    function handler(arg) {
      if (!armed()) return;
      clearTimeout(timer);
      emitter.off(handler);
      resolve(arg);
    }
    emitter.on(handler);
  });
}

// source: { key, url } (a file under /public) or { key, bytes } (imported).
// Loads are chained so two quick selections can never interleave.
function load(source, trackIndex) {
  const key = `${source.key}#${trackIndex}`;
  if (loadedKey === key && loading) return loading;
  loadedKey = key;
  const previous = loading ?? Promise.resolve();
  loading = previous
    .catch(() => null)
    .then(async () => {
      const a = ensureApi();
      const bytes = source.bytes
        ? new Uint8Array(source.bytes)
        : new Uint8Array(await (await fetch(source.url)).arrayBuffer());
      let sent = false;
      const armed = () => sent;
      // Subscribe before loading: playback is ready once the new file's
      // MIDI (and, the first time, the soundfont) is in the synth.
      // isReadyForPlayback can't be used — it stays true from the last file.
      const scoreLoaded = nextEvent(a.scoreLoaded, armed, 20000);
      const ready = nextEvent(a.playerReady, armed, 60000);
      sent = true;
      a.load(bytes, [trackIndex]);
      const score = await scoreLoaded;
      await ready;
      return score;
    });
  // A failed load must not stick: the next request retries.
  loading.catch(() => {
    if (loadedKey === key) {
      loadedKey = null;
      loading = null;
    }
  });
  return loading;
}

export function preloadReference(source, trackIndex) {
  return load(source, trackIndex).catch(() => null);
}

/** The loaded file's tracks: [{ index, name, program, percussion, noteCount }]. */
export async function referenceTracks(source, trackIndex) {
  const score = await load(source, trackIndex);
  return describeScore(score).tracks;
}

// Which tracks sound: exactly `enabled` (track indexes), the rest muted.
function applyMix(a, score, enabled) {
  const on = new Set(enabled);
  a.changeTrackSolo(score.tracks, false);
  a.changeTrackMute(score.tracks.filter((t) => !on.has(t.index)), true);
  a.changeTrackMute(score.tracks.filter((t) => on.has(t.index)), false);
}

/**
 * Plays ticks [startTick, endTick) at `speed` (1 = original tempo) with the
 * tracks in `tracks` sounding (default: just the solo's own track).
 * onTick(tick) follows the playback; onEnd() fires once at the end.
 */
export async function playReference({ source, trackIndex, tracks, startTick, endTick, speed, onTick, onEnd }) {
  const a = ensureApi();
  const score = await load(source, trackIndex);
  a.stop();
  applyMix(a, score, tracks ?? [trackIndex]);
  listeners = { onTick, onEnd, endTick };
  a.playbackSpeed = speed;
  a.playbackRange = { startTick, endTick };
  a.tickPosition = startTick;
  a.play();
}

export function stopReference() {
  if (!api) return;
  listeners = { onTick: null, onEnd: null, endTick: Infinity };
  api.stop();
}

/**
 * Renders ticks [startTick, endTick) of the `tracks` given — the backing
 * band — offline, with alphaTab's own synth, into an AudioBuffer of `ctx`.
 * Played with AudioBufferSourceNode.start(t) it lands sample-exactly on the
 * trainer's own clock (the live player runs on a separate clock, which
 * would smear the timing feedback). `speed` scales the file's tempo.
 */
export async function renderBacking({ ctx, source, trackIndex, tracks, startTick, endTick, speed }) {
  const a = ensureApi();
  const score = await load(source, trackIndex);
  const options = new alphaTab.synth.AudioExportOptions();
  options.sampleRate = ctx.sampleRate;
  options.useSyncPoints = false;
  options.masterVolume = 1;
  options.metronomeVolume = 0;
  options.playbackRange = { startTick, endTick };
  const on = new Set(tracks);
  for (const t of score.tracks) options.trackVolume.set(t.index, on.has(t.index) ? 1 : 0);

  // The MIDI is generated from the score synchronously inside exportAudio():
  // scale the tempo just for that call.
  const first = score.masterBars[0];
  const added = first.tempoAutomations.length === 0 ? alphaTab.model.Automation.buildTempoAutomation(false, 0, score.tempo, 2) : null;
  if (added) first.tempoAutomations.push(added);
  const originals = score.masterBars.flatMap((mb) => mb.tempoAutomations.map((au) => [au, au.value]));
  for (const [au, v] of originals) au.value = v * speed;
  let pending;
  try {
    pending = a.exportAudio(options);
  } finally {
    for (const [au, v] of originals) au.value = v;
    if (added) first.tempoAutomations.splice(first.tempoAutomations.indexOf(added), 1);
  }
  const exporter = await pending;
  const chunks = [];
  let frames = 0;
  const maxFrames = Math.ceil(((endTick - startTick) / TICKS_PER_BEAT) * (60 / (score.tempo * speed)) * ctx.sampleRate) + ctx.sampleRate * 4;
  try {
    for (;;) {
      const chunk = await exporter.render(1000);
      if (!chunk) break;
      chunks.push(chunk.samples);
      frames += chunk.samples.length / 2;
      if (frames >= maxFrames || chunk.currentTick >= endTick) break;
    }
  } finally {
    exporter.destroy();
  }
  // Interleaved stereo -> AudioBuffer.
  const buffer = ctx.createBuffer(2, Math.max(1, frames), ctx.sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  let pos = 0;
  for (const samples of chunks) {
    for (let i = 0; i + 1 < samples.length && pos < frames; i += 2, pos++) {
      left[pos] = samples[i];
      right[pos] = samples[i + 1];
    }
  }
  return buffer;
}
