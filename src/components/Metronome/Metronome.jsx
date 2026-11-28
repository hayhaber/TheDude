import { CLICK_SOUND_OPTIONS } from '../../audio/metronome';
import { useLanguage } from '../../i18n/LanguageContext';
import { WoodMetronome } from './WoodMetronome';
import { BpmField } from './BpmField';
import { Select } from '../ui/Select';
import { Button, ControlRow, PlayGlyph, SpeakerGlyph, StopGlyph } from '../ui/controls';
import './Metronome.css';
import './WoodMetronome.css';
import './DrumMachine.css';

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
  // The metronome plays the click alone; the drum machine (its own tool)
  // plays the drums alone — never both (user's call, 2026-10-17).
  const start = () => {
    if (!isRunning && drums && drums.soundSource !== 'standard') drums.setSoundSource('standard');
    toggle();
  };
  const bpmLabels = {
    down: t('piano.metronome.tempoDown'),
    up: t('piano.metronome.tempoUp'),
    value: t('metronome.bpm'),
    edit: t('piano.metronome.editHint'),
  };

  // v1.0.298 (user: "would Apple design it like this?"): the wooden face
  // stays (a device), everything under it speaks the drum machine's
  // language — the tempo big with round − +, a dot per beat, an inset list
  // of pop-ups, a volume row, ONE filled Start, no card around it.
  const beat = isRunning ? currentBeat : -1;
  return (
    <div className="metronome-face mw dmx">
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

      <section className="dmx-card dmx-tempo">
        <div className="dmx-tempo-row">
          <div className="dmx-tempo-num">
            <BpmField value={bpm} onChange={setBpm} min={minBpm} max={maxBpm} labels={bpmLabels} className="dmx-bpm" />
            <span className="dmx-unit">BPM</span>
          </div>
          <Button variant="gray" onClick={tapTempo} className="dmx-tap">
            {t('metronome.tapTempo')}
          </Button>
        </div>
        <div className="dmx-beats" dir="ltr" aria-hidden="true">
          {Array.from({ length: beatsPerMeasure }, (_, i) => (
            <span key={i} className={'dmx-beat' + (i === beat ? ' is-now' : '') + (i === 0 ? ' is-one' : '')} />
          ))}
        </div>
      </section>

      <section className="dmx-group">
        <ControlRow label={t('metronome.timeSignature')}>
          <Select value={beatsPerMeasure} aria-label={t('metronome.timeSignature')} onChange={(e) => setBeatsPerMeasure(Number(e.target.value))}>
            {TIME_SIGNATURES.map((ts) => (
              <option key={ts.beats} value={ts.beats}>
                {ts.label}
              </option>
            ))}
          </Select>
        </ControlRow>
        <ControlRow label={t('metronome.sound')}>
          <Select value={soundKey} aria-label={t('metronome.sound')} onChange={(e) => setSoundKey(e.target.value)}>
            {CLICK_SOUND_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {t(`metronome.sound.${opt.key}`)}
              </option>
            ))}
          </Select>
        </ControlRow>
        <div className="ui-row dmx-level">
          <button
            type="button"
            className={'dmx-speaker' + (isMuted ? ' is-muted' : '')}
            onClick={toggleMute}
            aria-pressed={isMuted}
            aria-label={isMuted ? t('metronome.unmute') : t('metronome.mute')}
          >
            <SpeakerGlyph off={isMuted || volume === 0} />
          </button>
          <input
            type="range"
            className="ui-slider dmx-slider"
            min={0}
            max={100}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(e.target.value)}
            style={{ '--fill': `${isMuted ? 0 : volume}%` }}
            aria-label={t('metronome.volume')}
          />
        </div>
      </section>

      <Button variant={isRunning ? 'gray' : 'filled'} size="lg" danger={isRunning} className="dmx-start" onClick={start} icon={isRunning ? <StopGlyph /> : <PlayGlyph size={15} />}>
        {(isRunning ? t('metronome.stop') : t('metronome.start')).replace(/^[▶■⏹◼]\uFE0F?\s*/u, '')}
      </Button>
    </div>
  );
}
