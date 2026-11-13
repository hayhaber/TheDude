import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { midiName, saveRange, voiceOf } from '../../music/vocal/voiceRange';
import {
  createProbe,
  findBreak,
  heldMatch,
  heldNotes,
  HOLD_LONG,
  probeExtreme,
  probeResult,
  speakingPitch,
  summarize,
} from '../../music/vocal/rangeProbe';
import { getAudioContext, prepareAudioOutput, reviveAudioOutput } from '../../audio/audioContext';
import { playPianoNote, preparePiano, schedulePianoNotes } from '../../audio/pianoPlayer';
import { IS_IOS, CYCLE_MIC, LOUDNESS, loadLoudnessKey, loadCountClick, countTick } from '../../hooks/useVocalExercise';
import { RangeBar } from './RangeBar';

// Guided range test, the way a voice teacher (or a voice clinic's "voice
// range profile") does it: 1) speak normally -> the comfortable speaking
// pitch, the starting point; 2) the piano plays one note, you sing it on
// "ah" and hold it; step by step DOWN until the voice can't hold a note;
// 3) the same UP from the middle. A note counts only when it is matched and
// held (rangeProbe.js). The result: the full range (the notes you reached)
// and the comfortable range inside it, which the exercises use.

const CUE_DUR = 1.3; // piano note length
const LISTEN_DELAY = 0.5; // after the cue, so the piano's tail isn't heard as you
const LISTEN_FOR = 3.6; // seconds to find and hold the note
const SPEAK_MIN = 3; // seconds of speaking before the pitch is taken
const SPEAK_GIVE_UP = 9;
const HOLD_LISTEN = 6; // seconds to hold the comfortable top for HOLD_LONG
const SIREN_MAX = 14; // seconds of sliding before the siren ends by itself

export function RangeTest({ mic, onDone, onCancel, onSkip, first = false }) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState('intro'); // intro | speak | down | up | hold | siren | result
  const [status, setStatus] = useState('cue'); // cue | listen | pass | miss
  const [target, setTarget] = useState(null);
  const [speakFail, setSpeakFail] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const [low, setLow] = useState(null);
  const [high, setHigh] = useState(null);
  const [margins, setMargins] = useState({ lowMargin: 2, highMargin: 2 });
  const [reach, setReach] = useState({ low: null, high: null }); // live, during the test
  const [passaggio, setPassaggio] = useState(null); // { midi } | { midi: null, smooth }
  const [sirenOn, setSirenOn] = useState(false);
  const [holdLeft, setHoldLeft] = useState(null);
  const run = useRef({ alive: false, raf: null, timer: null, probe: null, down: null, speaking: null });

  const stopLoop = useCallback(() => {
    const r = run.current;
    r.alive = false;
    if (r.raf) cancelAnimationFrame(r.raf);
    clearTimeout(r.timer);
    r.stopTick?.();
    r.stopTick = null;
    r.raf = null;
  }, []);

  useEffect(() => () => stopLoop(), [stopLoop]);

  const finish = useCallback(
    (down, up) => {
      stopLoop();
      const s = summarize(down, up);
      if (!s) {
        setNoVoice(true);
        setPhase('intro');
        return;
      }
      setLow(s.low);
      setHigh(s.high);
      setMargins({ lowMargin: s.lowMargin, highMargin: s.highMargin });
      run.current.notes = heldNotes(down, up);
      run.current.alive = true;
      // v1.0.168: a phrase-length hold at the comfortable top, then a siren
      // for the register break — what a teacher checks before picking a key.
      holdTop(s, 0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stopLoop]
  );

  // The comfortable top, held like a sung phrase (HOLD_LONG s). Can't hold
  // it -> the comfortable top comes down a semitone and is tried once more.
  const holdTop = (s, attempt) => {
    const r = run.current;
    if (!r.alive) return;
    const top = s.high - s.highMargin;
    setPhase('hold');
    setHoldLeft(null);
    const ctx = getAudioContext();
    const loud = LOUDNESS[loadLoudnessKey()];
    const t0 = ctx.currentTime + 0.4;
    const listenFrom = t0 + CUE_DUR + LISTEN_DELAY + (CYCLE_MIC ? 0.4 : 0);
    const deadline = listenFrom + HOLD_LISTEN;
    setTarget(top);
    setStatus('cue');
    if (CYCLE_MIC) {
      mic.stop();
      r.timer = setTimeout(() => {
        if (r.alive) mic.start().then(() => reviveAudioOutput());
      }, (CUE_DUR + 0.4) * 1000);
    }
    schedulePianoNotes([{ midi: top, start: 0, dur: CUE_DUR }], t0, loud);
    if (loadCountClick()) r.stopTick = countTick(ctx, listenFrom, true);
    const tick = () => {
      if (!r.alive) return;
      const now = ctx.currentTime;
      if (now < listenFrom) {
        r.raf = requestAnimationFrame(tick);
        return;
      }
      setStatus('listen');
      const m = heldMatch(mic.framesRef.current, top, listenFrom);
      setHoldLeft(Math.max(0, HOLD_LONG - m.held));
      if (m.held >= HOLD_LONG || now > deadline) {
        const ok = m.held >= HOLD_LONG;
        setStatus(ok ? 'pass' : 'miss');
        let next = s;
        if (!ok) {
          const room = s.high - (s.highMargin + 1) - (s.low + s.lowMargin);
          if (room >= 7) next = { ...s, highMargin: s.highMargin + 1 };
          setMargins({ lowMargin: next.lowMargin, highMargin: next.highMargin });
        }
        r.timer = setTimeout(() => {
          if (!ok && attempt < 1 && next !== s) holdTop(next, attempt + 1);
          else startSiren();
        }, 800);
        return;
      }
      r.raf = requestAnimationFrame(tick);
    };
    r.raf = requestAnimationFrame(tick);
  };

  // The siren: slide up and down on "oo"; where the pitch jumps = the break.
  const startSiren = () => {
    const r = run.current;
    if (!r.alive) return;
    setPhase('siren');
    setSirenOn(false);
    setPassaggio(null);
  };
  const sirenGo = () => {
    const r = run.current;
    const ctx = getAudioContext();
    r.sirenFrom = ctx.currentTime;
    setSirenOn(true);
    r.timer = setTimeout(() => sirenStop(), SIREN_MAX * 1000);
  };
  const sirenStop = () => {
    const r = run.current;
    clearTimeout(r.timer);
    setSirenOn(false);
    const frames = mic.framesRef.current.filter((f) => f.ct >= (r.sirenFrom ?? 0));
    setPassaggio(findBreak(frames, low ?? 0, high ?? 127));
    setPhase('result');
    stopLoop();
  };
  const sirenSkip = () => {
    clearTimeout(run.current.timer);
    setPassaggio(null);
    setPhase('result');
    stopLoop();
  };

  // One note: piano cue, then listen until it is held or time runs out.
  const trial = useCallback(
    (probe) => {
      const r = run.current;
      if (!r.alive) return;
      r.probe = probe;
      const ctx = getAudioContext();
      const loud = LOUDNESS[loadLoudnessKey()];
      const t0 = ctx.currentTime + 0.15;
      const listenFrom = t0 + CUE_DUR + LISTEN_DELAY + (CYCLE_MIC ? 0.4 : 0);
      const deadline = listenFrom + LISTEN_FOR;
      setTarget(probe.target);
      setStatus('cue');
      if (CYCLE_MIC) {
        // iPhone: no capture while the piano plays, or it comes out of the earpiece.
        mic.stop();
        r.timer = setTimeout(() => {
          if (r.alive) mic.start().then(() => reviveAudioOutput());
        }, (CUE_DUR + 0.15) * 1000);
      }
      schedulePianoNotes([{ midi: probe.target, start: 0, dur: CUE_DUR }], t0, loud);
      // "Now you": one soft high tick as listening starts (above the mic's
      // range); the target turns to "sing" on screen at the same moment.
      if (loadCountClick()) r.stopTick = countTick(ctx, listenFrom, true);
      const tick = () => {
        if (!r.alive) return;
        const now = ctx.currentTime;
        if (now < listenFrom) {
          r.raf = requestAnimationFrame(tick);
          return;
        }
        setStatus('listen');
        const m = heldMatch(mic.framesRef.current, probe.target, listenFrom);
        if (m.ok || now > deadline) {
          const next = probeResult(probe, m.ok, m.sd);
          setStatus(m.ok ? 'pass' : 'miss');
          if (m.ok) {
            setReach((v) =>
              probe.dir < 0 ? { ...v, low: Math.min(v.low ?? 999, probe.target) } : { ...v, high: Math.max(v.high ?? -1, probe.target) }
            );
          }
          r.timer = setTimeout(() => advance(next), 650);
          return;
        }
        r.raf = requestAnimationFrame(tick);
      };
      r.raf = requestAnimationFrame(tick);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mic]
  );

  const startUp = useCallback(
    (down) => {
      const r = run.current;
      r.down = down;
      setPhase('up');
      const start = Math.max(probeExtreme(down) ?? r.speaking, r.speaking) + 2;
      r.timer = setTimeout(() => trial(createProbe(start, 1)), 600);
    },
    [trial]
  );

  // Next step of the current direction (or the next direction / the result).
  const advance = useCallback(
    (probe) => {
      const r = run.current;
      if (!r.alive) return;
      if (!probe.done) {
        trial(probe);
        return;
      }
      if (probe.dir < 0) {
        if (probeExtreme(probe) == null) {
          stopLoop();
          setNoVoice(true);
          setPhase('intro');
          return;
        }
        startUp(probe);
      } else finish(r.down, probe);
    },
    [trial, startUp, finish, stopLoop]
  );

  // "Done": the singer says this is as far as the voice goes in this direction.
  const endDirection = () => {
    const r = run.current;
    if (!r.probe) return;
    clearTimeout(r.timer);
    if (r.raf) cancelAnimationFrame(r.raf);
    advance({ ...r.probe, done: true });
  };

  // Speaking pitch: the median of a few seconds of normal speech.
  const startSpeak = () => {
    const r = run.current;
    setPhase('speak');
    setSpeakFail(false);
    const ctx = getAudioContext();
    const from = ctx.currentTime;
    const check = () => {
      if (!r.alive) return;
      const frames = mic.framesRef.current.filter((f) => f.ct >= from);
      const elapsed = ctx.currentTime - from;
      const sp = elapsed >= SPEAK_MIN ? speakingPitch(frames) : null;
      if (sp != null && frames.filter((f) => f.midi != null).length >= 40) {
        r.speaking = sp;
        setPhase('down');
        r.timer = setTimeout(() => trial(createProbe(sp, -1)), 500);
        return;
      }
      if (elapsed > SPEAK_GIVE_UP) {
        setSpeakFail(true);
        return;
      }
      r.raf = requestAnimationFrame(check);
    };
    r.raf = requestAnimationFrame(check);
  };

  const begin = async () => {
    prepareAudioOutput();
    preparePiano();
    stopLoop();
    run.current = { alive: true, raf: null, timer: null, probe: null, down: null, speaking: null, notes: null };
    setPassaggio(null);
    setNoVoice(false);
    setReach({ low: null, high: null });
    const ok = await mic.start();
    reviveAudioOutput();
    if (!ok || !run.current.alive) return;
    startSpeak();
  };

  const cancel = () => {
    stopLoop();
    onCancel();
  };

  const liveMidi = mic.live.midi;
  const liveCents = liveMidi != null && target != null ? Math.round((liveMidi - target) * 100) : null;
  const comfortLow = low != null ? low + margins.lowMargin : null;
  const comfortHigh = high != null ? high - margins.highMargin : null;
  const voice = low != null ? voiceOf({ low, high, ...margins }) : null;
  const nudge = (which, d) => {
    if (which === 'low') setLow((v) => Math.min(v + d, high - margins.lowMargin - margins.highMargin - 3));
    else setHigh((v) => Math.max(v + d, low + margins.lowMargin + margins.highMargin + 3));
  };

  return (
    <div className="vocal-range-test">
      <div className="vocal-run-head">
        <button type="button" className="vocal-back" onClick={cancel}>
          {t('vocal.back')}
        </button>
        <h2>{t('vocal.range.title')}</h2>
      </div>

      {mic.error && <p className="vocal-error">{t('vocal.micError', { message: mic.error })}</p>}
      {mic.listening && mic.deadInput && <p className="vocal-warning">{t('vocal.noSignal')}</p>}
      {/* iPhone / iPad: what the mic path is doing, while nothing is heard
          (a screenshot of it tells which link is broken). */}
      {mic.listening && (mic.deadInput || (IS_IOS && mic.quiet)) && mic.diag && (
        <p className="vocal-diag" dir="ltr">
          {mic.diag}
        </p>
      )}

      {phase === 'intro' && (
        <div className="vocal-card vocal-range-step">
          {first && <p className="vocal-range-first">{t('vocal.range.first')}</p>}
          <p className="vocal-range-intro">{t('vocal.range.why')}</p>
          <ol className="vocal-range-steps">
            <li>{t('vocal.range.step1')}</li>
            <li>{t('vocal.range.step2')}</li>
            <li>{t('vocal.range.step3')}</li>
            <li>{t('vocal.range.step4')}</li>
          </ol>
          <p className="vocal-muted">{t('vocal.range.rules')}</p>
          {noVoice && <p className="vocal-warning">{t('vocal.range.noVoice')}</p>}
          <div className="vocal-actions">
            <button type="button" className="primary" onClick={begin}>
              {t('vocal.start')}
            </button>
            {onSkip && (
              <button type="button" onClick={onSkip} title={t('vocal.range.skipHint')}>
                {t('vocal.skip')}
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'speak' && (
        <div className="vocal-card vocal-range-step">
          <span className="vocal-eyebrow">{t('vocal.range.stepOf', { n: 1 })}</span>
          <p className="vocal-range-instruction">{t('vocal.range.speak')}</p>
          <div className="vocal-range-live">
            <div>
              <span className="vocal-eyebrow">{t('vocal.range.now')}</span>
              <strong className="vocal-big-note">{liveMidi != null ? midiName(liveMidi) : '–'}</strong>
              <span className="vocal-level">
                <span style={{ width: `${Math.round(mic.live.level * 100)}%` }} />
              </span>
            </div>
          </div>
          {speakFail && (
            <>
              <p className="vocal-warning">{t('vocal.range.speakFail')}</p>
              <div className="vocal-actions">
                <button type="button" className="primary" onClick={startSpeak}>
                  {t('vocal.range.retry')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {(phase === 'down' || phase === 'up') && (
        <div className="vocal-card vocal-range-step">
          <span className="vocal-eyebrow">{t('vocal.range.stepOf', { n: phase === 'down' ? 2 : 3 })}</span>
          <p className="vocal-range-instruction">{t(phase === 'down' ? 'vocal.range.down' : 'vocal.range.up')}</p>
          <div className="vocal-range-live">
            <div>
              <span className="vocal-eyebrow">{t('vocal.range.target')}</span>
              <strong className={'vocal-big-note is-target is-' + status}>{target != null ? midiName(target) : '–'}</strong>
              <span className="vocal-muted">{t(`vocal.range.status.${status}`)}</span>
            </div>
            <div>
              <span className="vocal-eyebrow">{t('vocal.range.now')}</span>
              <strong className="vocal-big-note">{liveMidi != null ? midiName(liveMidi) : '–'}</strong>
              <span className="vocal-muted" dir="ltr">
                {status === 'listen' && liveCents != null && Math.abs(liveCents) < 300
                  ? `${liveCents > 0 ? '+' : ''}${liveCents}¢`
                  : ' '}
              </span>
            </div>
          </div>
          <p className="vocal-range-notes">
            {reach.low != null ? midiName(reach.low) : '…'} – {reach.high != null ? midiName(reach.high) : '…'}
          </p>
          <div className="vocal-actions">
            <button type="button" onClick={endDirection} title={t('vocal.range.doneHint')}>
              {t('vocal.range.done')}
            </button>
          </div>
        </div>
      )}

      {phase === 'hold' && (
        <div className="vocal-card vocal-range-step">
          <span className="vocal-eyebrow">{t('vocal.range.stepOf', { n: 4 })}</span>
          <p className="vocal-range-instruction">{t('vocal.range.hold')}</p>
          <div className="vocal-range-live">
            <div>
              <span className="vocal-eyebrow">{t('vocal.range.target')}</span>
              <strong className={'vocal-big-note is-target is-' + status}>{target != null ? midiName(target) : '–'}</strong>
              <span className="vocal-muted" dir="auto">
                {status === 'listen' && holdLeft != null ? t('vocal.range.holdLeft', { n: holdLeft.toFixed(1) }) : t(`vocal.range.status.${status}`)}
              </span>
            </div>
            <div>
              <span className="vocal-eyebrow">{t('vocal.range.now')}</span>
              <strong className="vocal-big-note">{liveMidi != null ? midiName(liveMidi) : '–'}</strong>
            </div>
          </div>
        </div>
      )}

      {phase === 'siren' && (
        <div className="vocal-card vocal-range-step">
          <span className="vocal-eyebrow">{t('vocal.range.stepOf', { n: 5 })}</span>
          <p className="vocal-range-instruction">{t('vocal.range.siren')}</p>
          <p className="vocal-muted">{t('vocal.range.sirenWhy')}</p>
          <div className="vocal-range-live">
            <div>
              <span className="vocal-eyebrow">{t('vocal.range.now')}</span>
              <strong className="vocal-big-note">{sirenOn && liveMidi != null ? midiName(liveMidi) : '–'}</strong>
              <span className="vocal-level">
                <span style={{ width: `${Math.round((sirenOn ? mic.live.level : 0) * 100)}%` }} />
              </span>
            </div>
          </div>
          <div className="vocal-actions">
            {sirenOn ? (
              <button type="button" className="primary" onClick={sirenStop}>
                {t('vocal.range.done')}
              </button>
            ) : (
              <>
                <button type="button" className="primary" onClick={sirenGo}>
                  {t('vocal.start')}
                </button>
                <button type="button" onClick={sirenSkip}>
                  {t('vocal.skip')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {phase === 'result' && low != null && high != null && (
        <div className="vocal-card vocal-range-result">
          <span className="vocal-eyebrow">{t('vocal.range.type')}</span>
          <h3 className="vocal-voice-type">{voice ? t(`vocal.voice.${voice}`) : '–'}</h3>
          <dl className="vocal-range-summary">
            <div>
              <dt>{t('vocal.range.comfort')}</dt>
              <dd>
                <span dir="ltr">
                  {midiName(comfortLow)} – {midiName(comfortHigh)}
                </span>
              </dd>
            </div>
            <div>
              <dt>{t('vocal.range.full')}</dt>
              <dd>
                <span dir="ltr">
                  {midiName(low)} – {midiName(high)}
                </span>
                <small>{t('vocal.range.semitones', { n: high - low })}</small>
              </dd>
            </div>
          </dl>
          <RangeBar low={low} high={high} comfortLow={comfortLow} comfortHigh={comfortHigh} />
          {passaggio && (
            <p className="vocal-range-break" dir="auto">
              {passaggio.midi != null
                ? t('vocal.range.breakAt', { note: midiName(passaggio.midi) })
                : passaggio.smooth
                  ? t('vocal.range.breakNone')
                  : t('vocal.range.breakUnclear')}
            </p>
          )}
          <p className="vocal-muted">{t('vocal.range.explain')}</p>
          <p className="vocal-muted">{t('vocal.range.adjust')}</p>
          <div className="vocal-adjust">
            {[
              ['low', low],
              ['high', high],
            ].map(([which, val]) => (
              <div key={which} className="vocal-adjust-row">
                <span>{t(which === 'low' ? 'vocal.range.lowest' : 'vocal.range.highest')}</span>
                <button type="button" aria-label="−" onClick={() => nudge(which, -1)}>
                  −
                </button>
                <button type="button" className="vocal-adjust-note" onClick={() => playPianoNote(val)} title={t('vocal.range.hear')}>
                  {midiName(val)}
                </button>
                <button type="button" aria-label="+" onClick={() => nudge(which, 1)}>
                  +
                </button>
              </div>
            ))}
          </div>
          <div className="vocal-actions">
            <button
              type="button"
              className="primary"
              onClick={() => {
                const r = saveRange(low, high, {
                  ...margins,
                  speaking: run.current.speaking,
                  notes: run.current.notes ?? undefined,
                  passaggio: passaggio?.midi ?? undefined,
                  smoothBreak: passaggio && passaggio.midi == null ? !!passaggio.smooth : undefined,
                });
                onDone(r);
              }}
            >
              {t('vocal.range.save')}
            </button>
            <button type="button" onClick={begin}>
              {t('vocal.range.retry')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
