// One lesson, step by step (curriculum/guitar.js step kinds): explain / tune /
// checklist / quiz / chord (the mic hears the shape) / changes (one-minute
// changes, inline). Measured checks record a pass; the furthest step is
// remembered so a lesson can be continued.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useLeftHanded } from '../Fretboard/handedness';
import { ChordBox } from '../ChordLibrary/ChordBox';
import { GuitarTuner } from '../GuitarTuner/GuitarTuner';
import { MinuteChanges } from '../MinuteChanges/MinuteChanges';
import { playMidis } from '../../audio/chordPlayer';
import { useMicChordDetector } from '../../hooks/useMicChordDetector';
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

function ChordStep({ step, tx, leftHanded, passed, onPass }) {
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

// ---- the player --------------------------------------------------------------

export function HomeworkList({ items, tx, onPractise }) {
  const { t } = useLanguage();
  return (
    <ul className="tc-hw">
      {items.map(({ item, lesson }) => {
        const st = homeworkStatus(item);
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
              ) : (
                <span className="tc-hw-meta">{t('teacher.hw.daily')}</span>
              )}
            </span>
            {item.kind === 'changes' && onPractise && (
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
    onStage?.(noNeck ? null : shape ? stageFor(shape) : { position: null });
  }, [shape, onStage, finished, step.kind]);

  const pass = (skillId) => skillById(skillId) && recordPass(skillId);

  // Gates: a checklist needs every tick, a quiz the right answer.
  const canNext =
    step.kind === 'checklist' ? step.items.every((_, k) => ticks[k]) : step.kind === 'quiz' ? picked === step.answer : true;

  const next = () => {
    if (step.skill && step.kind !== 'tune') pass(step.skill);
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
