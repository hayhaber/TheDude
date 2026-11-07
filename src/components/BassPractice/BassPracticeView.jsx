import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { BpmField } from '../Metronome/BpmField';
import { CATEGORIES, EXERCISES, KEY_NAMES, LEVELS, buildExercise, exerciseById } from '../../music/bass/bassPractice';
import '../ScalePracticePanel/ScalePracticePanel.css';
import '../PracticeView/PracticeView.css';
import { LibraryRow, BackButton } from '../PracticeView/PracticeHome';
import '../PracticeView/PracticeHome.css';
import { loadOnboarding } from '../../onboarding/onboardingState';
import './BassPractice.css';
import { FreePlay } from '../PlayAlong/FreePlay';
import { BASS_TUNING } from '../../music/notes';

// The bass library (stage 4 of the redesign, the same list as the guitar's
// Practice — rule 10): a group per category, a row per exercise; the
// student's level (the first-run answer for bass) folds the exercises made
// for lower levels into one "N more basic" row and tags the harder ones.
const CAT_LOOK = {
  technique: { color: '#30B0C7', icon: 'hand' },
  scales: { color: '#007AFF', icon: 'path' },
  arpeggios: { color: '#AF52DE', icon: 'note' },
  grooves: { color: '#FF9500', icon: 'metronome' },
};
const RANGE = { 1: [0, 1], 2: [1, 2], 3: [2, 3] }; // exercise level -> student levels it is made for
function bassLevel() {
  const ob = loadOnboarding();
  if (ob?.instrument !== 'bass') return null;
  return { new: 0, few: 1, songs: 2 }[ob.level] ?? null;
}
const firstSentence = (txt) => (txt ? txt.split(/(?<=[.!?])\s/)[0] : '');

const PREFS = 'dudestar-p-bass-practice';
const MODES = ['play', 'wait', 'listen', 'free'];
// Free play (any notes, any order — only "is it in the scale / chord?") fits
// the shapes, not fixed technique patterns or grooves.
const FREE_CATS = ['scales', 'arpeggios'];

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
export function BassPracticeView({ bp, free, metronome }) {
  const { t, lang } = useLanguage();
  const tx = (x) => (x ? x[lang] ?? x.en : '');
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const [prefs, setPrefs] = useState(loadPrefs);
  // Opens empty, like the guitar's Practice: nothing until an exercise is chosen
  // (the last choice per tab is only remembered for this visit).
  const [chosen, setChosen] = useState({});
  const [expanded, setExpanded] = useState({});
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

  const freeOk = FREE_CATS.includes(cat);
  const freeOn = freeOk && bp.mode === 'free';
  const modes = freeOk ? MODES : MODES.filter((m) => m !== 'free');
  useEffect(() => {
    if (bp.mode === 'free' && ex && !freeOk) bp.setMode('play');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex, freeOk]);
  // A new exercise / key / mode starts free play over.
  useEffect(() => {
    free?.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built, bp.mode]);
  const startFree = () =>
    free.start({ shape: built.shapeNotes ?? [], tuning: BASS_TUNING, rootPc: ex.keyed ? prefs.key : null, log: { tool: 'bassFree', item: built.item } });

  const running = bp.running || !!free?.isPlaying;
  const steps = built?.steps ?? [];
  const cur = bp.stepIndex >= 0 ? steps[bp.stepIndex] : null;
  const curBar = cur?.bar ?? (built?.bars ? 0 : null);
  // The note strip: all notes (short exercises) or the current bar's (grooves).
  const strip = built?.bars ? steps.map((s, i) => ({ s, i })).filter(({ s }) => s.bar === curBar) : steps.map((s, i) => ({ s, i }));
  const labelOf = (s) => (bp.labels === 'finger' ? (s.finger === 0 ? '0' : s.finger ?? s.noteName) : bp.labels === 'degree' && s.degreeLabel ? s.degreeLabel : s.noteName);

  if (!ex) {
    const level = bassLevel();
    return (
      <div className="practice-view bass-practice" dir={dir}>
        <div className="ph" dir={dir}>
          <header className="ph-head">
            <h1>{t('bp.title')}</h1>
            <p className="subtitle">{t('bp.subtitle')}</p>
          </header>
          {CATEGORIES.map((c) => {
            const all = EXERCISES.filter((e) => e.cat === c.key).sort((a, b) => a.level - b.level);
            const basic = level == null ? [] : all.filter((e) => RANGE[e.level][1] < level);
            const main = all.filter((e) => !basic.includes(e));
            const open = expanded[c.key];
            const row = (e) => (
              <LibraryRow
                key={e.id}
                color={CAT_LOOK[c.key].color}
                icon={CAT_LOOK[c.key].icon}
                title={tx(e.title)}
                desc={firstSentence(tx(e.why))}
                tag={level != null && RANGE[e.level][0] > level ? t('ph.challenge') : null}
                onClick={() => {
                  save({ cat: c.key });
                  setChosen((ch) => ({ ...ch, [c.key]: e.id }));
                }}
              />
            );
            return (
              <section key={c.key} className="ph-section">
                <h2 className="ph-section-title">{tx(c.label)}</h2>
                <div className="ph-group">
                  {main.map(row)}
                  {open && basic.map(row)}
                  {basic.length > 0 && (
                    <button type="button" className="ph-more" onClick={() => setExpanded((x) => ({ ...x, [c.key]: !open }))}>
                      {open ? t('ph.fewer') : basic.length === 1 ? t('ph.moreOne') : t('ph.more', { count: basic.length })}
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="practice-view bass-practice is-detail" dir={dir}>
      <div className="practice-detail-head" dir={dir}>
        <BackButton
          label={t('bp.title')}
          onClick={() => {
            if (bp.running) bp.stop();
            free?.reset();
            setChosen((ch) => ({ ...ch, [cat]: undefined }));
          }}
        />
      </div>

      <div className="scale-practice-controls bp-controls">

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
              {modes.map((m) => (
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
        {ex && bp.mode !== 'wait' && !freeOn && (
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
        {ex && !freeOn && (
          <div className="scale-practice-field">
            <span className="scale-practice-field-label">&nbsp;</span>
            <span className="bp-actions">
              <button type="button" className={'bp-latch' + (bp.loop ? ' is-on' : '')} aria-pressed={bp.loop} onClick={() => bp.setLoop(!bp.loop)}>
                {t('bp.loop')}
              </button>
              <button type="button" className="play-button" onClick={bp.running ? bp.stop : bp.start}>
                {bp.running ? t('bp.stop') : t('bp.start')}
              </button>
            </span>
          </div>
        )}
      </div>

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

      {ex && freeOn && free && built && (
        <FreePlay free={free} onStart={startFree} total={new Set((built.shapeNotes ?? []).map((n) => n.string + ':' + n.fret)).size} idleText={t(cat === 'arpeggios' ? 'fp.idleChord' : 'fp.idle')} />
      )}

      {ex && !freeOn && (bp.running || bp.phase === 'done') && (
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

      {ex && !freeOn && bp.phase === 'done' && bp.result && <Result r={bp.result} best={bp.best} t={t} />}
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
