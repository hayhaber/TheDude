import * as alphaTab from '@coderline/alphatab';

// How Guitar Pro files sound in the app (GuitarPro section + file-based
// licks): the soundfont and a realistic finger vibrato.
//
// Soundfont: GeneralUser GS v2.0.3 by S. Christian Collins (free license,
// public/soundfont/GeneralUser-LICENSE.txt), converted to SF3 (Ogg Vorbis)
// so it downloads as ~9 MB instead of 32 MB — far better guitars, bass and
// drums than alphaTab's bundled 1.3 MB SONiVOX set. Fetched only when a
// Guitar Pro file is played, then cached by the browser.
// Versioned name: the file is cached for 30 days (vercel.json), so a new
// voicing needs a new name.
export const GP_SOUNDFONT_URL = '/soundfont/generaluser-gs-v2.sf3';

// Downloaded once and shared by every alphaTab instance (the hidden
// reference player, the song view, Songs -> Tab) — handing each its own URL
// made each one download the 9 MB file itself.
let soundFontBytes = null;
// Download progress 0..1 (null = size unknown, -1 = failed), for a "Loading sounds…" line:
// the first visit downloads ~9 MB and Play stays disabled until it's in.
let progress = 0;
const progressListeners = new Set();
function setProgress(p) {
  progress = p;
  progressListeners.forEach((cb) => cb(p));
}

/** Subscribes to the soundfont download progress; returns an unsubscribe. */
export function onSoundFontProgress(cb) {
  progressListeners.add(cb);
  cb(progress);
  return () => progressListeners.delete(cb);
}

async function download() {
  const r = await fetch(GP_SOUNDFONT_URL);
  if (!r.ok) throw new Error(`soundfont ${r.status}`);
  const total = Number(r.headers.get('content-length')) || 0;
  if (!r.body || !total) {
    setProgress(null);
    const buffer = await r.arrayBuffer();
    setProgress(1);
    return buffer;
  }
  const reader = r.body.getReader();
  const out = new Uint8Array(total);
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (got + value.length > out.length) {
      // Content-Length was off (e.g. re-encoded): fall back to collecting.
      const grown = new Uint8Array(Math.max(out.length * 2, got + value.length));
      grown.set(out.subarray(0, got));
      return finishGrowing(reader, grown, got, value);
    }
    out.set(value, got);
    got += value.length;
    setProgress(Math.min(0.99, got / total));
  }
  setProgress(1);
  return out.buffer.slice(0, got);
}

async function finishGrowing(reader, buf, got, first) {
  let out = buf;
  let n = got;
  const push = (chunk) => {
    if (n + chunk.length > out.length) {
      const g = new Uint8Array(Math.max(out.length * 2, n + chunk.length));
      g.set(out.subarray(0, n));
      out = g;
    }
    out.set(chunk, n);
    n += chunk.length;
  };
  push(first);
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    push(value);
  }
  setProgress(1);
  return out.buffer.slice(0, n);
}

function soundFontPromise() {
  if (!soundFontBytes) {
    soundFontBytes = download().catch((err) => {
      soundFontBytes = null; // let a later attempt retry
      setProgress(-1); // failed
      throw err;
    });
  }
  return soundFontBytes;
}

/** Starts the download early (e.g. when the GuitarPro section opens). */
export function prefetchGpSoundFont() {
  soundFontPromise().catch(() => {});
}

/**
 * Loads the shared soundfont into an AlphaTabApi created with enablePlayer
 * and no soundFont URL. alphaTab creates its synth only some time after the
 * api (once it's set up), and before that loadSoundFont() returns false and
 * DROPS the data — so when the file was already cached (fast), Play stayed
 * disabled. Keep offering it until the player takes it.
 */
export function loadGpSoundFont(api) {
  return soundFontPromise().then(
    (buffer) =>
      new Promise((resolve, reject) => {
        const started = Date.now();
        const attempt = () => {
          // A copy each time: the bytes are posted to the synth worker.
          let taken = false;
          try {
            taken = api.loadSoundFont(new Uint8Array(buffer.slice(0)), false) !== false;
          } catch (err) {
            reject(err);
            return;
          }
          if (taken) resolve();
          else if (Date.now() - started > 60000) reject(new Error('player did not start'));
          else setTimeout(attempt, 100);
        };
        attempt();
      })
  );
}

// Finger vibrato, as a guitarist does it: the string is pushed and let back,
// so the pitch only ever rises ABOVE the fretted (or bent) note — alphaTab's
// default swings a sine below it too, which is what sounded out of tune —
// at a steady ~5.5 Hz in real time whatever the tempo or playback speed
// (alphaTab's default is a fixed tick length, so it crawled when slowed down).
const VIBRATO_HZ_SLIGHT = 5.5;
const VIBRATO_HZ_WIDE = 5.0;
const DEPTH_SLIGHT = 0.8; // quarter tones (0.4 semitone) peak
const DEPTH_WIDE = 1.6; // quarter tones (0.8 semitone) peak
const STEP_TICKS = 8;

let patched = false;
function patchVibrato() {
  if (patched) return;
  patched = true;
  const Gen = alphaTab.midi?.MidiFileGenerator;
  const proto = Gen?.prototype;
  if (!proto || typeof proto._generateVibrato !== 'function' || typeof proto._generateVibratorWithParams !== 'function') return;
  const noteVibrato = proto._generateVibrato;
  const generic = proto._generateVibratorWithParams;
  proto._generateVibrato = function patchedNoteVibrato(...args) {
    this.__fingerVibrato = true;
    try {
      return noteVibrato.apply(this, args);
    } finally {
      this.__fingerVibrato = false;
    }
  };
  // Whammy-bar (beat) vibrato keeps alphaTab's own swing around the pitch.
  proto._generateVibratorWithParams = function patchedVibrator(noteStart, noteDuration, phaseLength, bendBase, bendAmplitude, addBend) {
    if (!this.__fingerVibrato || !(phaseLength > 0)) {
      return generic.call(this, noteStart, noteDuration, phaseLength, bendBase, bendAmplitude, addBend);
    }
    const ramp = phaseLength * 0.75; // eases in over the first cycle
    for (let t = 0; t < noteDuration; t += STEP_TICKS) {
      const phase = (t % phaseLength) / phaseLength;
      const depth = bendAmplitude * Math.min(1, t / ramp);
      const value = bendBase + (depth * (1 - Math.cos(2 * Math.PI * phase))) / 2;
      addBend((noteStart + t) | 0, Gen.getPitchWheel(value));
    }
    addBend((noteStart + noteDuration) | 0, Gen.getPitchWheel(bendBase));
  };
}

/**
 * Sets the vibrato for the next MIDI generation of `api` so it runs at a
 * real-time rate for `tempo` BPM played at `speed`. Returns true when the
 * values changed (the MIDI then needs regenerating).
 */
export function tuneVibrato(settings, tempo, speed) {
  patchVibrato();
  const ticksPerSecond = (960 * (tempo || 120) * (speed || 1)) / 60;
  const v = settings.player.vibrato;
  const next = {
    noteSlightLength: Math.max(32, Math.round(ticksPerSecond / VIBRATO_HZ_SLIGHT)),
    noteWideLength: Math.max(32, Math.round(ticksPerSecond / VIBRATO_HZ_WIDE)),
    noteSlightAmplitude: DEPTH_SLIGHT,
    noteWideAmplitude: DEPTH_WIDE,
  };
  let changed = false;
  for (const [k, val] of Object.entries(next)) {
    if (v[k] !== val) {
      v[k] = val;
      changed = true;
    }
  }
  return changed;
}

patchVibrato();
