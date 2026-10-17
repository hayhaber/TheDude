import { useState } from 'react';
import { CLICK_SOUND_OPTIONS } from '../../audio/metronome';
import { SOUND_SOURCE_OPTIONS } from '../../music/drumPatterns';
import { useLanguage } from '../../i18n/LanguageContext';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { WoodMetronome } from './WoodMetronome';
import { BpmField } from './BpmField';
import './Metronome.css';
import './WoodMetronome.css';

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

// The 808's step-key colours, one per beat.
const PAD_COLORS = ['red', 'orange', 'yellow', 'cream'];
const VIEW_KEY = 'metronome-view'; // device setting: 'wood' | 'drums'

function loadView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'drums' ? 'drums' : 'wood';
  } catch {
    return 'wood';
  }
}

// Fed by App.jsx's single useMetronome() call (shared with the drills,
// recorder and the app pills). Two faces over the same state (user's
// choice, 2026-10-17): a classic wooden metronome, and a drum machine for
// the drum patterns (source, style, fills, mixer).
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
  const [view, setViewState] = useState(loadView);
  const setView = (v) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* private mode */
    }
  };
  const effectiveVolume = isMuted ? 0 : volume;
  const volumeIcon = isMuted || volume === 0 ? '🔇' : volume < 34 ? '🔈' : volume < 67 ? '🔉' : '🔊';
  const bpmLabels = {
    down: t('piano.metronome.tempoDown'),
    up: t('piano.metronome.tempoUp'),
    value: t('metronome.bpm'),
    edit: t('piano.metronome.editHint'),
  };
  const showDrums = drums && view === 'drums';

  const timeSigSelect = (cls) => (
    <select className={cls} value={beatsPerMeasure} onChange={(e) => setBeatsPerMeasure(Number(e.target.value))} aria-label={t('metronome.timeSignature')}>
      {TIME_SIGNATURES.map((ts) => (
        <option key={ts.beats} value={ts.beats}>
          {ts.label}
        </option>
      ))}
    </select>
  );

  const volumeRow = (cls) => (
    <div className={cls}>
      <button
        type="button"
        className={'mw-vol-icon' + (isMuted ? ' muted' : '')}
        onClick={toggleMute}
        aria-label={isMuted ? t('metronome.unmute') : t('metronome.mute')}
        aria-pressed={isMuted}
      >
        {volumeIcon}
      </button>
      <input
        type="range"
        className="mw-vol-slider"
        min={0}
        max={100}
        value={effectiveVolume}
        onChange={(e) => setVolume(e.target.value)}
        style={{ '--fill': `${effectiveVolume}%` }}
        aria-label={t('metronome.volume')}
      />
    </div>
  );

  return (
    <div className={'metronome mw' + (showDrums ? ' is-drums' : '')}>
      <h2 className="metronome-title">{t('metronome.title')}</h2>

      {drums && (
        <div className="mode-toggle mw-view" role="group" aria-label={t('metronome.view')}>
          <button type="button" className={view === 'wood' ? 'active' : ''} aria-pressed={view === 'wood'} onClick={() => setView('wood')}>
            {t('metronome.view.wood')}
          </button>
          <button type="button" className={view === 'drums' ? 'active' : ''} aria-pressed={view === 'drums'} onClick={() => setView('drums')}>
            {t('metronome.view.drums')}
          </button>
        </div>
      )}

      {!showDrums ? (
        <>
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
              {timeSigSelect('mw-tile-select')}
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

          {volumeRow('mw-volume')}

          <div className="mw-actions">
            <button type="button" className="mw-btn" onClick={tapTempo}>
              {t('metronome.tapTempo')}
            </button>
            <button type="button" className={'mw-btn mw-start' + (isRunning ? ' running' : '')} onClick={toggle}>
              {isRunning ? t('metronome.stop') : t('metronome.start')}
            </button>
          </div>
          {drums?.drumsActive && <p className="mw-note">{t('metronome.drumsOn', { source: t(`metronome.source.${drums.soundSource}`) })}</p>}
        </>
      ) : (
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
            <button type="button" className={'dm-key dm-big dm-start' + (isRunning ? ' running' : '')} onClick={toggle}>
              {isRunning ? t('metronome.stop') : t('metronome.start')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
