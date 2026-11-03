import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getAudioContext, prepareAudioOutput } from '../../audio/audioContext';
import { preparePiano, schedulePianoNotes } from '../../audio/pianoPlayer';
import { LOUDNESS, loadLoudnessKey } from '../../hooks/useVocalExercise';
import { VOCAL_EAR_LEVELS, VOCAL_EAR_MODES, pcName, vocalEarQuestion } from '../../music/vocal/vocalEar';
import { TIMED_HOLD_CORRECT_MS, TIMED_HOLD_WRONG_MS } from '../../hooks/useEarTraining';
import { TIMED_CHALLENGE_DURATION_S, loadBestStreak, loadLifetimeStats, saveBestStreak, saveLifetimeStats } from '../../music/earTraining';
import { midiName } from '../../music/vocal/voiceRange';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';

// Ear training for singers: listen on the piano, answer with a tap. The
// last option, Sing back, is answered with the voice (the 'echo' exercise
// in the normal runner — onSingBack). Everything is drawn from the singer's
// comfortable range; no fretboard, no guitar.

const PREFS_KEY = 'dudestar-p-vocal-ear'; // per profile
const MODES = [...VOCAL_EAR_MODES, 'echo'];
const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
// Same flow as the guitar / piano ear training (useEarTraining): after an
// answer the next question comes by itself — a right answer after a beat,
// a wrong one later so the reveal can be read. Hear after answering pauses
// it (the Next button takes over); Next during the wait skips the wait.
const AUTO_ADVANCE_CORRECT_MS = 1100;
const AUTO_ADVANCE_WRONG_MS = 2600;
// Pace, as in the guitar / piano ear training: Standard, or Timed = as many
// right answers as you can in 60 s (wall-clock deadline), then a summary.
const PACES = ['standard', 'timed'];

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY));
    return {
      mode: MODES.includes(p?.mode) ? p.mode : 'direction',
      level: VOCAL_EAR_LEVELS.includes(p?.level) ? p.level : 'beginner',
      pace: PACES.includes(p?.pace) ? p.pace : 'standard',
    };
  } catch {
    return { mode: 'direction', level: 'beginner', pace: 'standard' };
  }
}

function choiceText(t, kind, choice) {
  if (kind === 'direction') return t(`direction.${choice.label}`);
  if (kind === 'interval') return t(`interval.${choice.label}`);
  if (kind === 'chord') return t(`quality.${choice.label}`);
  return choice.label;
}

// Spelled in the key: sharps in sharp keys (E major's 3rd is G#, not Ab).
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SHARP_MAJOR = [7, 2, 9, 4, 11, 6]; // G D A E B F#
const SHARP_MINOR = [4, 11, 6, 1, 8]; // E B F# C# G#
function inKey(midi, tonic, minor) {
  const pc = ((tonic % 12) + 12) % 12;
  const names = (minor ? SHARP_MINOR : SHARP_MAJOR).includes(pc) ? SHARP_NAMES : FLAT_NAMES;
  return names[((Math.round(midi) % 12) + 12) % 12] + (Math.floor(Math.round(midi) / 12) - 1);
}
function keyName(tonic, minor) {
  return inKey(tonic, tonic, minor).replace(/-?\d+$/, '');
}

// The note names behind the answer ("C → G"), so a degree / interval is
// tied back to real pitches.
function revealDetail(t, q) {
  const r = q.reveal;
  if (q.kind === 'direction' || q.kind === 'interval') return r.notes.map(midiName).join(' → ');
  if (q.kind === 'scaledegree') return `${inKey(r.target, r.tonic, r.minor)} — ${keyName(r.tonic, r.minor)} ${t(r.minor ? 'quality.Minor' : 'quality.Major')}`;
  if (q.kind === 'chord') return `${pcName(r.root)} ${t(`quality.${r.quality}`)}`;
  return '';
}

export function VocalEarTraining({ range, onBack, onSingBack }) {
  const { t } = useLanguage();
  const [prefs, setPrefs] = useState(loadPrefs);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [session, setSession] = useState({ correct: 0, total: 0, streak: 0, best: 0 });
  const [lifetime, setLifetime] = useState(() => loadLifetimeStats(`vocal-${prefs.mode}`));
  // Best streak ever, per mode (and per profile — earTrainingBestStreak: is personal).
  const [bestStreak, setBestStreak] = useState(() => loadBestStreak(`vocal-${prefs.mode}`));
  const [timeLeft, setTimeLeft] = useState(TIMED_CHALLENGE_DURATION_S);
  const [timeUp, setTimeUp] = useState(false);
  const stopRef = useRef(null);
  const advanceRef = useRef(null); // pending auto-advance timer
  const clockRef = useRef(null); // { deadline, id } while a timed run is on

  const cancelAdvance = () => {
    if (advanceRef.current) clearTimeout(advanceRef.current);
    advanceRef.current = null;
  };

  const stopClock = () => {
    if (clockRef.current) clearInterval(clockRef.current.id);
    clockRef.current = null;
  };

  const startClock = () => {
    stopClock();
    const deadline = Date.now() + TIMED_CHALLENGE_DURATION_S * 1000;
    setTimeLeft(TIMED_CHALLENGE_DURATION_S);
    setTimeUp(false);
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0) {
        stopClock();
        cancelAdvance();
        stopRef.current?.();
        setTimeUp(true);
      }
    }, 250);
    clockRef.current = { deadline, id };
  };

  useEffect(() => {
    preparePiano();
    return () => {
      stopRef.current?.();
      cancelAdvance();
      stopClock();
    };
  }, []);

  const savePrefs = (next) => {
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
    stopRef.current?.();
    cancelAdvance();
    stopClock();
    setTimeLeft(TIMED_CHALLENGE_DURATION_S);
    setTimeUp(false);
    setQuestion(null);
    setAnswer(null);
    setSession({ correct: 0, total: 0, streak: 0, best: 0 });
    setLifetime(loadLifetimeStats(`vocal-${next.mode}`));
    setBestStreak(loadBestStreak(`vocal-${next.mode}`));
  };

  const play = (q) => {
    if (!q) return;
    prepareAudioOutput(); // in the tap (iOS)
    stopRef.current?.();
    const ctx = getAudioContext();
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    const loud = LOUDNESS[loadLoudnessKey()] ?? LOUDNESS.loud;
    stopRef.current = schedulePianoNotes(q.notes, ctx.currentTime + 0.08, loud);
  };

  const next = () => {
    cancelAdvance();
    if (clockRef.current && clockRef.current.deadline <= Date.now()) return; // time's up
    const q = vocalEarQuestion(prefs.mode, prefs.level, range);
    setQuestion(q);
    setAnswer(null);
    play(q);
  };

  const choose = (key) => {
    if (!question || answer) return;
    const ok = key === question.correct;
    setAnswer(key);
    const streak = ok ? session.streak + 1 : 0;
    setSession((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1, streak, best: Math.max(s.best, streak) }));
    if (streak > bestStreak) {
      saveBestStreak(`vocal-${prefs.mode}`, streak);
      setBestStreak(streak);
    }
    const life = loadLifetimeStats(`vocal-${prefs.mode}`);
    const updated = { correct: life.correct + (ok ? 1 : 0), total: life.total + 1 };
    saveLifetimeStats(`vocal-${prefs.mode}`, updated);
    setLifetime(updated);
    cancelAdvance();
    // `next` reads the prefs of this render; a change of mode/level cancels the timer.
    advanceRef.current = setTimeout(() => {
      advanceRef.current = null;
      next();
    }, timed ? (ok ? TIMED_HOLD_CORRECT_MS : TIMED_HOLD_WRONG_MS) : ok ? AUTO_ADVANCE_CORRECT_MS : AUTO_ADVANCE_WRONG_MS);
  };

  // Start (and Again after time's up): a fresh session; Timed starts its clock.
  const begin = () => {
    setSession({ correct: 0, total: 0, streak: 0, best: 0 });
    if (timed) startClock();
    next();
  };

  const hear = () => {
    play(question);
    // Asking to hear it again after answering = "don't rush me".
    if (answer && advanceRef.current) {
      cancelAdvance();
    }
  };

  const echo = prefs.mode === 'echo';
  const timed = !echo && prefs.pace === 'timed';
  const pct = (c, n) => (n ? `${Math.round((c / n) * 100)}%` : '–');
  const correctChoice = question?.choices.find((c) => c.key === question.correct);

  return (
    <div className="vocal-runner vocal-ear">
      <div className="vocal-run-head">
        <button type="button" className="vocal-back" onClick={onBack}>
          {t('vocal.back')}
        </button>
        <div className="vocal-run-title">
          <span className="vocal-eyebrow">{t('vocal.title')}</span>
          <h2>{t('vocal.ear.title')}</h2>
        </div>
      </div>

      <div className="vocal-card vocal-ear-setup">
        <label className="vocal-field">
          <span>{t('earTraining.modeLabel')}</span>
          <select value={prefs.mode} onChange={(e) => savePrefs({ ...prefs, mode: e.target.value })}>
            {MODES.map((m) => (
              <option key={m} value={m}>
                {t(`vocal.ear.mode.${m}`)}
              </option>
            ))}
          </select>
        </label>
        {!echo && (
          <label className="vocal-field">
            <span>{t('earTraining.difficultyLabel')}</span>
            <select value={prefs.level} onChange={(e) => savePrefs({ ...prefs, level: e.target.value })}>
              {VOCAL_EAR_LEVELS.map((lv) => (
                <option key={lv} value={lv}>
                  {t(`difficulty.${LEVEL_LABEL[lv]}`)}
                </option>
              ))}
            </select>
          </label>
        )}
        {!echo && (
          <label className="vocal-field">
            <span>{t('earTraining.practiceModeLabel')}</span>
            <select value={prefs.pace} onChange={(e) => savePrefs({ ...prefs, pace: e.target.value })}>
              {PACES.map((p) => (
                <option key={p} value={p}>
                  {t(`earTraining.practiceMode.${p}`)}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="vocal-ear-about">{t(`vocal.ear.about.${prefs.mode}`)}</p>
        {range.isDefault && <p className="vocal-hint">{t('vocal.defaultRange')}</p>}
      </div>

      {echo ? (
        <div className="vocal-card vocal-ear-play">
          <div className="vocal-actions">
            <button type="button" className="primary" onClick={onSingBack}>
              {t('vocal.start')}
            </button>
          </div>
        </div>
      ) : (
        <div className="vocal-card vocal-ear-play">
          <div className="vocal-ear-score" dir="ltr">
            <span>
              <b>
                {session.correct}/{session.total}
              </b>
              {t('earTraining.correct')}
            </span>
            <span>
              <b>{session.streak}</b>
              {t('earTraining.streak')}
            </span>
            <span>
              <b>{bestStreak}</b>
              {t('earTraining.bestStreak')}
            </span>
            {timed ? (
              <span className={'vocal-ear-clock' + (timeLeft <= 10 && clockRef.current ? ' is-low' : '')}>
                <b>{timeLeft}</b>
                {t('vocal.ear.seconds')}
              </span>
            ) : (
              <span>
                <b>{pct(lifetime.correct, lifetime.total)}</b>
                {t('earTraining.lifetimeAccuracy')}
              </span>
            )}
          </div>

          {timeUp ? (
            <div className="vocal-ear-summary">
              <h3>{t('earTraining.timedSummary.title')}</h3>
              <p>
                <span>
                  {t('earTraining.timedSummary.correct')} <b>{session.correct}</b>
                </span>
                <span>
                  {t('earTraining.timedSummary.attempts')} <b>{session.total}</b>
                </span>
                <span>
                  {t('earTraining.timedSummary.accuracy')} <b>{pct(session.correct, session.total)}</b>
                </span>
                <span>
                  {t('earTraining.summary.bestStreak')} <b>{session.best}</b>
                </span>
              </p>
              <div className="vocal-actions">
                <button type="button" className="primary" onClick={begin}>
                  {t('vocal.again')}
                </button>
              </div>
            </div>
          ) : !question ? (
            <div className="vocal-actions">
              <button type="button" className="primary" onClick={begin}>
                {t('vocal.start')}
              </button>
            </div>
          ) : (
            <>
              <p className="vocal-ear-prompt">{t(question.promptKey)}</p>
              <div className={'vocal-ear-choices' + (question.kind === 'rhythm' ? ' is-wide' : '')}>
                {question.choices.map((c) => {
                  const state = !answer ? '' : c.key === question.correct ? ' is-right' : c.key === answer ? ' is-wrong' : ' is-dim';
                  return (
                    <button key={c.key} type="button" className={'vocal-ear-choice' + state} onClick={() => choose(c.key)} disabled={!!answer}>
                      {choiceText(t, question.kind, c)}
                    </button>
                  );
                })}
              </div>
              <p className={'vocal-ear-reveal' + (answer ? (answer === question.correct ? ' is-good' : ' is-off') : ' is-pending')} dir="auto">
                {answer ? (
                  <>
                    {t(answer === question.correct ? 'earTraining.correct' : 'earTraining.incorrect')} —{' '}
                    {t('earTraining.reveal', { answer: choiceText(t, question.kind, correctChoice) })}
                    {/* Note names read left to right even in Hebrew. */}
                    {revealDetail(t, question) && (
                      <>
                        {' '}
                        (<bdi>{revealDetail(t, question)}</bdi>)
                      </>
                    )}
                  </>
                ) : (
                  ' '
                )}
              </p>
              <div className="vocal-actions">
                <button type="button" onClick={hear}>
                  {t('vocal.hear')}
                </button>
                <button type="button" className={answer ? 'primary' : ''} onClick={next}>
                  {answer ? t('earTraining.next') : t('earTraining.skip')}
                </button>
                <InfoTooltip text={t('tip.tools.vocalEar')} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
