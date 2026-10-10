import { getAudioContext } from './audioContext';
import { getAudioInputSettings, getCalibration } from './audioInputSettingsStore';

// ROOM CALIBRATION — the #1 complaint about mic-based guitar apps is that
// detection falls apart in a normal room (fan, AC, fridge hum, traffic,
// echo). Instead of one fixed loudness gate for everybody, we measure THIS
// room through THIS mic:
//   1. QUIET_S of the room as usual (nobody playing) -> the noise floor:
//      frame RMS percentile + the average noise spectrum per FFT bin.
//   2. PLAY_S of normal playing -> the playing level.
// From those: a noise gate between floor and playing level, and a gain
// suggestion when the playing level is far too low/high.
//
// Every level is stored RAW (before the user's input gain), so changing the
// gain slider later doesn't invalidate the calibration — users of it scale
// by the current gain (`gateFor()` / `subtractNoiseProfile()`).
//
// Detectors use it only as max(their own gate, calibrated gate) — with no
// calibration (or one for another mic/mode) nothing changes at all.

export const QUIET_S = 3;
export const PLAY_S = 4;
const FRAME_MS = 50;
// Same FFT size as the chord detectors (useMicChordDetector / useMinuteChanges)
// so the stored spectrum lines up bin for bin with their frequency data.
export const PROFILE_FFT = 4096;
const PROFILE_MAX_HZ = 2100; // computeChroma only looks at 80–2000 Hz
const GATE_ABOVE_FLOOR = 2; // ×2 RMS = +6 dB over the (90th-percentile) floor
const GATE_MIN = 0.0002; // raw RMS sanity range (-74 .. -26 dBFS)
const GATE_MAX = 0.05;
const TARGET_PEAK = 0.5; // gain suggestion aims playing peaks at -6 dBFS

export const toDb = (x) => 20 * Math.log10(Math.max(x, 1e-9));

function percentile(values, p) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))))];
}

// Opens the mic exactly like usePitchDetection does (same device + same
// processing on/off), so what we measure is what the detectors will hear.
async function openMic() {
  const { deviceId, inputMode } = getAudioInputSettings();
  const processing = inputMode === 'microphone';
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: processing,
      noiseSuppression: processing,
      autoGainControl: processing,
    },
  });
  const ctx = getAudioContext();
  if (ctx.state !== 'running') await ctx.resume().catch(() => {});
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = PROFILE_FFT;
  analyser.smoothingTimeConstant = 0.6; // as useMicChordDetector
  source.connect(analyser); // raw (no gain node): levels are stored pre-gain
  return {
    ctx,
    analyser,
    close() {
      source.disconnect();
      stream.getTracks().forEach((tr) => tr.stop());
    },
  };
}

// Records `seconds` of frames: RMS + peak per frame, and (optionally) the
// summed POWER spectrum for the noise profile.
function record(mic, seconds, { spectrum, onProgress, signal }) {
  const { analyser } = mic;
  const time = new Float32Array(analyser.fftSize);
  const freq = new Float32Array(analyser.frequencyBinCount);
  const maxBin = Math.min(freq.length - 1, Math.ceil(PROFILE_MAX_HZ / (mic.ctx.sampleRate / PROFILE_FFT)));
  const power = spectrum ? new Float64Array(maxBin + 1) : null;
  const rms = [];
  let peak = 0;
  let specFrames = 0;
  const t0 = performance.now();
  return new Promise((resolve, reject) => {
    const id = setInterval(() => {
      if (signal?.aborted) {
        clearInterval(id);
        reject(new DOMException('aborted', 'AbortError'));
        return;
      }
      analyser.getFloatTimeDomainData(time);
      let sum = 0;
      for (let i = 0; i < time.length; i += 1) {
        const v = time[i];
        sum += v * v;
        if (Math.abs(v) > peak) peak = Math.abs(v);
      }
      const r = Math.sqrt(sum / time.length);
      rms.push(r);
      const elapsed = (performance.now() - t0) / 1000;
      // Skip the first 300 ms of the spectrum (analyser smoothing settling).
      if (power && elapsed > 0.3) {
        analyser.getFloatFrequencyData(freq);
        for (let b = 0; b <= maxBin; b += 1) if (Number.isFinite(freq[b])) power[b] += 10 ** (freq[b] / 10);
        specFrames += 1;
      }
      onProgress?.(Math.min(1, elapsed / seconds), Math.min(1, r * 8));
      if (elapsed >= seconds) {
        clearInterval(id);
        let profile = null;
        if (power && specFrames) {
          profile = Array.from(power, (p) => Math.round(10 * Math.log10(Math.max(p / specFrames, 1e-16)) * 10) / 10);
        }
        resolve({ rms, peak, profile });
      }
    }, FRAME_MS);
  });
}

// The whole two-step measurement. onStep('quiet'|'play'), onProgress(0..1,
// level 0..1). Resolves to a calibration record (or a { noPlay } result when
// the playing step wasn't louder than the room). Abort with `signal`.
export async function runCalibration({ onStep, onProgress, signal } = {}) {
  const gain = getAudioInputSettings().gain;
  const mic = await openMic();
  try {
    onStep?.('quiet');
    const quiet = await record(mic, QUIET_S, { spectrum: true, onProgress, signal });
    onStep?.('play');
    const play = await record(mic, PLAY_S, { spectrum: false, onProgress, signal });
    return analyseCalibration(quiet, play, { gain, sampleRate: mic.ctx.sampleRate });
  } finally {
    mic.close();
  }
}

// Pure: turns the two recordings into the stored record (raw levels).
export function analyseCalibration(quiet, play, { gain, sampleRate }) {
  const floorRms = percentile(quiet.rms, 90);
  // Playing has attacks and decays — the 80th percentile is "a note sounding".
  const playRms = percentile(play.rms, 80);
  const snrDb = toDb(playRms) - toDb(floorRms);
  const base = { floorDb: toDb(floorRms), playDb: toDb(playRms), snrDb };
  // Even a few dB is enough: the chord detectors work on the spectrum (the
  // noise is subtracted per bin), so a loud room still benefits.
  if (!(playRms > floorRms * 1.15)) return { noPlay: true, ...base };

  // Gate: +6 dB over the floor, but never above the midpoint (in dB) between
  // floor and playing level, so soft notes still get through in a noisy room.
  let gateRms = Math.min(floorRms * GATE_ABOVE_FLOOR, Math.sqrt(floorRms * playRms));
  gateRms = Math.max(GATE_MIN, Math.min(GATE_MAX, gateRms));

  // Gain suggestion (post-gain playing peak far from ~-6 dBFS). Applied only
  // when the user taps Apply.
  const postPeak = play.peak * gain;
  let suggestedGain = null;
  if (postPeak < 0.15 || postPeak > 0.9) {
    const g = Math.round(Math.max(0.3, Math.min(3, (TARGET_PEAK / Math.max(play.peak, 1e-6)))) * 10) / 10;
    if (Math.abs(g - gain) >= 0.2) suggestedGain = g;
  }

  return {
    v: 1,
    at: Date.now(),
    floorRms,
    playRms,
    gateRms,
    ...base,
    peakDb: toDb(postPeak),
    gainAtCal: gain,
    suggestedGain,
    verdict: snrDb >= 24 ? 'good' : snrDb >= 12 ? 'fair' : 'noisy',
    sampleRate,
    fftSize: PROFILE_FFT,
    noiseProfile: quiet.profile, // dB per bin (raw, pre-gain), bins 0..~2100 Hz
  };
}

// ---- Used by the detectors -------------------------------------------------

// Calibrated RMS gate in the detector's own (post-gain) units, or 0 when
// there is no calibration -> callers do max(theirGate, gateFor(...)) and an
// uncalibrated setup behaves exactly as before.
export function gateFor(cal, gain) {
  return cal ? cal.gateRms * gain : 0;
}

// The current calibration for a detector. `inputMode` overrides the setting
// for detectors that always open the mic one way (the vocal mic: processing
// off = 'direct').
export function activeCalibration(inputMode) {
  return getCalibration(getAudioInputSettings().deviceId, inputMode ?? getAudioInputSettings().inputMode);
}

// A noise gate with a little hysteresis: opens at the gate, closes 3 dB
// lower (but not into the noise floor), so a decaying note isn't chopped
// the moment it dips under the threshold.
//
// `soft` (the chord detectors): they also subtract the noise spectrum, so
// their gate only has to keep pure-noise frames out — it opens halfway (in
// dB) between the floor and the full gate, so a strum's decaying ring is
// followed longer.
export function createGate({ soft = false } = {}) {
  let open = false;
  return (rms, cal, gain) => {
    if (!cal) return true;
    const gateRms = soft ? Math.max(Math.sqrt(cal.gateRms * cal.floorRms), cal.floorRms * 1.15) : cal.gateRms;
    const on = gateRms * gain;
    const off = Math.max(on * 0.7, cal.floorRms * gain * 1.1);
    open = open ? rms >= off : rms >= on;
    return open;
  };
}

// Spectral subtraction for the chord detectors: removes the measured noise
// power (×2, i.e. 3 dB over-subtraction) from each bin of an AnalyserNode
// getFloatFrequencyData() frame, in place. Bins that end up at/below the
// noise become -160 dB, so computeChroma ignores them. Only when the
// calibration was measured with the same FFT size and sample rate.
export function subtractNoiseProfile(freqDb, cal, gain, fftSize, sampleRate) {
  const prof = cal?.noiseProfile;
  if (!prof || cal.fftSize !== fftSize || cal.sampleRate !== sampleRate) return freqDb;
  const gainDb = toDb(gain);
  const n = Math.min(prof.length, freqDb.length);
  for (let i = 0; i < n; i += 1) {
    const db = freqDb[i];
    if (!Number.isFinite(db)) continue;
    const p = 10 ** (db / 10) - 2 * 10 ** ((prof[i] + gainDb) / 10);
    freqDb[i] = p > 1e-16 ? 10 * Math.log10(p) : -160;
  }
  return freqDb;
}

// Frame RMS of a time-domain buffer (for detectors that didn't compute one).
export function frameRms(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}
