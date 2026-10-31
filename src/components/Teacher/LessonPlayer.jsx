// One lesson, step by step (curriculum/guitar.js step kinds): explain / tune /
// checklist / quiz / chord (the mic hears the shape) / changes (one-minute
// changes, inline) / arp (arpeggio notes on the neck) / play (the mic follows
// the arpeggio note by note). Measured checks record a pass; the furthest step is
// remembered so a lesson can be continued.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useLeftHanded } from '../Fretboard/handedness';
import { ChordBox } from '../ChordLibrary/ChordBox';
import { GuitarTuner } from '../GuitarTuner/GuitarTuner';
import { MinuteChanges } from '../MinuteChanges/MinuteChanges';
import { playMidis } from '../../audio/chordPlayer';
import { useMicChordDetector } from '../../hooks/useMicChordDetector';
import { usePitchDetection } from '../../hooks/usePitchDetection';
import { ARPS, arpGap, arpNotes, playOrder } from '../../teacher/arpeggios';
import { logPerf } from '../../coach/perfLog';
import { judgeShape, STD_TUNING } from '../../music/chordBuilder';
import { chordTones, toPosition } from '../../music/chordLibrary';
import { FINGERS, SHAPES, skillById } from '../../teacher/curriculum/guitar';
import { finishLesson, reachStep, recordPass, useTeacher } from '../../teacher/teacherState';
import { homeworkStatus } from '../../teacher/mastery';
import '../ChordLibrary/ChordLibraryView.css';

const midisOf = (frets) => frets.map((f, s) => (f == null ? null : STD_TUNING[s] + f)).filter((m) => m != null);

/** Names under the strings + roles, for ChordBox. */
function boxData(name) {
  const sh = SHAPES[name];
  const tones = chordTones(sh.root, sh.type);
  const names = [];
  const roles = [];
  sh.frets.forEach((f, s) => {
    if (f == null) return;
    const pc = (STD_TUNING[s] + f) % 12;
    const tone = tones.find((x) => x.pc === pc);
    names[s] = tone?.name ?? '';
    roles[s] = tone?.role ?? '';
  });
  return { frets: sh.frets, fingers: FINGERS[name], names, roles };
}

export function stageFor(name) {
  const sh = SHAPES[name];
  if (!sh) return null;
  const position = toPosition(sh.root, sh.type, sh.frets, STD_TUNING, 'note');
  if (FINGERS[name]) position.fingers = FINGERS[name];
  return { position, labelMode: 'note' };
}

function Shape({ name, leftHanded }) {
  const d = boxData(name);
  return (
    <figure className="tc-shape">
      <ChordBox frets={d.frets} fingers={d.fingers} roles={d.roles} names={d.names} position={0} leftHanded={leftHanded} />
      <figcaption dir="ltr">{name}</figcaption>
    </figure>
  );
}

function HearButton({ name }) {
  const { t } = useLanguage();
  return (
    <button type="button" className="tc-btn" onClick={() => playMidis(midisOf(SHAPES[name].frets))}>
      {t('teacher.step.hear')}
    </button>
  );
}

// ---- step bodies -------------------------------------------------------------

function ExplainStep({ step, tx, leftHanded }) {
  return (
    <>
      <p className="tc-text">{tx(step.text)}</p>
      {step.shape && (
        <div className="tc-shape-row">
          <Shape name={step.shape} leftHanded={leftHanded} />
          <HearButton name={step.shape} />
        </div>
      )}
    </>
  );
}

function TuneStep({ step, tx, onDone, done }) {
  const { t } = useLanguage();
  return (
    <>
      <p className="tc-text">{tx(step.text)}</p>
      <div className="tc-tuner">
        <GuitarTuner mode="guitar" />
      </div>
      <button type="button" className={'tc-btn' + (done ? ' is-done' : ' is-primary')} onClick={onDone}>
        {done ? '✓ ' : ''}
        {t('teacher.step.tuned')}
      </button>
    </>
  );
}

function ChecklistStep({ step, tx, ticks, setTicks }) {
  const { t } = useLanguage();
  return (
    <>
      {step.text && <p className="tc-text">{tx(step.text)}</p>}
      <ul className="tc-checklist">
        {step.items.map((item, i) => (
          <li key={i}>
            <label className={ticks[i] ? 'is-on' : ''}>
              <input type="checkbox" checked={!!ticks[i]} onChange={() => setTicks({ ...ticks, [i]: !ticks[i] })} />
              <span>{tx(item)}</span>
            </label>
          </li>
        ))}
      </ul>
      {!step.items.every((_, i) => ticks[i]) && <p className="tc-hint">{t('teacher.step.checkAll')}</p>}
    </>
  );
}

function QuizStep({ step, tx, picked, setPicked }) {
  const { t } = useLanguage();
  return (
    <>
      <p className="tc-question">{tx(step.question)}</p>
      <div className="tc-options">
        {step.options.map((o, i) => {
          const state = picked == null ? '' : i === step.answer ? ' is-right' : i === picked ? ' is-wrong' : ' is-dim';
          return (
            <button key={i} type="button" className={'tc-option' + state} disabled={picked === step.answer} onClick={() => setPicked(i)}>
              {tx(o)}
            </button>
          );
        })}
      </div>
      {picked != null && (
        <p className={'tc-verdict ' + (picked === step.answer ? 'is-right' : 'is-wrong')}>
          <strong>{picked === step.answer ? t('teacher.step.right') : t('teacher.step.wrong')}</strong> {picked === step.answer ? tx(step.why) : ''}
        </p>
      )}
    </>
  );
}

// The rivals a shape must beat: the other lesson chords and the same shape
// with one fretted finger missing (the usual beginner mistake: a finger not
// pressing or a string muted by the next finger).
function rivalsFor(name) {
  const sh = SHAPES[name].frets;
  const out = Object.entries(SHAPES)
    .filter(([k]) => k !== name && ['D', 'A', 'E'].includes(k))
    .map(([, v]) => v.frets);
  sh.forEach((f, s) => {
    if (f > 0) out.push(sh.map((x, i) => (i === s ? 0 : x)));
  });
  return out;
}

export function ChordStep({ step, tx, leftHanded, passed, onPass }) {
  const { t } = useLanguage();
  const mic = useMicChordDetector();
  const [result, setResult] = useState(passed ? 'ok' : null); // null | listening | ok | notYet
  const hits = useRef(0);
  const since = useRef(0);
  const frets = SHAPES[step.chord].frets;
  const rivals = useMemo(() => rivalsFor(step.chord), [step.chord]);

  useEffect(() => {
    if (!mic.isListening || result === 'ok') return undefined;
    since.current = Date.now();
    hits.current = 0;
    const id = setInterval(() => {
      const verdict = judgeShape(mic.averageChroma(4), frets, rivals);
      hits.current = verdict.match ? hits.current + 1 : 0;
      if (hits.current >= 2) {
        setResult('ok');
        mic.stopListening();
        onPass();
        return;
      }
      if (Date.now() - since.current > 8000) setResult((r) => (r === 'ok' ? r : 'notYet'));
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.isListening, result === 'ok']);
  useEffect(() => () => mic.stopListening(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const listen = () => {
    if (mic.isListening) {
      mic.stopListening();
      setResult(null);
      return;
    }
    setResult('listening');
    mic.startListening();
  };

  return (
    <>
      <p className="tc-text">{tx(step.text)}</p>
      <div className="tc-shape-row">
        <Shape name={step.chord} leftHanded={leftHanded} />
        <div className="tc-mic">
          <span className="tc-actions">
            <button type="button" className={'tc-btn' + (mic.isListening ? '' : ' is-primary')} onClick={listen}>
              {mic.isListening ? t('teacher.step.stop') : t('teacher.step.listen')}
            </button>
            <HearButton name={step.chord} />
          </span>
          <p className={'tc-mic-state is-' + (result ?? 'idle')} aria-live="polite">
            {result === 'listening' && t('teacher.step.listening')}
            {result === 'ok' && '✓ ' + t('teacher.step.ok', { chord: '⁦' + step.chord + '⁩' })}
            {result === 'notYet' && t('teacher.step.notYet')}
            {mic.error && <span className="tc-error">{String(mic.error)}</span>}
          </p>
          {result === 'notYet' && <p className="tc-hint">{t('teacher.step.skip')}</p>}
        </div>
      </div>
    </>
  );
}

function ChangesStep({ step, tx }) {
  const { t } = useLanguage();
  const [last, setLast] = useState(null);
  const onResult = useCallback((res) => setLast(res), []);
  return (
    <>
      <p className="tc-text">{tx(step.text)}</p>
      <div className="tc-embed">
        <MinuteChanges initialChords={step.pair} onResult={onResult} />
      </div>
      {last && <p className="tc-verdict is-right">{t('teacher.step.changesDone', { n: last.count })}</p>}
    </>
  );
}

// ---- arpeggios ----------------------------------------------------------------

const ARP_GAP = 0.36; // s between picked notes

function playArp(ids, updown = false) {
  const list = [].concat(ids);
  let at = 0;
  list.forEach((id) => {
    const midis = playOrder(id, updown).map((n) => n.midi);
    const gap = arpGap(id) ?? ARP_GAP;
    setTimeout(() => playMidis(midis, gap), at * 1000);
    // shapes with a written order (tapping) flow into each other without a pause
    at += midis.length * gap + (arpGap(id) ? 0 : 0.5);
  });
}

/** The neck's dots for some arpeggio shapes; `current` = the note to play now. */
export function arpStage(ids, labels = 'degree', current = null) {
  const seen = new Set();
  const notes = arpNotes(ids)
    .filter((n) => {
      const k = n.string + ':' + n.fret;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((n) => ({ ...n, isCurrent: !!current && current.string === n.string && current.fret === n.fret }));
  return { position: null, scaleNotes: notes, labelMode: labels === 'degree' || labels === 'finger' ? labels : 'note' };
}

/** The notes as a row of pills (name over role), for when the neck is out of view. */
function NoteStrip({ notes, at = -1, done = false, fingers = false }) {
  return (
    <ol className="tc-notes" dir="ltr">
      {notes.map((n, k) => (
        <li key={k} className={(n.isRoot ? 'is-root' : '') + (n.tapped ? ' is-tap' : '') + (done || k < at ? ' is-past' : k === at ? ' is-now' : '')}>
          <span>{n.noteName}</span>
          <small>{fingers && n.finger != null ? n.finger : n.degreeLabel}</small>
        </li>
      ))}
    </ol>
  );
}

function ArpStep({ step, tx }) {
  const { t } = useLanguage();
  const ids = [].concat(step.arp);
  const strumIds = step.compare ? ids : null;
  return (
    <>
      <p className="tc-text">{tx(step.text)}</p>
      {ids.map((id) => (
        <NoteStrip key={id} notes={ARPS[id]?.seq ? playOrder(id) : arpNotes(id)} fingers={step.labels === 'finger'} />
      ))}
      <span className="tc-actions">
        <button type="button" className="tc-btn is-primary" onClick={() => playArp(step.hear ?? ids)}>
          {t('teacher.step.hear')}
        </button>
        {strumIds && (
          <button type="button" className="tc-btn" onClick={() => playMidis(arpNotes(strumIds[0]).map((n) => n.midi))}>
            {t('teacher.step.strum')}
          </button>
        )}
      </span>
      {step.labels === 'degree' && <p className="tc-hint">{t('teacher.arp.legend')}</p>}
      {step.labels === 'finger' && <p className="tc-hint">{t('teacher.tap.legend')}</p>}
    </>
  );
}

// The mic follows the notes one at a time (like the Lick Trainer's Wait
// mode): the next note lights on the neck and moves on when the right pitch
// is heard twice in a row (±45 cents, exact octave).
export function PlayStep({ step, tx, onStage, onPass }) {
  const { t } = useLanguage();
  const pitch = usePitchDetection();
  const order = useMemo(() => playOrder(step.arp, step.updown), [step.arp, step.updown]);
  const [at, setAt] = useState(0);
  const [done, setDone] = useState(false);
  const hits = useRef(0);
  const startedAt = useRef(0);
  const labels = step.labels ?? 'note';

  useEffect(() => {
    onStage?.(arpStage(step.arp, labels, done ? null : order[at]));
  }, [at, done, order, onStage, step.arp, labels]);

  useEffect(() => {
    if (!pitch.isListening || done) return;
    const n = pitch.currentNote;
    const target = order[at];
    if (!n || !target) {
      hits.current = 0;
      return;
    }
    if (n.midi === target.midi && Math.abs(n.centsOff ?? 0) < 45) {
      hits.current += 1;
      if (hits.current >= 2) {
        hits.current = 0;
        if (at === 0) startedAt.current = Date.now();
        if (at + 1 >= order.length) {
          setDone(true);
          pitch.stopListening();
          try {
            logPerf({ tool: 'arpeggio', item: [].concat(step.arp).join('+'), durationMs: Date.now() - startedAt.current, metrics: { notes: order.length } });
          } catch {
            /* logging never breaks the lesson */
          }
          onPass?.();
        } else setAt(at + 1);
      }
    } else hits.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitch.currentNote]);
  useEffect(() => () => pitch.stopListening(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const listen = () => {
    if (pitch.isListening) {
      pitch.stopListening();
      return;
    }
    if (done) {
      setDone(false);
      setAt(0);
    }
    hits.current = 0;
    pitch.startListening();
  };

  return (
    <>
      {step.text && <p className="tc-text">{tx(step.text)}</p>}
      <NoteStrip notes={order} at={at} done={done} fingers={labels === 'finger'} />
      <span className="tc-actions">
        <button type="button" className={'tc-btn' + (pitch.isListening ? '' : ' is-primary')} onClick={listen}>
          {pitch.isListening ? t('teacher.step.stop') : done ? t('teacher.step.again') : t('teacher.step.listen')}
        </button>
        <button type="button" className="tc-btn" onClick={() => playArp(step.arp, step.updown)}>
          {t('teacher.step.hear')}
        </button>
      </span>
      <p className={'tc-mic-state is-' + (done ? 'ok' : pitch.isListening ? 'listening' : 'idle')} aria-live="polite">
        {done
          ? '✓ ' + t('teacher.arp.done', { n: order.length })
          : pitch.isListening
          ? t('teacher.arp.next', { n: at + 1, m: order.length, note: '\u2066' + order[at].noteName + '\u2069' })
          : ''}
        {pitch.error && <span className="tc-error">{String(pitch.error)}</span>}
      </p>
    </>
  );
}

// ---- the player --------------------------------------------------------------

export function HomeworkList({ items, tx, onPractise }) {
  const { t } = useLanguage();
  const [state] = useTeacher();
  return (
    <ul className="tc-hw">
      {items.map(({ item, lesson }) => {
        const st = homeworkStatus(item, state);
        return (
          <li key={(lesson?.id ?? '') + item.id} className="tc-hw-row">
            <span className={'tc-hw-mark' + (st.doneToday ? ' is-done' : '')} aria-hidden="true">
              {st.doneToday ? '✓' : ''}
            </span>
            <span className="tc-hw-body">
              <span className="tc-hw-text">{tx(item.text)}</span>
              {st.kind === 'changes' ? (
                <span className="tc-hw-meta">
                  {st.bestToday != null ? t('teacher.hw.today', { n: st.bestToday }) : t('teacher.hw.notToday')} · {t('teacher.hw.target', { n: item.min })} ·{' '}
                  {t('teacher.hw.days', { n: st.daysMet })}
                </span>
              ) : st.kind === 'play' ? (
                <span className="tc-hw-meta">
                  {st.doneToday ? t('teacher.hw.doneToday') : t('teacher.hw.notToday')} · {t('teacher.hw.days', { n: st.daysMet })}
                </span>
              ) : (
                <span className="tc-hw-meta">{t('teacher.hw.daily')}</span>
              )}
            </span>
            {(item.kind === 'changes' || item.kind === 'play') && onPractise && (
              <button type="button" className="tc-btn" onClick={() => onPractise(item)}>
                {t('teacher.hw.practise')}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function LessonPlayer({ lesson, onClose, onStage }) {
  const { t, lang } = useLanguage();
  const tx = useCallback((x) => (x ? x[lang] ?? x.en : ''), [lang]);
  const [leftHanded] = useLeftHanded();
  const [state] = useTeacher();
  const saved = state.lessons[lesson.id];
  const [i, setI] = useState(() => (saved && !saved.done ? Math.min(saved.at ?? 0, lesson.steps.length - 1) : 0));
  const [finished, setFinished] = useState(false);
  const [ticks, setTicks] = useState({});
  const [picked, setPicked] = useState(null);
  const [tuned, setTuned] = useState(false);
  const step = lesson.steps[i];
  const topRef = useRef(null);

  useEffect(() => {
    reachStep(lesson.id, i);
    setTicks({});
    setPicked(null);
    topRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [lesson.id, i]);

  // The neck below shows the chord this step is about (empty otherwise).
  const shape = finished ? null : step.shape ?? step.chord ?? null;
  useEffect(() => {
    // tuner / one-minute changes have their own display: no neck under them
    const noNeck = !finished && (step.kind === 'tune' || step.kind === 'changes');
    if (!finished && step.kind === 'play') return; // PlayStep draws its own (with the current note)
    if (!finished && step.kind === 'arp') {
      onStage?.(arpStage(step.arp, step.labels));
      return;
    }
    onStage?.(noNeck ? null : shape ? stageFor(shape) : { position: null });
  }, [shape, onStage, finished, step]);

  const pass = (skillId) => skillById(skillId) && recordPass(skillId);

  // Gates: a checklist needs every tick, a quiz the right answer.
  const canNext =
    step.kind === 'checklist' ? step.items.every((_, k) => ticks[k]) : step.kind === 'quiz' ? picked === step.answer : true;

  const next = () => {
    // measured steps (play) pass only when the mic heard them, never by Next
    if (step.skill && step.kind !== 'tune' && step.kind !== 'play') pass(step.skill);
    if (i < lesson.steps.length - 1) setI(i + 1);
    else {
      finishLesson(lesson.id);
      setFinished(true);
    }
  };

  if (finished) {
    return (
      <div className="tc-lesson" ref={topRef}>
        <div className="tc-card tc-done">
          <div className="tc-done-mark" aria-hidden="true">
            ✓
          </div>
          <h2>{t('teacher.done.title')}</h2>
          <p className="tc-text">{t('teacher.done.text')}</p>
          {lesson.homework && <HomeworkList items={lesson.homework.map((item) => ({ item, lesson }))} tx={tx} />}
          <button type="button" className="tc-btn is-primary" onClick={onClose}>
            {t('teacher.done.ok')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tc-lesson" ref={topRef}>
      <div className="tc-lesson-head">
        <button type="button" className="tc-close" onClick={onClose} aria-label={t('teacher.step.close')}>
          ×
        </button>
        <div className="tc-lesson-title">
          <span className="tc-eyebrow">{tx(lesson.title)}</span>
          <span className="tc-progress" aria-label={t('teacher.next.step', { n: i + 1, m: lesson.steps.length })}>
            {lesson.steps.map((_, k) => (
              <span key={k} className={k < i ? 'is-past' : k === i ? 'is-now' : ''} />
            ))}
          </span>
        </div>
      </div>

      <div className="tc-card tc-step" key={i}>
        <h2>{tx(step.title)}</h2>
        {step.kind === 'explain' && <ExplainStep step={step} tx={tx} leftHanded={leftHanded} />}
        {step.kind === 'tune' && (
          <TuneStep
            step={step}
            tx={tx}
            done={tuned}
            onDone={() => {
              setTuned(true);
              if (step.skill) pass(step.skill);
              next();
            }}
          />
        )}
        {step.kind === 'checklist' && <ChecklistStep step={step} tx={tx} ticks={ticks} setTicks={setTicks} />}
        {step.kind === 'quiz' && <QuizStep step={step} tx={tx} picked={picked} setPicked={setPicked} />}
        {step.kind === 'chord' && (
          <ChordStep step={step} tx={tx} leftHanded={leftHanded} passed={false} onPass={() => pass(`chord-${step.chord}`)} />
        )}
        {step.kind === 'changes' && <ChangesStep step={step} tx={tx} />}
        {step.kind === 'arp' && <ArpStep step={step} tx={tx} />}
        {step.kind === 'play' && <PlayStep step={step} tx={tx} onStage={onStage} onPass={() => step.skill && pass(step.skill)} />}
      </div>

      <div className="tc-nav">
        <button type="button" className="tc-btn" disabled={i === 0} onClick={() => setI(i - 1)}>
          {t('teacher.step.back')}
        </button>
        <span className="tc-count">
          {i + 1} / {lesson.steps.length}
        </span>
        <button type="button" className="tc-btn is-primary" disabled={!canNext} onClick={next}>
          {i === lesson.steps.length - 1 ? t('teacher.step.finish') : t('teacher.step.next')}
        </button>
      </div>
    </div>
  );
}
