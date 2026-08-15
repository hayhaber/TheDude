import { CLICK_SOUND_OPTIONS } from '../../audio/metronome';
import { SOUND_SOURCE_OPTIONS } from '../../music/drumPatterns';
import { BpmScroller } from './BpmScroller';
import { useLanguage } from '../../i18n/LanguageContext';
import './Metronome.css';

const MIXER_CHANNELS = [
  { key: 'kick', labelKey: 'metronome.channel.kick' },
  { key: 'snare', labelKey: 'metronome.channel.snare' },
  { key: 'hihat', labelKey: 'metronome.channel.hihat' },
];

const TIME_SIGNATURES = [
  { beats: 2, label: '2/4' },
  { beats: 3, label: '3/4' },
  { beats: 4, label: '4/4' },
  { beats: 5, label: '5/4' },
  { beats: 6, label: '6/8' },
];

// Fed by App.jsx's single useMetronome() call (lifted there so the new
// Practice Drill engine can also start/stop this exact metronome instance
// and react to its live bpm/ticks) rather than owning the hook itself —
// everything below is otherwise unchanged from when it did.
export function Metronome({
  bpm,
  setBpm,
  beatsPerMeasure,
  setBeatsPerMeasure,
  soundKey,
  setSoundKey,
  isRunning,
  currentBeat,
  toggle,
  tapTempo,
  minBpm,
  maxBpm,
  volume,
  setVolume,
  isMuted,
  toggleMute,
  drums,
}) {
  const effectiveVolume = isMuted ? 0 : volume;
  const volumeIcon = isMuted || volume === 0 ? '🔇' : volume < 34 ? '🔈' : volume < 67 ? '🔉' : '🔊';
  const { t } = useLanguage();

  return (
    <div className="metronome">
      <h2 className="metronome-title">{t('metronome.title')}</h2>

      {/* Beats + Tap on the left, the big BPM dial on the right — same
          two-column top area a real hardware metronome's own layout uses
          (a small readout/tap area beside the one big control that matters
          most), replacing the old single-column stack now that this drawer
          has room to spare (see TunerBar.css's own drawer-sizing fix for
          the same "was oversized, now sized to content" story — this one
          runs the other direction, since the dial was too cramped at 84px). */}
      <div className="metronome-top-row">
        <div className="metronome-top-left">
          <div className="metronome-beats" aria-hidden="true">
            {Array.from({ length: beatsPerMeasure }, (_, i) => (
              <span
                key={i}
                className={
                  'metronome-beat-dot' +
                  (i === 0 ? ' accent' : '') +
                  (isRunning && currentBeat === i ? ' active' : '')
                }
              />
            ))}
          </div>
          <button type="button" className="metronome-tap" onClick={tapTempo}>
            {t('metronome.tapTempo')}
          </button>
        </div>

        <BpmScroller value={bpm} onChange={setBpm} min={minBpm} max={maxBpm} defaultValue={120} />
      </div>

      <div className="metronome-control-grid">
        <label className="metronome-field">
          {t('metronome.timeSignature')}
          <select
            value={beatsPerMeasure}
            onChange={(e) => setBeatsPerMeasure(Number(e.target.value))}
          >
            {TIME_SIGNATURES.map((ts) => (
              <option key={ts.beats} value={ts.beats}>
                {ts.label}
              </option>
            ))}
          </select>
        </label>

        <label className="metronome-field">
          {t('metronome.sound')}
          <select value={soundKey} onChange={(e) => setSoundKey(e.target.value)}>
            {CLICK_SOUND_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {t(`metronome.sound.${opt.key}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        className={'metronome-toggle' + (isRunning ? ' running' : '')}
        onClick={toggle}
      >
        {isRunning ? t('metronome.stop') : t('metronome.start')}
      </button>

      {/* The actual master volume control — a real slider bound to
          setVolume, not just the mute-toggle icon that used to be the only
          thing here (that icon only ever flipped between muted/unmuted, it
          never actually raised or lowered the level, which is the bug this
          fixes). Clicking the icon still toggles mute, same as a system
          volume control; dragging the slider also un-mutes automatically
          (see useMetronome.js's setVolumeClamped). */}
      <div className="metronome-volume-row">
        <button
          type="button"
          className={'metronome-volume-icon' + (isMuted ? ' muted' : '')}
          onClick={toggleMute}
          aria-label={isMuted ? t('metronome.unmute') : t('metronome.mute')}
          aria-pressed={isMuted}
        >
          {volumeIcon}
        </button>
        <input
          type="range"
          className="metronome-volume-slider"
          min={0}
          max={100}
          value={effectiveVolume}
          onChange={(e) => setVolume(e.target.value)}
          style={{ '--fill': `${effectiveVolume}%` }}
          aria-label={t('metronome.volume')}
        />
      </div>

      {drums && (
        <div className="metronome-drum-section">
          <div className="metronome-source-switch" role="group" aria-label={t('metronome.soundSource')}>
            {SOUND_SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={'metronome-source-pill' + (drums.soundSource === opt.key ? ' active' : '')}
                aria-pressed={drums.soundSource === opt.key}
                onClick={() => drums.setSoundSource(opt.key)}
              >
                {t(`metronome.source.${opt.key}`)}
              </button>
            ))}
          </div>

          {drums.drumsActive && (
            <>
              <label className="metronome-field metronome-style-field">
                {t('metronome.style')}
                <select value={drums.styleKey} onChange={(e) => drums.setStyleKey(e.target.value)}>
                  {drums.styleOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {t(`metronome.style.${opt.key}`)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="metronome-mixer">
                {MIXER_CHANNELS.map((ch) => (
                  <div className="metronome-mixer-channel" key={ch.key}>
                    <span className="metronome-mixer-label">{t(ch.labelKey)}</span>
                    <input
                      type="range"
                      className="metronome-mixer-fader"
                      min={0}
                      max={100}
                      value={drums.mutes[ch.key] ? 0 : drums.mix[ch.key]}
                      onChange={(e) => drums.setMixValue(ch.key, e.target.value)}
                      aria-label={t('metronome.channelVolume', { channel: t(ch.labelKey) })}
                    />
                    <button
                      type="button"
                      className={'metronome-mixer-mute' + (drums.mutes[ch.key] ? ' muted' : '')}
                      onClick={() => drums.toggleInstrumentMute(ch.key)}
                      aria-pressed={drums.mutes[ch.key]}
                      aria-label={
                        drums.mutes[ch.key]
                          ? t('metronome.unmuteChannel', { channel: t(ch.labelKey) })
                          : t('metronome.muteChannel', { channel: t(ch.labelKey) })
                      }
                    >
                      {drums.mutes[ch.key] ? '🔇' : '🔊'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
