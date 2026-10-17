import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { startDrumEngine } from '../audio/drumEngine';
import { DRUM_STYLE_OPTIONS } from '../music/drumPatterns';
import { isUserKey, loadUserPatterns, resolvePattern, saveUserPatterns } from '../music/drumKit';

// Drives the Drum Machine groove engine off the existing Metronome's own
// bpm/beatsPerMeasure/isRunning/masterVolume (pass in the live values from
// useMetronome()) so the two never need reconciling — there's exactly one
// tempo, one "running" state and one master volume/mute, this hook just
// reacts to them. Kept as its own hook/service rather than folded into
// useMetronome so the plain click metronome is untouched by any of this.
export function useDrumEngine({ bpm, beatsPerMeasure, isRunning, masterVolume = 1 }) {
  const [soundSource, setSoundSource] = useState('standard'); // 'standard' | 'drum' | 'both'
  const [styleKey, setStyleKey] = useState(DRUM_STYLE_OPTIONS[0].key);
  const [mix, setMix] = useState({ kick: 80, snare: 80, hihat: 80, perc: 80 });
  const [mutes, setMutes] = useState({ kick: false, snare: false, hihat: false, perc: false });
  // Step sequencer (2026-10-17): the user's own patterns (per profile), a
  // draft being edited (played live while editing), rows muted by tapping
  // their name, and step callbacks for the playhead.
  const [userPatterns, setUserPatternsState] = useState(loadUserPatterns);
  const [draft, setDraft] = useState(null);
  const [rowMutes, setRowMutes] = useState({});
  const setUserPatterns = useCallback((list) => {
    setUserPatternsState(list);
    saveUserPatterns(list);
  }, []);
  const stepListeners = useRef(new Set());
  const subscribeStep = useCallback((fn) => {
    stepListeners.current.add(fn);
    return () => stepListeners.current.delete(fn);
  }, []);
  // Off by default — opt-in variety on top of the groove, not a change to
  // what anyone already using the drum machine currently hears.
  const [fillsEnabled, setFillsEnabled] = useState(false);

  const engineRef = useRef(null);
  // Read live by the scheduler on every step, same reasoning as
  // useMetronome's volumeRef — dragging a mixer fader (or the shared master
  // volume) while playing shouldn't need to restart the engine.
  const mixRef = useRef({ kick: 0.8, snare: 0.8, hihat: 0.8, perc: 0.8, rows: {} });

  useEffect(() => {
    mixRef.current = {
      kick: (mutes.kick ? 0 : mix.kick / 100) * masterVolume,
      snare: (mutes.snare ? 0 : mix.snare / 100) * masterVolume,
      hihat: (mutes.hihat ? 0 : mix.hihat / 100) * masterVolume,
      perc: (mutes.perc ? 0 : mix.perc / 100) * masterVolume,
      rows: rowMutes,
    };
  }, [mix, mutes, masterVolume, rowMutes]);

  // What the engine plays: the draft while editing, else a saved user
  // pattern, else (null) the built-in style.
  const current = useMemo(() => draft ?? (isUserKey(styleKey) ? resolvePattern(styleKey, userPatterns) : null), [draft, styleKey, userPatterns]);
  const patternRef = useRef(current);
  patternRef.current = current;

  const drumsActive = soundSource === 'drum' || soundSource === 'both';
  // Exposed so the caller can silence the plain click (via useMetronome's
  // own `silenced` param) without touching the user's click volume/mute.
  const clickSilenced = soundSource === 'drum';

  useEffect(() => {
    if (!isRunning || !drumsActive) return undefined;

    engineRef.current = startDrumEngine({
      bpm,
      beatsPerMeasure,
      styleKey: isUserKey(styleKey) ? 'rock' : styleKey,
      getPattern: () => patternRef.current,
      getMix: () => mixRef.current,
      fillsEnabled,
      onStep: (at) => stepListeners.current.forEach((fn) => fn(at)),
    });

    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, drumsActive, bpm, beatsPerMeasure, styleKey, fillsEnabled]);

  function setMixValue(instrument, value) {
    const n = Math.round(Number(value));
    if (Number.isNaN(n)) return;
    setMix((m) => ({ ...m, [instrument]: Math.max(0, Math.min(100, n)) }));
    if (n > 0) setMutes((m) => (m[instrument] ? { ...m, [instrument]: false } : m));
  }

  function toggleInstrumentMute(instrument) {
    setMutes((m) => ({ ...m, [instrument]: !m[instrument] }));
  }

  const toggleRowMute = (instrument) => setRowMutes((m) => ({ ...m, [instrument]: !m[instrument] }));

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
    fillsEnabled,
    setFillsEnabled,
    userPatterns,
    setUserPatterns,
    draft,
    setDraft,
    rowMutes,
    toggleRowMute,
    subscribeStep,
    // The pattern on screen: draft / saved user pattern / built-in style.
    pattern: current ?? resolvePattern(styleKey, userPatterns) ?? resolvePattern('rock', []),
  };
}
