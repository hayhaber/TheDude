// The piano teacher (v1.0.294) — the piano's Learn tab, next to Theory.
// One screen like the guitar teacher's: the next lesson as the hero, my
// progress, today's practice; a lesson = steps (explain / checklist / quiz /
// staff / play). A play step lights the next key; the student plays it on a
// REAL piano (the mic hears it) or on the keys below (exact). Content and
// order: teacher/curriculum/piano.js.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { BackButton } from '../HomeButton/BackButton';
import { MoreMenu } from '../MoreMenu/MoreMenu';
import { LibraryRow } from '../PracticeView/PracticeHome';
import { ChecklistStep } from '../Teacher/LessonPlayer';
import { StaffNotation } from '../StaffNotation/StaffNotation';
import { usePitchDetection } from '../../hooks/usePitchDetection';
import { useMicChordDetector } from '../../hooks/useMicChordDetector';
import { schedulePianoNotes, preparePiano } from '../../audio/pianoPlayer';
import { getAudioContext } from '../../audio/audioContext';
import { logPerf } from '../../coach/perfLog';
import { PIANO_LESSONS, PIANO_LEVELS, noteName, parseEvents, pcName, pianoSkillById } from '../../teacher/curriculum/piano';
import { nextPianoLesson, pianoHomework, pianoHomeworkStatus, pianoProgress } from '../../teacher/pianoTeacher';
import { pianoTeacherStore } from '../../teacher/teacherState';
import '../Teacher/Teacher.css';
import './PianoTeacher.css';

const { useTeacher, saveIntake, recordPass, reachStep, finishLesson } = pianoTeacherStore;
const L = (en, he) => ({ en, he });
const iso = (s) => '⁦' + s + '⁩';

// ---- sound ----------------------------------------------------------------------------

let stopHear = null;
let hearTimers = [];
let hearCb = null;
/** Play the events; onStep(i) as event i SOUNDS (-1 at the end / when cut). */
function hear(events, bpm = 76, onStep = null) {
  try {
    if (typeof stopHear === 'function') stopHear();
  } catch {
    /* already stopped */
  }
  hearTimers.forEach(clearTimeout);
  hearTimers = [];
  if (hearCb) hearCb(-1);
  hearCb = onStep;
  const beat = 60 / bpm;
  const notes = [];
  const lead = 0.06;
  const ctx = getAudioContext();
  const lag = (ctx.outputLatency || ctx.baseLatency || 0) + lead;
  let t = 0;
  events.forEach((ev, i) => {
    for (const n of ev.notes) if (n.midi != null) notes.push({ midi: n.midi, start: t, dur: Math.max(0.3, ev.beats * beat * 0.95) });
    if (onStep) hearTimers.push(setTimeout(() => onStep(i), (t + lag) * 1000));
    t += ev.beats * beat;
  });
  if (onStep)
    hearTimers.push(
      setTimeout(() => {
        if (hearCb === onStep) hearCb = null;
        onStep(-1);
      }, (t + lag) * 1000 + 150)
    );
  stopHear = schedulePianoNotes(notes, ctx.currentTime + lead);
}
/** Cut a playing Hear (a step left / closed). */
function stopHearing() {
  try {
    if (typeof stopHear === 'function') stopHear();
  } catch {
    /* ok */
  }
  stopHear = null;
  hearTimers.forEach(clearTimeout);
  hearTimers = [];
  if (hearCb) hearCb(-1);
  hearCb = null;
}

/** [index of the event sounding now (-1 = none), play(events, bpm)] */
function useHearing() {
  const [now, setNow] = useState(-1);
  const play = useCallback((events, bpm) => hear(events, bpm, setNow), []);
  useEffect(
    () => () => {
      if (hearCb === setNow) stopHearing();
    },
    []
  );
  return [now, play];
}

/** The keyboard while event `ev` sounds: its keys lit, every finger number kept. */
function hearStage(ev, all) {
  return {
    notes: [],
    playNotes: ev.notes.filter((n) => n.midi != null).map((n) => ({ midi: n.midi, hand: handOf(n) })),
    fingerNumbers: all?.fingerNumbers ?? ev.notes.filter((n) => n.finger).map((n) => ({ midi: n.midi, finger: n.finger })),
  };
}
const activeFingers = (ev) => (ev ? ev.notes.filter((n) => n.finger).map((n) => ({ hand: n.hand === 'L' ? 'L' : 'R', finger: n.finger })) : []);

// ---- the hands picture: fingers numbered 1–5, the sounding one lit -------------------
// Seen from above, palms down: the thumbs point to each other (left hand on the
// left). Only digits inside the SVG — the words are HTML (WebKit reverses
// Hebrew in SVG <text>).
const FINGERS_R = [
  { f: 1, x1: 54, y1: 142, x2: 16, y2: 98, w: 24 },
  { f: 2, x1: 58, y1: 108, x2: 56, y2: 34, w: 21 },
  { f: 3, x1: 81, y1: 104, x2: 81, y2: 20, w: 21 },
  { f: 4, x1: 104, y1: 108, x2: 106, y2: 30, w: 20 },
  { f: 5, x1: 124, y1: 116, x2: 130, y2: 58, w: 18 },
];
function OneHand({ side, active }) {
  const m = side === 'L' ? (x) => 150 - x : (x) => x;
  const fs = FINGERS_R.map((d) => ({ ...d, x1: m(d.x1), x2: m(d.x2) }));
  const on = (f) => active.some((a) => a.hand === side && a.finger === f);
  const palmX = side === 'L' ? 150 - 38 - 92 : 38;
  return (
    <svg className="pt-hand" viewBox="0 0 150 180" aria-hidden="true">
      <g className="pt-hand-rim">
        {fs.map((d) => (
          <line key={d.f} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} strokeWidth={d.w + 3} />
        ))}
        <rect x={palmX - 1.5} y={90.5} width={95} height={81} rx={25} />
      </g>
      <g className="pt-hand-skin">
        {fs.map((d) => (
          <line key={d.f} className={on(d.f) ? 'is-on' : ''} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} strokeWidth={d.w} />
        ))}
        <rect x={palmX} y={92} width={92} height={78} rx={24} />
      </g>
      {fs.map((d) => (
        <g key={d.f} className={'pt-hand-badge' + (on(d.f) ? ' is-on' : '')}>
          <circle cx={d.x2} cy={d.y2 + 4} r={10.5} />
          <text x={d.x2} y={d.y2 + 8.5} textAnchor="middle">
            {d.f}
          </text>
        </g>
      ))}
    </svg>
  );
}
function HandsPicture({ hands = 'both', active = [] }) {
  const { t } = useLanguage();
  const show = hands === 'both' ? ['L', 'R'] : [hands];
  return (
    <div className="pt-hands" dir="ltr">
      {show.map((side) => (
        <figure key={side} className="pt-hands-one">
          <OneHand side={side} active={active} />
          <figcaption>{t(side === 'L' ? 'pt.hand.left' : 'pt.hand.right')}</figcaption>
        </figure>
      ))}
    </div>
  );
}

const handOf = (n) => (n.hand === 'L' ? 'left' : 'right');
const VF = { 4: 'w', 2: 'h', 1: 'q', 0.5: '8' };

function Staff({ staff, highlight = null }) {
  const notes = useMemo(() => parseEvents(staff.notes).map((e) => ({ midi: e.notes[0].midi, duration: VF[e.beats] ?? 'q' })), [staff.notes]);
  return (
    <div className="pt-staff" dir="ltr">
      <StaffNotation notes={notes} clef={staff.clef} width={Math.min(420, 90 + notes.length * 44)} highlightMidi={highlight} />
    </div>
  );
}

/** What a step shows on the keyboard when it isn't a play step. */
function keysStage(src, opts) {
  if (!src) return { notes: [] };
  const evs = parseEvents(src, opts);
  const notes = [];
  const fingers = [];
  const seen = new Set();
  for (const ev of evs)
    for (const n of ev.notes) {
      if (n.midi == null || seen.has(n.midi)) continue;
      seen.add(n.midi);
      notes.push({ midi: n.midi, hand: handOf(n) });
      if (n.finger) fingers.push({ midi: n.midi, finger: n.finger });
    }
  return { notes: [], playNotes: notes, fingerNumbers: fingers };
}

// ---- steps ----------------------------------------------------------------------------

function QuizStep({ step, tx, picked, setPicked }) {
  const { t } = useLanguage();
  return (
    <>
      {step.staff && <Staff staff={step.staff} />}
      <p className="tc-question">{tx(step.question)}</p>
      {step.listen && (
        <span className="tc-actions">
          <button type="button" className="tc-btn is-primary" onClick={() => hear(parseEvents(step.listen), 60)}>
            {t('teacher.step.hear')}
          </button>
        </span>
      )}
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

const evLabel = (ev) =>
  ev.notes
    .map((n) => (n.any ? pcName(n.pc) : noteName(n.midi)))
    .join(' + ');

// The mic: a real piano. Single notes = the pitch detector (exact octave,
// a repeated note must be struck again); notes together = the chroma (which
// notes sound, any octave) — two agreeing reads in a row.
function chromaHit(c, ev) {
  if (!c) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += c[i];
  if (sum <= 0) return false;
  const pcs = [...new Set(ev.notes.map((n) => (n.any ? n.pc : n.midi % 12)))];
  const v = (pc) => c[pc] / sum;
  const max = Math.max(...Array.from(c, (x) => x / sum));
  if (pcs.length === 1) return v(pcs[0]) >= 0.22 && v(pcs[0]) >= max * 0.8;
  const inside = pcs.reduce((a, pc) => a + v(pc), 0);
  return inside >= 0.55 && pcs.every((pc) => v(pc) >= 0.3 / pcs.length);
}

function PlayStep({ step, tx, setStage, noteRef, onPass }) {
  const { t } = useLanguage();
  const events = useMemo(() => parseEvents(step.notes, { hand: step.hand, split: step.split }), [step.notes, step.hand, step.split]);
  const single = events.every((e) => e.notes.length === 1);
  const [at, setAt] = useState(0);
  const [done, setDone] = useState(false);
  const [wrong, setWrong] = useState(null);
  const atRef = useRef(0);
  atRef.current = at;
  const doneRef = useRef(false);
  doneRef.current = done;
  const startedAt = useRef(0);
  const pitch = usePitchDetection();
  const chroma = useMicChordDetector();
  const listening = single ? pitch.isListening : chroma.isListening;
  const [heardAt, playHear] = useHearing();

  const advance = useCallback(
    (by) => {
      const k = atRef.current;
      if (doneRef.current) return;
      if (k === 0) startedAt.current = Date.now();
      if (k + 1 >= events.length) {
        setDone(true);
        doneRef.current = true;
        pitch.stopListening();
        chroma.stopListening();
        try {
          logPerf({ tool: 'pianoLesson', item: step.skill || step.notes.slice(0, 40), durationMs: Date.now() - startedAt.current, metrics: { notes: events.length, by } });
        } catch {
          /* never breaks the lesson */
        }
        onPass?.();
      } else {
        atRef.current = k + 1;
        setAt(k + 1);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events]
  );

  // the keyboard: the next event lit (green right hand / blue left), its fingers
  useEffect(() => {
    if (heardAt >= 0 && events[heardAt]) return setStage(hearStage(events[heardAt]));
    const ev = done ? null : events[at];
    setStage({
      notes: [],
      playNotes: ev ? ev.notes.filter((n) => n.midi != null).map((n) => ({ midi: n.midi, hand: handOf(n) })) : [],
      fingerNumbers: ev ? ev.notes.filter((n) => n.finger).map((n) => ({ midi: n.midi, finger: n.finger })) : [],
      quizFeedbackKey: wrong != null ? { midi: wrong, correct: false } : null,
    });
  }, [at, done, wrong, events, setStage, heardAt]);

  // screen keys / MIDI: exact notes; keys of a chord pressed together
  const held = useRef(new Map());
  const wrongTimer = useRef(0);
  useEffect(() => {
    noteRef.current = (e) => {
      // a key pressed in the last 0.9 s counts as "together" (held or not)
      if (e.type !== 'on') return;
      const now = performance.now();
      held.current.set(e.midi, now);
      if (doneRef.current) return;
      const ev = events[atRef.current];
      if (!ev) return;
      const fits = ev.notes.some((n) => (n.any ? e.midi % 12 === n.pc : n.midi === e.midi));
      if (!fits) {
        setWrong(e.midi);
        clearTimeout(wrongTimer.current);
        wrongTimer.current = setTimeout(() => setWrong(null), 450);
        return;
      }
      const all = ev.notes.every((n) => {
        if (n.any) return true;
        const at0 = held.current.get(n.midi);
        return at0 != null && now - at0 < 900;
      });
      if (all) advance('keys');
    };
    return () => {
      noteRef.current = null;
    };
  }, [events, noteRef, advance]);
  useEffect(() => () => clearTimeout(wrongTimer.current), []);

  // mic, single notes (the guitar teacher's wait mode)
  const hits = useRef(0);
  const lastNote = useRef(null);
  const reattack = useRef({ need: false, minLevel: 1 });
  useEffect(() => {
    if (!single || !pitch.isListening || done) return;
    const n = pitch.currentNote;
    const ev = events[at];
    const level = pitch.inputLevel ?? 0;
    const ra = reattack.current;
    ra.minLevel = Math.min(ra.minLevel, level);
    if (ra.need && (!n || (level > ra.minLevel * 1.6 && level - ra.minLevel > 0.03))) ra.need = false;
    if (!n || !ev) {
      hits.current = 0;
      return;
    }
    if (ra.need || lastNote.current === n) return;
    lastNote.current = n;
    const want = ev.notes[0];
    const ok = want.any ? n.midi % 12 === want.pc : n.midi === want.midi && Math.abs(n.centsOff ?? 0) < 45;
    if (!ok) {
      hits.current = 0;
      return;
    }
    hits.current += 1;
    if (hits.current < 2) return;
    hits.current = 0;
    const nxt = events[at + 1]?.notes[0];
    if (nxt && (want.any ? nxt.any && nxt.pc === want.pc : nxt.midi === want.midi)) reattack.current = { need: true, minLevel: level };
    advance('mic');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitch.currentNote, pitch.inputLevel]);

  // mic, notes together: the chroma, read every 120 ms
  useEffect(() => {
    if (single || !chroma.isListening || done) return undefined;
    let streak = 0;
    let quietUntil = 0;
    const id = setInterval(() => {
      const now = performance.now();
      if (now < quietUntil) return;
      const ev = events[atRef.current];
      if (!ev) return;
      if (chromaHit(chroma.averageChroma(3), ev)) streak += 1;
      else streak = 0;
      if (streak >= 2) {
        streak = 0;
        const prev = ev;
        advance('mic');
        const nxt = events[atRef.current];
        // the same notes again must be played again: give them time
        quietUntil = now + (nxt && evLabel(nxt) === evLabel(prev) ? 520 : 260);
      }
    }, 120);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [single, chroma.isListening, done, events]);
  useEffect(
    () => () => {
      pitch.stopListening();
      chroma.stopListening();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const listen = () => {
    if (listening) {
      (single ? pitch : chroma).stopListening();
      return;
    }
    if (done) restart();
    hits.current = 0;
    (single ? pitch : chroma).startListening();
  };
  const restart = () => {
    setDone(false);
    doneRef.current = false;
    setAt(0);
    atRef.current = 0;
  };
  const ev = events[at];
  const fingers = ev?.notes.filter((n) => n.finger).map((n) => n.finger);
  const err = pitch.error || chroma.error;
  return (
    <>
      {step.text && <p className="tc-text">{tx(step.text)}</p>}
      {step.staff && <Staff staff={step.staff} highlight={heardAt >= 0 ? events[heardAt]?.notes[0]?.midi ?? null : null} />}
      <div className="pt-progress" aria-hidden="true">
        <span style={{ width: Math.round(((done ? events.length : at) / events.length) * 100) + '%' }} />
      </div>
      <p className={'tc-mic-state is-' + (done ? 'ok' : listening ? 'listening' : 'idle')} aria-live="polite">
        {done
          ? '✓ ' + t('pt.done', { n: events.length })
          : t('pt.next', { n: at + 1, m: events.length, note: iso(evLabel(ev)) }) + (fingers?.length ? ' · ' + t('pt.finger', { f: iso(fingers.join('-')) }) : '')}
      </p>
      <span className="tc-actions">
        <button type="button" className={'tc-btn' + (listening ? '' : ' is-primary')} onClick={listen}>
          {listening ? t('teacher.step.stop') : t('pt.listen')}
        </button>
        <button type="button" className="tc-btn" onClick={() => playHear(events, step.bpm ?? 76)}>
          {t('teacher.step.hear')}
        </button>
        {(done || at > 0) && (
          <button type="button" className="tc-btn" onClick={restart}>
            {t('teacher.step.again')}
          </button>
        )}
      </span>
      <p className="tc-hint">{listening ? t('pt.hintMic') : t('pt.hint')}</p>
      {err && <p className="tc-error">{String(err)}</p>}
    </>
  );
}

// ---- the lesson ----------------------------------------------------------------------

function HomeworkRows({ items, tx, onPractise }) {
  const { t } = useLanguage();
  const [state] = useTeacher();
  return (
    <ul className="tc-hw">
      {items.map(({ item, lesson }) => {
        const st = pianoHomeworkStatus(item, state);
        return (
          <li key={lesson.id + item.id} className="tc-hw-row">
            <span className={'tc-hw-mark' + (st.doneToday ? ' is-done' : '')} aria-hidden="true">
              {st.doneToday ? '✓' : ''}
            </span>
            <span className="tc-hw-body">
              <span className="tc-hw-text">{tx(item.text)}</span>
              <span className="tc-hw-meta">
                {item.kind === 'play'
                  ? `${st.doneToday ? t('teacher.hw.doneToday') : t('teacher.hw.notToday')} · ${t('teacher.hw.days', { n: st.daysMet })}`
                  : t('teacher.hw.daily')}
              </span>
            </span>
            {item.kind === 'play' && onPractise && (
              <button type="button" className="tc-btn" onClick={() => onPractise(lesson, item.step)}>
                {t('teacher.hw.practise')}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function LessonPlayer({ lesson, startAt = null, onClose, setStage, noteRef, metro }) {
  const { t, lang } = useLanguage();
  const tx = useCallback((x) => (x ? x[lang] ?? x.en : ''), [lang]);
  const [state] = useTeacher();
  const saved = state.lessons[lesson.id];
  const [i, setI] = useState(() => startAt ?? (saved && !saved.done ? Math.min(saved.at ?? 0, lesson.steps.length - 1) : 0));
  const [finished, setFinished] = useState(false);
  const [ticks, setTicks] = useState({});
  const [picked, setPicked] = useState(null);
  const step = lesson.steps[i];
  const topRef = useRef(null);
  const [heardAt, playHear] = useHearing();
  const stepEvents = useMemo(() => {
    const src = step.keys ?? step.staff?.notes;
    return src && step.kind !== 'play' ? parseEvents(src, { hand: step.hand, split: step.split }) : [];
  }, [step]);

  useEffect(() => {
    preparePiano();
  }, []);
  useEffect(() => {
    reachStep(lesson.id, i);
    stopHearing();
    setTicks({});
    setPicked(null);
    topRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [lesson.id, i]);

  // the keyboard under the step (a play step draws its own)
  useEffect(() => {
    if (finished) return setStage(null);
    if (step.kind === 'play') return;
    if (step.kind === 'quiz' && !step.listen) return setStage(null);
    const all = keysStage(step.keys ?? step.staff?.notes, { hand: step.hand, split: step.split });
    if (heardAt >= 0 && stepEvents[heardAt]) return setStage(hearStage(stepEvents[heardAt], all));
    setStage(all);
  }, [finished, step, setStage, heardAt, stepEvents]);

  const pass = (id) => pianoSkillById(id) && recordPass(id);
  const canNext = step.kind === 'checklist' ? step.items.every((_, k) => ticks[k]) : step.kind === 'quiz' ? picked === step.answer : true;
  const next = () => {
    if (step.skill && step.kind !== 'play') pass(step.skill);
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
          <p className="tc-text">{t('pt.doneText')}</p>
          {lesson.homework && <HomeworkRows items={lesson.homework.map((item) => ({ item, lesson }))} tx={tx} />}
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
        {step.kind === 'explain' && (
          <>
            {step.visual === 'hands' && <HandsPicture hands={step.hands} active={activeFingers(heardAt >= 0 ? stepEvents[heardAt] : null)} />}
            <p className="tc-text">{tx(step.text)}</p>
            {step.keys && (
              <span className="tc-actions">
                <button type="button" className="tc-btn" onClick={() => playHear(stepEvents, step.visual === 'hands' ? 72 : 96)}>
                  {t('teacher.step.hear')}
                </button>
              </span>
            )}
          </>
        )}
        {step.kind === 'staff' && (
          <>
            <p className="tc-text">{tx(step.text)}</p>
            <Staff staff={step.staff} highlight={heardAt >= 0 ? stepEvents[heardAt]?.notes[0]?.midi ?? null : null} />
            <span className="tc-actions">
              <button type="button" className="tc-btn" onClick={() => playHear(stepEvents, 72)}>
                {t('teacher.step.hear')}
              </button>
            </span>
          </>
        )}
        {step.kind === 'checklist' && <ChecklistStep step={step} tx={tx} ticks={ticks} setTicks={setTicks} metro={metro} />}
        {step.kind === 'quiz' && <QuizStep step={step} tx={tx} picked={picked} setPicked={setPicked} />}
        {step.kind === 'play' && <PlayStep step={step} tx={tx} setStage={setStage} noteRef={noteRef} onPass={() => step.skill && pass(step.skill)} />}
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

// ---- the screens ----------------------------------------------------------------------

const START = [
  { key: 'none', title: L('Never — I’m new to the piano', 'אף פעם — אני חדש בפסנתר'), desc: L('From sitting at the keys to your first melody', 'מהישיבה ליד הקלידים ועד המנגינה הראשונה') },
  { key: 'little', title: L('A little — simple tunes, one hand', 'קצת — מנגינות פשוטות, יד אחת'), desc: L('Reading notes, both hands, first chords', 'קריאת תווים, שתי ידיים, אקורדים ראשונים') },
  { key: 'some', title: L('Yes — both hands and chords', 'כן — שתי ידיים ואקורדים'), desc: L('Scales, triads, minor, accompaniment', 'סולמות, משולשים, מינור, ליווי') },
];

function StartPick({ tx, onPick, current }) {
  return (
    <div className="ph-group pt-start">
      {START.map((s, k) => (
        <LibraryRow key={s.key} color={['#34c759', '#007aff', '#af52de'][k]} icon="freeplay" title={tx(s.title)} desc={tx(s.desc)} tag={current === s.key ? '✓' : undefined} tagTone="neutral" onClick={() => onPick(s.key)} />
      ))}
    </div>
  );
}

function PathList({ state, tx, onOpen }) {
  const now = nextPianoLesson(state);
  return PIANO_LEVELS.map((lv) => (
    <div key={lv.n} className="tc-section">
      <span className="tc-section-head">
        {tx(L(`Level ${lv.n} · ${lv.grade}`, `רמה ${lv.n} · ${lv.grade}`))} — {tx(lv.title)}
      </span>
      <div className="ph-group">
        {PIANO_LESSONS.filter((l) => l.level === lv.n).map((l) => {
          const st = state.lessons[l.id]?.done ? 'done' : now?.id === l.id ? 'now' : 'todo';
          return (
            <button key={l.id} type="button" className={'ph-row tc-path-row is-' + st} onClick={() => onOpen(l)}>
              <span className="tc-path-mark" aria-hidden="true">
                {st === 'done' ? '✓' : st === 'now' ? '●' : ''}
              </span>
              <span className="ph-text">
                <span className="ph-title">{tx(l.title)}</span>
                <span className="ph-desc">{tx(l.objective)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  ));
}

export function PianoTeacherView({ onStage, noteRef, metro, initialScreen = null }) {
  const { t, lang } = useLanguage();
  const tx = useCallback((x) => (x ? x[lang] ?? x.en : ''), [lang]);
  const [state] = useTeacher();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const [screen, setScreen] = useState('home');
  const [lesson, setLesson] = useState(null);
  const [startAt, setStartAt] = useState(null);
  const setStage = useCallback((s) => onStage?.(s), [onStage]);

  // the card's Lesson shortcut: straight into the next lesson
  useEffect(() => {
    if (initialScreen !== 'lesson' || !state.intake) return;
    const l = nextPianoLesson(state);
    if (l) {
      setLesson(l);
      setScreen('lesson');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // the keyboard only inside a lesson
  useEffect(() => {
    if (screen !== 'lesson') setStage(null);
  }, [screen, setStage]);
  useEffect(() => () => onStage?.(null), [onStage]);

  const open = (l, at = null) => {
    setLesson(l);
    setStartAt(at);
    setScreen('lesson');
  };
  const back = () => setScreen('home');

  if (screen === 'lesson' && lesson)
    return (
      <div className="teacher piano-teacher" dir={dir}>
        <LessonPlayer key={lesson.id + ':' + startAt} lesson={lesson} startAt={startAt} onClose={back} setStage={setStage} noteRef={noteRef} metro={metro} />
      </div>
    );

  const sub = (title, body) => (
    <div className="teacher piano-teacher" dir={dir}>
      <div className="tc-subhead">
        <BackButton label={t('pt.title')} onClick={back} />
        {title && <h1 className="tc-subtitle-h">{title}</h1>}
      </div>
      {body}
    </div>
  );
  if (screen === 'path') return sub(t('teacher.path.title'), <PathList state={state} tx={tx} onOpen={(l) => open(l)} />);
  if (screen === 'start')
    return sub(
      t('pt.startTitle'),
      <>
        <p className="tc-text">{t('pt.startText')}</p>
        <StartPick
          tx={tx}
          current={state.intake?.experience}
          onPick={(k) => {
            saveIntake({ ...(state.intake ?? {}), experience: k });
            back();
          }}
        />
      </>
    );

  const prog = pianoProgress(state);
  const next = prog.next;
  const saved = next && state.lessons[next.id];
  const inProgress = saved && !saved.done && (saved.at ?? 0) > 0;
  const hw = pianoHomework(state);
  const level = PIANO_LEVELS.find((l) => l.n === prog.level);

  return (
    <div className="teacher piano-teacher" dir={dir}>
      <div className="tc-top">
        <h1>{t('pt.title')}</h1>
        {state.intake && (
          <MoreMenu label={t('teacher.more')}>
            <button type="button" className="more-menu-item" onClick={() => setScreen('path')}>
              {t('teacher.path.title')}
            </button>
            <button type="button" className="more-menu-item" onClick={() => setScreen('start')}>
              {t('pt.startTitle')}
            </button>
          </MoreMenu>
        )}
      </div>

      {!state.intake ? (
        <>
          <div className="tc-card tc-hero">
            <span className="tc-eyebrow">{t('pt.helloEyebrow')}</span>
            <h2>{t('pt.hello')}</h2>
            <p className="tc-text">{t('pt.helloText')}</p>
          </div>
          <div className="tc-section">
            <span className="tc-section-head">{t('pt.startTitle')}</span>
            <StartPick tx={tx} onPick={(k) => saveIntake({ experience: k })} />
          </div>
        </>
      ) : (
        <>
          {next ? (
            <div className="tc-card tc-hero">
              <span className="tc-eyebrow">
                {tx(L(`Level ${next.level} · ${level?.grade ?? ''}`, `רמה ${next.level} · ${level?.grade ?? ''}`))}
              </span>
              <h2>{tx(next.title)}</h2>
              <span className="tc-meta">
                {[t('teacher.next.min', { n: next.minutes }), inProgress ? t('teacher.next.step', { n: (saved.at ?? 0) + 1, m: next.steps.length }) : null].filter(Boolean).join(' · ')}
              </span>
              <p className="tc-text">{tx(next.objective)}</p>
              <button type="button" className="tc-btn is-primary tc-hero-btn" onClick={() => open(next)}>
                {inProgress ? t('teacher.next.continue') : t('teacher.next.start')}
              </button>
            </div>
          ) : (
            <div className="tc-card tc-hero">
              <h2>{t('teacher.next.allDone')}</h2>
            </div>
          )}

          <div className="ph-group">
            <button type="button" className="ph-row tc-progress-row" onClick={() => setScreen('path')}>
              <span className="ph-tile" style={{ background: '#34c759' }} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M4 18c4 0 4-12 8-12s4 12 8 12" />
                </svg>
              </span>
              <span className="ph-text">
                <span className="ph-title">{tx(L('My progress', 'ההתקדמות שלי'))}</span>
                <span className="ph-desc">
                  {tx(L(`Level ${prog.level} · lesson ${prog.at} of ${prog.of} · ${prog.done} of ${prog.total} done`, `רמה ${prog.level} · שיעור ${prog.at} מתוך ${prog.of} · ${prog.done} מתוך ${prog.total} הושלמו`))}
                </span>
                <span className="tc-pbar" aria-hidden="true">
                  <span style={{ width: Math.round(prog.share * 100) + '%' }} />
                </span>
              </span>
              <span className="ph-chev" aria-hidden="true">
                <svg viewBox="0 0 8 14" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1.5 1.5L6.5 7l-5 5.5" />
                </svg>
              </span>
            </button>
          </div>

          {hw.length > 0 && (
            <div className="tc-section">
              <span className="tc-section-head">{tx(L('Today’s practice', 'התרגול של היום'))}</span>
              <div className="tc-card">
                <HomeworkRows items={hw} tx={tx} onPractise={(l, at) => open(l, at)} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
