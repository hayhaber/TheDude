import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import { LICK_GENRES, LICK_LEVELS } from '../../music/lickTrainer/library';
import { TEMPO_OPTIONS } from '../../hooks/useLickTrainer';
import { midiToNoteName } from '../../music/pitchUtils';
import { TabTimeline } from './TabTimeline';
import './LickTrainer.css';

const STRING_NUM = (stringIndex) => 6 - stringIndex; // app index -> tab string number

function labelOf(list, key, lang) {
  return localize(list.find((x) => x.key === key)?.label ?? { en: key, he: key }, lang);
}

function pct(v) {
  return v == null ? '—' : `${Math.round(v * 100)}%`;
}

function NoteIssue({ note, res, t }) {
  const where = t('lickTrainer.noteWhere', { n: note.order, string: STRING_NUM(note.string), fret: note.fret });
  let text;
  if (res.status === 'missed') text = t('lickTrainer.issue.missed');
  else if (res.status === 'wrong')
    text = t('lickTrainer.issue.wrong', { played: midiToNoteName(res.playedMidi), expected: midiToNoteName(note.midi) });
  else if (res.status === 'timing')
    text = t(res.offsetMs > 0 ? 'lickTrainer.issue.late' : 'lickTrainer.issue.early', { ms: Math.abs(res.offsetMs) });
  else if (res.bend && !res.bend.ok)
    text = t(res.bend.reached < res.bend.target ? 'lickTrainer.issue.bendFlat' : 'lickTrainer.issue.bendSharp', {
      cents: Math.round(Math.abs(res.bend.reached - res.bend.target) * 100),
    });
  else if (res.release && !res.release.ok) text = t('lickTrainer.issue.release');
  else if (res.vibrato && !res.vibrato.ok) text = t('lickTrainer.issue.vibrato');
  else return null;
  return (
    <li className={`lt-issue is-${res.status}`}>
      <span className="lt-issue-where">{where}</span>
      <span>{text}</span>
    </li>
  );
}

function Results({ trainer, t, lang }) {
  const { result, lick } = trainer;
  if (!result) return null;
  const s = result.summary;
  const issues = result.notes.filter((r) => r.status !== 'ok');
  return (
    <div className="lt-results" aria-live="polite">
      {result.signal.tooQuiet ? (
        <p className="lt-warning">{t('lickTrainer.signal.quiet')}</p>
      ) : (
        <>
          <div className="lt-score-row">
            <div className={`lt-score grade-${s.verdict}`}>
              <span className="lt-score-num">{s.score}</span>
              <span className="lt-score-label">{t('lickTrainer.score')}</span>
            </div>
            <div className="lt-verdict">
              <p className="lt-verdict-text">{t(`lickTrainer.verdict.${s.verdict}`)}</p>
              <div className="lt-breakdown">
                <span>
                  {t('lickTrainer.notes')}: <b>{s.correct}/{s.total}</b>
                </span>
                <span>
                  {t('lickTrainer.timing')}: <b>{pct(s.timingScore)}</b>
                </span>
                {s.techniqueScore != null && (
                  <span>
                    {t('lickTrainer.technique')}: <b>{pct(s.techniqueScore)}</b>
                  </span>
                )}
                <span className="lt-muted">
                  {result.tempoPct}% · {result.bpm} BPM
                </span>
              </div>
            </div>
          </div>

          {s.tips.length > 0 && (
            <ul className="lt-tips">
              {s.tips.map((tip) => (
                <li key={tip.key}>{t(`lickTrainer.tip.${tip.key}`, tip)}</li>
              ))}
            </ul>
          )}

          {s.focus && (
            <p className="lt-focus">{t('lickTrainer.focus', { from: s.focus.from + 1, to: s.focus.to + 1 })}</p>
          )}

          {issues.length > 0 && (
            <ul className="lt-issues">
              {issues.slice(0, 8).map((r) => (
                <NoteIssue key={r.index} note={lick.notes[r.index]} res={r} t={t} />
              ))}
            </ul>
          )}

          {result.signal.clipped && <p className="lt-warning">{t('lickTrainer.signal.clipped')}</p>}
          {!result.calibrated && <p className="lt-muted">{t('lickTrainer.notCalibrated')}</p>}
        </>
      )}

      <div className="lt-actions" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <button type="button" className="primary" onClick={trainer.record}>
          {t('lickTrainer.retry')}
        </button>
        {s.verdict === 'tempoUp' && trainer.tempoPct < TEMPO_OPTIONS[TEMPO_OPTIONS.length - 1] && (
          <button type="button" onClick={trainer.raiseTempo}>
            {t('lickTrainer.faster')}
          </button>
        )}
      </div>
    </div>
  );
}

export function LickTrainer({ trainer }) {
  const { t, lang } = useLanguage();
  const { lick, phase, history } = trainer;
  const busy = phase === 'countIn' || phase === 'recording' || phase === 'analyzing' || phase === 'calibrating';
  const countdown =
    phase === 'countIn' && trainer.playheadBeat != null ? Math.max(1, Math.ceil(-trainer.playheadBeat)) : null;
  const dir = lang === 'he' ? 'rtl' : 'ltr';

  return (
    <div className="lick-trainer" dir={dir}>
      <p className="lt-intro">{t('lickTrainer.intro')}</p>

      <div className="lt-filters">
        <label className="lt-field">
          <span>{t('lickTrainer.genre')}</span>
          <select value={trainer.genre} onChange={(e) => trainer.setGenre(e.target.value)}>
            <option value="all">{t('lickTrainer.all')}</option>
            {LICK_GENRES.map((g) => (
              <option key={g.key} value={g.key}>
                {localize(g.label, lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="lt-field">
          <span>{t('lickTrainer.level')}</span>
          <select value={trainer.level} onChange={(e) => trainer.setLevel(e.target.value)}>
            <option value="all">{t('lickTrainer.all')}</option>
            {LICK_LEVELS.map((l) => (
              <option key={l.key} value={l.key}>
                {localize(l.label, lang)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="lt-list" role="list">
        {trainer.visibleLicks.length === 0 && <p className="lt-muted">{t('lickTrainer.none')}</p>}
        {trainer.visibleLicks.map((l) => {
          const best = history[l.id]?.best;
          return (
            <button
              key={l.id}
              type="button"
              role="listitem"
              className={'lt-card' + (l.id === lick.id ? ' active' : '')}
              onClick={() => trainer.selectLick(l.id)}
              disabled={busy}
            >
              <span className="lt-card-title" dir="auto">
                {localize(l.title, lang)}
              </span>
              <span className="lt-card-meta">
                {labelOf(LICK_GENRES, l.genre, lang)} · {labelOf(LICK_LEVELS, l.level, lang)} · {l.key}
              </span>
              {best && (
                <span className="lt-card-best">
                  {t('lickTrainer.best', { score: best.score, tempo: best.tempoPct })}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section className="lt-lick">
        <div className="lt-lick-head">
          <h3 dir="auto">{localize(lick.title, lang)}</h3>
          <span className={'lt-badge' + (lick.source === 'user' ? ' verified' : '')}>
            {t(lick.source === 'user' ? 'lickTrainer.sourceUser' : 'lickTrainer.sourceApp')}
          </span>
        </div>
        <p className="lt-meta">
          <bdi dir="ltr">
            {lick.scale} · {lick.bpm} BPM
          </bdi>{' '}
          · {labelOf(LICK_LEVELS, lick.level, lang)}
        </p>
        <p className="lt-about" dir="auto">
          {localize(lick.about, lang)}
        </p>
        {lick.rhythmApprox && <p className="lt-muted">{t('lickTrainer.rhythmApprox')}</p>}

        <TabTimeline lick={lick} playheadBeat={trainer.playheadBeat} result={trainer.result} />

        <div className="lt-controls">
          <label className="lt-field">
            <span>{t('lickTrainer.tempo')}</span>
            <select dir="ltr" value={trainer.tempoPct} onChange={(e) => trainer.setTempoPct(Number(e.target.value))} disabled={busy}>
              {TEMPO_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}% · {Math.round((lick.bpm * v) / 100)} BPM
                </option>
              ))}
            </select>
          </label>

          {phase === 'listening' ? (
            <button type="button" onClick={trainer.stop}>
              {t('lickTrainer.stop')}
            </button>
          ) : (
            <button type="button" onClick={trainer.listen} disabled={busy}>
              {t('lickTrainer.listen')}
            </button>
          )}

          {phase === 'countIn' || phase === 'recording' ? (
            <button type="button" className="record active" onClick={trainer.stop}>
              {t('lickTrainer.stop')}
            </button>
          ) : (
            <button type="button" className="record" onClick={trainer.record} disabled={busy}>
              {t('lickTrainer.record')}
            </button>
          )}

          <label className="lt-check">
            <input type="checkbox" checked={trainer.clickDuring} onChange={(e) => trainer.setClickDuring(e.target.checked)} disabled={busy} />
            {t('lickTrainer.click')}
          </label>
        </div>

        <div className="lt-status" aria-live="polite">
          {phase === 'countIn' && countdown != null && <span className="lt-countdown">{countdown}</span>}
          {phase === 'countIn' && <span>{t('lickTrainer.getReady')}</span>}
          {phase === 'recording' && <span className="lt-rec-dot" aria-hidden="true" />}
          {phase === 'recording' && <span>{t('lickTrainer.recording')}</span>}
          {phase === 'analyzing' && <span>{t('lickTrainer.analyzing')}</span>}
          {phase === 'calibrating' && <span>{t('lickTrainer.calibrating')}</span>}
          {(phase === 'recording' || phase === 'calibrating' || phase === 'countIn') && (
            <span className="lt-meter" aria-hidden="true">
              <span style={{ width: `${Math.min(100, trainer.inputLevel * 140)}%` }} />
            </span>
          )}
        </div>

        {trainer.error && (
          <p className="lt-warning">
            {trainer.error.key === 'mic'
              ? t('lickTrainer.error.mic', { message: trainer.error.message })
              : t('lickTrainer.error.calibration')}
          </p>
        )}

        <Results trainer={trainer} t={t} lang={lang} />

        <div className="lt-calibration">
          <span className="lt-muted">
            {trainer.latency != null
              ? t('lickTrainer.latency', { ms: Math.round(trainer.latency * 1000) })
              : t('lickTrainer.latencyUnknown')}
          </span>
          <button type="button" onClick={trainer.calibrate} disabled={busy}>
            {t('lickTrainer.calibrate')}
          </button>
        </div>
        <p className="lt-muted lt-small">{t('lickTrainer.calibrateHow')}</p>
      </section>
    </div>
  );
}
