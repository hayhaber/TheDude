import { SOUND_SOURCE_OPTIONS } from '../../music/drumPatterns';
import { useLanguage } from '../../i18n/LanguageContext';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { BpmField } from './BpmField';
import { TIME_SIGNATURES, VolumeRow } from './Metronome';
import './Metronome.css';
import './WoodMetronome.css';

const MIXER_CHANNELS = [
  { key: 'kick', labelKey: 'metronome.channel.kick' },
  { key: 'snare', labelKey: 'metronome.channel.snare' },
  { key: 'hihat', labelKey: 'metronome.channel.hihat' },
];

// The 808's step-key colours, one per beat.
const PAD_COLORS = ['red', 'orange', 'yellow', 'cream'];

// The drum machine — its own tool (Tools card), over the same metronome
// clock + drum engine as the metronome (user's request 2026-10-17). Start
// here plays the drums: a source still on plain Click switches to Drums.
export function DrumMachine({
  bpm,
  setBpm,
  beatsPerMeasure,
  setBeatsPerMeasure,
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
  const timeSigSelect = (cls) => (
    <select className={cls} value={beatsPerMeasure} onChange={(e) => setBeatsPerMeasure(Number(e.target.value))} aria-label={t('metronome.timeSignature')}>
      {TIME_SIGNATURES.map((ts) => (
        <option key={ts.beats} value={ts.beats}>
          {ts.label}
        </option>
      ))}
    </select>
  );
  const volumeRow = (cls) => <VolumeRow className={cls} volume={volume} setVolume={setVolume} isMuted={isMuted} toggleMute={toggleMute} />;
  const start = () => {
    if (!isRunning && drums.soundSource === 'standard') drums.setSoundSource('drum');
    toggle();
  };

  return (
    <div className="metronome mw drum-machine">
    <div className="dm" dir="ltr">
      <div className="dm-head">
        <span className="dm-brand">DudeStar</span>
        <span className="dm-model">RHYTHM COMPOSER DR-8</span>
        <span className={'dm-led' + (isRunning ? ' is-on' : '')} aria-hidden="true" />
      </div>
      <div className="dm-strip" aria-hidden="true" />

      <div className="dm-top">
        <div className="dm-display">
          <BpmField value={bpm} onChange={setBpm} min={minBpm} max={maxBpm} labels={bpmLabels} className="dm-bpm" />
          <span className="dm-unit">BPM</span>
        </div>
        <label className="dm-lcd">
          <span className="dm-lbl">{t('metronome.timeSignature')}</span>
          {timeSigSelect('dm-select')}
        </label>
      </div>

      {/* One step key per beat, lit on the beat. */}
      <div className="dm-pads" style={{ '--n': beatsPerMeasure }} aria-hidden="true">
        {Array.from({ length: beatsPerMeasure }, (_, i) => (
          <span key={i} className={`dm-pad c-${PAD_COLORS[i % 4]}` + (isRunning && currentBeat === i ? ' is-on' : '')}>
            <i />
            <b>{i + 1}</b>
          </span>
        ))}
      </div>

      <div className="dm-section">
        <span className="dm-lbl">{t('metronome.soundSource')}</span>
        <div className="dm-keys" role="group" aria-label={t('metronome.soundSource')}>
          {SOUND_SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={'dm-key is-latch' + (drums.soundSource === opt.key ? ' is-active' : '')}
              aria-pressed={drums.soundSource === opt.key}
              onClick={() => drums.setSoundSource(opt.key)}
            >
              {t(`metronome.source.${opt.key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className={'dm-drumpart' + (drums.drumsActive ? '' : ' is-idle')}>
        <div className="dm-row">
          <label className="dm-lcd dm-grow">
            <span className="dm-lbl">{t('metronome.style')}</span>
            <select className="dm-select" value={drums.styleKey} onChange={(e) => drums.setStyleKey(e.target.value)}>
              {drums.styleOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {t(`metronome.style.${opt.key}`)}
                </option>
              ))}
            </select>
          </label>
          <span className="dm-fills">
            <button
              type="button"
              className={'dm-key is-latch' + (drums.fillsEnabled ? ' is-active' : '')}
              aria-pressed={drums.fillsEnabled}
              onClick={() => drums.setFillsEnabled(!drums.fillsEnabled)}
            >
              {t('metronome.fillsKey')}
            </button>
            <InfoTooltip text={t('tip.tools.drumFills')} />
          </span>
        </div>

        <div className="dm-mixer">
          {MIXER_CHANNELS.map((ch) => (
            <div className="dm-ch" key={ch.key}>
              <span className="dm-lbl">{t(ch.labelKey)}</span>
              <input
                type="range"
                className="dm-fader"
                min={0}
                max={100}
                value={drums.mutes[ch.key] ? 0 : drums.mix[ch.key]}
                onChange={(e) => drums.setMixValue(ch.key, e.target.value)}
                aria-label={t('metronome.channelVolume', { channel: t(ch.labelKey) })}
              />
              <button
                type="button"
                className={'dm-mute' + (drums.mutes[ch.key] ? ' is-muted' : '')}
                onClick={() => drums.toggleInstrumentMute(ch.key)}
                aria-pressed={drums.mutes[ch.key]}
                aria-label={
                  drums.mutes[ch.key]
                    ? t('metronome.unmuteChannel', { channel: t(ch.labelKey) })
                    : t('metronome.muteChannel', { channel: t(ch.labelKey) })
                }
              >
                M
              </button>
            </div>
          ))}
        </div>
      </div>

      {volumeRow('dm-volume')}

      <div className="dm-bottom">
        <button type="button" className="dm-key dm-big" onClick={tapTempo}>
          {t('metronome.tapTempo')}
        </button>
        <button type="button" className={'dm-key dm-big dm-start' + (isRunning ? ' running' : '')} onClick={start}>
          {isRunning ? t('metronome.stop') : t('metronome.start')}
        </button>
      </div>
    </div>
    </div>
  );
}
