import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { Knob } from './Knob';
import { LedMeter } from './LedMeter';
import { Nameplate } from './Nameplate';
import { ToggleSwitch } from './ToggleSwitch';
import { ChannelSwitch } from './ChannelSwitch';
import { TIPS_AMP } from '../../i18n/tips/amp';
import {
  AMP_KNOBS,
  BUILTIN_PRESETS,
  PEDALS,
  applyPreset,
  headphonesConfirmed,
  loadCurrentSettings,
  loadUserPresets,
  sameSound,
  saveCurrentSettings,
  saveUserPresets,
  setHeadphonesConfirmed,
} from '../../audio/amp/ampSettings';
import { createLiveContext, estimateLatency, openLiveInput } from '../../audio/amp/liveInput';
import { createAmpEngine } from '../../audio/amp/ampEngine';
import { prepareAudioOutput } from '../../audio/audioContext';
import './AmpView.css';

const AMP_FACE = ['gate', ...AMP_KNOBS];

// Text printed on the hardware (amp panel, pedal enclosures) is English in
// both languages, like on real gear; accessible names stay localized.
const EN = TIPS_AMP.en;
const engraved = (key) => EN[key] ?? key;

/**
 * The virtual amp (Tools card -> Amp): the Settings input through gate,
 * pedals, amp, cabinet and effects to the headphones. Off until Power;
 * leaving the screen turns it off (mic closed, context closed).
 */
export function AmpView() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState(loadCurrentSettings);
  const [userPresets, setUserPresets] = useState(loadUserPresets);
  const [presetId, setPresetId] = useState(() => {
    try {
      return localStorage.getItem('amp-preset-id') || '';
    } catch {
      return '';
    }
  });
  const [power, setPower] = useState('off'); // off | starting | on
  const [error, setError] = useState(null);
  const [phonesOk, setPhonesOk] = useState(headphonesConfirmed);
  const [muted, setMuted] = useState(false);
  const [latency, setLatency] = useState(null);
  const [inputName, setInputName] = useState('');
  const [noGate, setNoGate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const rig = useRef(null); // { ctx, input, engine }
  const startToken = useRef(0);
  const inMeterRef = useRef(null);
  const outMeterRef = useRef(null);

  const monitor = phonesOk && !muted;

  // ---- power ---------------------------------------------------------------
  const stop = useCallback(() => {
    startToken.current += 1;
    const r = rig.current;
    rig.current = null;
    if (r) {
      r.engine?.dispose();
      r.input?.close();
      r.ctx.close().catch(() => {});
    }
    setPower('off');
    setLatency(null);
  }, []);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const monitorRef = useRef(monitor);
  monitorRef.current = monitor;

  const start = useCallback(async () => {
    const token = ++startToken.current;
    setError(null);
    setPower('starting');
    // In the tap: our own context, plus the shared one's iOS session nudge.
    const ctx = createLiveContext();
    ctx.resume().catch(() => {});
    prepareAudioOutput();
    const r = { ctx, input: null, engine: null };
    rig.current = r;
    try {
      r.input = await openLiveInput(ctx);
      if (token !== startToken.current) throw new Error('cancelled');
      r.engine = await createAmpEngine(ctx, r.input.input, settingsRef.current, { monitor: monitorRef.current });
      if (token !== startToken.current) throw new Error('cancelled');
      if (ctx.state !== 'running') await ctx.resume();
      setInputName(r.input.label);
      setNoGate(!r.engine.hasGate);
      setPower('on');
    } catch (e) {
      r.engine?.dispose();
      r.input?.close();
      ctx.close().catch(() => {});
      if (rig.current === r) rig.current = null;
      if (token === startToken.current) {
        setPower('off');
        setError(e?.message || String(e));
      }
    }
  }, []);

  // Leaving the screen: everything off.
  useEffect(() => stop, [stop]);

  // ---- live updates --------------------------------------------------------
  useEffect(() => {
    rig.current?.engine?.update(settings);
    const id = setTimeout(() => saveCurrentSettings(settings), 250);
    return () => clearTimeout(id);
  }, [settings]);

  useEffect(() => {
    rig.current?.engine?.setMonitor(monitor);
  }, [monitor, power]);

  useEffect(() => {
    try {
      localStorage.setItem('amp-preset-id', presetId);
    } catch {
      /* ignore */
    }
  }, [presetId]);

  // Meters (straight to the DOM, no re-render) + latency once a second.
  useEffect(() => {
    if (power !== 'on') return undefined;
    let raf = 0;
    let last = 0;
    const tick = (ts) => {
      const r = rig.current;
      if (r?.engine) {
        inMeterRef.current?.(r.engine.inputLevel());
        outMeterRef.current?.(r.engine.outputLevel());
        if (ts - last > 1000) {
          last = ts;
          const l = estimateLatency(r.ctx, r.input?.inputLatency);
          setLatency((prev) => (prev && Math.abs(prev.total - l.total) < 0.0005 ? prev : l));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      inMeterRef.current?.(null);
      outMeterRef.current?.(null);
    };
  }, [power]);

  // ---- settings helpers ----------------------------------------------------
  const setAmp = (k, v) =>
    setSettings((s) => (k === 'gate' ? { ...s, gate: v } : { ...s, amp: { ...s.amp, [k]: v } }));
  const setPedal = (id, k, v) =>
    setSettings((s) => ({ ...s, pedals: { ...s.pedals, [id]: { ...s.pedals[id], [k]: v } } }));

  const allPresets = useMemo(
    () => [
      ...BUILTIN_PRESETS.map((p) => ({ key: `b:${p.id}`, name: t(`amp.preset.${p.id}`), settings: p.settings, builtin: true })),
      ...userPresets.map((p) => ({ key: `u:${p.id}`, name: p.name, settings: p.settings, builtin: false, id: p.id })),
    ],
    [userPresets, t]
  );
  const current = allPresets.find((p) => p.key === presetId) || null;
  const edited = current ? !sameSound(current.settings, settings) : false;

  const choosePreset = (key) => {
    setConfirmDelete(false);
    setSaving(false);
    const p = allPresets.find((x) => x.key === key);
    setPresetId(key);
    if (p) setSettings((s) => applyPreset(s, p.settings));
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const existing = userPresets.find((p) => p.name.toLowerCase() === name.toLowerCase());
    const id = existing?.id ?? `p${Date.now().toString(36)}`;
    const entry = { id, name, settings: { ...settings, amp: { ...settings.amp } } };
    const list = existing ? userPresets.map((p) => (p.id === id ? entry : p)) : [...userPresets, entry];
    setUserPresets(list);
    saveUserPresets(list);
    setPresetId(`u:${id}`);
    setSaving(false);
    setPresetName('');
  };

  const deletePreset = () => {
    if (!current || current.builtin) return;
    const list = userPresets.filter((p) => p.id !== current.id);
    setUserPresets(list);
    saveUserPresets(list);
    setPresetId('');
    setConfirmDelete(false);
  };

  const confirmPhones = () => {
    setHeadphonesConfirmed(true);
    setPhonesOk(true);
    setMuted(false);
  };

  const isOn = power === 'on';
  const statusText = t(isOn ? 'amp.statusOn' : power === 'starting' ? 'amp.statusStarting' : 'amp.statusOff');

  return (
    <div className={`amp-view voicing-${settings.voicing}` + (isOn ? ' is-on' : '')}>
      <p className="amp-warn" role="note">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M4 14v-2a8 8 0 0 1 16 0v2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="3" y="13" width="4.5" height="7" rx="1.6" fill="currentColor" />
          <rect x="16.5" y="13" width="4.5" height="7" rx="1.6" fill="currentColor" />
        </svg>
        <span>{t('amp.warn')}</span>
      </p>

      {!phonesOk && (
        <div className="amp-callout" role="status">
          <span>{t('amp.muted')}</span>
          <button type="button" className="amp-btn amp-btn-primary" onClick={confirmPhones}>
            {t('amp.confirm')}
          </button>
        </div>
      )}

      {/* Presets */}
      <section className="amp-presets">
        <label className="amp-field">
          <span>{t('amp.preset')}</span>
          <select value={current ? presetId : ''} onChange={(e) => choosePreset(e.target.value)}>
            {!current && <option value="">{t('amp.custom')}</option>}
            <optgroup label={t('amp.presetsBuiltin')}>
              {allPresets
                .filter((p) => p.builtin)
                .map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
            </optgroup>
            {userPresets.length > 0 && (
              <optgroup label={t('amp.presetsMine')}>
                {allPresets
                  .filter((p) => !p.builtin)
                  .map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </label>
        {edited && <span className="amp-badge">{t('amp.edited')}</span>}
        <div className="amp-preset-actions">
          {saving ? (
            <form
              className="amp-save-form"
              onSubmit={(e) => {
                e.preventDefault();
                savePreset();
              }}
            >
              <input
                type="text"
                autoFocus
                maxLength={40}
                placeholder={t('amp.presetName')}
                aria-label={t('amp.presetName')}
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    setSaving(false);
                  }
                }}
              />
              <button type="submit" className="amp-btn amp-btn-primary" disabled={!presetName.trim()}>
                {t('amp.save')}
              </button>
              <button type="button" className="amp-btn" onClick={() => setSaving(false)}>
                {t('amp.cancel')}
              </button>
            </form>
          ) : confirmDelete && current && !current.builtin ? (
            <div className="amp-save-form" role="group">
              <span className="amp-confirm-q">{t('amp.deleteQ', { name: current.name })}</span>
              <button type="button" className="amp-btn amp-btn-danger" onClick={deletePreset}>
                {t('amp.delete')}
              </button>
              <button type="button" className="amp-btn" onClick={() => setConfirmDelete(false)}>
                {t('amp.cancel')}
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="amp-btn"
                onClick={() => {
                  setPresetName(current && !current.builtin ? current.name : '');
                  setSaving(true);
                }}
              >
                {t('amp.save')}
              </button>
              {current && !current.builtin && (
                <button type="button" className="amp-btn" onClick={() => setConfirmDelete(true)}>
                  {t('amp.delete')}
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {/* The amp: tolex cabinet, brushed control panel, grille cloth */}
      <section className="amp-rig" aria-label={t('amp.title')}>
        <div className="amp-handle" aria-hidden="true" />
        <div className="amp-cab" dir="ltr">
          <div className="amp-face">
            <span className="amp-screw s-tl" aria-hidden="true" />
            <span className="amp-screw s-tr" aria-hidden="true" />
            <span className="amp-screw s-bl" aria-hidden="true" />
            <span className="amp-screw s-br" aria-hidden="true" />

            <div className="amp-panel-input">
              <div className="amp-jack-block" title={inputName ? t('amp.input', { name: inputName }) : undefined}>
                <span className="amp-jack" aria-hidden="true">
                  <span className="amp-jack-hole" />
                </span>
                <span className="amp-engrave">INPUT</span>
              </div>
              <ChannelSwitch
                value={settings.voicing}
                onChange={(voicing) => setSettings((st) => ({ ...st, voicing }))}
              />
            </div>

            <div className="amp-knobs">
              {AMP_FACE.map((k) => (
                <Knob
                  key={k}
                  variant="amp"
                  label={t(`amp.knob.${k}`)}
                  caption={engraved(`amp.knob.${k}`)}
                  value={k === 'gate' ? settings.gate : settings.amp[k]}
                  onChange={(v) => setAmp(k, v)}
                  hint={t('amp.knobHint')}
                  tip={k === 'gate' ? <InfoTooltip text={t('amp.tip.gate')} /> : undefined}
                />
              ))}
            </div>

            <div className="amp-panel-power">
              <div className="amp-switches">
                <div className="amp-jewel-block">
                  <span className={'amp-jewel' + (isOn ? ' is-on' : '') + (power === 'starting' ? ' is-starting' : '')} aria-hidden="true">
                    <span className="amp-jewel-glass" />
                  </span>
                  <span className="amp-engrave">PILOT</span>
                </div>
                <ToggleSwitch
                  className={'amp-mute' + (muted ? ' is-active' : '')}
                  caption="STANDBY"
                  up={phonesOk && !muted}
                  pressed={phonesOk ? muted : undefined}
                  label={t('amp.mute')}
                  disabled={!phonesOk}
                  onClick={() => setMuted((m) => !m)}
                />
                <ToggleSwitch
                  className={'amp-power' + (isOn ? ' is-on' : '') + (power === 'starting' ? ' is-starting' : '')}
                  caption="POWER"
                  up={power !== 'off'}
                  pressed={isOn}
                  busy={power === 'starting'}
                  label={t('amp.power')}
                  onClick={() => (power === 'off' ? start() : stop())}
                />
              </div>
              <div className="amp-meters">
                <LedMeter label="IN" bind={inMeterRef} />
                <LedMeter label="OUT" bind={outMeterRef} />
              </div>
              <div className="amp-status">
                <span className="amp-visually-hidden" role="status">
                  {t('amp.title')}: {statusText}
                </span>
                <span className="amp-status-latency" dir="auto">
                  <span>{t('amp.latencyLabel')}</span>{' '}
                  <b
                    dir="ltr"
                    title={
                      latency
                        ? `in ${Math.round(latency.input * 1000)} · buffer ${Math.round(latency.base * 1000)} · out ${Math.round(latency.output * 1000)} ms`
                        : undefined
                    }
                  >
                    {latency ? t('amp.latency', { ms: Math.round(latency.total * 1000) }) : '—'}
                  </b>
                  <InfoTooltip text={t('amp.tip.latency')} />
                </span>
              </div>
            </div>
          </div>

          <div className="amp-grille" aria-hidden="true">
            <Nameplate />
          </div>
        </div>
      </section>

      {error && (
        <p className="amp-error" role="alert">
          {t('amp.errMic', { msg: error })}
        </p>
      )}
      {isOn && noGate && <p className="amp-hint">{t('amp.noGate')}</p>}
      {isOn && inputName && <p className="amp-hint amp-input-name">{t('amp.input', { name: inputName })}</p>}

      {/* Pedal board (signal order, always left to right) */}
      <section className="amp-board">
        <h2 className="amp-board-title">{t('amp.pedals')}</h2>
        <div className="amp-board-surface" dir="ltr">
          <div className="amp-pedals">
            {PEDALS.map((p) => {
              const st = settings.pedals[p.id];
              const name = t(`amp.pedal.${p.id}`);
              return (
                <div key={p.id} className={`amp-pedal pedal-${p.id}` + (st.on ? ' is-on' : '')} role="group" aria-label={name}>
                  <span className="amp-pedal-jack j-in" aria-hidden="true" />
                  <span className="amp-pedal-jack j-out" aria-hidden="true" />
                  <span className="amp-pedal-led" aria-hidden="true" />
                  <div className={`amp-pedal-knobs n${p.knobs.length}`}>
                    {p.knobs.map((k) => (
                      <Knob
                        key={k}
                        variant="pedal"
                        label={`${name} ${t(`amp.pk.${k}`)}`}
                        caption={engraved(`amp.pk.${k}`)}
                        value={st[k]}
                        onChange={(v) => setPedal(p.id, k, v)}
                        hint={t('amp.knobHint')}
                      />
                    ))}
                  </div>
                  <div className="amp-pedal-print" aria-hidden="true">
                    <span className="amp-pedal-name">{engraved(`amp.pedal.${p.id}`)}</span>
                    <span className="amp-pedal-brand">DudeStar</span>
                  </div>
                  <button
                    type="button"
                    className="amp-pedal-switch"
                    aria-pressed={st.on}
                    aria-label={t('amp.pedalOn', { name })}
                    onClick={() => setPedal(p.id, 'on', !st.on)}
                  >
                    <span className="amp-pedal-stomp" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
