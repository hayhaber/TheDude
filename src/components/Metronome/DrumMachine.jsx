import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { BpmField } from './BpmField';
import { TIME_SIGNATURES, VolumeRow } from './Metronome';
import {
  DRUM_INSTRUMENTS,
  RESOLUTIONS,
  USER_PREFIX,
  blankPattern,
  changeBeats,
  changeResolution,
  clearPattern,
  draftFrom,
  hasHits,
  isUserKey,
  nextName,
  nextVelocity,
  removePattern,
  setHit,
  upsertPattern,
  usedInstruments,
} from '../../music/drumKit';
import './Metronome.css';
import './WoodMetronome.css';

const MIXER_CHANNELS = [
  { key: 'kick', labelKey: 'drums.mix.kick' },
  { key: 'snare', labelKey: 'drums.mix.snare' },
  { key: 'hihat', labelKey: 'drums.mix.hihat' },
  { key: 'perc', labelKey: 'drums.mix.perc' },
];
const GROUP_OF = Object.fromEntries(DRUM_INSTRUMENTS.map((i) => [i.key, i.group]));

// The drum machine — its own tool (Tools card + a pill beside the
// metronome's), over the same clock + drum engine as the metronome. Start
// here plays the drums only; the metronome's Start plays the click only.
// A step sequencer (user's choice 2026-10-17, TR-8 style): a row per drum of
// the full kit, a column per step of the bar, the playhead running across.
// Tapping a square edits (on -> soft -> off); the edit plays live and can
// be saved as the user's own pattern (per profile).
export function DrumMachine({
  bpm,
  setBpm,
  beatsPerMeasure,
  setBeatsPerMeasure,
  isRunning,
  toggle,
  tapTempo,
  minBpm,
  maxBpm,
  volume,
  setVolume,
  isMuted,
  toggleMute,
  drums,
  resetOnLeave = false,
}) {
  const { t } = useLanguage();
  const [showKit, setShowKit] = useState(false);
  const [name, setName] = useState('');
  const [head, setHead] = useState(null); // { role, step } of the playhead
  // Row name tap = hear that drum (a short flash on the name).
  const [hitRow, setHitRow] = useState(null);
  const hitTimer = useRef(0);
  const audition = (inst) => {
    drums.previewInstrument(inst);
    setHitRow(inst);
    clearTimeout(hitTimer.current);
    hitTimer.current = setTimeout(() => setHitRow(null), 180);
  };
  useEffect(() => () => clearTimeout(hitTimer.current), []);
  const bpmLabels = {
    down: t('piano.metronome.tempoDown'),
    up: t('piano.metronome.tempoUp'),
    value: t('metronome.bpm'),
    edit: t('piano.metronome.editHint'),
  };

  // Leaving the drum machine SCREEN puts the shared clock back on the plain
  // click (resetOnLeave); closing the pill's drawer leaves the drums playing.
  const setSourceRef = useRef(drums.setSoundSource);
  setSourceRef.current = drums.setSoundSource;
  const resetRef = useRef(resetOnLeave);
  resetRef.current = resetOnLeave;
  useEffect(
    () => () => {
      if (resetRef.current) setSourceRef.current('standard');
    },
    []
  );
  const start = () => {
    if (!isRunning && drums.soundSource !== 'drum') drums.setSoundSource('drum');
    toggle();
  };

  // Playhead (the engine reports every step at the time it sounds).
  useEffect(() => drums.subscribeStep(setHead), [drums.subscribeStep]); // eslint-disable-line react-hooks/exhaustive-deps
  const playing = isRunning && drums.drumsActive;
  useEffect(() => {
    if (!playing) setHead(null);
  }, [playing]);

  const { draft, setDraft, userPatterns, setUserPatterns, styleKey, setStyleKey } = drums;
  const editing = !!draft;
  const pattern = drums.pattern;
  const spb = pattern.stepsPerBeat;
  const beats = editing ? draft.cell.length : pattern.cell.length;
  const steps = beats * spb;
  // A draft follows the time signature (one bar).
  useEffect(() => {
    if (draft && draft.cell.length !== beatsPerMeasure) setDraft(changeBeats(draft, beatsPerMeasure));
  }, [beatsPerMeasure]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = editing || showKit ? DRUM_INSTRUMENTS.map((i) => i.key) : usedInstruments(pattern);
  const editedUser = isUserKey(styleKey) ? userPatterns.find((p) => USER_PREFIX + p.id === styleKey) : null;
  const myBeat = t('drums.myBeat');

  const beginEdit = (from) => {
    const d = from ?? draftFrom(pattern, beatsPerMeasure);
    setName(d.name || nextName(userPatterns, myBeat));
    setDraft(d);
    return d;
  };
  const tapCell = (instrument, b, s) => {
    const d = draft ?? beginEdit();
    const v = d.cell[b]?.[s]?.[instrument] ?? 0;
    setDraft(setHit(d, b, s, instrument, nextVelocity(v)));
  };
  const save = () => {
    if (!draft) return;
    const { list, saved } = upsertPattern(userPatterns, draft, name || nextName(userPatterns, myBeat));
    setUserPatterns(list);
    setStyleKey(USER_PREFIX + saved.id);
    setDraft(null);
  };
  const remove = () => {
    if (!editedUser) return;
    setUserPatterns(removePattern(userPatterns, editedUser.id));
    setStyleKey('rock');
    setDraft(null);
  };

  const headCol = head && head.role < beats && head.step < spb ? head.role * spb + head.step : -1;
  const canFill = !!pattern.fill;

  return (
    <div className="metronome mw drum-machine">
      <div className="dm" dir="ltr">
        <div className="dm-head">
          <span className="dm-brand">DudeStar</span>
          <span className="dm-model">RHYTHM COMPOSER DR-8</span>
          <span className={'dm-led' + (playing ? ' is-on' : '')} aria-hidden="true" />
        </div>
        <div className="dm-strip" aria-hidden="true" />

        <div className="dm-top">
          <div className="dm-display">
            <BpmField value={bpm} onChange={setBpm} min={minBpm} max={maxBpm} labels={bpmLabels} className="dm-bpm" />
            <span className="dm-unit">BPM</span>
          </div>
          <div className="dm-lcds">
            <label className="dm-lcd">
              <span className="dm-lbl">{t('metronome.style')}</span>
              <select
                className="dm-select"
                value={styleKey}
                disabled={editing}
                onChange={(e) => {
                  setStyleKey(e.target.value);
                  setShowKit(false);
                }}
              >
                <optgroup label={t('drums.builtIn')}>
                  {drums.styleOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {t(`metronome.style.${opt.key}`)}
                    </option>
                  ))}
                </optgroup>
                {userPatterns.length > 0 && (
                  <optgroup label={t('drums.mine')}>
                    {userPatterns.map((p) => (
                      <option key={p.id} value={USER_PREFIX + p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
            <label className="dm-lcd dm-lcd-small">
              <span className="dm-lbl">{t('metronome.timeSignature')}</span>
              <select className="dm-select" value={beatsPerMeasure} onChange={(e) => setBeatsPerMeasure(Number(e.target.value))}>
                {TIME_SIGNATURES.map((ts) => (
                  <option key={ts.beats} value={ts.beats}>
                    {ts.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Edit bar: name, grid, and the actions — or, when not editing, the
            ways in (Edit / New) + Kit (show every drum) + Fills. */}
        {editing ? (
          <div className="dm-editbar">
            <label className="dm-lcd dm-grow">
              <span className="dm-lbl">{t('drums.name')}</span>
              <input className="dm-select dm-name" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} dir="auto" />
            </label>
            <label className="dm-lcd dm-lcd-small">
              <span className="dm-lbl">{t('drums.grid')}</span>
              <select className="dm-select" value={draft.stepsPerBeat} onChange={(e) => setDraft(changeResolution(draft, Number(e.target.value)))}>
                {RESOLUTIONS.map((r) => (
                  <option key={r.key} value={r.key}>
                    {t(r.labelKey)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div className="dm-keys dm-keys-4">
            <button type="button" className="dm-key" onClick={() => beginEdit()}>
              {t('drums.edit')}
            </button>
            <button type="button" className="dm-key" onClick={() => beginEdit(blankPattern(beatsPerMeasure, 4))}>
              {t('drums.new')}
            </button>
            <button type="button" className={'dm-key is-latch' + (showKit ? ' is-active' : '')} aria-pressed={showKit} onClick={() => setShowKit(!showKit)}>
              {t('drums.kit')}
            </button>
            <span className="dm-fills">
              <button
                type="button"
                className={'dm-key is-latch' + (drums.fillsEnabled && canFill ? ' is-active' : '')}
                aria-pressed={drums.fillsEnabled}
                disabled={!canFill}
                onClick={() => drums.setFillsEnabled(!drums.fillsEnabled)}
              >
                {t('metronome.fillsKey')}
              </button>
              <InfoTooltip text={t('tip.tools.drumFills')} />
            </span>
          </div>
        )}

        {/* The sequencer */}
        <div className="dm-seq-wrap">
          <div className="dm-seq" style={{ '--steps': steps }}>
            <span className="dm-seq-corner" />
            {Array.from({ length: steps }, (_, c) => (
              <span key={c} className={'dm-seq-num' + (c % spb === 0 ? ' is-beat' : '') + (c === headCol ? ' is-head' : '')}>
                {c % spb === 0 ? c / spb + 1 : ''}
              </span>
            ))}
            {rows.map((inst) => {
              const src = editing ? draft : pattern;
              return [
                <button
                  key={inst + '-l'}
                  type="button"
                  className={'dm-row-name g-' + GROUP_OF[inst] + (hitRow === inst ? ' is-hit' : '')}
                  onClick={() => audition(inst)}
                  title={t('drums.rowListen')}
                >
                  {t(`drums.inst.${inst}`)}
                </button>,
                ...Array.from({ length: steps }, (_, c) => {
                  const b = Math.floor(c / spb);
                  const s = c % spb;
                  const v = src.cell[b % src.cell.length]?.[s]?.[inst] ?? 0;
                  return (
                    <button
                      key={inst + c}
                      type="button"
                      className={
                        'dm-cell g-' +
                        GROUP_OF[inst] +
                        (v > 0.7 ? ' is-on' : v > 0 ? ' is-soft' : '') +
                        (s === 0 ? ' is-beat' : '') +
                        (c === headCol ? ' is-head' : '')
                      }
                      aria-label={`${t(`drums.inst.${inst}`)} ${b + 1}.${s + 1}`}
                      aria-pressed={v > 0}
                      onClick={() => tapCell(inst, b, s)}
                    />
                  );
                }),
              ];
            })}
          </div>
          {rows.length === 0 && <p className="dm-empty">{t('drums.empty')}</p>}
        </div>

        {editing && (
          <>
            <p className="dm-hint">{t('drums.editHint')}</p>
            <div className="dm-keys dm-keys-4">
              <button type="button" className="dm-key dm-save" onClick={save} disabled={!hasHits(draft)}>
                {t('drums.save')}
              </button>
              <button type="button" className="dm-key" onClick={() => setDraft(clearPattern(draft))}>
                {t('drums.clear')}
              </button>
              <button type="button" className="dm-key" onClick={() => setDraft(null)}>
                {t('drums.cancel')}
              </button>
              <button type="button" className="dm-key dm-danger" onClick={remove} disabled={!editedUser || draft.id !== editedUser.id}>
                {t('drums.delete')}
              </button>
            </div>
          </>
        )}

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

        <VolumeRow className="dm-volume" volume={volume} setVolume={setVolume} isMuted={isMuted} toggleMute={toggleMute} />

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
