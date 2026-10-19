import { AutoPlayToggle } from './AutoPlayToggle';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { CHORD_TYPES, ROOTS, TYPE_GROUPS, appSymbol, chordName, chordTones, typeByKey } from '../../music/chordLibrary';
import { identifyPianoChord, inversionCount, pianoVoicing, voicingsFor } from '../../music/pianoChordLibrary';
import { playPianoChord, playPianoSequence } from '../../audio/pianoPlayer';
import { KeysBox } from './KeysBox';
import './ChordLibraryView.css';

// Piano -> Chord Library (user's request 2026-10-19): the guitar library's
// chords, laid out for the keys. Simple by default (the user's rule): tap a
// key, tap a type, one keyboard diagram; ‹ › walk the inversions. Advanced:
// voicing style (close / two hands / spread / shell / rootless), slash bass,
// notes + formula, Arpeggio, Add to Compose. Piano-only: hand + finger
// numbers on every key, and "You play" — the chord you hold on the keys (or
// a MIDI keyboard) is named live and checked against the one shown.

const STORE = 'dudestar-p-piano-chord-library'; // per profile
const DEFAULTS = { root: 0, type: 'major', voicing: 'close', bass: 'none', advanced: false };
const QUICK_TYPES = ['major', 'minor', 'dom7', 'maj7', 'm7', 'sus2', 'sus4', 'dim', 'aug', 'add9', 'six'];

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE)) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function PianoChordLibraryView({ onStage, onAddToCompose, noteEventRef }) {
  const { t } = useLanguage();
  const [prefs, setPrefs] = useState(load);
  const [inv, setInv] = useState(0);
  const [added, setAdded] = useState(false);
  // Keys played on the Stage keyboard / MIDI / computer keys: held keys, plus
  // keys tapped within the last 1.5 s (so a chord can be tapped note by note
  // with a mouse too).
  const [heldNotes, setHeldNotes] = useState([]);
  const heldRef = useRef({ down: new Set(), recent: new Map(), timer: 0 });
  useEffect(() => {
    const h = heldRef.current;
    const publish = () => {
      const now = performance.now();
      for (const [m, at] of h.recent) if (now - at > 1500 && !h.down.has(m)) h.recent.delete(m);
      setHeldNotes([...new Set([...h.down, ...h.recent.keys()])].sort((a, b) => a - b));
    };
    if (noteEventRef)
      noteEventRef.current = (e) => {
        if (e.type === 'on') {
          h.down.add(e.midi);
          h.recent.set(e.midi, performance.now());
        } else h.down.delete(e.midi);
        publish();
        clearTimeout(h.timer);
        h.timer = setTimeout(publish, 1600);
      };
    return () => {
      clearTimeout(h.timer);
      if (noteEventRef) noteEventRef.current = null;
    };
  }, [noteEventRef]);
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
    if ('root' in patch || 'type' in patch || 'voicing' in patch || 'bass' in patch) setInv(0);
  };

  const { root, type, advanced } = prefs;
  const styles = voicingsFor(type);
  const voicing = advanced && styles.some((v) => v.key === prefs.voicing) ? prefs.voicing : 'close';
  const bassPc = advanced && prefs.bass !== 'none' ? Number(prefs.bass) : null;
  const tones = useMemo(() => chordTones(root, type), [root, type]);
  const slash = bassPc != null && !tones.some((x) => x.pc === bassPc);
  const count = slash || (bassPc != null && bassPc !== root) ? 1 : inversionCount(type, voicing);
  const index = Math.min(inv, count - 1);
  const keys = useMemo(() => pianoVoicing(root, type, { voicing, inversion: index, bassPc }), [root, type, voicing, index, bassPc]);
  // an inversion / spread voicing with another note at the bottom reads as a slash chord
  const name = chordName(root, type, bassPc ?? (voicing !== 'rootless' && keys[0].pc !== root ? keys[0].pc : null));

  useEffect(() => {
    onStage?.(keys);
  }, [keys, onStage]);
  useEffect(() => () => onStage?.(null), [onStage]);
  useEffect(() => () => clearTimeout(addedTimer.current), []);

  // Keep the chosen pills in view in the scrolling strips.
  const stripsRef = useRef(null);
  useEffect(() => {
    stripsRef.current?.querySelectorAll('.cl-chip.is-on').forEach((el) => {
      const strip = el.parentElement;
      strip.scrollTo({ left: Math.max(0, el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2), behavior: 'smooth' });
    });
  }, [root, type]);

  const midis = keys.map((k) => k.midi);
  const play = () => playPianoChord(midis);
  const arpeggio = () => playPianoSequence(midis, 0.22);
  const step = (d) => {
    if (count < 2) return;
    const next = (index + d + count) % count;
    setInv(next);
    if (prefs.autoPlay !== false) playPianoChord(pianoVoicing(root, type, { voicing, inversion: next, bassPc }).map((k) => k.midi));
  };

  // "You play": what the keys being held right now make.
  const heard = heldNotes && heldNotes.length >= 2 ? identifyPianoChord(heldNotes) : null;
  const heardName = heard ? chordName(heard.rootPc, heard.typeKey, heard.bassPc) : null;
  const wanted = new Set(keys.map((k) => k.pc));
  const heldPcs = new Set((heldNotes ?? []).map((m) => m % 12));
  const match = heldNotes?.length > 0 && wanted.size === heldPcs.size && [...wanted].every((pc) => heldPcs.has(pc));

  const invLabel = (i) =>
    voicing === 'shell' || voicing === 'rootless' ? t(i === 0 ? 'pchord.formA' : 'pchord.formB') : t(`chordlib.inv${Math.min(i, 3)}`);
  const symbol = appSymbol(root, type, bassPc);
  const quick = QUICK_TYPES.includes(type) ? QUICK_TYPES : [...QUICK_TYPES, type];

  return (
    <div className={'chord-library is-piano' + (advanced ? ' is-advanced' : '')}>
      <header className="cl-head">
        <h1>
          {t('chordlib.title')}
          <InfoTooltip text={t('tip.pchord.what')} />
        </h1>
        <button type="button" className={'cl-adv-btn' + (advanced ? ' is-on' : '')} aria-pressed={advanced} onClick={() => set({ advanced: !advanced })}>
          {t('chordlib.advanced')}
        </button>
      </header>

      <div className="cl-strips" ref={stripsRef}>
        <div className="cl-strip" role="radiogroup" aria-label={t('chordlib.root')} dir="ltr">
          {ROOTS.map((r) => (
            <button key={r.pc} type="button" role="radio" aria-checked={r.pc === root} className={'cl-chip' + (r.pc === root ? ' is-on' : '')} onClick={() => set({ root: r.pc, bass: 'none' })}>
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
              onClick={() => set({ type: k, bass: 'none' })}
            >
              {k === 'major' || k === 'minor' ? t(`chordlib.chip.${k}`) : typeByKey(k).sym}
            </button>
          ))}
        </div>
      </div>

      {advanced && (
        <div className="cl-controls">
          <label className="cl-field is-wide">
            <span>{t('chordlib.type')}</span>
            <select value={type} onChange={(e) => set({ type: e.target.value, bass: 'none' })}>
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
              {t('pchord.voicing')}
              <InfoTooltip text={t('tip.pchord.voicing')} />
            </span>
            <select value={voicing} onChange={(e) => set({ voicing: e.target.value })}>
              {styles.map((v) => (
                <option key={v.key} value={v.key}>
                  {t(`pchord.v.${v.key}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="cl-field">
            <span>{t('chordlib.bass')}</span>
            <select value={prefs.bass} onChange={(e) => set({ bass: e.target.value })}>
              <option value="none">{t('chordlib.rootPos')}</option>
              <optgroup label={t('chordlib.inversions')}>
                {tones.slice(1, 4).map((x, i) => (
                  <option key={x.pc} value={x.pc}>
                    {t(`chordlib.inv${i + 1}`)} — {chordName(root, type, x.pc)}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t('chordlib.slash')}>
                {Array.from({ length: 12 }, (_, pc) => pc)
                  .filter((pc) => !tones.some((x) => x.pc === pc))
                  .map((pc) => (
                    <option key={pc} value={pc}>
                      {chordName(root, type, pc)}
                    </option>
                  ))}
              </optgroup>
            </select>
          </label>
        </div>
      )}

      <section className="cl-simple">
        <div className="cl-simple-name" dir="ltr">
          {name}
        </div>
        <div className="cl-simple-box" dir="ltr">
          <button type="button" className="cl-arrow" onClick={() => step(-1)} aria-label={t('chordlib.prev')} disabled={count < 2}>
            ‹
          </button>
          <button type="button" className="cl-simple-diagram is-keys" onClick={play} aria-label={t('pchord.play')}>
            <KeysBox keys={keys} />
          </button>
          <button type="button" className="cl-arrow" onClick={() => step(1)} aria-label={t('chordlib.next')} disabled={count < 2}>
            ›
          </button>
        </div>
        <div className="cl-simple-meta">
          <span>{invLabel(index)}</span>
          {count > 1 && (
            <span className="cl-count" dir="ltr">
              {index + 1} / {count}
            </span>
          )}
          <button type="button" className="cl-btn is-primary" onClick={play}>
            {t('pchord.play')}
          </button>
          <AutoPlayToggle on={prefs.autoPlay !== false} onChange={(v) => set({ autoPlay: v })} label={t('chordlib.autoPlay')} />
        </div>
        <div className="pc-hands" aria-hidden="true">
          {keys.some((k) => k.hand === 'left') && (
            <span>
              <i className="pc-dot is-left" /> {t('pchord.lh')}
            </span>
          )}
          {keys.some((k) => k.hand === 'right') && (
            <span>
              <i className="pc-dot is-right" /> {t('pchord.rh')}
            </span>
          )}
          <span className="pc-fingers">{t('pchord.fingers')}</span>
        </div>
        <div className={'pc-heard' + (match ? ' is-match' : '') + (heldNotes?.length ? '' : ' is-idle')} dir="auto" aria-live="polite">
          {heldNotes?.length ? (
            <>
              {t('pchord.youPlay')} <b dir="ltr">{heardName ?? '…'}</b> {match ? '✓' : ''}
            </>
          ) : (
            t('pchord.tryIt')
          )}
        </div>
      </section>

      {advanced && (
        <section className="cl-info">
          <div className="cl-tones" dir="ltr">
            {tones.map((x) => (
              <span key={x.pc} className={'cl-tone r-' + x.role}>
                <b>{x.name}</b>
                <small>{x.interval}</small>
              </span>
            ))}
          </div>
          <div className="cl-formula" dir="ltr">
            {tones.map((x) => x.interval).join(' – ')}
          </div>
          <div className="cl-actions">
            <button type="button" className="cl-btn" onClick={arpeggio}>
              {t('chordlib.pick')}
            </button>
            <button
              type="button"
              className="cl-btn"
              disabled={!symbol}
              title={symbol ? t('tip.chordlib.add') : t('chordlib.notInCompose')}
              onClick={() => {
                onAddToCompose?.(symbol);
                setAdded(true);
                clearTimeout(addedTimer.current);
                addedTimer.current = setTimeout(() => setAdded(false), 1600);
              }}
            >
              {added ? '✓' : t('chordlib.add')}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
