import { useCallback, useEffect, useRef, useState } from 'react';
import { PitchDetector } from 'pitchy';
import { getAudioContext, reviveAudioOutput } from '../audio/audioContext';
import { getAudioInputSettings } from '../audio/audioInputSettingsStore';
import { hzToMidi } from '../music/vocal/voiceRange';
import { activeCalibration, gateFor } from '../audio/noiseCalibration';

// The Vocal section's microphone: a continuous, timestamped pitch track (not
// just "the current note" like usePitchDetection) — the exercises draw the
// voice as a line over the target notes and analyse the whole take.
//
// Tuned for the singing voice: 70–1300 Hz (a low bass E2 up to a soprano's
// top), a slightly lower clarity bar than the guitar tuner (a breathy or
// soft voice is still a pitch), a loudness gate against room noise, and a
// 3-frame median that removes single-frame octave slips.
const FFT_SIZE = 2048;
const MIN_HZ = 70;
const MAX_HZ = 1300;
const MIN_CLARITY = 0.86;
const MIN_RMS = 0.006;
const ENV_RELEASE_S = 0.004;

/**
 * A copy of `buf` with its loudness envelope flattened (fast peak follower,
 * 4 ms release). A lip trill / tongue trill chops the voice 20–35 times a
 * second; on a low voice (below ~200 Hz) the analyser then finds the period
 * of the whole chopped pattern (27–33 Hz) instead of the note, so most frames
 * came back empty. With the envelope flattened the note's own period is the
 * strongest again. Synthetic test (2026-11-06): 98–196 Hz, 90 % modulation at
 * 22–34 Hz -> 0–86 % of frames read before, 96–100 % after, 0 wrong notes,
 * noise still unread.
 */
function flattenEnvelope(buf, out, sampleRate) {
  const a = Math.exp(-1 / (sampleRate * ENV_RELEASE_S));
  let e = 0;
  const warm = Math.min(buf.length, Math.round(sampleRate * 0.01));
  for (let i = 0; i < warm; i += 1) e = Math.max(Math.abs(buf[i]), e * a);
  for (let i = 0; i < buf.length; i += 1) {
    e = Math.max(Math.abs(buf[i]), e * a);
    out[i] = buf[i] / Math.max(e, 1e-4);
  }
  return out;
}

export function useVocalMic() {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const [live, setLive] = useState({ midi: null, level: 0 });
  // Every frame: { ct: AudioContext time of the analysed sound, midi | null }
  const framesRef = useRef([]);
  const nodes = useRef({});
  const rafRef = useRef(null);
  const recent = useRef([]);
  const tickCount = useRef(0);

  const tick = useCallback(() => {
    const { analyser, detector, buffer, gain } = nodes.current;
    if (!analyser) return;
    const ctx = getAudioContext();
    gain.gain.value = getAudioInputSettings().gain;
    analyser.getFloatTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i += 1) sum += buffer[i] * buffer[i];
    const rms = Math.sqrt(sum / buffer.length);
    let midi = null;
    // Fixed gate, raised to the room calibration's gate when there is one
    // (the vocal mic always opens with processing off -> 'direct' mode).
    const minRms = Math.max(MIN_RMS, gateFor(nodes.current.cal, gain.gain.value));
    if (rms >= minRms) {
      const valid = (hz, clarity) => clarity >= MIN_CLARITY && hz >= MIN_HZ && hz <= MAX_HZ;
      let [hz, clarity] = detector.findPitch(buffer, ctx.sampleRate);
      // Only when the plain read fails (frames that read today are untouched).
      if (!valid(hz, clarity)) [hz, clarity] = detector.findPitch(flattenEnvelope(buffer, nodes.current.flat, ctx.sampleRate), ctx.sampleRate);
      if (valid(hz, clarity)) midi = hzToMidi(hz);
    }
    // 3-frame median (null counts as a gap only when most frames are null).
    const r = recent.current;
    r.push(midi);
    if (r.length > 3) r.shift();
    const vals = r.filter((v) => v != null).sort((a, b) => a - b);
    const smooth = midi == null || vals.length < 2 ? midi : vals[vals.length >> 1];
    // The analysed window ends now; its centre is half a window earlier.
    const ct = ctx.currentTime - FFT_SIZE / 2 / ctx.sampleRate - (ctx.baseLatency || 0);
    framesRef.current.push({ ct, midi: smooth });
    if (framesRef.current.length > 6000) framesRef.current.splice(0, 2000);
    tickCount.current += 1;
    if (tickCount.current % 2 === 0) setLive({ midi: smooth, level: Math.min(1, rms * 8) });
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const n = nodes.current;
    n.source?.disconnect();
    n.gain?.disconnect();
    n.stream?.getTracks().forEach((tr) => tr.stop());
    nodes.current = {};
    recent.current = [];
    setListening(false);
    setLive({ midi: null, level: 0 });
  }, []);

  const start = useCallback(async () => {
    if (nodes.current.analyser) return true;
    setError(null);
    try {
      const { deviceId } = getAudioInputSettings();
      // Processing off: echo cancellation/AGC/noise suppression bend a
      // sustained sung pitch and pump its level.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      const ctx = getAudioContext();
      // Opening the mic can interrupt playback on iOS; wake it again.
      reviveAudioOutput();
      if (ctx.state !== 'running') await ctx.resume().catch(() => {});
      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      source.connect(gain).connect(analyser);
      nodes.current = {
        stream,
        source,
        gain,
        analyser,
        detector: PitchDetector.forFloat32Array(FFT_SIZE),
        buffer: new Float32Array(FFT_SIZE),
        flat: new Float32Array(FFT_SIZE),
        cal: activeCalibration('direct'),
      };
      setListening(true);
      rafRef.current = requestAnimationFrame(tick);
      return true;
    } catch (err) {
      setError(err?.message ?? String(err));
      setListening(false);
      return false;
    }
  }, [tick]);

  useEffect(() => stop, [stop]);

  return { listening, error, live, framesRef, start, stop };
}
