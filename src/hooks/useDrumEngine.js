import { useEffect, useRef, useState } from 'react';
import { startDrumEngine } from '../audio/drumEngine';
import { DRUM_STYLE_OPTIONS } from '../music/drumPatterns';

// Drives the Drum Machine groove engine off the existing Metronome's own
// bpm/beatsPerMeasure/isRunning/masterVolume (pass in the live values from
// useMetronome()) so the two never need reconciling — there's exactly one
// tempo, one "running" state and one master volume/mute, this hook just
// reacts to them. Kept as its own hook/service rather than folded into
// useMetronome so the plain click metronome is untouched by any of this.
export function useDrumEngine({ bpm, beatsPerMeasure, isRunning, masterVolume = 1 }) {
  const [soundSource, setSoundSource] = useState('standard'); // 'standard' | 'drum' | 'both'
  const [styleKey, setStyleKey] = useState(DRUM_STYLE_OPTIONS[0].key);
  const [mix, setMix] = useState({ kick: 80, snare: 80, hihat: 80 });
  const [mutes, setMutes] = useState({ kick: false, snare: false, hihat: false });

  const engineRef = useRef(null);
  // Read live by the scheduler on every step, same reasoning as
  // useMetronome's volumeRef — dragging a mixer fader (or the shared master
  // volume) while playing shouldn't need to restart the engine.
  const mixRef = useRef({ kick: 0.8, snare: 0.8, hihat: 0.8 });

  useEffect(() => {
    mixRef.current = {
      kick: (mutes.kick ? 0 : mix.kick / 100) * masterVolume,
      snare: (mutes.snare ? 0 : mix.snare / 100) * masterVolume,
      hihat: (mutes.hihat ? 0 : mix.hihat / 100) * masterVolume,
    };
  }, [mix, mutes, masterVolume]);

  const drumsActive = soundSource === 'drum' || soundSource === 'both';
  // Exposed so the caller can silence the plain click (via useMetronome's
  // own `silenced` param) without touching the user's click volume/mute.
  const clickSilenced = soundSource === 'drum';

  useEffect(() => {
    if (!isRunning || !drumsActive) return undefined;

    engineRef.current = startDrumEngine({
      bpm,
      beatsPerMeasure,
      styleKey,
      getMix: () => mixRef.current,
    });

    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, drumsActive, bpm, beatsPerMeasure, styleKey]);

  function setMixValue(instrument, value) {
    const n = Math.round(Number(value));
    if (Number.isNaN(n)) return;
    setMix((m) => ({ ...m, [instrument]: Math.max(0, Math.min(100, n)) }));
    if (n > 0) setMutes((m) => (m[instrument] ? { ...m, [instrument]: false } : m));
  }

  function toggleInstrumentMute(instrument) {
    setMutes((m) => ({ ...m, [instrument]: !m[instrument] }));
  }

  return {
    soundSource,
    setSoundSource,
    styleKey,
    setStyleKey,
    styleOptions: DRUM_STYLE_OPTIONS,
    mix,
    setMixValue,
    mutes,
    toggleInstrumentMute,
    drumsActive,
    clickSilenced,
  };
}
