import { useRef, useState } from 'react';
import * as P from '../../audio/studio/project';
import { MP3_KBPS, MP3_DEFAULT_KBPS } from '../../audio/studio/mp3';
import { DRUM_STYLE_OPTIONS } from '../../music/drumPatterns';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { usePlayhead } from './useStudio';

// The studio's controls under the timeline. Every new button is one word;
// every choice of more than two is a <select> (house rules).

/** The engraved head of a rack unit: status LED, name (+ ⓘ), model plate. */
export function RackHead({ name, tip, model, led, tag = 'h3' }) {
  const H = tag;
  return (
    <div className="rk-head">
      <span className={'rk-led' + (led ? ' is-on' : '')} aria-hidden="true" />
      <H className="rk-name" dir="auto">
        {name}
        {tip && <InfoTooltip text={tip} />}
      </H>
      <span className="rk-model" aria-hidden="true">
        {model}
      </span>
    </div>
  );
}

function Toggle({ on, onClick, children, disabled, title }) {
  return (
    <button type="button" className={'st-toggle' + (on ? ' is-on' : '')} aria-pressed={!!on} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

const FADES = [0.008, 0.1, 0.5, 1.5];

export function SongBar({ t, studio }) {
  const { project, projects, phase } = studio;
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirm, setConfirm] = useState(false);
  const idle = phase === 'idle';
  if (!project) return null;
  const list = projects.some((p) => p.id === project.id) ? projects : [project, ...projects];
  return (
    <div className="st-songbar">
      {renaming ? (
        <form
          className="st-rename"
          onSubmit={(e) => {
            e.preventDefault();
            setRenaming(false);
            studio.renameSong(draft.slice(0, 40));
          }}
        >
          <input autoFocus value={draft} maxLength={40} aria-label={t('rec.rename')} onChange={(e) => setDraft(e.target.value)} />
          <button type="submit" className="amp-btn amp-btn-primary">
            {t('rec.save')}
          </button>
          <button type="button" className="amp-btn" onClick={() => setRenaming(false)}>
            {t('rec.cancel')}
          </button>
        </form>
      ) : (
        <label className="st-song">
          <span className="st-label">{t('rec.song')}</span>
          <select value={project.id} disabled={!idle} onChange={(e) => studio.selectSong(e.target.value)} dir="auto">
            {list.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {!renaming && (
        <div className="st-btns">
          {confirm ? (
            <>
              <span className="rec-confirm-q">{t('rec.deleteSongQ')}</span>
              <button
                type="button"
                className="amp-btn amp-btn-danger"
                onClick={() => {
                  setConfirm(false);
                  studio.deleteSong();
                }}
              >
                {t('rec.delete')}
              </button>
              <button type="button" className="amp-btn" onClick={() => setConfirm(false)}>
                {t('rec.cancel')}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="amp-btn" disabled={!idle} onClick={studio.newSong}>
                {t('rec.new')}
              </button>
              <button
                type="button"
                className="amp-btn"
                disabled={!idle}
                onClick={() => {
                  setDraft(project.name);
                  setRenaming(true);
                }}
              >
                {t('rec.rename')}
              </button>
              <button type="button" className="amp-btn" disabled={!idle} onClick={() => setConfirm(true)}>
                {t('rec.delete')}
              </button>
              <span className="st-sep" aria-hidden="true" />
              <button type="button" className="amp-btn st-histbtn" disabled={!studio.canUndo || !idle} onClick={studio.undo} title="Ctrl+Z" aria-label={t('rec.undo')}>
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="st-histtext">{t('rec.undo')}</span>
              </button>
              <button type="button" className="amp-btn st-histbtn" disabled={!studio.canRedo || !idle} onClick={studio.redo} title="Ctrl+Shift+Z" aria-label={t('rec.redo')}>
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="st-histtext">{t('rec.redo')}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Tools for the selected region. */
export function RegionTools({ t, studio }) {
  const { project, selection, phase } = studio;
  const { position } = usePlayhead(studio.positionStore);
  const f = project && selection ? P.findRegion(project, selection) : null;
  if (!f) return null;
  const r = f.region;
  const idle = phase === 'idle' || phase === 'playing';
  const canSplit = position > r.start + P.MIN_REGION && position < P.regionEnd(r) - P.MIN_REGION;
  const normalized = Math.abs((r.gain ?? 1) - 1) > 0.01;
  const nearest = (v) => FADES.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a), FADES[0]);

  const normalize = () => {
    if (normalized) {
      studio.update((p) => P.setRegion(p, r.id, { gain: 1 }));
      return;
    }
    const buf = studio.engine.buffers.get(r.takeId);
    if (!buf) return;
    const a = Math.floor(r.offset * buf.sampleRate);
    const b = Math.min(buf.length, Math.ceil((r.offset + r.length) * buf.sampleRate));
    let peak = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = a; i < b; i++) {
        const v = d[i] < 0 ? -d[i] : d[i];
        if (v > peak) peak = v;
      }
    }
    if (peak < 1e-4) return;
    studio.update((p) => P.setRegion(p, r.id, { gain: Math.min(16, 0.98 / peak) }));
  };

  return (
    <div className="st-region-tools" role="toolbar" aria-label={t('rec.regionTools')}>
      <span className="st-edit-plate" aria-hidden="true">
        EDIT
      </span>
      <button
        type="button"
        className="amp-btn"
        disabled={!idle || !canSplit}
        onClick={() => {
          let rightId = null;
          studio.update((p) => {
            const res = P.splitAt(p, r.id, position);
            rightId = res.rightId;
            return res.project;
          });
          if (rightId) studio.setSelection(rightId);
        }}
        title={t('rec.splitHint')}
      >
        {t('rec.split')}
      </button>
      <Toggle on={normalized} onClick={normalize} disabled={!idle} title={t('rec.normalizeHint')}>
        {t('rec.normalize')}
      </Toggle>
      <label className="st-field">
        <span className="st-label">{t('rec.fadeIn')}</span>
        <select value={nearest(r.fadeIn ?? 0.008)} disabled={!idle} onChange={(e) => studio.update((p) => P.setRegion(p, r.id, { fadeIn: Math.min(Number(e.target.value), r.length / 2) }))}>
          {FADES.map((v, i) => (
            <option key={v} value={v}>
              {t(`rec.fade${i}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="st-field">
        <span className="st-label">{t('rec.fadeOut')}</span>
        <select value={nearest(r.fadeOut ?? 0.008)} disabled={!idle} onChange={(e) => studio.update((p) => P.setRegion(p, r.id, { fadeOut: Math.min(Number(e.target.value), r.length / 2) }))}>
          {FADES.map((v, i) => (
            <option key={v} value={v}>
              {t(`rec.fade${i}`)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="amp-btn amp-btn-danger"
        disabled={!idle}
        onClick={() => {
          studio.setSelection(null);
          studio.update((p) => P.deleteRegion(p, r.id));
        }}
      >
        {t('rec.delete')}
      </button>
      <button type="button" className="st-close" aria-label={t('rec.cancel')} onClick={() => studio.setSelection(null)}>
        ×
      </button>
    </div>
  );
}

export function RangePanel({ t, studio }) {
  const { project, phase, prefs, setPrefs } = studio;
  const { position } = usePlayhead(studio.positionStore);
  if (!project) return null;
  const idle = phase === 'idle' || phase === 'playing';
  const r = project.range;
  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  const setIn = () => studio.update((p) => ({ ...p, range: { in: position, out: p.range && p.range.out > position + 0.05 ? p.range.out : position + P.barSeconds(p) * 2 } }));
  const setOut = () =>
    studio.update((p) => ({ ...p, range: { in: p.range && p.range.in < position - 0.05 ? p.range.in : Math.max(0, position - P.barSeconds(p) * 2), out: Math.max(position, 0.05) } }));
  return (
    <div className="st-panel rk-unit rk-silver">
      <RackHead name={t('rec.rangeTitle')} tip={t('rec.tip.range')} model="AL-2" led={project.loop || project.punch} />
      <div className="st-row">
        <button type="button" className="amp-btn" disabled={!idle} onClick={setIn}>
          {t('rec.in')}
        </button>
        <button type="button" className="amp-btn" disabled={!idle} onClick={setOut}>
          {t('rec.out')}
        </button>
        <button type="button" className="amp-btn" disabled={!idle || !r} onClick={() => studio.update((p) => ({ ...p, range: null }))}>
          {t('rec.clear')}
        </button>
        <span className="st-range-read" dir="ltr">
          {r ? `${fmt(r.in)} – ${fmt(r.out)}` : '—'}
        </span>
      </div>
      <div className="st-row">
        <Toggle on={project.loop} disabled={phase === 'recording' || phase === 'saving'} onClick={() => studio.update((p) => ({ ...p, loop: !p.loop }), { history: false })} title={t('rec.loopHint')}>
          {t('rec.loop')}
        </Toggle>
        <Toggle on={project.punch} disabled={phase === 'recording' || phase === 'saving'} onClick={() => studio.update((p) => ({ ...p, punch: !p.punch }), { history: false })} title={t('rec.punchHint')}>
          {t('rec.punch')}
        </Toggle>
        <Toggle on={prefs.snap} onClick={() => setPrefs((x) => ({ ...x, snap: !x.snap }))} title={t('rec.snapHint')}>
          {t('rec.snap')}
        </Toggle>
      </div>
      <div className="st-row">
        <label className="st-field">
          <span className="st-label">{t('rec.preRoll')}</span>
          <select value={project.preRoll} disabled={!idle} onChange={(e) => studio.update((p) => ({ ...p, preRoll: Number(e.target.value) }), { history: false })}>
            <option value={0}>{t('rec.rollOff')}</option>
            <option value={1}>{t('rec.bars', { n: 1 })}</option>
            <option value={2}>{t('rec.bars', { n: 2 })}</option>
          </select>
        </label>
        <label className="st-field">
          <span className="st-label">{t('rec.postRoll')}</span>
          <select value={project.postRoll} disabled={!idle} onChange={(e) => studio.update((p) => ({ ...p, postRoll: Number(e.target.value) }), { history: false })}>
            <option value={0}>{t('rec.rollOff')}</option>
            <option value={1}>{t('rec.bars', { n: 1 })}</option>
            <option value={2}>{t('rec.bars', { n: 2 })}</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export function DrumsPanel({ t, studio }) {
  const { project, phase } = studio;
  if (!project) return null;
  const d = project.drums;
  const locked = phase === 'recording' || phase === 'saving';
  const set = (patch, mix = false) => (mix ? studio.updateMix : studio.update)((p) => ({ ...p, drums: { ...p.drums, ...patch } }));
  return (
    <div className="st-panel rk-unit rk-black rk-drum">
      <RackHead name={t('rec.drums')} tip={t('rec.tip.drums')} model="DR-7" led={d.on} />
      <div className="st-row">
        <Toggle on={d.on} disabled={locked} onClick={() => set({ on: !d.on })}>
          {t('rec.drums')}
        </Toggle>
        <Toggle on={d.fills} disabled={locked || !d.on} onClick={() => set({ fills: !d.fills })}>
          {t('rec.fills')}
        </Toggle>
      </div>
      <div className="st-row">
        <label className="st-field is-grow">
          <span className="st-label">{t('rec.style')}</span>
          <select value={d.style} disabled={locked || !d.on} onChange={(e) => set({ style: e.target.value })}>
            {DRUM_STYLE_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="st-row">
        <label className="st-field is-grow">
          <span className="st-label">{t('rec.volume')}</span>
          <input type="range" min="0" max="1.2" step="0.01" value={d.volume} disabled={!d.on} onChange={(e) => set({ volume: Number(e.target.value) }, true)} />
        </label>
      </div>
    </div>
  );
}

export function FilePanel({ t, studio }) {
  const { project, phase, busyTask } = studio;
  const [what, setWhat] = useState('mix');
  const [span, setSpan] = useState('all');
  const [format, setFormat] = useState('wav');
  const [kbps, setKbps] = useState(MP3_DEFAULT_KBPS);
  const fileRef = useRef(null);
  if (!project) return null;
  const idle = phase === 'idle';
  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare;
  const whatValue = what === 'mix' || project.tracks.some((x) => x.id === what) ? what : 'mix';
  const go = (to) => studio.exportAudio({ what: whatValue, span: span === 'range' && project.range ? 'range' : 'all', format, kbps, to });
  return (
    <div className="st-panel rk-unit rk-silver">
      <RackHead name={t('rec.fileTitle')} tip={t('rec.tip.export')} model="AD-24" led={!!busyTask} />
      <div className="st-row">
        <button type="button" className="amp-btn" disabled={!idle || !!busyTask} onClick={() => fileRef.current?.click()}>
          {t('rec.import')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg,.flac"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) studio.importFile(f);
          }}
        />
        {busyTask === 'import' && <span className="st-busy">{t('rec.importing')}</span>}
      </div>
      <div className="st-row">
        <label className="st-field is-grow">
          <span className="st-label">{t('rec.export')}</span>
          <select value={whatValue} onChange={(e) => setWhat(e.target.value)} dir="auto">
            <option value="mix">{t('rec.mixAll')}</option>
            {project.tracks.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.name}
              </option>
            ))}
          </select>
        </label>
        <label className="st-field">
          <span className="st-label">{t('rec.span')}</span>
          <select value={span} onChange={(e) => setSpan(e.target.value)}>
            <option value="all">{t('rec.spanAll')}</option>
            <option value="range" disabled={!project.range}>
              {t('rec.spanRange')}
            </option>
          </select>
        </label>
      </div>
      <div className="st-row">
        <label className="st-field">
          <span className="st-label">{t('rec.format')}</span>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="wav">WAV</option>
            <option value="mp3">MP3</option>
          </select>
        </label>
        {format === 'mp3' && (
          <label className="st-field">
            <span className="st-label">{t('rec.quality')}</span>
            <select value={kbps} onChange={(e) => setKbps(Number(e.target.value))}>
              {MP3_KBPS.map((k) => (
                <option key={k} value={k}>
                  {k} kbps
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="st-row">
        <button type="button" className="amp-btn amp-btn-primary" disabled={!idle || !!busyTask} onClick={() => go('download')}>
          {t('rec.download')}
        </button>
        {canShare && (
          <button type="button" className="amp-btn" disabled={!idle || !!busyTask} onClick={() => go('share')}>
            {t('rec.share')}
          </button>
        )}
        <button type="button" className="amp-btn" disabled={!idle || !!busyTask} onClick={() => go('library')} title={t('rec.bounceHint')}>
          {t('rec.library')}
        </button>
        {busyTask === 'export' && <span className="st-busy">{t('rec.exporting')}</span>}
      </div>
    </div>
  );
}

export function SyncPanel({ t, studio }) {
  const { latencyMs, busyTask, phase } = studio;
  return (
    <div className="st-panel rk-unit rk-black">
      <RackHead name={t('rec.syncTitle')} tip={t('rec.tip.latency')} model="SY-1" led={latencyMs != null} />
      <p className="st-text">{latencyMs == null ? t('rec.latencyAuto') : t('rec.latencyMeasured', { ms: latencyMs })}</p>
      <div className="st-row">
        <button type="button" className="amp-btn" disabled={phase !== 'idle' || !!busyTask} onClick={studio.calibrate}>
          {t('rec.calibrate')}
        </button>
        {latencyMs != null && (
          <button type="button" className="amp-btn" disabled={phase !== 'idle'} onClick={studio.resetLatency}>
            {t('rec.reset')}
          </button>
        )}
        {busyTask === 'calibrate' && <span className="st-busy">{t('rec.calibrating')}</span>}
      </div>
    </div>
  );
}
