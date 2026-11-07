import { BpmField } from '../Metronome/BpmField';
import { useLanguage } from '../../i18n/LanguageContext';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import './PlayAlong.css';

const SPEAKER = (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const MIC = (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
    <path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/**
 * The one play-along strip for beat-by-beat exercises (Practice -> Scales,
 * Rhythm): WHAT is happening now (demo = listen only / count-in / your turn —
 * listening / result), the transport (Demo · the one primary Start / Stop ·
 * tempo − / + with "adaptive" · Speed = find my top accurate speed), live
 * counts and the result card (notes right, in time, the tendency, what the
 * tempo does next). Logic: hooks/useRhythmGame.js.
 */
export function PlayAlong({ game, metronome }) {
  const { t } = useLanguage();
  const { phase, countIn, live, result, exercise } = game;
  const total = exercise?.sequence?.length ?? 0;
  const running = game.isPlaying;
  const demo = game.demoing;

  let status;
  if (phase === 'countin') status = { kind: 'count', text: demo ? t('pa.countDemo') : t('pa.countPlay'), big: countIn };
  else if (phase === 'demo') status = { kind: 'demo', text: t('pa.demo') };
  else if (phase === 'run') status = { kind: 'run', text: game.findSpeed ? t('pa.runSpeed', { bpm: metronome.bpm }) : t('pa.run') };
  else if (phase === 'done') status = { kind: 'done', text: t('pa.done') };
  else status = { kind: 'idle', text: t('pa.idle') };

  return (
    <div className="pa" dir="auto">
      <div className={'pa-status is-' + status.kind} aria-live="polite">
        {status.kind === 'demo' && <span className="pa-ico">{SPEAKER}</span>}
        {status.kind === 'run' && <span className="pa-ico is-mic">{MIC}</span>}
        {status.kind === 'count' && <span className="pa-count">{status.big}</span>}
        <span className="pa-status-text">{status.text}</span>
        {status.kind === 'run' && (
          <span className="pa-live">
            {live.hits}/{total}
          </span>
        )}
      </div>

      <div className="pa-transport">
        <button
          type="button"
          className="pa-demo"
          onClick={running ? game.stop : game.demo}
          disabled={running && !demo}
          aria-label={t('pa.demoBtn')}
        >
          {SPEAKER}
          <span>{demo ? t('vocal.stop') : t('pa.demoBtn')}</span>
        </button>
        <button type="button" className={'pa-go' + (running && !demo ? ' is-on' : '')} onClick={running ? game.stop : game.play} disabled={demo}>
          <span className="pa-go-glyph" aria-hidden="true" />
          <span>{running && !demo ? t('vocal.stop') : phase === 'done' ? t('pa.again') : t('vocal.start')}</span>
        </button>
        <div className="pa-tempo">
          <BpmField
            value={metronome.bpm}
            onChange={metronome.setBpm}
            min={40}
            max={220}
            className="pa-bpm"
            labels={{ down: t('piano.metronome.tempoDown'), up: t('piano.metronome.tempoUp'), value: t('metronome.bpm'), edit: t('piano.metronome.editHint') }}
          />
          <label className="pa-auto">
            <input type="checkbox" className="lt-switch" checked={game.autoTempo} onChange={(e) => game.setAutoTempo(e.target.checked)} />
            <span>{t('pa.auto')}</span>
            <InfoTooltip text={t('pa.autoTip')} />
          </label>
        </div>
        <button type="button" className="pa-speed" onClick={game.startFindSpeed} disabled={running}>
          {t('pa.speedBtn')}
        </button>
      </div>
      {phase === 'idle' && game.startWhy === 'level' && <p className="pa-note">{t('pa.fromLevel', { bpm: metronome.bpm })}</p>}
      {phase === 'idle' && game.startWhy === 'item' && <p className="pa-note">{t('pa.fromItem', { bpm: metronome.bpm })}</p>}
      {phase === 'idle' && <p className="pa-note">{t('pa.speedHint')}</p>}

      {result && phase === 'done' && <Result result={result} t={t} />}
      {running && game.micError && <p className="pa-warn">{t('trainer.micError', { message: game.micError })}</p>}
    </div>
  );
}

function Result({ result: r, t }) {
  const tendency =
    r.meanOffsetMs == null
      ? null
      : Math.abs(r.meanOffsetMs) <= 30
      ? t('pa.tendOn')
      : r.meanOffsetMs < 0
      ? t('pa.tendEarly', { ms: Math.abs(r.meanOffsetMs) })
      : t('pa.tendLate', { ms: r.meanOffsetMs });
  const tempo = r.tempo;
  const tempoLine = !tempo
    ? null
    : tempo.change === 'up'
    ? t('pa.tempoUp', { to: tempo.to })
    : tempo.change === 'down'
    ? t('pa.tempoDown', { to: tempo.to })
    : tempo.change === 'speedUp'
    ? t('pa.speedUp', { to: tempo.to })
    : tempo.change === 'speedFound'
    ? tempo.best
      ? t('pa.speedFound', { best: tempo.best })
      : t('pa.speedNone', { to: tempo.to })
    : t('pa.tempoSame');
  return (
    <div className={'pa-result' + (r.passed ? ' is-pass' : '')}>
      <div className="pa-tiles">
        <div className="pa-tile">
          <span className="pa-tile-v">{r.notesPct}%</span>
          <span className="pa-tile-l">{t('pa.notes', { hits: r.hits, total: r.total })}</span>
        </div>
        <div className="pa-tile">
          <span className="pa-tile-v">{r.timingPct == null ? '—' : `${r.timingPct}%`}</span>
          <span className="pa-tile-l">{t('pa.inTime')}</span>
        </div>
        <div className="pa-tile">
          <span className="pa-tile-v">{r.bpm}</span>
          <span className="pa-tile-l">BPM</span>
        </div>
      </div>
      <p className="pa-verdict">{r.passed ? t('pa.pass') : r.notesPct < 75 ? t('pa.failNotes') : t('pa.failTime')}</p>
      {tendency && <p className="pa-line">{tendency}</p>}
      {r.wrong > 0 && <p className="pa-line">{t('pa.wrong', { n: r.wrong })}</p>}
      {tempoLine && <p className="pa-line is-tempo">{tempoLine}</p>}
    </div>
  );
}
