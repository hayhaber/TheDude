import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { usePitchDetection } from '../../hooks/usePitchDetection';
import { useMicChordDetector } from '../../hooks/useMicChordDetector';
import { judgeShape } from '../../music/chordBuilder';
import { playMidis } from '../../audio/chordPlayer';
import { logPerf, localDay } from '../../coach/perfLog';
import { CYCLE, chordLabel, drillPath, itemKey, neckShapes, QUALITIES, rivalFrets, sixFrets, STRING_SETS } from '../../music/triadNeck';
import { Button, PlayGlyph } from '../ui/controls';
import { Select } from '../ui/Select';
import '../Teacher/Teacher.css';
import './TriadNeck.css';

// Practice -> Triads across the neck (v1.0.264). One item = one chord on one
// string set: every shape from the nut up, each picked note by note (the
// pitch detector names the exact note) and then strummed (the chord check
// tells it from the same shape with the 3rd moved or a fret off). Progress
// per profile; the path is major on every set, then minor (triadNeck.js).
const KEY = 'dudestar-p-triad-neck';
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
};
const save = (v) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* storage full / blocked: the drill still runs */
  }
};
const PATH = drillPath();
const setLabel = (set) => set.split('').join('–');
const iso = (s) => '⁦' + s + '⁩';

export function TriadNeckPanel({ onStage }) {
  const { t } = useLanguage();
  const [store, setStore] = useState(load);
  const firstOpen = () => PATH.find((it) => !store.done?.[itemKey(it)]) ?? PATH[0];
  const [item, setItem] = useState(() => store.pick ?? firstOpen());
  const shapes = useMemo(() => neckShapes(item.root, item.quality, item.set), [item]);
  const label = chordLabel(item.root, item.quality);

  const [phase, setPhase] = useState('idle'); // idle | notes | strum | done
  const [si, setSi] = useState(0); // shape
  const [ni, setNi] = useState(0); // note in the shape
  const [hint, setHint] = useState(null);
  const pitch = usePitchDetection();
  const chord = useMicChordDetector();
  const startedAt = useRef(0);

  const choose = (patch) => {
    stop();
    const next = { ...item, ...patch };
    setItem(next);
    setPhase('idle');
    const v = { ...load(), pick: next };
    save(v);
    setStore(v);
  };

  // the neck: the whole map while resting, the shape being played while running
  useEffect(() => {
    const running = phase === 'notes' || phase === 'strum';
    const list = running ? [shapes[si]] : shapes;
    const notes = list.flatMap((sh, k) =>
      sh.notes.map((n, j) => ({ ...n, isCurrent: running && phase === 'notes' && j === ni, isHit: running && (phase === 'strum' || j < ni), shape: k }))
    );
    onStage?.({ position: null, scaleNotes: notes, labelMode: 'degree' });
  }, [shapes, si, ni, phase, onStage]);
  useEffect(() => () => onStage?.(null), [onStage]);

  const stop = useCallback(() => {
    pitch.stopListening();
    chord.stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => stop(), [stop]);

  const start = () => {
    setSi(0);
    setNi(0);
    setHint(null);
    setPhase('notes');
    startedAt.current = Date.now();
    // both listeners open in the tap (iOS): notes by pitch, the strum by chroma
    pitch.startListening();
    chord.startListening();
  };

  const finishItem = () => {
    stop();
    setPhase('done');
    const v = load();
    v.done = { ...(v.done ?? {}), [itemKey(item)]: localDay() };
    save(v);
    setStore(v);
    try {
      logPerf({ tool: 'triadNeck', item: itemKey(item), durationMs: Date.now() - startedAt.current, metrics: { shapes: shapes.length } });
    } catch {
      /* logging never breaks the drill */
    }
  };
  const nextShape = () => {
    if (si + 1 >= shapes.length) finishItem();
    else {
      setSi(si + 1);
      setNi(0);
      setHint(null);
      setPhase('notes');
    }
  };

  // notes: the exact pitch, twice in a row (as the Teacher's play steps)
  const hits = useRef(0);
  const lastNote = useRef(null);
  useEffect(() => {
    if (phase !== 'notes' || !pitch.isListening) return;
    const n = pitch.currentNote;
    const target = shapes[si]?.notes[ni];
    if (!n || !target || lastNote.current === n) {
      if (!n) hits.current = 0;
      return;
    }
    lastNote.current = n;
    if (n.midi === target.midi && Math.abs(n.centsOff ?? 0) < 45) {
      hits.current += 1;
      if (hits.current >= 2) {
        hits.current = 0;
        if (ni + 1 >= 3) setPhase('strum');
        else setNi(ni + 1);
      }
    } else hits.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitch.currentNote]);

  // the strum: two passing half-second windows in a row
  useEffect(() => {
    if (phase !== 'strum' || !chord.isListening) return undefined;
    const sh = shapes[si];
    const six = sixFrets(sh, item.set);
    const rivals = rivalFrets(sh, item.set);
    let ok = 0;
    const since = Date.now();
    const id = setInterval(() => {
      const v = judgeShape(chord.averageChroma(4), six, rivals);
      ok = v.match ? ok + 1 : 0;
      if (ok >= 2) {
        clearInterval(id);
        setHint('heard');
        setTimeout(nextShape, 500);
      } else if (Date.now() - since > 8000) setHint('notYet');
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, si, chord.isListening]);

  const hear = () => {
    const sh = shapes[phase === 'notes' || phase === 'strum' ? si : 0];
    const m = sh.notes.map((n) => n.midi);
    playMidis(m, 0.42);
    setTimeout(() => playMidis(m), 1500);
  };
  const skip = () => {
    if (phase === 'notes') setPhase('strum');
    else nextShape();
  };

  const idx = PATH.findIndex((it) => itemKey(it) === itemKey(item));
  const next = PATH[idx + 1] ?? null;
  const doneCount = PATH.filter((it) => store.done?.[itemKey(it)]).length;
  const running = phase === 'notes' || phase === 'strum';
  const sh = shapes[si];

  return (
    <div className="tn">
      <section className="tn-card">
        <div className="tn-head">
          <span className="tn-eyebrow">
            {t('tn.' + item.quality)} · {t('tn.set', { set: iso(setLabel(item.set)) })}
          </span>
          <span className="tn-chord" dir="ltr">
            {label}
          </span>
          <span className="tn-where">
            {t('tn.where', { n: CYCLE.indexOf(item.root) + 1, s: STRING_SETS.indexOf(item.set) + 1 })}
          </span>
        </div>
        <div className="tn-bar" role="progressbar" aria-valuemin={0} aria-valuemax={PATH.length} aria-valuenow={doneCount}>
          <span style={{ width: (100 * doneCount) / PATH.length + '%' }} />
        </div>
        <span className="tn-overall">{t('tn.overall', { done: doneCount, n: PATH.length })}</span>

        <div className="tn-pick">
          <label>
            <span>{t('tn.type')}</span>
            <Select value={item.quality} onChange={(e) => choose({ quality: e.target.value })} disabled={running}>
              {QUALITIES.map((q) => (
                <option key={q} value={q}>
                  {t('tn.' + q)}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span>{t('tn.strings')}</span>
            <Select value={item.set} onChange={(e) => choose({ set: e.target.value })} disabled={running} dir="ltr">
              {STRING_SETS.map((s) => (
                <option key={s} value={s}>
                  {setLabel(s)}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span>{t('tn.chord')}</span>
            <Select value={String(item.root)} onChange={(e) => choose({ root: Number(e.target.value) })} disabled={running} dir="ltr">
              {CYCLE.map((r) => (
                <option key={r} value={r}>
                  {chordLabel(r, item.quality)}
                  {store.done?.[itemKey({ ...item, root: r })] ? ' ✓' : ''}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </section>

      <ol className="tn-shapes" dir="ltr" aria-label={label}>
        {shapes.map((s, k) => (
          <li key={k} className={(running && k === si ? 'is-now' : '') + (phase === 'done' || (running && k < si) ? ' is-past' : '')}>
            <strong>{t('tn.inv.' + s.inversion)}</strong>
            <small>{t('tn.fret', { n: s.low || 0 })}</small>
          </li>
        ))}
      </ol>

      {phase === 'done' ? (
        <section className="tn-card tn-done">
          <strong>✓ {t('tn.doneTitle', { chord: iso(label), set: setLabel(item.set) })}</strong>
          <p>{t('tn.doneText', { n: shapes.length })}</p>
          <div className="tn-actions">
            {next ? (
              <Button variant="filled" size="lg" onClick={() => choose(next)}>
                {next.set !== item.set || next.quality !== item.quality
                  ? t('tn.nextSet', { set: setLabel(next.set) })
                  : t('tn.nextChord', { chord: iso(chordLabel(next.root, next.quality)) })}
              </Button>
            ) : (
              <p>{t('tn.allDone')}</p>
            )}
            <Button variant="plain" onClick={start}>
              {t('tn.again')}
            </Button>
          </div>
        </section>
      ) : (
        <section className="tn-card">
          {running ? (
            <>
              <p className="tn-step">
                {phase === 'notes'
                  ? t('tn.notes', { i: si + 1, n: shapes.length, notes: iso(sh.notes.map((n) => n.noteName).join(' · ')) })
                  : t('tn.strum')}
              </p>
              <ol className="tc-notes" dir="ltr">
                {sh.notes.map((n, k) => (
                  <li key={k} className={(n.isRoot ? 'is-root' : '') + (phase === 'strum' || k < ni ? ' is-past' : k === ni ? ' is-now' : '')}>
                    <span>{n.noteName}</span>
                    <small>{n.degreeLabel}</small>
                  </li>
                ))}
              </ol>
              <p className={'tn-state' + (hint === 'heard' ? ' is-ok' : '')} aria-live="polite">
                {hint === 'heard' ? '✓ ' + t('tn.heard') : hint === 'notYet' ? t('tn.notYet') : phase === 'notes' ? t('tn.next', { note: iso(sh.notes[ni].noteName) }) : ''}
                {(pitch.error || chord.error) && <span className="tc-error">{String(pitch.error || chord.error)}</span>}
              </p>
            </>
          ) : (
            <p className="tn-step">{t('tn.how')}</p>
          )}
          <div className="tn-actions">
            {running ? (
              <Button variant="gray" danger onClick={() => (stop(), setPhase('idle'))}>
                {t('tn.stop')}
              </Button>
            ) : (
              <Button variant="filled" size="lg" icon={<PlayGlyph />} onClick={start}>
                {t('tn.start')}
              </Button>
            )}
            <Button variant="gray" onClick={hear}>
              {t('tn.hear')}
            </Button>
            {running && (
              <Button variant="plain" onClick={skip}>
                {t('tn.skip')}
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
