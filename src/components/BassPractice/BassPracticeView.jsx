import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { BpmField } from '../Metronome/BpmField';
import { CATEGORIES, EXERCISES, KEY_NAMES, LEVELS, buildExercise, exerciseById } from '../../music/bass/bassPractice';
import '../ScalePracticePanel/ScalePracticePanel.css';
import '../PracticeView/PracticeView.css';
import './BassPractice.css';

const PREFS = 'dudestar-p-bass-practice';
const MODES = ['play', 'wait', 'listen'];

function loadPrefs() {
  try {
    return { cat: 'technique', ex: {}, key: 7, rootString: 0, ...(JSON.parse(localStorage.getItem(PREFS)) ?? {}) };
  } catch {
    return { cat: 'technique', ex: {}, key: 7, rootString: 0 };
  }
}

// Bass card -> Practice. The exercise library (music/bass/bassPractice.js) on
// the engine (hooks/useBassPractice.js, created in App so the Stage's bass
// neck can show the shape, the moving note and hit / miss flashes).
export function BassPracticeView({ bp, metronome }) {
  const { t, lang } = useLanguage();
  const tx = (x) => (x ? x[lang] ?? x.en : '');
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const [prefs, setPrefs] = useState(loadPrefs);
  // Opens empty, like the guitar's Practice: nothing until an exercise is chosen
  // (the last choice per tab is only remembered for this visit).
  const [chosen, setChosen] = useState({});
  const cat = prefs.cat;
  const ex = exerciseById(chosen[cat]);

  const save = (patch) => setPrefs((p) => ({ ...p, ...patch }));
  useEffect(() => {
    try {
      localStorage.setItem(PREFS, JSON.stringify({ cat: prefs.cat, key: prefs.key, rootString: prefs.rootString, mode: bp.mode }));
    } catch {
      /* storage full / blocked: prefs are a convenience */
    }
  }, [prefs.cat, prefs.key, prefs.rootString, bp.mode]);

  useEffect(() => {
    if (prefs.mode && MODES.includes(prefs.mode)) bp.setMode(prefs.mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const built = useMemo(() => {
    if (!ex) return null;
    const b = buildExercise(ex, { key: prefs.key, rootString: prefs.rootString });
    const item = ex.keyed ? `${ex.id}@${prefs.key}:${prefs.rootString}` : ex.id;
    return { ...b, id: ex.id, item, bpm: ex.bpm, labels: ex.labels };
  }, [ex, prefs.key, prefs.rootString]);

  useEffect(() => {
    bp.load(built);
    if (built?.labels) bp.setLabels(built.labels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built]);

  const list = EXERCISES.filter((e) => e.cat === cat);
  const levels = [...new Set(list.map((e) => e.level))];
  const running = bp.running;
  const steps = built?.steps ?? [];
  const cur = bp.stepIndex >= 0 ? steps[bp.stepIndex] : null;
  const curBar = cur?.bar ?? (built?.bars ? 0 : null);
  // The note strip: all notes (short exercises) or the current bar's (grooves).
  const strip = built?.bars ? steps.map((s, i) => ({ s, i })).filter(({ s }) => s.bar === curBar) : steps.map((s, i) => ({ s, i }));
  const labelOf = (s) => (bp.labels === 'finger' ? (s.finger === 0 ? '0' : s.finger ?? s.noteName) : bp.labels === 'degree' && s.degreeLabel ? s.degreeLabel : s.noteName);

  return (
    <div className="practice-view bass-practice" dir={dir}>
      <div>
        <h1>{t('bp.title')}</h1>
        <p className="subtitle">{t('bp.subtitle')}</p>
      </div>

      <div className="mode-toggle wrap practice-tabs" role="group" aria-label={t('bp.title')}>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            className={cat === c.key ? 'active' : ''}
            onClick={() => {
              if (running) bp.stop();
              save({ cat: c.key });
            }}
          >
            {tx(c.label)}
          </button>
        ))}
      </div>

      <div className="scale-practice-controls bp-controls">
        <label className="scale-practice-field bp-field-wide">
          <span className="scale-practice-field-label">{t('bp.exercise')}</span>
          <select
            value={chosen[cat] ?? ''}
            disabled={running}
            onChange={(e) => setChosen((c) => ({ ...c, [cat]: e.target.value || undefined }))}
          >
            <option value="">{t('bp.choose')}</option>
            {levels.map((lv) => (
              <optgroup key={lv} label={tx(LEVELS[lv])}>
                {list
                  .filter((e) => e.level === lv)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {tx(e.title)}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>

        {ex?.keyed && (
          <label className="scale-practice-field">
            <span className="scale-practice-field-label">{t('bp.key')}</span>
            <select value={prefs.key} disabled={running} onChange={(e) => save({ key: Number(e.target.value) })}>
              {KEY_NAMES.map((n, pc) => (
                <option key={pc} value={pc}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        {ex?.keyed && (
          <label className="scale-practice-field">
            <span className="scale-practice-field-label">{t('bp.rootString')}</span>
            <select value={prefs.rootString} disabled={running} onChange={(e) => save({ rootString: Number(e.target.value) })}>
              <option value={0}>{t('bp.string.0')}</option>
              <option value={1}>{t('bp.string.1')}</option>
            </select>
          </label>
        )}
        {ex && (
          <label className="scale-practice-field">
            <span className="scale-practice-field-label">{t('bp.mode')}</span>
            <select
              value={bp.mode}
              disabled={running}
              onChange={(e) => bp.setMode(e.target.value)}
            >
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {t('bp.mode.' + m)}
                </option>
              ))}
            </select>
          </label>
        )}
        {ex && (
          <label className="scale-practice-field">
            <span className="scale-practice-field-label">{t('bp.labels')}</span>
            <select
              value={bp.labels}
              onChange={(e) => bp.setLabels(e.target.value)}
            >
              {['note', 'degree', 'finger'].map((m) => (
                <option key={m} value={m}>
                  {t('bp.labels.' + m)}
                </option>
              ))}
            </select>
          </label>
        )}
        {ex && bp.mode !== 'wait' && (
          <div className="scale-practice-field">
            <span className="scale-practice-field-label">{t('bp.tempo')}</span>
            <BpmField
              value={metronome.bpm}
              onChange={metronome.setBpm}
              min={40}
              max={200}
              className="bp-bpm"
              labels={{ down: t('piano.metronome.tempoDown'), up: t('piano.metronome.tempoUp'), value: t('metronome.bpm'), edit: t('piano.metronome.editHint') }}
            />
          </div>
        )}
        {ex && (
          <div className="scale-practice-field">
            <span className="scale-practice-field-label">&nbsp;</span>
            <span className="bp-actions">
              <button type="button" className={'bp-latch' + (bp.loop ? ' is-on' : '')} aria-pressed={bp.loop} onClick={() => bp.setLoop(!bp.loop)}>
                {t('bp.loop')}
              </button>
              <button type="button" className="play-button" onClick={running ? bp.stop : bp.start}>
                {running ? t('bp.stop') : t('bp.start')}
              </button>
            </span>
          </div>
        )}
      </div>

      {!ex && <p className="bp-empty">{t('bp.empty')}</p>}

      {ex && (
        <section className="bp-card" dir={dir}>
          <div className="bp-card-head">
            <h2>{tx(ex.title)}</h2>
            <span className={'bp-level is-' + ex.level}>{tx(LEVELS[ex.level])}</span>
          </div>
          <p>
            <b>{t('bp.how')}: </b>
            {tx(ex.how)}
          </p>
          <p className="bp-why">
            <b>{t('bp.why')}: </b>
            {tx(ex.why)}
          </p>
        </section>
      )}

      {built?.bars && (
        <div className="bp-bars" dir="ltr" aria-label="chords">
          {built.bars.map((b, i) => (
            <span key={i} className={'bp-bar' + (i === curBar && (running || bp.stepIndex >= 0) ? ' is-now' : '')}>
              {b.name}
            </span>
          ))}
        </div>
      )}

      {ex && (
        <div className="bp-strip" dir="ltr">
          {strip.map(({ s, i }) => (
            <span key={i} className={'bp-note' + (i === bp.stepIndex ? ' is-now' : '') + (s.isRoot ? ' is-root' : '') + (s.beats < 1 ? ' is-short' : '')}>
              {labelOf(s)}
            </span>
          ))}
        </div>
      )}

      {ex && (running || bp.phase === 'done') && (
        <p className="bp-status" aria-live="polite" dir="auto">
          {bp.phase === 'countin' ? (
            <span className="bp-countin">{t('bp.countIn', { n: bp.countIn })}</span>
          ) : running && bp.mode === 'wait' && cur ? (
            t('bp.next', { n: bp.stepIndex + 1, m: steps.length, note: '⁦' + cur.noteName + '⁩' })
          ) : running && bp.mode === 'play' ? (
            <>
              {t('bp.listening')} {t('bp.live', bp.live)}
            </>
          ) : running ? (
            t('bp.playing')
          ) : null}
          {running && bp.mode !== 'listen' && bp.heard && <span className="bp-heard">{t('bp.heard', { note: '⁦' + bp.heard.name + '⁩' })}</span>}
          {bp.micError && <span className="bp-error">{t('bp.micError', { message: String(bp.micError) })}</span>}
          {running && bp.deadInput && <span className="bp-error">{t('bp.noSignal')}</span>}
        </p>
      )}

      {ex && bp.phase === 'done' && bp.result && <Result r={bp.result} best={bp.best} t={t} />}
    </div>
  );
}

function Result({ r, best, t }) {
  if (r.mode === 'wait') {
    return (
      <section className="bp-result">
        <h3>{t('bp.result.title')}</h3>
        <p dir="auto">{t('bp.result.wait', { n: r.notes, s: r.seconds })}</p>
      </section>
    );
  }
  const off = r.meanOffsetMs;
  const timing = off == null ? '—' : off <= -35 ? t('bp.timing.early', { ms: -off }) : off >= 35 ? t('bp.timing.late', { ms: off }) : t('bp.timing.on');
  const sp = r.spreadMs;
  const steady = sp == null ? '—' : sp < 30 ? t('bp.steady.tight', { ms: sp }) : sp < 60 ? t('bp.steady.ok', { ms: sp }) : t('bp.steady.loose', { ms: sp });
  return (
    <section className="bp-result">
      <h3>{t('bp.result.title')}</h3>
      <div className="bp-result-grid">
        <div className="bp-stat">
          <span className="bp-stat-label">{t('bp.result.accuracy')}</span>
          <span className="bp-stat-value">{r.accuracyPct ?? 0}%</span>
          <span className="bp-stat-sub">
            {r.hits} / {r.hits + r.misses}
          </span>
        </div>
        <div className="bp-stat">
          <span className="bp-stat-label">{t('bp.result.timing')}</span>
          <span className="bp-stat-value is-text" dir="auto">
            {timing}
          </span>
        </div>
        <div className="bp-stat">
          <span className="bp-stat-label">{t('bp.result.steady')}</span>
          <span className="bp-stat-value is-text" dir="auto">
            {steady}
          </span>
        </div>
        {best != null && (
          <div className="bp-stat">
            <span className="bp-stat-label">{t('bp.result.best')}</span>
            <span className="bp-stat-value">{best}%</span>
          </div>
        )}
      </div>
      <p className="bp-tip" dir="auto">
        {(r.accuracyPct ?? 0) >= 90 ? t('bp.tip.next') : (r.accuracyPct ?? 0) < 70 ? t('bp.tip.slow') : ''} {t('bp.lagNote')}
      </p>
    </section>
  );
}
