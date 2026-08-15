import { useCallback, useEffect, useState } from 'react';
import { getAudioInputSettings, setAudioInputSettings } from '../audio/audioInputSettingsStore';

// Settings UI's source of truth for audio INPUT device/gain/mode — mirrors
// every change into audioInputSettingsStore.js (read by usePitchDetection.js
// at mic-open time) and into localStorage, same split as useAudioSettings.js
// (React state for the UI to render, module store for everyone else to read
// without a prop chain).
export function useAudioInputSettings() {
  const [deviceId, setDeviceIdState] = useState(() => getAudioInputSettings().deviceId);
  const [gain, setGainState] = useState(() => getAudioInputSettings().gain);
  const [inputMode, setInputModeState] = useState(() => getAudioInputSettings().inputMode);
  const [devices, setDevices] = useState([]);

  // Device *labels* are only populated once the page has been granted mic
  // permission at least once this session (a browser privacy measure) —
  // callers can use `devices.some(d => d.label)` to tell whether that's
  // happened yet, rather than this hook guessing at a separate boolean that
  // could fall out of sync with the browser's own state.
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === 'audioinput'));
    } catch {
      // Enumeration itself can fail in some locked-down embeds — leave the
      // list empty rather than throwing, same "degrade quietly" approach
      // usePitchDetection.js takes for getUserMedia failures.
    }
  }, []);

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
  }, [refreshDevices]);

  function setDeviceId(id) {
    setDeviceIdState(id);
    setAudioInputSettings({ deviceId: id });
  }

  function setGain(value) {
    const n = Math.max(0, Math.min(3, Number(value)));
    if (Number.isNaN(n)) return;
    setGainState(n);
    setAudioInputSettings({ gain: n });
  }

  function setInputMode(mode) {
    const next = mode === 'microphone' ? 'microphone' : 'direct';
    setInputModeState(next);
    setAudioInputSettings({ inputMode: next });
  }

  return { deviceId, setDeviceId, gain, setGain, inputMode, setInputMode, devices, refreshDevices };
}
