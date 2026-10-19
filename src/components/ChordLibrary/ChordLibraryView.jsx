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

// Guitar -> Chord Library (user's request 2026-10-19). SIMPLE by default
// (the user's call, Ultimate Guitar style): tap a key, tap a type, see ONE
// big diagram (easiest first) with ‹ › through the other shapes, on the neck
// below too. "Advanced" opens the rest: every type, inversions / slash bass,
// tuning, neck labels, notes + formula, Pick / Add / Practise changes, and
// all shapes as a grid grouped root position / inversions.

const STORE = 'dudestar-p-chord-library'; // per profile
const ALL_BASSES = 'auto';
const DEFAULTS = { root: 9, type: 'major', bass: ALL_BASSES, tuning: 'standard', labels: 'note', advanced: false };
// The quick picker's types (Ultimate Guitar style); the rest are in Advanced.
const QUICK_TYPES = ['major', 'minor', 'dom7', 'maj7', 'm7', 'sus2', 'sus4', 'dim', 'aug', 'add9', 'power'];

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE)) };
  } catch {
    return { ...DEFAULTS };
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
    if ('root' in patch || 'type' in patch || 'bass' in patch || 'tuning' in patch || 'advanced' in patch) setPick({ group: 0, index: 0 });
  };

  const { root, type, advanced } = prefs;
  const labels = advanced ? prefs.labels : 'note';
  const tuning = (GUITAR_TUNINGS.find((x) => x.id === prefs.tuning) ?? GUITAR_TUNINGS[0]).midis;
  const tones = useMemo(() => chordTones(root, type), [root, type]);
  const chordType = typeByKey(type);
  // Simple view: root position only.
  const bass = !advanced ? root : prefs.bass === ALL_BASSES ? ALL_BASSES : Number(prefs.bass);

  // Groups: root position + every inversion; or the one bass chosen.
  const groups = useMemo(() => {
    const basses = bass === ALL_BASSES ? (chordType.power ? [root] : tones.map((x) => x.pc)) : [bass];
    return basses
      .map((b) => {
        const list = libraryVoicings(root, type, { tuning, bassPc: b }, b === root ? 8 : 6);
        // in neck order, open position first (‹ › walk up the neck — user's rule)
        return { bass: b, name: chordName(root, type, b), voicings: list };
      })
      .filter((g) => g.voicings.length);
  }, [root, type, bass, tones, chordType.power, tuning, advanced]);

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
  // Keep the chosen key / type pill in view in a strip that scrolls.
  const stripsRef = useRef(null);
  useEffect(() => {
    stripsRef.current?.querySelectorAll('.cl-chip.is-on').forEach((el) => {
      const strip = el.parentElement;
      const left = el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2;
      strip.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    });
  }, [root, type]);

  const midisOf = (v) => v.frets.map((f, s) => (f == null ? null : tuning[s] + f)).filter((m) => m != null);
  const play = (v, gap) => v && playMidis(midisOf(v), gap);

  const symbol = group ? appSymbol(root, type, group.bass) : null;
  const baseSymbol = appSymbol(root, type);
  const formula = tones.map((x) => x.interval).join(' – ');
  const otherBasses = Array.from({ length: 12 }, (_, pc) => pc).filter((pc) => !tones.some((x) => x.pc === pc));
  const inversionLabel = (i) => t(`chordlib.inv${Math.min(i, 3)}`);

  const tuningObj = GUITAR_TUNINGS.find((x) => x.id === prefs.tuning) ?? GUITAR_TUNINGS[0];
  const quick = QUICK_TYPES.includes(type) ? QUICK_TYPES : [...QUICK_TYPES, type];
  const count = group?.voicings.length ?? 0;
  const step = (d) => {
    if (!count) return;
    const index = (pick.index + d + count) % count;
    setPick({ group: pick.group, index });
    play(group.voicings[index], 0.035);
  };
  const big = voicing && group ? describe(group, voicing) : null;
  const bigPos = voicing ? voicingPosition(voicing.frets) : 0;

  return (
    <div className={'chord-library' + (advanced ? ' is-advanced' : '')}>
      <header className="cl-head">
        <h1>
          {t('chordlib.title')}
          <InfoTooltip text={t('tip.chordlib.what')} />
        </h1>
        <button type="button" className={'cl-adv-btn' + (advanced ? ' is-on' : '')} aria-pressed={advanced} onClick={() => set({ advanced: !advanced })}>
          {t('chordlib.advanced')}
        </button>
      </header>

      {/* Quick picker: a key, then a type — one tap each. */}
      <div className="cl-strips" ref={stripsRef}>
      <div className="cl-strip" role="radiogroup" aria-label={t('chordlib.root')} dir="ltr">
        {ROOTS.map((r) => (
          <button
            key={r.pc}
            type="button"
            role="radio"
            aria-checked={r.pc === root}
            className={'cl-chip' + (r.pc === root ? ' is-on' : '')}
            onClick={() => set({ root: r.pc, bass: ALL_BASSES })}
          >
            {r.name}
          </button>
        ))}
      </div>
      <div className="cl-strip is-types" role="radiogroup" aria-label={t('chordlib.type')} dir="ltr">
        {quick.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={k === type}
            title={t(`chordlib.type.${k}`)}
            className={'cl-chip' + (k === type ? ' is-on' : '')}
            onClick={() => set({ type: k, bass: ALL_BASSES })}
          >
            {k === 'major' || k === 'minor' ? t(`chordlib.chip.${k}`) : typeByKey(k).sym}
          </button>
        ))}
      </div>
      </div>

      {!advanced && (
        <section className="cl-simple">
          <div className="cl-simple-name" dir="ltr">
            {group?.name ?? chordName(root, type)}
            {tuningObj.id !== 'standard' && <span className="cl-simple-tuning">{t(`tuning.${tuningObj.id}`)}</span>}
          </div>
          {big ? (
            <div className="cl-simple-box" dir="ltr">
              <button type="button" className="cl-arrow" onClick={() => step(-1)} aria-label={t('chordlib.prev')} disabled={count < 2}>
                ‹
              </button>
              <button type="button" className="cl-simple-diagram" onClick={() => play(voicing, 0.035)} aria-label={t('chordlib.strum')}>
                <ChordBox
                  frets={voicing.frets}
                  fingers={voicing.fing.fingers}
                  barre={voicing.fing.barre}
                  roles={big.roles}
                  names={big.names}
                  position={bigPos}
                  leftHanded={leftHanded}
                />
              </button>
              <button type="button" className="cl-arrow" onClick={() => step(1)} aria-label={t('chordlib.next')} disabled={count < 2}>
                ›
              </button>
            </div>
          ) : (
            <p className="cl-empty">{t('chordlib.none')}</p>
          )}
          {big && (
            <div className="cl-simple-meta">
              <span>{bigPos ? t('chordlib.fret', { n: bigPos }) : t('chordlib.open')}</span>
              <span className="cl-count" dir="ltr">
                {pick.index + 1} / {count}
              </span>
              <button type="button" className="cl-btn is-primary" onClick={() => play(voicing, 0.035)}>
                {t('chordlib.strum')}
              </button>
            </div>
          )}
        </section>
      )}

      {advanced && (
        <>
      <div className="cl-controls">
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
        </>
      )}
    </div>
  );
}
