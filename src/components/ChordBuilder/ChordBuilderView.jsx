// Studies -> Chord Structure (user's request 2026-10-20). Every chord type
// is taught as the open E or A chord with one or two fingers moved (one fret
// = one semitone), then barred up the neck like the plain barre chords the
// student already knows. Lessons: the 1-3-5 map, sliding the barre, one
// lesson per chord type, mixed practice. Practice is checked with the mic
// (judgeShape: the target shape's harmonic model vs. the shape it came
// from). Pure logic in music/chordBuilder.js.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useLeftHanded } from '../Fretboard/handedness';
import { ChordBox } from '../ChordLibrary/ChordBox';
import { playMidis } from '../../audio/chordPlayer';
import { useMicChordDetector } from '../../hooks/useMicChordDetector';
import {
  BUILDER_TYPES,
  FAMILIES,
  LESSONS,
  STD_TUNING,
  atFret,
  builderType,
  judgeShape,
  openShape,
  shapeMoves,
  shapeTones,
} from '../../music/chordBuilder';
import { typeByKey } from '../../music/chordLibrary';
import '../ChordLibrary/ChordLibraryView.css';
import './ChordBuilderView.css';

const STORE = 'dudestar-p-chord-builder';
const DEFAULTS = { lesson: 'map', family: 'E', fret: 3, done: [] };
const load = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE)) };
  } catch {
    return { ...DEFAULTS };
  }
};

const label = (x) => (x === 'R' ? '1' : x ?? '');
// an interval inside Hebrew text: isolate it so ♭7 doesn't turn into 7♭
const iso = (x) => `\u2066${label(x)}\u2069`;
const midisOf = (frets) => frets.map((f, s) => (f == null ? null : STD_TUNING[s] + f)).filter((m) => m != null);
const familiesOf = (typeKey) => ['E', 'A'].filter((f) => openShape(typeKey, f));
const randomFret = (avoid) => {
  let f;
  do f = 1 + Math.floor(Math.random() * 10);
  while (f === avoid);
  return f;
};

function Diagram({ typeKey, family, moved = [], ghosts = [], caption, leftHanded }) {
  const st = shapeTones(typeKey, family, 0);
  if (!st) return null;
  return (
    <figure className="cb-diagram">
      <figcaption>{caption}</figcaption>
      <ChordBox
        frets={st.frets}
        roles={st.roles}
        names={st.intervals.map(label)}
        position={0}
        leftHanded={leftHanded}
        roleColors
        moved={moved}
        ghosts={ghosts}
      />
      <div className="cb-diagram-name" dir="ltr">
        {st.name}
      </div>
    </figure>
  );
}

export function ChordBuilderView({ onStage }) {
  const { t } = useLanguage();
  const [leftHanded] = useLeftHanded();
  const [prefs, setPrefs] = useState(load);
  const set = useCallback((patch) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(STORE, JSON.stringify(next));
      } catch {
        /* storage full / blocked: keep going */
      }
      return next;
    });
  }, []);

  const lesson = LESSONS.find((l) => l.id === prefs.lesson) ?? LESSONS[0];
  const lessonType = lesson.type ?? (lesson.id === 'slide' ? 'major' : null);
  const families = lessonType ? familiesOf(lessonType) : ['E', 'A'];
  const familyOk = families.includes(prefs.family);
  const family = familyOk ? prefs.family : families[0];
  const typeInfo = lessonType ? builderType(lessonType) : null;
  const moves = lesson.type && familyOk ? shapeMoves(lesson.type, family) : [];
  const fret = prefs.fret;

  // ---- practice task -------------------------------------------------------
  const newTask = useCallback(
    (avoidFret) => {
      if (lesson.id === 'quiz') {
        const pool = BUILDER_TYPES.filter((x) => x.from);
        const type = pool[Math.floor(Math.random() * pool.length)];
        const fams = familiesOf(type.key);
        const fam = fams[Math.floor(Math.random() * fams.length)];
        return { type: type.key, family: fam, fret: randomFret(avoidFret) };
      }
      if (!lessonType) return null;
      return { type: lessonType, family, fret: randomFret(avoidFret ?? fret) };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lesson.id, lessonType, family]
  );
  const [task, setTask] = useState(() => null);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState(null); // null | 'listening' | 'ok' | 'notYet'
  useEffect(() => {
    setTask(newTask());
    setRevealed(false);
    setResult(null);
  }, [newTask]);

  const taskShape = task ? shapeTones(task.type, task.family, task.fret) : null;
  const taskParent = task && builderType(task.type)?.from ? atFret(openShape(builderType(task.type).from, task.family), task.fret) : null;

  // ---- mic -----------------------------------------------------------------
  const mic = useMicChordDetector();
  const hits = useRef(0);
  const since = useRef(0);
  useEffect(() => {
    if (!mic.isListening || !taskShape || result === 'ok') return undefined;
    since.current = Date.now();
    hits.current = 0;
    const rivals = [taskParent, atFret(openShape(task.type, task.family), task.fret - 1), atFret(openShape(task.type, task.family), task.fret + 1)].filter(
      (r) => r && r.every((f) => f == null || f >= 0)
    );
    const id = setInterval(() => {
      const avg = mic.averageChroma(4);
      const verdict = judgeShape(avg, taskShape.frets, rivals);
      hits.current = verdict.match ? hits.current + 1 : 0;
      if (hits.current >= 2) {
        setResult('ok');
        if (lesson.type && !prefs.done.includes(lesson.id)) set({ done: [...prefs.done, lesson.id] });
        return;
      }
      if (Date.now() - since.current > 7000) setResult('notYet');
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.isListening, task, result === 'ok']);
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
  const next = () => {
    setTask(newTask(task?.fret));
    setRevealed(false);
    setResult(mic.isListening ? 'listening' : null);
  };
  const show = () => {
    setRevealed(true);
    if (task) set({ family: task.family, fret: task.fret });
  };

  // ---- stage (the neck below) ---------------------------------------------
  const stageType = lesson.id === 'map' ? 'major' : lesson.id === 'quiz' ? (revealed || result === 'ok' ? task?.type : null) : lessonType;
  const stageFamily = lesson.id === 'quiz' ? task?.family : family;
  const stageFret = lesson.id === 'map' ? 0 : lesson.id === 'quiz' ? task?.fret : fret;
  useEffect(() => {
    const st = stageType && stageFamily && openShape(stageType, stageFamily) ? shapeTones(stageType, stageFamily, stageFret) : null;
    if (!st) {
      onStage?.(null);
      return;
    }
    onStage?.({ position: { ...st.position, strings: st.position.strings.map((s) => (s.label === 'R' ? { ...s, label: '1' } : s)) }, tuning: STD_TUNING, labelMode: 'note' });
  }, [stageType, stageFamily, stageFret, onStage]);
  useEffect(() => () => onStage?.(null), [onStage]);

  // ---- text helpers --------------------------------------------------------
  const moveText = (m) => {
    const vars = { s: 6 - m.s, n: m.to };
    const key = m.kind === 'press' ? (m.from == null ? 'cb.move.pressOpen' : 'cb.move.press') : `cb.move.${m.kind}`;
    const text = t(key, m.kind === 'up' || m.kind === 'down' ? { ...vars, n: m.by } : vars);
    return m.kind === 'mute' ? text : `${text} (${iso(m.was)} → ${iso(m.now)})`;
  };
  const famName = (f) => t(f === 'E' ? 'cb.famE' : 'cb.famA');
  const lessonTitle = (l, i) => {
    if (l.type) return `${i + 1}. ${t(`chordlib.type.${l.type}`)} (${typeByKey(l.type).sym})${prefs.done.includes(l.id) ? ' ✓' : ''}`;
    return `${i + 1}. ${t(`cb.lesson.${l.id}`)}`;
  };
  const lessonIndex = LESSONS.findIndex((l) => l.id === lesson.id);
  const moveCount = moves.length;

  const playShape = (typeKey, fam, at = 0) => {
    const frets = atFret(openShape(typeKey, fam), at);
    if (frets) playMidis(midisOf(frets), 0.035);
  };

  const familySwitch = (
    <div className="mode-toggle cb-family" role="group" aria-label={t('cb.family')}>
      {['E', 'A'].map((f) => (
        <button key={f} type="button" className={family === f && familyOk ? 'active' : prefs.family === f ? 'active is-off' : ''} onClick={() => set({ family: f })}>
          {famName(f)}
        </button>
      ))}
    </div>
  );

  const slider = (typeKey) => {
    const st = shapeTones(typeKey, family, fret);
    return (
      <div className="cb-slide">
        <div className="cb-slide-head">
          <span>{t('cb.fret')}</span>
          <b dir="ltr">{fret === 0 ? t('cb.openPos') : fret}</b>
          <span className="cb-slide-name" dir="ltr">
            {st?.name}
          </span>
        </div>
        <input type="range" min={0} max={12} value={fret} onChange={(e) => set({ fret: Number(e.target.value) })} aria-label={t('cb.fret')} dir="ltr" />
        <div className="cb-slide-roots" dir="ltr">
          {Array.from({ length: 13 }, (_, f) => (
            <button key={f} type="button" className={f === fret ? 'is-on' : ''} onClick={() => set({ fret: f })}>
              {shapeTones('major', family, f)?.name}
            </button>
          ))}
        </div>
        <p className="cb-note">{t('cb.rootOn', { n: 6 - FAMILIES[family].rootString })}</p>
      </div>
    );
  };

  const practice = task && taskShape && (
    <section className="cb-card cb-practice">
      <h3>{t('cb.practice')}</h3>
      <div className="cb-task">
        {t('cb.task', { name: `\u2066${taskShape.name}\u2069` })}
      </div>
      {(revealed || result === 'ok') && <p className="cb-note">{t('cb.taskHint', { family: famName(task.family), fret: task.fret })}</p>}
      <div className="cb-actions">
        <button type="button" className={'cl-btn' + (mic.isListening ? ' is-on' : ' is-primary')} onClick={listen}>
          {mic.isListening ? t('cb.stop') : t('cb.listen')}
        </button>
        <button type="button" className="cl-btn" onClick={show} disabled={revealed}>
          {t('cb.show')}
        </button>
        <button type="button" className="cl-btn" onClick={next}>
          {t('cb.next')}
        </button>
      </div>
      <p className={'cb-status' + (result === 'ok' ? ' is-ok' : '')} aria-live="polite">
        {mic.error
          ? t('cb.micError')
          : result === 'ok'
          ? t('cb.ok', { name: `\u2066${taskShape.name}\u2069` })
          : result === 'notYet'
          ? t('cb.notYet', {
              moves: shapeMoves(task.type, task.family).map(moveText).join(' · ') || t('cb.taskHint', { family: famName(task.family), fret: task.fret }),
            })
          : mic.isListening
          ? t('cb.listening')
          : ''}
      </p>
    </section>
  );

  return (
    <div className="chord-builder">
      <header className="cb-head">
        <div>
          <h2>{t('cb.title')}</h2>
          <p className="cb-sub">{t('cb.subtitle')}</p>
        </div>
        <label className="cl-field cb-lesson">
          <span>{t('cb.lesson')}</span>
          <select value={lesson.id} onChange={(e) => set({ lesson: e.target.value })}>
            {LESSONS.map((l, i) => (
              <option key={l.id} value={l.id}>
                {lessonTitle(l, i)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="cb-legend" aria-hidden="true">
        {['root', 'third', 'fifth', 'seventh', 'extension'].map((r) => (
          <span key={r}>
            <i className={'cb-dot r-' + r} />
            {t('cb.legend.' + r)}
          </span>
        ))}
      </div>

      {lesson.id === 'map' && (
        <section className="cb-card">
          <p className="cb-why">{t('cb.map.text')}</p>
          <div className="cb-pair">
            {['E', 'A'].map((f) => (
              <button key={f} type="button" className="cb-pair-btn" onClick={() => playShape('major', f)}>
                <Diagram typeKey="major" family={f} caption={famName(f)} leftHanded={leftHanded} />
              </button>
            ))}
          </div>
        </section>
      )}

      {lesson.id === 'slide' && (
        <section className="cb-card">
          <p className="cb-why">{t('cb.slide.text')}</p>
          {familySwitch}
          {slider('major')}
          <div className="cb-actions">
            <button type="button" className="cl-btn is-primary" onClick={() => playShape('major', family, fret)}>
              {t('cb.play')}
            </button>
          </div>
        </section>
      )}

      {lesson.type && (
        <section className="cb-card">
          <h3 className="cb-type" dir="auto">
            {t(`chordlib.type.${lesson.type}`)} <span dir="ltr">({typeByKey(lesson.type).sym})</span>
          </h3>
          <p className="cb-why">{t(`cb.why.${lesson.type}`)}</p>
          {familySwitch}
          {!familyOk ? (
            <div className="cb-off">
              <p>{t(`cb.why.${typeInfo[`why${prefs.family}`]}`)}</p>
              <button type="button" className="cl-btn" onClick={() => set({ family: families[0] })}>
                {t('cb.switch')}
              </button>
            </div>
          ) : (
            <>
              <div className="cb-pair" dir="ltr">
                <button type="button" className="cb-pair-btn" onClick={() => playShape(typeInfo.from, family)} aria-label={t('cb.before')}>
                  <Diagram typeKey={typeInfo.from} family={family} caption={t('cb.from')} leftHanded={leftHanded} />
                </button>
                <span className="cb-arrow" aria-hidden="true">
                  →
                </span>
                <button type="button" className="cb-pair-btn" onClick={() => playShape(lesson.type, family)} aria-label={t('cb.after')}>
                  <Diagram
                    typeKey={lesson.type}
                    family={family}
                    caption={t('cb.to')}
                    moved={moves.map((m) => m.s)}
                    ghosts={moves.filter((m) => m.from != null && m.to !== m.from).map((m) => ({ s: m.s, fret: m.from }))}
                    leftHanded={leftHanded}
                  />
                </button>
              </div>
              <div className="cb-moves">
                <h4>
                  {t('cb.moves')} <span className="cb-count">({moveCount})</span>
                </h4>
                <ol>
                  {moves.map((m) => (
                    <li key={m.s}>{moveText(m)}</li>
                  ))}
                </ol>
              </div>
              <div className="cb-actions">
                <button type="button" className="cl-btn" onClick={() => playShape(typeInfo.from, family, fret)}>
                  {t('cb.before')}
                </button>
                <button type="button" className="cl-btn is-primary" onClick={() => playShape(lesson.type, family, fret)}>
                  {t('cb.after')}
                </button>
              </div>
              {slider(lesson.type)}
            </>
          )}
        </section>
      )}

      {lesson.id === 'quiz' && (
        <section className="cb-card">
          <p className="cb-why">{t('cb.quiz.text')}</p>
        </section>
      )}

      {lesson.id !== 'map' && (familyOk || lesson.id === 'quiz') && practice}

      <div className="cb-nav">
        <button type="button" className="cl-btn" disabled={lessonIndex <= 0} onClick={() => set({ lesson: LESSONS[lessonIndex - 1].id })}>
          ‹
        </button>
        <span dir="ltr">
          {lessonIndex + 1} / {LESSONS.length}
        </span>
        <button type="button" className="cl-btn is-primary" disabled={lessonIndex >= LESSONS.length - 1} onClick={() => set({ lesson: LESSONS[lessonIndex + 1].id })}>
          ›
        </button>
      </div>
    </div>
  );
}
