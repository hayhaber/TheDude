import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getAudioContext, prepareAudioOutput } from '../../audio/audioContext';
import { preparePiano, schedulePianoNotes } from '../../audio/pianoPlayer';
import { LOUDNESS, loadLoudnessKey } from '../../hooks/useVocalExercise';
import { VOCAL_EAR_LEVELS, VOCAL_EAR_MODES, pcName, vocalEarQuestion } from '../../music/vocal/vocalEar';
import { loadLifetimeStats, saveLifetimeStats } from '../../music/earTraining';
import { midiName } from '../../music/vocal/voiceRange';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';

// Ear training for singers: listen on the piano, answer with a tap. The
// last option, Sing back, is answered with the voice (the 'echo' exercise
// in the normal runner — onSingBack). Everything is drawn from the singer's
// comfortable range; no fretboard, no guitar.

const PREFS_KEY = 'dudestar-p-vocal-ear'; // per profile
const MODES = [...VOCAL_EAR_MODES, 'echo'];
const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY));
    return {
      mode: MODES.includes(p?.mode) ? p.mode : 'direction',
      level: VOCAL_EAR_LEVELS.includes(p?.level) ? p.level : 'beginner',
    };
  } catch {
    return { mode: 'direction', level: 'beginner' };
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
  const [session, setSession] = useState({ correct: 0, total: 0, streak: 0 });
  const [lifetime, setLifetime] = useState(() => loadLifetimeStats(`vocal-${prefs.mode}`));
  const stopRef = useRef(null);

  useEffect(() => {
    preparePiano();
    return () => stopRef.current?.();
  }, []);

  const savePrefs = (next) => {
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
    stopRef.current?.();
    setQuestion(null);
    setAnswer(null);
    setSession({ correct: 0, total: 0, streak: 0 });
    setLifetime(loadLifetimeStats(`vocal-${next.mode}`));
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
    const q = vocalEarQuestion(prefs.mode, prefs.level, range);
    setQuestion(q);
    setAnswer(null);
    play(q);
  };

  const choose = (key) => {
    if (!question || answer) return;
    const ok = key === question.correct;
    setAnswer(key);
    setSession((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1, streak: ok ? s.streak + 1 : 0 }));
    const life = loadLifetimeStats(`vocal-${prefs.mode}`);
    const updated = { correct: life.correct + (ok ? 1 : 0), total: life.total + 1 };
    saveLifetimeStats(`vocal-${prefs.mode}`, updated);
    setLifetime(updated);
  };

  const echo = prefs.mode === 'echo';
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
              <b>{pct(lifetime.correct, lifetime.total)}</b>
              {t('earTraining.lifetimeAccuracy')}
            </span>
          </div>

          {!question ? (
            <div className="vocal-actions">
              <button type="button" className="primary" onClick={next}>
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
                <button type="button" onClick={() => play(question)}>
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
