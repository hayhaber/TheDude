import { useEffect } from 'react';
import { useAudioInputSettings } from '../../hooks/useAudioInputSettings';
import { usePitchDetection } from '../../hooks/usePitchDetection';
import { useLanguage } from '../../i18n/LanguageContext';
import './AudioInputSettings.css';

// Settings UI for every feature that listens to the mic (Tuner, Ear
// Training's mic-answer mode, Guitar Practice Trainer, Rhythm Practice) —
// none of those own any audio-input configuration themselves, they all go
// through the one shared usePitchDetection.js hook, which reads whatever is
// chosen here (see audioInputSettingsStore.js). Runs its own short-lived
// usePitchDetection instance purely to drive the live VU meter/gain preview
// while this section is open — starting it is what actually requests mic
// permission, which is also what unlocks real device labels from
// enumerateDevices() (a browser privacy measure, not a bug here).
export function AudioInputSettings() {
  const { t } = useLanguage();
  const { deviceId, setDeviceId, gain, setGain, inputMode, setInputMode, devices, refreshDevices } = useAudioInputSettings();
  const { isListening, startListening, stopListening, inputLevel, error } = usePitchDetection();

  // Device labels only appear after permission is granted — re-check the
  // list right after a successful startListening() so a first-time "Test
  // Mic" doesn't leave the dropdown showing blank labels until manually
  // refreshed.
  useEffect(() => {
    if (isListening) refreshDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  useEffect(() => stopListening, [stopListening]);

  const hasLabels = devices.some((d) => d.label);
  const levelPct = Math.round(inputLevel * 100);
  const isClipping = inputLevel > 0.98;

  return (
    <div className="audio-input-settings">
      <label className="settings-field">
        {t('audioInput.device')}
        <select value={deviceId ?? ''} onChange={(e) => setDeviceId(e.target.value || null)}>
          <option value="">{t('audioInput.defaultDevice')}</option>
          {devices.map((d, i) => (
            <option key={d.deviceId || i} value={d.deviceId}>
              {d.label || t('audioInput.unlabeledDevice', { index: i + 1 })}
            </option>
          ))}
        </select>
        {!hasLabels && <span className="settings-attribution">{t('audioInput.labelsHint')}</span>}
      </label>

      <label className="settings-field">
        {t('audioInput.mode')}
        <div className="mode-toggle" role="group" aria-label={t('audioInput.mode')}>
          <button type="button" className={inputMode === 'direct' ? 'active' : ''} onClick={() => setInputMode('direct')}>
            {t('audioInput.mode.direct')}
          </button>
          <button type="button" className={inputMode === 'microphone' ? 'active' : ''} onClick={() => setInputMode('microphone')}>
            {t('audioInput.mode.microphone')}
          </button>
        </div>
        <span className="settings-attribution">{t(inputMode === 'direct' ? 'audioInput.mode.directHint' : 'audioInput.mode.microphoneHint')}</span>
      </label>

      <label className="settings-field">
        {t('audioInput.gain', { value: gain.toFixed(1) })}
        <input
          type="range"
          min="0"
          max="3"
          step="0.1"
          value={gain}
          onChange={(e) => setGain(e.target.value)}
          className="audio-input-gain-slider"
        />
      </label>

      <div className="settings-field">
        {t('audioInput.level')}
        <div className="audio-input-meter" role="meter" aria-valuenow={levelPct} aria-valuemin={0} aria-valuemax={100}>
          <div className={'audio-input-meter-fill' + (isClipping ? ' clipping' : '')} style={{ width: `${levelPct}%` }} />
        </div>
        <button type="button" className="audio-input-test-btn" onClick={isListening ? stopListening : startListening}>
          {isListening ? t('trainer.stop') : t('audioInput.testMic')}
        </button>
        {error && <span className="settings-attribution audio-input-error">{t('trainer.micError', { message: error })}</span>}
        {isClipping && <span className="settings-attribution audio-input-error">{t('audioInput.clipping')}</span>}
      </div>
    </div>
  );
}
