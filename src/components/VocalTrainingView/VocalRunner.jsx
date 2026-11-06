import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useVocalExercise, IS_IOS, LOUDNESS, LOUDNESS_KEY, loadLoudnessKey, COUNT_KEY, COUNT_BEATS, loadCountClick } from '../../hooks/useVocalExercise';
import { midiName } from '../../music/vocal/voiceRange';
import { centsOff } from '../../music/vocal/vocalAnalysis';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { targetAt } from '../../music/vocal/exercises';
import { getAudioContext } from '../../audio/audioContext';
import { PitchRoll } from './PitchRoll';

const TEMPOS = [
  { key: 'slow', value: 0.8 },
  { key: 'normal', value: 1 },
  { key: 'fast', value: 1.2 },
];

// One exercise: how-to, the pitch roll, transport, and the result.
/**
 * The count-in on the roll: big 2 · 1 on each beat between the cue and the
 * singing (its own rAF — on iPhone the mic is closed then, so nothing else
 * re-renders), then "Sing!" for a moment.
 */
function CountIn({ viewRef, t }) {
  const [n, setN] = useState(null);
  useEffect(() => {
    let raf;
    const step = () => {
      raf = requestAnimationFrame(step);
      const v = viewRef.current;
      const ctx = getAudioContext();
      // What is HEARD now: the context clock minus the output delay (large on
      // Bluetooth), so a number appears with its tick, not before it.
      const heard = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
      let next = null;
      if ((v.phase === 'cue' || v.phase === 'sing') && v.countStart != null) {
        if (heard >= v.countStart && heard < v.singStart) {
          // Each number flashes on its beat and is gone before the next one:
          // 2 _ 1 _ sing (user's request 2026-11-06 — a number held for the
          // whole beat read as "start right after 1").
          const k = Math.floor((heard - v.countStart) / v.countBeat);
          const within = (heard - v.countStart) - k * v.countBeat;
          if (within < v.countBeat * 0.55) next = COUNT_BEATS - k;
        } else if (heard >= v.singStart && heard < v.singStart + 0.6) next = 0;
      }
      setN((x) => (x === next ? x : next));
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [viewRef]);
  if (n == null) return null;
  return (
    <div className={'vocal-count' + (n === 0 ? ' is-go' : '')} aria-live="assertive">
      <span key={n}>{n === 0 ? t('vocal.count.go') : n}</span>
    </div>
  );
}

export function VocalRunner({ ex, range, level, mic, step, onBack, onNext, isLast }) {
  const { t } = useLanguage();
  const [tempoKey, setTempoKey] = useState('normal');
  const [guide, setGuide] = useState(false);
  const [countClick, setCountClick] = useState(loadCountClick);
  const changeCount = (v) => {
    setCountClick(v);
    try {
      localStorage.setItem(COUNT_KEY, v ? 'on' : 'off');
    } catch {
      /* private mode */
    }
  };
  const [volumeKey, setVolumeKey] = useState(loadLoudnessKey);
  const changeVolume = (v) => {
    setVolumeKey(v);
    try {
      localStorage.setItem(LOUDNESS_KEY, v);
    } catch {
      /* private mode */
    }
  };
  const tempo = TEMPOS.find((x) => x.key === tempoKey)?.value ?? 1;
  const run = useVocalExercise({ ex, range, level, tempo, guide, mic, loud: LOUDNESS[volumeKey], countClick });
  const running = run.phase === 'cue' || run.phase === 'sing';
  const timed = ex.kind === 'pattern' || ex.kind === 'glide';
  const resultRef = useRef(null);
  const stageRef = useRef(null);
  const begin = () => {
    stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    run.start();
  };
  useEffect(() => {
    if (run.phase === 'done') resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [run.phase]);

  // Live readout: the sung note and how far from the current target.
  let liveName = '–';
  let liveCents = null;
  let liveDir = null;
  if (mic.live.midi != null) {
    liveName = midiName(mic.live.midi);
    const v = run.viewRef.current;
    const tgt = run.phase === 'sing' && v.rep ? targetAt(v.rep, getAudioContext().currentTime - v.singStart) : null;
    if (tgt == null) liveCents = Math.round((mic.live.midi - Math.round(mic.live.midi)) * 100);
    else {
      const off = centsOff(mic.live.midi, tgt).cents;
      // Far from the target: just which way to go (cents would be confusing).
      if (Math.abs(off) <= 100) liveCents = Math.round(off);
      else liveDir = mic.live.midi < tgt ? 'up' : 'down';
    }
  }

  const status =
    run.phase === 'cue'
      ? t('vocal.phase.cue')
      : run.phase === 'sing'
        ? t('vocal.phase.sing')
        : run.phase === 'done'
          ? t('vocal.resultTitle')
          : t('vocal.phase.ready');

  return (
    <div className="vocal-runner">
      <div className="vocal-run-head">
        <button type="button" className="vocal-back" onClick={onBack}>
          {t('vocal.back')}
        </button>
        <div className="vocal-run-title">
          <span className="vocal-eyebrow">
            {t(`vocal.cat.${ex.category}`)}
            {step ? ` · ${t('vocal.stepOf', { i: step.index + 1, n: step.count })}` : ''}
          </span>
          <h2>{t(`vocal.ex.${ex.id}.title`)}</h2>
        </div>
      </div>

      <div className="vocal-card vocal-how">
        <div className="vocal-syllable">
          <span>{t('vocal.singOn')}</span>
          <strong>{t(`vocal.syl.${ex.syllable}`)}</strong>
        </div>
        <p>{t(`vocal.ex.${ex.id}.how`)}</p>
        <p className="vocal-why">
          <strong>{t('vocal.why')}:</strong> {t(`vocal.ex.${ex.id}.why`)}
        </p>
        {range.isDefault && <p className="vocal-hint">{t('vocal.defaultRange')}</p>}
      </div>

      <div className="vocal-card vocal-stage" ref={stageRef}>
        <div className="vocal-stage-top">
          <div className={'vocal-status is-' + run.phase}>
            <span className="vocal-dot" />
            {status}
          </div>
          {/* The pitch roll below has no heading of its own. */}
          <InfoTooltip text={t('tip.tools.vocalRoll')} />
          {run.repCount > 0 && run.phase !== 'done' && run.phase !== 'ready' && (
            <span className="vocal-muted">
              {t('vocal.rep', { i: run.repIndex + 1, n: run.repCount })} · {t('vocal.key', { note: midiName(run.viewRef.current.rep?.key ?? 60) })}
            </span>
          )}
          <div className="vocal-live" dir="ltr">
            <strong>{liveName}</strong>
            {liveDir && (
              <span className="is-off" title={t(liveDir === 'up' ? 'vocal.goUp' : 'vocal.goDown')}>
                {liveDir === 'up' ? '↑' : '↓'}
              </span>
            )}
            {liveCents != null && (
              <span className={Math.abs(liveCents) <= 25 ? 'is-good' : Math.abs(liveCents) <= 50 ? 'is-ok' : 'is-off'}>
                {liveCents > 0 ? '+' : ''}
                {liveCents}¢
              </span>
            )}
            <span className="vocal-level">
              <span style={{ width: `${Math.round(mic.live.level * 100)}%` }} />
            </span>
            <InfoTooltip text={t('tip.tools.vocalLive')} />
          </div>
        </div>
        <div className="vocal-roll-wrap" dir="ltr">
          <PitchRoll viewRef={run.viewRef} framesRef={mic.framesRef} level={level} />
          <CountIn viewRef={run.viewRef} t={t} />
          {run.phase === 'ready' && (
            <div className="vocal-roll-empty">
              <p>{t('vocal.phase.ready')}</p>
            </div>
          )}
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
        <p className="vocal-hint vocal-sound-hint">{t('vocal.soundHint')}</p>

        <div className="vocal-controls-row">
          <div className="vocal-actions">
            {running ? (
              <button type="button" onClick={run.stop}>
                {t('vocal.stop')}
              </button>
            ) : (
              <button type="button" className="primary" onClick={begin}>
                {t('vocal.start')}
              </button>
            )}
            <button type="button" onClick={run.repeat} disabled={!running}>
              {t('vocal.repeat')}
            </button>
            <button type="button" onClick={run.skip} disabled={!running}>
              {t('vocal.skip')}
            </button>
            <button type="button" onClick={run.hear} title={t('vocal.hearHint')}>
              {t('vocal.hear')}
            </button>
          </div>
          <div className="vocal-options">
            {timed && (
              <label className="vocal-field">
                <span>{t('vocal.tempo')}</span>
                <select value={tempoKey} onChange={(e) => setTempoKey(e.target.value)} disabled={running}>
                  {TEMPOS.map((x) => (
                    <option key={x.key} value={x.key}>
                      {t(`vocal.tempo.${x.key}`)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="vocal-field">
              <span>{t('vocal.volume')}</span>
              <select value={volumeKey} onChange={(e) => changeVolume(e.target.value)}>
                {Object.keys(LOUDNESS).map((k) => (
                  <option key={k} value={k}>
                    {t(`vocal.volume.${k}`)}
                  </option>
                ))}
              </select>
            </label>
            <span className="vocal-with-tip">
              <label className="vocal-switch" title={t('vocal.guideHint')}>
                <input type="checkbox" checked={guide} onChange={(e) => setGuide(e.target.checked)} />
                <span className="vocal-switch-track" aria-hidden="true" />
                {t('vocal.guide')}
              </label>
              <InfoTooltip text={t('tip.tools.vocalGuide')} />
            </span>
            {/* The count-in's tick (the 2 · 1 on the roll always shows). */}
            <label className="vocal-switch" title={t('vocal.countHint')}>
              <input type="checkbox" checked={countClick} onChange={(e) => changeCount(e.target.checked)} />
              <span className="vocal-switch-track" aria-hidden="true" />
              {t('vocal.count')}
            </label>
          </div>
        </div>
      </div>

      {run.phase === 'done' && run.summary && (
        <div className="vocal-card vocal-result" ref={resultRef}>
          <div className="vocal-result-top">
            <div className="vocal-score-ring" style={{ '--p': run.summary.score }}>
              <span>{run.summary.score}</span>
            </div>
            <div className="vocal-rounds" dir="ltr">
              {run.results.map((r, i) => (
                <span key={i} title={midiName(r.key)} className={r.score >= 85 ? 'is-good' : r.score >= 60 ? 'is-ok' : 'is-off'} style={{ height: `${Math.max(8, r.score)}%` }} />
              ))}
            </div>
            <InfoTooltip text={t('tip.tools.vocalScore')} />
          </div>
          <ul className="vocal-tips">
            {run.summary.tips.map((tip) => (
              <li key={tip.key} className={tip.key === 'great' || tip.key === 'vibratoGood' ? 'is-good' : ''}>
                <strong>{t(`vocal.tip.${tip.key}.title`, tip)}</strong>
                <span>{t(`vocal.tip.${tip.key}.text`, tip)}</span>
              </li>
            ))}
          </ul>
          <div className="vocal-actions">
            {onNext && (
              <button type="button" className="primary" onClick={onNext}>
                {isLast ? t('vocal.done') : t('vocal.next')}
              </button>
            )}
            <button type="button" className={onNext ? '' : 'primary'} onClick={begin}>
              {t('vocal.again')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
