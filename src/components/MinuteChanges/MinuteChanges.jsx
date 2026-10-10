import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { colorForChord } from '../../styles/colors';
import { perfFor } from '../../coach/perfLog';
import { pairIndexOf, useMinuteChanges } from '../../hooks/useMinuteChanges';
import './MinuteChanges.css';

// Practice: One-Minute Changes — pick two chords, Start, alternate one
// strum per chord for 60 s; the mic counts the clean changes (see
// hooks/useMinuteChanges.js for the counting rule). Self-contained panel.

const CHORD_GROUPS = [
  { key: 'minute.groupOpen', chords: ['A', 'C', 'D', 'E', 'G', 'Am', 'Dm', 'Em'] },
  { key: 'minute.group7', chords: ['A7', 'B7', 'C7', 'D7', 'E7', 'G7'] },
  { key: 'minute.groupBarre', chords: ['F', 'B', 'Bb', 'Bm', 'F#m', 'Cm', 'Gm'] },
];
const ALL_CHORDS = CHORD_GROUPS.flatMap((g) => g.chords);
const DEFAULT_PAIR = ['A', 'D'];

const RING_R = 88;
const RING_C = 2 * Math.PI * RING_R;
const TARGET_OK = 30;
const TARGET_MASTER = 60;

// Keeps chord names (Latin, with ♯/♭/7) reading left-to-right inside Hebrew text.
const ltr = (s) => `⁦${s}⁩`;

function validPair(pair) {
  if (!Array.isArray(pair) || pair.length !== 2) return DEFAULT_PAIR;
  const [a, b] = pair;
  return ALL_CHORDS.includes(a) && ALL_CHORDS.includes(b) && a !== b ? [a, b] : DEFAULT_PAIR;
}

function historyFor(a, b) {
  try {
    return [...perfFor({ tool: 'minuteChanges', item: `${a}>${b}` }), ...perfFor({ tool: 'minuteChanges', item: `${b}>${a}` })]
      .filter((e) => Number.isFinite(e.metrics?.perMinute ?? e.metrics?.count))
      .sort((x, y) => x.at - y.at);
  } catch {
    return [];
  }
}

function ChordSelect({ id, value, onChange, disabled, label, t }) {
  return (
    <label className="minute-field" htmlFor={id}>
      <span className="minute-field-label">{label}</span>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} dir="ltr">
        {CHORD_GROUPS.map((g) => (
          <optgroup key={g.key} label={t(g.key)}>
            {g.chords.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function Sparkline({ values }) {
  const w = 160;
  const h = 40;
  const max = Math.max(TARGET_MASTER, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const y = (v) => h - 3 - (v / max) * (h - 6);
  const pts = values.map((v, i) => `${(values.length > 1 ? i * step : w / 2).toFixed(1)},${y(v).toFixed(1)}`);
  return (
    <svg className="minute-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <line className="minute-spark-target" x1="0" x2={w} y1={y(TARGET_OK)} y2={y(TARGET_OK)} />
      {values.length > 1 && <polyline className="minute-spark-line" points={pts.join(' ')} />}
      {pts.map((p, i) => {
        const [cx, cy] = p.split(',');
        return <circle key={i} className={`minute-spark-dot${i === pts.length - 1 ? ' is-last' : ''}`} cx={cx} cy={cy} r={i === pts.length - 1 ? 3.2 : 2.2} />;
      })}
    </svg>
  );
}

function pickTip(res) {
  if (res.count >= 10 && res.wrong >= Math.max(4, res.count * 0.25)) return 'minute.tipSlow';
  if (res.count < 15) return 'minute.tipAir';
  if (res.count < TARGET_OK) return 'minute.tipAnchor';
  if (res.count < 45) return 'minute.tipBlock';
  if (res.count < TARGET_MASTER) return 'minute.tipLook';
  return null;
}

export function MinuteChanges({ initialChords, onResult }) {
  const { t, lang } = useLanguage();
  const [pair, setPair] = useState(() => validPair(initialChords));
  const [a, b] = pair;
  const [history, setHistory] = useState(() => historyFor(a, b));

  const handleResult = useCallback(
    (res) => {
      setHistory(historyFor(a, b));
      onResult?.(res);
    },
    [a, b, onResult]
  );

  const mc = useMinuteChanges({ chords: pair, onResult: handleResult });
  const busy = mc.phase === 'countdown' || mc.phase === 'running';

  useEffect(() => {
    setHistory(historyFor(a, b));
  }, [a, b]);

  const setA = (v) => setPair(([, pb]) => [v, pb]);
  const setB = (v) => setPair(([pa]) => [pa, v]);
  const swap = () => setPair(([pa, pb]) => [pb, pa]);
  const same = a === b;

  const fraction = mc.phase === 'running' ? mc.remainingMs / mc.durationMs : 1; // done = full (green) ring
  const secondsLeft = Math.ceil(mc.remainingMs / 1000);
  // Which chord comes next: before the first one is heard, either may start (show A).
  const nextIdx = mc.phase === 'running' ? (mc.current == null ? 0 : 1 - mc.current) : null;

  const res = mc.result;
  const verdict = res ? (res.count >= TARGET_MASTER ? 'High' : res.count >= TARGET_OK ? 'Mid' : 'Low') : null;
  const tipKey = res ? pickTip(res) : null;
  let slower = null;
  if (res && res.nAToB >= 3 && res.nBToA >= 3) {
    const ab = res.meanAToBMs;
    const ba = res.meanBToAMs;
    if (ab > ba * 1.25) slower = `${a}→${b}`;
    else if (ba > ab * 1.25) slower = `${b}→${a}`;
  }

  const histValues = useMemo(() => history.map((e) => e.metrics.perMinute ?? e.metrics.count), [history]);
  const best = histValues.length ? Math.max(...histValues) : null;
  const recent = history.slice(-12);
  const dateFmt = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return null;
    }
  }, [lang]);

  const heardIdx = pairIndexOf(mc.heard, pair);
  // A pair chord is shown with the pair's own spelling (Bb, not the detector's A#).
  const heardName = heardIdx >= 0 ? pair[heardIdx] : mc.heard?.chord ?? null;

  return (
    <section className="minute-changes" aria-labelledby="minute-title" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <header className="minute-head">
        <h2 id="minute-title" className="minute-title">
          {t('minute.title')}
          <InfoTooltip text={t('minute.tip')} />
        </h2>
        <p className="minute-subtitle">{t('minute.subtitle')}</p>
      </header>

      <div className="minute-controls">
        <ChordSelect id="minute-chord-a" value={a} onChange={setA} disabled={busy} label={t('minute.chordA')} t={t} />
        <button type="button" className="minute-swap" onClick={swap} disabled={busy} aria-label={t('minute.swapLabel')} title={t('minute.swapLabel')}>
          <span aria-hidden="true">⇄</span> {t('minute.swap')}
        </button>
        <ChordSelect id="minute-chord-b" value={b} onChange={setB} disabled={busy} label={t('minute.chordB')} t={t} />
        <div className="minute-actions">
          {busy ? (
            <button type="button" className="minute-btn is-stop" onClick={mc.stop}>
              {t('minute.stop')}
            </button>
          ) : (
            <button type="button" className="minute-btn is-primary" onClick={mc.start} disabled={same}>
              {mc.phase === 'done' ? t('minute.again') : t('minute.start')}
            </button>
          )}
        </div>
      </div>
      {same && <p className="minute-note is-warn">{t('minute.same')}</p>}
      {mc.error && <p className="minute-note is-warn">{t('minute.micError', { msg: mc.error })}</p>}

      <div className={`minute-stage is-${mc.phase}`}>
        <div className="minute-ring-wrap">
          <svg className="minute-ring" viewBox="0 0 200 200" aria-hidden="true">
            <circle className="minute-ring-track" cx="100" cy="100" r={RING_R} />
            <circle
              className="minute-ring-progress"
              cx="100"
              cy="100"
              r={RING_R}
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - fraction)}
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div className="minute-ring-center" aria-live="polite">
            {mc.phase === 'countdown' ? (
              <>
                <span className="minute-big is-countdown" key={mc.countdown}>
                  {mc.countdown}
                </span>
                <span className="minute-small">{t('minute.getReady')}</span>
              </>
            ) : mc.phase === 'idle' ? (
              <>
                <span className="minute-big is-muted">{Math.round(mc.durationMs / 1000)}</span>
                <span className="minute-small">{t('minute.ready')}</span>
              </>
            ) : (
              <>
                <span className="minute-big">{mc.count}</span>
                <span className="minute-small">{t('minute.changes')}</span>
                {mc.phase === 'running' && <span className="minute-time">{t('minute.secondsLeft', { s: secondsLeft })}</span>}
              </>
            )}
          </div>
        </div>

        <div className="minute-side">
          <div className="minute-pair" dir="ltr">
            {[a, b].map((c, i) => (
              <div
                key={`${i}-${c}`}
                className={`minute-chip${nextIdx === i ? ' is-next' : ''}${mc.phase === 'running' && mc.current === i ? ' is-current' : ''}`}
                style={{ '--chip-color': colorForChord(c) }}
              >
                <span className="minute-chip-name">{c}</span>
                {nextIdx === i && <span className="minute-chip-tag">{t('minute.next')}</span>}
              </div>
            ))}
          </div>

          <div className="minute-heard">
            <span className="minute-label">{t('minute.heard')}</span>
            <span className={`minute-heard-chord${heardIdx >= 0 ? ' is-match' : heardName ? ' is-other' : ''}`} dir="ltr">
              {busy ? heardName ?? t('minute.silence') : t('minute.silence')}
            </span>
          </div>

          <div className="minute-meter" role="meter" aria-label={t('minute.level')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(mc.level * 100)}>
            <span className="minute-label">{t('minute.level')}</span>
            <div className="minute-meter-bar">
              <div className="minute-meter-fill" style={{ transform: `scaleX(${mc.level.toFixed(3)})` }} />
            </div>
          </div>

          {(mc.phase === 'running' || mc.phase === 'done') && mc.wrong > 0 && (
            <div className="minute-wrong">
              <span className="minute-label">{t('minute.wrong')}</span>
              <span className="minute-wrong-n">{mc.wrong}</span>
            </div>
          )}
          {mc.phase === 'idle' && <p className="minute-howto">{t('minute.howTo')}</p>}
        </div>
      </div>

      <div className="minute-bottom">
        {res && (
          <div className={`minute-card minute-result is-${verdict.toLowerCase()}`}>
            <h3 className="minute-card-title">{t('minute.resultTitle')}</h3>
            <div className="minute-result-main">
              <span className="minute-result-n">{res.perMinute}</span>
              <span className="minute-result-unit">{t('minute.perMinute')}</span>
            </div>
            <div className="minute-stats">
              <span className="minute-stat">
                <span dir="ltr">{`${a}→${b}`}</span> <b>{res.aToB}</b>
              </span>
              <span className="minute-stat">
                <span dir="ltr">{`${b}→${a}`}</span> <b>{res.bToA}</b>
              </span>
              {res.count > 0 && (
                <span className="minute-stat">
                  {t('minute.meanGap')} <b>{t('minute.secUnit', { s: (res.meanGapMs / 1000).toFixed(1) })}</b>
                </span>
              )}
              <span className="minute-stat">
                {t('minute.longestGap')} <b>{t('minute.secUnit', { s: (res.longestGapMs / 1000).toFixed(1) })}</b>
              </span>
              {res.wrong > 0 && (
                <span className="minute-stat">
                  {t('minute.wrong')} <b>{res.wrong}</b>
                </span>
              )}
            </div>
            <p className="minute-verdict">{t(`minute.verdict${verdict}`)}</p>
            {slower && <p className="minute-advice">{t('minute.slowerDir', { pair: ltr(slower) })}</p>}
            {tipKey && <p className="minute-advice">{t(tipKey)}</p>}
          </div>
        )}

        <div className="minute-card minute-history">
          <h3 className="minute-card-title">
            {t('minute.history')}
            {best != null && <span className="minute-best">{t('minute.best', { n: best })}</span>}
          </h3>
          {recent.length === 0 ? (
            <p className="minute-muted">{t('minute.noHistory')}</p>
          ) : (
            <>
              <Sparkline values={recent.map((e) => e.metrics.perMinute ?? e.metrics.count)} />
              <ol className="minute-history-list">
                {recent
                  .slice(-5)
                  .reverse()
                  .map((e) => (
                    <li key={e.id}>
                      <span className="minute-muted">{dateFmt ? dateFmt.format(new Date(e.at)) : e.day}</span>
                      <b>{e.metrics.perMinute ?? e.metrics.count}</b>
                    </li>
                  ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default MinuteChanges;
