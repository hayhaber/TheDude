import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { useLeftHanded } from '../Fretboard/handedness';
import { GUITAR_TUNINGS } from '../../music/tunings';
import {
  CHORD_TYPES,
  ROOTS,
  TYPE_GROUPS,
  appSymbol,
  bassName,
  chordName,
  chordTones,
  libraryVoicings,
  toPosition,
  typeByKey,
  voicingPosition,
} from '../../music/chordLibrary';
import { playMidis } from '../../audio/chordPlayer';
import { CHANGES_CHORDS } from '../MinuteChanges/MinuteChanges';
import { ChordBox } from './ChordBox';
import './ChordLibraryView.css';

// Guitar -> Chord Library (user's request 2026-10-19, after a chord-library
// screenshot): pick a key + chord type, see its voicings as chord-book
// diagrams, grouped root position / inversions (or one slash bass), the
// chosen one on the big neck below. Strum / pick it, add it to Compose,
// practise changing to another chord (One-Minute Changes).

const STORE = 'dudestar-p-chord-library'; // per profile
const ALL_BASSES = 'auto';

function load() {
  try {
    return { root: 9, type: 'major', bass: ALL_BASSES, tuning: 'standard', labels: 'note', ...JSON.parse(localStorage.getItem(STORE)) };
  } catch {
    return { root: 9, type: 'major', bass: ALL_BASSES, tuning: 'standard', labels: 'note' };
  }
}

export function ChordLibraryView({ onStage, onAddToCompose, onPracticeChanges }) {
  const { t } = useLanguage();
  const [leftHanded] = useLeftHanded();
  const [prefs, setPrefs] = useState(load);
  const [pick, setPick] = useState({ group: 0, index: 0 });
  const [added, setAdded] = useState(false);
  const addedTimer = useRef(0);
  const set = (patch) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(STORE, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
    if ('root' in patch || 'type' in patch || 'bass' in patch || 'tuning' in patch) setPick({ group: 0, index: 0 });
  };

  const { root, type, labels } = prefs;
  const tuning = (GUITAR_TUNINGS.find((x) => x.id === prefs.tuning) ?? GUITAR_TUNINGS[0]).midis;
  const tones = useMemo(() => chordTones(root, type), [root, type]);
  const chordType = typeByKey(type);
  const bass = prefs.bass === ALL_BASSES ? ALL_BASSES : Number(prefs.bass);

  // Groups: root position + every inversion; or the one bass chosen.
  const groups = useMemo(() => {
    const basses = bass === ALL_BASSES ? (chordType.power ? [root] : tones.map((x) => x.pc)) : [bass];
    return basses
      .map((b) => ({ bass: b, name: chordName(root, type, b), voicings: libraryVoicings(root, type, { tuning, bassPc: b }, b === root ? 8 : 6) }))
      .filter((g) => g.voicings.length);
  }, [root, type, bass, tones, chordType.power, tuning]);

  const group = groups[pick.group] ?? groups[0];
  const voicing = group?.voicings[pick.index] ?? group?.voicings[0];

  const describe = (g, v) => {
    const pos = toPosition(root, type, v.frets, tuning, 'note', g.bass);
    return { pos, names: pos.strings.map((s) => s.label ?? ''), roles: pos.strings.map((s) => (s.role === 'bass' && g.bass !== root && tones.some((x) => x.pc === g.bass) ? 'bass' : s.role)) };
  };

  // The chosen voicing on the big neck.
  useEffect(() => {
    if (!voicing || !group) {
      onStage?.(null);
      return;
    }
    const position = { ...toPosition(root, type, voicing.frets, tuning, labels === 'interval' ? 'interval' : 'note', group.bass), fingers: voicing.fing.fingers };
    onStage?.({ position, tuning, labelMode: labels === 'finger' ? 'finger' : 'note' });
  }, [voicing, group, root, type, tuning, labels, onStage]);
  useEffect(() => () => onStage?.(null), [onStage]);
  useEffect(() => () => clearTimeout(addedTimer.current), []);

  const midisOf = (v) => v.frets.map((f, s) => (f == null ? null : tuning[s] + f)).filter((m) => m != null);
  const play = (v, gap) => v && playMidis(midisOf(v), gap);

  const symbol = group ? appSymbol(root, type, group.bass) : null;
  const baseSymbol = appSymbol(root, type);
  const formula = tones.map((x) => x.interval).join(' – ');
  const otherBasses = Array.from({ length: 12 }, (_, pc) => pc).filter((pc) => !tones.some((x) => x.pc === pc));
  const inversionLabel = (i) => t(`chordlib.inv${Math.min(i, 3)}`);

  return (
    <div className="chord-library">
      <header className="cl-head">
        <h1>
          {t('chordlib.title')}
          <InfoTooltip text={t('tip.chordlib.what')} />
        </h1>
        <p className="cl-sub">{t('chordlib.subtitle')}</p>
      </header>

      <div className="cl-controls">
        <label className="cl-field">
          <span>{t('chordlib.root')}</span>
          <select value={root} onChange={(e) => set({ root: Number(e.target.value), bass: ALL_BASSES })} dir="ltr">
            {ROOTS.map((r) => (
              <option key={r.pc} value={r.pc}>
                {r.alt ? `${r.name} / ${r.alt}` : r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="cl-field is-wide">
          <span>{t('chordlib.type')}</span>
          <select value={type} onChange={(e) => set({ type: e.target.value, bass: ALL_BASSES })}>
            {TYPE_GROUPS.map((g) => (
              <optgroup key={g} label={t(`chordlib.group.${g}`)}>
                {CHORD_TYPES.filter((c) => c.group === g).map((c) => (
                  <option key={c.key} value={c.key}>
                    {t(`chordlib.type.${c.key}`)} ({ROOTS[root].name}
                    {c.sym})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="cl-field">
          <span>
            {t('chordlib.bass')}
            <InfoTooltip text={t('tip.chordlib.bass')} />
          </span>
          <select value={prefs.bass} onChange={(e) => set({ bass: e.target.value })}>
            <option value={ALL_BASSES}>{chordType.power ? t('chordlib.rootPos') : t('chordlib.allInv')}</option>
            {!chordType.power && (
              <optgroup label={t('chordlib.inversions')}>
                {tones.map((x, i) => (
                  <option key={x.pc} value={x.pc}>
                    {i === 0 ? t('chordlib.rootPos') : `${inversionLabel(i)} — ${chordName(root, type, x.pc)}`}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label={t('chordlib.slash')}>
              {otherBasses.map((pc) => (
                <option key={pc} value={pc}>
                  {chordName(root, type, pc)}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="cl-field">
          <span>{t('chordlib.tuning')}</span>
          <select value={prefs.tuning} onChange={(e) => set({ tuning: e.target.value })}>
            {GUITAR_TUNINGS.map((x) => (
              <option key={x.id} value={x.id}>
                {t(`tuning.${x.id}`)} ({x.names.join('')})
              </option>
            ))}
          </select>
        </label>
        <label className="cl-field">
          <span>{t('chordlib.labels')}</span>
          <select value={labels} onChange={(e) => set({ labels: e.target.value })}>
            <option value="note">{t('chordlib.labels.note')}</option>
            <option value="interval">{t('chordlib.labels.interval')}</option>
            <option value="finger">{t('chordlib.labels.finger')}</option>
          </select>
        </label>
      </div>

      {/* The chosen chord: name, notes with their role, formula, actions. */}
      <section className="cl-info">
        <div className="cl-name" dir="ltr">
          {group?.name ?? chordName(root, type)}
        </div>
        <div className="cl-tones" dir="ltr">
          {tones.map((x) => (
            <span key={x.pc} className={'cl-tone r-' + x.role}>
              <b>{x.name}</b>
              <small>{x.interval}</small>
            </span>
          ))}
          {group && !tones.some((x) => x.pc === group.bass) && (
            <span className="cl-tone r-bass">
              <b>{bassName(root, type, group.bass)}</b>
              <small>{t('chordlib.bassShort')}</small>
            </span>
          )}
        </div>
        <div className="cl-formula" dir="ltr">
          {formula}
        </div>
        <div className="cl-actions">
          <button type="button" className="cl-btn is-primary" disabled={!voicing} onClick={() => play(voicing, 0.035)}>
            {t('chordlib.strum')}
          </button>
          <button type="button" className="cl-btn" disabled={!voicing} onClick={() => play(voicing, 0.32)}>
            {t('chordlib.pick')}
          </button>
          <button
            type="button"
            className="cl-btn"
            disabled={!symbol}
            title={symbol ? undefined : t('chordlib.notInCompose')}
            onClick={() => {
              onAddToCompose?.(symbol);
              setAdded(true);
              clearTimeout(addedTimer.current);
              addedTimer.current = setTimeout(() => setAdded(false), 1600);
            }}
          >
            {added ? '✓' : t('chordlib.add')}
          </button>
          <label className="cl-field cl-changes">
            <span>
              {t('chordlib.changes')}
              <InfoTooltip text={t('tip.chordlib.changes')} />
            </span>
            <select
              value=""
              disabled={!baseSymbol}
              onChange={(e) => e.target.value && onPracticeChanges?.([baseSymbol, e.target.value])}
              dir="ltr"
            >
              <option value="">{baseSymbol ? t('chordlib.changesPick') : t('chordlib.notInCompose')}</option>
              {CHANGES_CHORDS.filter((c) => c !== baseSymbol).map((c) => (
                <option key={c} value={c}>
                  {baseSymbol} ⇄ {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {groups.length === 0 && <p className="cl-empty">{t('chordlib.none')}</p>}

      {groups.map((g, gi) => (
        <section key={g.bass} className="cl-group">
          <h2 className="cl-group-title" dir="ltr">
            {g.name}
            {g.bass !== root && tones.some((x) => x.pc === g.bass) && (
              <span className="cl-group-sub" dir="auto">
                {inversionLabel(tones.findIndex((x) => x.pc === g.bass))}
              </span>
            )}
          </h2>
          <div className="cl-grid" dir="ltr">
            {g.voicings.map((v, vi) => {
              const d = describe(g, v);
              const pos = voicingPosition(v.frets);
              const on = gi === pick.group && vi === pick.index;
              return (
                <button
                  key={v.frets.join(',')}
                  type="button"
                  className={'cl-card' + (on ? ' is-on' : '')}
                  aria-pressed={on}
                  aria-label={`${g.name} ${pos ? t('chordlib.fret', { n: pos }) : t('chordlib.open')}`}
                  onClick={() => {
                    setPick({ group: gi, index: vi });
                    play(v, 0.035);
                  }}
                >
                  <span className="cl-card-head">
                    <span>{pos ? t('chordlib.fret', { n: pos }) : t('chordlib.open')}</span>
                    {v.easiest && <span className="cl-badge">{t('chordlib.easiest')}</span>}
                  </span>
                  <ChordBox
                    frets={v.frets}
                    fingers={v.fing.fingers}
                    barre={v.fing.barre}
                    roles={d.roles}
                    names={d.names}
                    position={pos}
                    leftHanded={leftHanded}
                  />
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

