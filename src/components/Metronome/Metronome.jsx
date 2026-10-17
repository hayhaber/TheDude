import { CLICK_SOUND_OPTIONS } from '../../audio/metronome';
import { useLanguage } from '../../i18n/LanguageContext';
import { WoodMetronome } from './WoodMetronome';
import { BpmField } from './BpmField';
import './Metronome.css';
import './WoodMetronome.css';

export const TIME_SIGNATURES = [
  { beats: 2, label: '2/4' },
  { beats: 3, label: '3/4' },
  { beats: 4, label: '4/4' },
  { beats: 5, label: '5/4' },
  { beats: 6, label: '6/8' },
];

/** Master volume: mute icon + slider (dragging also un-mutes, see useMetronome). */
export function VolumeRow({ className, volume, setVolume, isMuted, toggleMute }) {
  const { t } = useLanguage();
  const effective = isMuted ? 0 : volume;
  const icon = isMuted || volume === 0 ? '🔇' : volume < 34 ? '🔈' : volume < 67 ? '🔉' : '🔊';
  return (
    <div className={className}>
      <button
        type="button"
        className={'mw-vol-icon' + (isMuted ? ' muted' : '')}
        onClick={toggleMute}
        aria-label={isMuted ? t('metronome.unmute') : t('metronome.mute')}
        aria-pressed={isMuted}
      >
        {icon}
      </button>
      <input
        type="range"
        className="mw-vol-slider"
        min={0}
        max={100}
        value={effective}
        onChange={(e) => setVolume(e.target.value)}
        style={{ '--fill': `${effective}%` }}
        aria-label={t('metronome.volume')}
      />
    </div>
  );
}

// Fed by App.jsx's single useMetronome() call (shared with the drills,
// recorder, the drum machine and the app pills). The face is a classic
// wooden metronome (user's choice, 2026-10-17); the drum machine is its own
// tool (DrumMachine.jsx, Tools card) over the same clock.
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
  const { t } = useLanguage();
  const bpmLabels = {
    down: t('piano.metronome.tempoDown'),
    up: t('piano.metronome.tempoUp'),
    value: t('metronome.bpm'),
    edit: t('piano.metronome.editHint'),
  };

  return (
    <div className="metronome mw">
      <h2 className="metronome-title">{t('metronome.title')}</h2>

      <div className="mw-stage">
        <WoodMetronome
          bpm={bpm}
          setBpm={setBpm}
          minBpm={minBpm}
          maxBpm={maxBpm}
          isRunning={isRunning}
          currentBeat={currentBeat}
          beatsPerMeasure={beatsPerMeasure}
          label={t('metronome.dragTempo')}
        />
      </div>

      <div className="mw-tiles">
        <div className="mw-tile">
          <BpmField value={bpm} onChange={setBpm} min={minBpm} max={maxBpm} labels={bpmLabels} className="mw-bpm" />
          <span className="mw-tile-label">BPM</span>
        </div>
        <label className="mw-tile">
          <select
            className="mw-tile-select"
            value={beatsPerMeasure}
            onChange={(e) => setBeatsPerMeasure(Number(e.target.value))}
            aria-label={t('metronome.timeSignature')}
          >
            {TIME_SIGNATURES.map((ts) => (
              <option key={ts.beats} value={ts.beats}>
                {ts.label}
              </option>
            ))}
          </select>
          <span className="mw-tile-label">{t('metronome.timeSignature')}</span>
        </label>
        <label className="mw-tile">
          <select className="mw-tile-select" value={soundKey} onChange={(e) => setSoundKey(e.target.value)} aria-label={t('metronome.sound')}>
            {CLICK_SOUND_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {t(`metronome.sound.${opt.key}`)}
              </option>
            ))}
          </select>
          <span className="mw-tile-label">{t('metronome.sound')}</span>
        </label>
      </div>

      <VolumeRow className="mw-volume" volume={volume} setVolume={setVolume} isMuted={isMuted} toggleMute={toggleMute} />

      <div className="mw-actions">
        <button type="button" className="mw-btn" onClick={tapTempo}>
          {t('metronome.tapTempo')}
        </button>
        <button type="button" className={'mw-btn mw-start' + (isRunning ? ' running' : '')} onClick={toggle}>
          {isRunning ? t('metronome.stop') : t('metronome.start')}
        </button>
      </div>

      {/* The drum machine (its own tool) shares this clock: say so when it is
          on, with a one-tap way back to the plain click. */}
      {drums?.drumsActive && (
        <p className="mw-note">
          {t('metronome.drumsOn', { source: t(`metronome.source.${drums.soundSource}`) })}{' '}
          <button type="button" className="mw-link" onClick={() => drums.setSoundSource('standard')}>
            {t('metronome.clickOnly')}
          </button>
        </p>
      )}
    </div>
  );
}
