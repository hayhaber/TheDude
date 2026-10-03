import * as alphaTab from '@coderline/alphatab';

// How Guitar Pro files sound in the app (GuitarPro section + file-based
// licks): the soundfont and a realistic finger vibrato.
//
// Soundfont: GeneralUser GS v2.0.3 by S. Christian Collins (free license,
// public/soundfont/GeneralUser-LICENSE.txt), converted to SF3 (Ogg Vorbis)
// so it downloads as ~9 MB instead of 32 MB — far better guitars, bass and
// drums than alphaTab's bundled 1.3 MB SONiVOX set. Fetched only when a
// Guitar Pro file is played, then cached by the browser.
export const GP_SOUNDFONT_URL = '/soundfont/generaluser-gs.sf3';

// Downloaded once and shared by every alphaTab instance (the hidden
// reference player, the song view, Songs -> Tab) — handing each its own URL
// made each one download the 9 MB file itself.
let soundFontBytes = null;
function soundFontPromise() {
  if (!soundFontBytes) {
    soundFontBytes = fetch(GP_SOUNDFONT_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`soundfont ${r.status}`);
        return r.arrayBuffer();
      })
      .catch((err) => {
        soundFontBytes = null; // let a later attempt retry
        throw err;
      });
  }
  return soundFontBytes;
}

/** Loads the shared soundfont into an AlphaTabApi created with enablePlayer and no soundFont URL. */
export function loadGpSoundFont(api) {
  return soundFontPromise().then((buffer) => {
    // A copy each time: the bytes are posted to the synth worker.
    api.loadSoundFont(new Uint8Array(buffer.slice(0)), false);
  });
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
