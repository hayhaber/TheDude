import * as alphaTab from '@coderline/alphatab';

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
      // Only the solo's own track sounds.
      const track = score.tracks[trackIndex];
      if (track) a.changeTrackSolo([track], true);
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

/**
 * Plays ticks [startTick, endTick) of one track at `speed` (1 = original
 * tempo). onTick(tick) follows the playback; onEnd() fires once at the end.
 */
export async function playReference({ source, trackIndex, startTick, endTick, speed, onTick, onEnd }) {
  const a = ensureApi();
  await load(source, trackIndex);
  a.stop();
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
