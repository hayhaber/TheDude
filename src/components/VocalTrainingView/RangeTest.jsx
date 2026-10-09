import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { classifyVoice, midiName, saveRange } from '../../music/vocal/voiceRange';
import { playPianoNote } from '../../audio/pianoPlayer';
import { RangeBar } from './RangeBar';

// Guided range test: slide down to the lowest comfortable note and hold it,
// then up to the highest. Only a HELD note counts (stable for ~0.35 s), so a
// passing crack or a noise frame can't set the range; the result can be
// nudged a semitone either way if the mic missed a note.
const STABLE_SECONDS = 0.35;

export function RangeTest({ mic, onDone, onCancel }) {
  const { t } = useLanguage();
  const [step, setStep] = useState('low'); // low | high | result
  const [low, setLow] = useState(null);
  const [high, setHigh] = useState(null);
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    mic.start();
    let raf;
    const check = () => {
      raf = requestAnimationFrame(check);
      const fr = mic.framesRef.current;
      if (fr.length < 10) return;
      const end = fr[fr.length - 1].ct;
      const win = [];
      for (let i = fr.length - 1; i >= 0 && fr[i].ct >= end - STABLE_SECONDS; i -= 1) win.push(fr[i].midi);
      if (win.length < 8 || win.some((m) => m == null)) return;
      const lo = Math.min(...win);
      const hi = Math.max(...win);
      if (hi - lo > 0.7) return;
      const note = Math.round([...win].sort((a, b) => a - b)[win.length >> 1]);
      if (stepRef.current === 'low') setLow((v) => (v == null ? note : Math.min(v, note)));
      else if (stepRef.current === 'high') setHigh((v) => (v == null ? note : Math.max(v, note)));
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [mic]);

  const liveNote = mic.live.midi != null ? midiName(mic.live.midi) : '–';
  const voice = low != null && high != null ? classifyVoice(low, high) : null;

  const nudge = (which, d) => {
    if (which === 'low') setLow((v) => (v ?? 48) + d);
    else setHigh((v) => (v ?? 67) + d);
  };

  return (
    <div className="vocal-range-test">
      <div className="vocal-run-head">
        <button type="button" className="vocal-back" onClick={onCancel}>
          {t('vocal.back')}
        </button>
        <h2>{t('vocal.range.title')}</h2>
      </div>

      {mic.error && <p className="vocal-error">{t('vocal.micError', { message: mic.error })}</p>}

      {step !== 'result' && (
        <div className="vocal-card vocal-range-step">
          <p className="vocal-range-intro">{t('vocal.range.intro')}</p>
          <p className="vocal-range-instruction">{t(step === 'low' ? 'vocal.range.low' : 'vocal.range.high')}</p>
          <div className="vocal-range-live">
            <div>
              <span className="vocal-eyebrow">{t('vocal.range.now')}</span>
              <strong className="vocal-big-note">{liveNote}</strong>
              <span className="vocal-level">
                <span style={{ width: `${Math.round(mic.live.level * 100)}%` }} />
              </span>
            </div>
            <div>
              <span className="vocal-eyebrow">{t(step === 'low' ? 'vocal.range.lowest' : 'vocal.range.highest')}</span>
              <strong className="vocal-big-note is-captured">
                {step === 'low' ? (low != null ? midiName(low) : '–') : high != null ? midiName(high) : '–'}
              </strong>
              <span className="vocal-muted">{(step === 'low' ? low : high) == null ? t('vocal.range.waiting') : ' '}</span>
            </div>
          </div>
          <div className="vocal-actions">
            {step === 'low' ? (
              <button type="button" className="primary" disabled={low == null} onClick={() => setStep('high')}>
                {t('vocal.next')}
              </button>
            ) : (
              <button type="button" className="primary" disabled={high == null} onClick={() => setStep('result')}>
                {t('vocal.next')}
              </button>
            )}
            <button type="button" onClick={() => (step === 'low' ? setLow(null) : setHigh(null))}>
              {t('vocal.range.retry')}
            </button>
          </div>
        </div>
      )}

      {step === 'result' && low != null && high != null && (
        <div className="vocal-card vocal-range-result">
          <span className="vocal-eyebrow">{t('vocal.range.type')}</span>
          <h3 className="vocal-voice-type">{voice ? t(`vocal.voice.${voice}`) : '–'}</h3>
          <p className="vocal-range-notes">
            {midiName(low)} – {midiName(high)} · {t('vocal.range.semitones', { n: high - low })}
          </p>
          <RangeBar low={low} high={high} />
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
          {high - low < 7 && <p className="vocal-warning">{t('vocal.range.narrow')}</p>}
          <div className="vocal-actions">
            <button
              type="button"
              className="primary"
              disabled={high <= low}
              onClick={() => {
                const r = saveRange(low, high);
                mic.stop();
                onDone(r);
              }}
            >
              {t('vocal.range.save')}
            </button>
            <button
              type="button"
              onClick={() => {
                setLow(null);
                setHigh(null);
                setStep('low');
              }}
            >
              {t('vocal.range.retry')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
