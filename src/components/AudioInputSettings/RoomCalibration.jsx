import { useEffect, useRef, useState } from 'react';
import { getCalibration, setCalibration } from '../../audio/audioInputSettingsStore';
import { runCalibration, toDb } from '../../audio/noiseCalibration';
import { useLanguage } from '../../i18n/LanguageContext';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';

// Settings -> Audio Input -> Room Calibration: 3 s of the room as usual,
// then 4 s of normal playing (audio/noiseCalibration.js). Saved per mic +
// input mode; every mic detector then gates out sound below the playing
// level. A suggested input gain is only applied on "Apply".
export function RoomCalibration({ deviceId, inputMode, gain, setGain, beforeStart }) {
  const { t, lang } = useLanguage();
  const [phase, setPhase] = useState('idle'); // idle | quiet | play | result
  const [progress, setProgress] = useState(0);
  const [level, setLevel] = useState(0);
  const [result, setResult] = useState(null); // last run's record (or { noPlay })
  const [error, setError] = useState(null);
  const [, bump] = useState(0);
  const abortRef = useRef(null);

  const saved = getCalibration(deviceId, inputMode);
  // A different mic/mode chosen -> drop the previous run's result card.
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [deviceId, inputMode]);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function start() {
    beforeStart?.();
    setError(null);
    setResult(null);
    setProgress(0);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const rec = await runCalibration({
        signal: ac.signal,
        onStep: (s) => {
          setPhase(s);
          setProgress(0);
        },
        onProgress: (p, l) => {
          setProgress(p);
          setLevel(l);
        },
      });
      if (!rec.noPlay) setCalibration(deviceId, inputMode, rec);
      setResult(rec);
      setPhase('result');
    } catch (err) {
      if (err?.name !== 'AbortError') setError(err?.message ?? String(err));
      setPhase('idle');
    } finally {
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function reset() {
    setCalibration(deviceId, inputMode, null);
    setResult(null);
    setPhase('idle');
    bump((n) => n + 1);
  }

  const running = phase === 'quiet' || phase === 'play';
  const fmt = (db) => t('noise.db', { value: Math.round(db) });
  const shown = result && !result.noPlay ? result : null;
  const dateStr = saved ? new Date(saved.at).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short' }) : '';

  return (
    <div className="settings-field room-cal">
      <span className="room-cal-head">
        {t('noise.title')}
        <InfoTooltip text={t('noise.tip')} />
      </span>

      {!running && (
        <span className="room-cal-status">
          {saved ? t('noise.saved', { date: dateStr, gate: Math.round(toDb(saved.gateRms * gain)) }) : t('noise.none')}
        </span>
      )}

      {running && (
        <div className="room-cal-run" aria-live="polite">
          <span className={'room-cal-step is-' + phase}>{t(phase === 'quiet' ? 'noise.step.quiet' : 'noise.step.play')}</span>
          <div className="room-cal-bar" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="room-cal-bar-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="audio-input-meter room-cal-level">
            <div className="audio-input-meter-fill" style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
        </div>
      )}

      {result?.noPlay && <span className="room-cal-warn">{t('noise.noPlay')}</span>}

      {shown && (
        <div className="room-cal-result">
          <div className="room-cal-stats">
            <div className="room-cal-stat">
              <span className="room-cal-stat-label">{t('noise.floor')}</span>
              <span className="room-cal-stat-value">{fmt(shown.floorDb + toDb(shown.gainAtCal))}</span>
            </div>
            <div className="room-cal-stat">
              <span className="room-cal-stat-label">{t('noise.playing')}</span>
              <span className="room-cal-stat-value">{fmt(shown.playDb + toDb(shown.gainAtCal))}</span>
            </div>
            <div className={'room-cal-stat is-' + shown.verdict}>
              <span className="room-cal-stat-label">{t('noise.snr')}</span>
              <span className="room-cal-stat-value">{fmt(shown.snrDb)}</span>
            </div>
          </div>
          <span className={'room-cal-verdict is-' + shown.verdict}>{t('noise.verdict.' + shown.verdict)}</span>
          {shown.verdict !== 'good' && (
            <div className="room-cal-tips">
              <span>{t('noise.tipsTitle')}</span>
              <ul>
                <li>{t('noise.tips.closer')}</li>
                <li>{t('noise.tips.fans')}</li>
                <li>{t('noise.tips.headphones')}</li>
                <li>{t('noise.tips.interface')}</li>
              </ul>
            </div>
          )}
          {shown.suggestedGain != null && Math.abs(shown.suggestedGain - gain) >= 0.1 && (
            <div className="room-cal-gain">
              <span>
                {t(shown.suggestedGain > shown.gainAtCal ? 'noise.gainLow' : 'noise.gainHigh', {
                  value: shown.suggestedGain.toFixed(1),
                })}
              </span>
              <button type="button" className="audio-input-test-btn" onClick={() => setGain(shown.suggestedGain)}>
                {t('noise.apply')}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <span className="settings-attribution audio-input-error">{t('noise.error', { message: error })}</span>}

      <div className="room-cal-actions">
        {running ? (
          <button type="button" className="audio-input-test-btn" onClick={cancel}>
            {t('noise.cancel')}
          </button>
        ) : (
          <>
            <button type="button" className="audio-input-test-btn room-cal-go" onClick={start}>
              {t(saved || result ? 'noise.again' : 'noise.calibrate')}
            </button>
            {saved && (
              <button type="button" className="audio-input-test-btn" onClick={reset}>
                {t('noise.reset')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
