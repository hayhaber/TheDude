import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { BpmField } from './BpmField';
import { TIME_SIGNATURES } from './Metronome';
import { Select } from '../ui/Select';
import { Button, ControlRow, PlayGlyph, Segmented, SpeakerGlyph, Switch } from '../ui/controls';
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
import { DRUM_KITS, drumKit, loadDrumKit, onDrumKitChange, setDrumKit } from '../../audio/drumSamples';
import './DrumMachine.css';

const MIXER_CHANNELS = [
  { key: 'kick', group: 'kick', labelKey: 'drums.mix.kick' },
  { key: 'snare', group: 'drums', labelKey: 'drums.mix.snare' },
  { key: 'hihat', group: 'cymbals', labelKey: 'drums.mix.hihat' },
  { key: 'perc', group: 'perc', labelKey: 'drums.mix.perc' },
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
  // the drum sound (a recorded kit or the synth one) — device setting
  const [kit, setKit] = useState(drumKit);
  useEffect(() => {
    loadDrumKit();
    return onDrumKitChange(setKit);
  }, []);
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

  const kitOn = showKit && !editing;
  const curBeat = head && head.role < beats ? head.role : -1;
  const mixOpenKey = 'dudestar-dm-mixer-open';
  const [mixOpen, setMixOpen] = useState(() => {
    try {
      return localStorage.getItem(mixOpenKey) === '1';
    } catch {
      return false;
    }
  });
  const toggleMix = () => {
    const v = !mixOpen;
    setMixOpen(v);
    try {
      localStorage.setItem(mixOpenKey, v ? '1' : '0');
    } catch {
      /* private mode */
    }
  };

  return (
    <div className="drum-machine dmx">
      {/* Tempo: the number big, − + beside it, Tap, and a dot per beat. */}
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
          {Array.from({ length: beats }, (_, i) => (
            <span key={i} className={'dmx-beat' + (i === curBeat ? ' is-now' : '') + (i === 0 ? ' is-one' : '')} />
          ))}
        </div>
      </section>

      {/* What plays: style, sound, time, fills. */}
      <section className="dmx-group">
        <ControlRow label={t('metronome.style')}>
          <Select
            value={styleKey}
            disabled={editing}
            aria-label={t('metronome.style')}
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
          </Select>
        </ControlRow>
        <ControlRow label={t('drums.sound')}>
          <Select value={kit} aria-label={t('drums.sound')} onChange={(e) => setDrumKit(e.target.value)}>
            {DRUM_KITS.map((k) => (
              <option key={k} value={k}>
                {t('drums.kitSound.' + k)}
              </option>
            ))}
          </Select>
        </ControlRow>
        <ControlRow label={t('drums.meter')}>
          <Select value={beatsPerMeasure} aria-label={t('metronome.timeSignature')} onChange={(e) => setBeatsPerMeasure(Number(e.target.value))}>
            {TIME_SIGNATURES.map((ts) => (
              <option key={ts.beats} value={ts.beats}>
                {ts.label}
              </option>
            ))}
          </Select>
        </ControlRow>
        <ControlRow
          label={
            <span className="dmx-label-tip">
              {t('metronome.fillsKey')}
              <InfoTooltip text={t('tip.tools.drumFills')} />
            </span>
          }
        >
          <Switch
            checked={drums.fillsEnabled && canFill}
            disabled={!canFill || editing}
            onChange={(v) => drums.setFillsEnabled(v)}
            aria-label={t('metronome.fillsKey')}
          />
        </ControlRow>
      </section>

      {/* The pattern: a beat sequencer. */}
      <section className="dmx-card dmx-pattern">
        {editing ? (
          <div className="dmx-pattern-head is-edit">
            <input
              className="dmx-name"
              value={name}
              maxLength={28}
              onChange={(e) => setName(e.target.value)}
              dir="auto"
              aria-label={t('drums.name')}
              placeholder={t('drums.name')}
            />
            <Select value={draft.stepsPerBeat} aria-label={t('drums.grid')} onChange={(e) => setDraft(changeResolution(draft, Number(e.target.value)))}>
              {RESOLUTIONS.map((r) => (
                <option key={r.key} value={r.key}>
                  {t(r.labelKey)}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div className="dmx-pattern-head">
            <Segmented
              className="dmx-seg"
              ariaLabel={t('drums.pattern')}
              value={kitOn ? 'all' : 'used'}
              onChange={(v) => setShowKit(v === 'all')}
              options={[
                { value: 'used', label: t('drums.used') },
                { value: 'all', label: t('drums.all') },
              ]}
            />
            <span className="dmx-head-actions">
              <Button variant="plain" size="sm" onClick={() => beginEdit()}>
                {t('drums.edit')}
              </Button>
              <Button variant="plain" size="sm" onClick={() => beginEdit(blankPattern(beatsPerMeasure, 4))}>
                {t('drums.new')}
              </Button>
            </span>
          </div>
        )}

        <div className="dmx-seq-wrap" dir="ltr">
          <div className="dmx-seq" style={{ '--steps': steps }}>
            <span className="dmx-seq-corner" />
            {Array.from({ length: steps }, (_, c) => (
              <span key={c} className={'dmx-seq-num' + (c % spb === 0 ? ' is-beat' : '') + (c === headCol ? ' is-head' : '')}>
                {c % spb === 0 ? c / spb + 1 : ''}
              </span>
            ))}
            {rows.map((inst) => {
              const src = editing ? draft : pattern;
              return [
                <button
                  key={inst + '-l'}
                  type="button"
                  className={'dmx-row-name g-' + GROUP_OF[inst] + (hitRow === inst ? ' is-hit' : '')}
                  onClick={() => audition(inst)}
                  title={t('drums.rowListen')}
                  dir="auto"
                >
                  <i aria-hidden="true" />
                  <span>{t(`drums.inst.${inst}`)}</span>
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
                        'dmx-cell g-' +
                        GROUP_OF[inst] +
                        (v > 0.7 ? ' is-on' : v > 0 ? ' is-soft' : '') +
                        (b % 2 ? ' is-alt' : '') +
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
          {rows.length === 0 && <p className="dmx-note">{t('drums.empty')}</p>}
        </div>

        {editing && (
          <>
            <p className="dmx-note">{t('drums.editHint')}</p>
            <div className="dmx-edit-actions">
              <Button variant="plain" danger onClick={remove} disabled={!editedUser || draft.id !== editedUser.id}>
                {t('drums.delete')}
              </Button>
              <span className="dmx-grow" />
              <Button variant="gray" onClick={() => setDraft(clearPattern(draft))}>
                {t('drums.clear')}
              </Button>
              <Button variant="gray" onClick={() => setDraft(null)}>
                {t('drums.cancel')}
              </Button>
              <Button variant="tinted" onClick={save} disabled={!hasHits(draft)}>
                {t('drums.save')}
              </Button>
            </div>
          </>
        )}
      </section>

      {/* Levels: the master volume always; the four channels folded. */}
      <section className="dmx-group">
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
        <button type="button" className="ui-row dmx-disclose" aria-expanded={mixOpen} onClick={toggleMix}>
          <span className="ui-row-label">{t('drums.mixer')}</span>
          <svg className="dmx-chev" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {mixOpen &&
          MIXER_CHANNELS.map((ch) => {
            const muted = !!drums.mutes[ch.key];
            return (
              <div className="ui-row dmx-level dmx-ch" key={ch.key}>
                <span className={'dmx-ch-name g-' + ch.group}>{t(ch.labelKey)}</span>
                <input
                  type="range"
                  className="ui-slider dmx-slider"
                  min={0}
                  max={100}
                  value={muted ? 0 : drums.mix[ch.key]}
                  onChange={(e) => drums.setMixValue(ch.key, e.target.value)}
                  style={{ '--fill': `${muted ? 0 : drums.mix[ch.key]}%` }}
                  aria-label={t('metronome.channelVolume', { channel: t(ch.labelKey) })}
                />
                <button
                  type="button"
                  className={'dmx-speaker' + (muted ? ' is-muted' : '')}
                  onClick={() => drums.toggleInstrumentMute(ch.key)}
                  aria-pressed={muted}
                  aria-label={muted ? t('metronome.unmuteChannel', { channel: t(ch.labelKey) }) : t('metronome.muteChannel', { channel: t(ch.labelKey) })}
                >
                  <SpeakerGlyph off={muted} />
                </button>
              </div>
            );
          })}
      </section>

      <Button variant={isRunning ? 'gray' : 'filled'} size="lg" danger={isRunning} className="dmx-start" onClick={start} icon={isRunning ? <StopGlyph /> : <PlayGlyph size={15} />}>
        {(isRunning ? t('metronome.stop') : t('metronome.start')).replace(/^[▶■⏹◼]\uFE0F?\s*/u, '')}
      </Button>
    </div>
  );
}

function StopGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="2.5" fill="currentColor" />
    </svg>
  );
}
