import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import { LICK_GENRES, LICK_LEVELS } from '../../music/lickTrainer/library';
import { defaultTrackIndex } from '../../music/lickTrainer/gpImport';
import { TEMPO_OPTIONS } from '../../hooks/useLickTrainer';
import { midiToNoteName } from '../../music/pitchUtils';
import { BUILD_PASS, waitTarget } from '../../music/lickTrainer/practiceModes';
import { TabTimeline } from './TabTimeline';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import './LickTrainer.css';

const STRING_NUM = (stringIndex) => 6 - stringIndex; // app index -> tab string number

function labelOf(list, key, lang) {
  return localize(list.find((x) => x.key === key)?.label ?? { en: key, he: key }, lang);
}

// "80 BPM", or "60 BPM · 12/8" for licks counted in dotted quarters.
function tempoLabel(lick, bpm) {
  return lick.beatUnit === 'dotted' ? `${bpm} BPM · 12/8` : `${bpm} BPM`;
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
              <span className="lt-score-label">
                {t('lickTrainer.score')}
                <InfoTooltip text={t('tip.practice.lickScore')} />
              </span>
            </div>
            <div className="lt-verdict">
              <p className="lt-verdict-text">{t(`lickTrainer.verdict.${s.verdict}`)}</p>
              <div className="lt-breakdown">
                <span>
                  {t('lickTrainer.notes')}: <b>{s.correct}/{s.total}</b>
                </span>
                <span>
                  {t('lickTrainer.timing')}
                  <InfoTooltip text={t('tip.practice.lickTiming')} />: <b>{pct(s.timingScore)}</b>
                </span>
                {s.techniqueScore != null && (
                  <span>
                    {t('lickTrainer.technique')}
                    <InfoTooltip text={t('tip.practice.lickTechnique')} />: <b>{pct(s.techniqueScore)}</b>
                  </span>
                )}
                <span className="lt-muted">
                  {result.tempoPct}% · {tempoLabel(lick, result.bpm)}
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

          <ResultNotes result={result} t={t} />

          {result.signal.clipped && <p className="lt-warning">{t('lickTrainer.signal.clipped')}</p>}
          {!result.calibrated && <p className="lt-muted">{t('lickTrainer.notCalibrated')}</p>}
        </>
      )}

      {result.loopEnd && <p className="lt-focus">{t(`trainerx.loopEnd.${result.loopEnd}`)}</p>}

      <div className="lt-actions" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <button type="button" className="primary" onClick={trainer.record}>
          {t('lickTrainer.retry')}
        </button>
        {s.verdict === 'tempoUp' && !trainer.autoTempo.on && trainer.tempoPct < TEMPO_OPTIONS[TEMPO_OPTIONS.length - 1] && (
          <button type="button" onClick={trainer.raiseTempo}>
            {t('lickTrainer.faster')}
          </button>
        )}
      </div>

      <TakeBar trainer={trainer} t={t} />
    </div>
  );
}

// Under the score: what the auto tempo / Build step made of this take.
function ResultNotes({ result, t }) {
  const lines = [];
  if (result.build) {
    const b = result.build;
    lines.push(
      <p key="build" className={b.passed ? 'lt-good' : 'lt-muted'}>
        {b.done ? t('trainerx.build.done') : b.passed ? t('trainerx.build.passed') : t('trainerx.build.failed', { pass: BUILD_PASS })}
      </p>
    );
  }
  if (result.targetHeld) lines.push(<p key="held" className="lt-good">{t('trainerx.targetHeld')}</p>);
  else if (result.tempoChange) {
    const up = result.tempoChange.to > result.tempoChange.from;
    lines.push(
      <p key="tempo" className={up ? 'lt-good' : 'lt-muted'}>
        {t(up ? 'trainerx.tempoUp' : 'trainerx.tempoDown', { to: result.tempoChange.to })}
      </p>
    );
  }
  return lines.length ? <div className="lt-result-notes">{lines}</div> : null;
}

// Your last take: play it, hear it right after the reference, save it.
function TakeBar({ trainer, t }) {
  if (!trainer.take) return null;
  const playing = trainer.phase === 'listening';
  return (
    <div className="lt-take">
      <span className="lt-take-title">
        {t('trainerx.take.title')}
        <InfoTooltip text={t('trainerx.tip.take')} />
      </span>
      <div className="lt-actions">
        <button type="button" onClick={trainer.listenTake} disabled={playing}>
          {t('trainerx.take.mine')}
        </button>
        <button type="button" onClick={trainer.compareTake} disabled={playing}>
          {t('trainerx.take.compare')}
        </button>
        <button type="button" onClick={trainer.saveTake}>
          {t('trainerx.take.save')}
        </button>
      </div>
    </div>
  );
}

// Wait mode: the note being waited for, or the run's summary.
function WaitPanel({ trainer, t }) {
  const { wait, lick } = trainer;
  if (!wait) return null;
  if (wait.done) {
    return (
      <div className="lt-wait is-done" aria-live="polite">
        <p className="lt-wait-main">{t('trainerx.wait.done', { notes: wait.total })}</p>
        <p className="lt-muted">{t('trainerx.wait.doneStats', { wrong: wait.wrong, seconds: wait.seconds })}</p>
        <p className="lt-muted lt-small">{t('trainerx.wait.next')}</p>
        <div className="lt-actions">
          <button type="button" className="primary" onClick={trainer.startWait}>
            {t('trainerx.again')}
          </button>
        </div>
      </div>
    );
  }
  const note = lick.notes[wait.index];
  if (!note) return null;
  const name = midiToNoteName(waitTarget(note));
  const what = note.technique === 'bend' ? t('trainerx.wait.bend', { note: name }) : name;
  // (The note names are LTR inside a Hebrew sentence: each piece is isolated.)
  return (
    <div className="lt-wait" aria-live="polite">
      <p className="lt-wait-main">
        {t('trainerx.wait.status', { n: wait.index + 1, total: wait.total, note: what })}{' '}
        <bdi className="lt-muted lt-wait-where">({t('trainerx.wait.where', { string: STRING_NUM(note.string), fret: note.fret })})</bdi>
      </p>
      <p className={'lt-wait-hint' + (wait.hint ? ' is-on' : '')}>{wait.hint ? t(`trainerx.wait.hint.${wait.hint}`) : '\u00a0'}</p>
      {wait.wrong > 0 && <p className="lt-muted lt-small">{t('trainerx.wait.wrong', { n: wait.wrong })}</p>}
    </div>
  );
}

// Solos: each section's best score and tempo as a coloured strip.
export function MasteryMap({ trainer, t, busy }) {
  const { mastery } = trainer;
  if (!mastery || mastery.length < 2) return null;
  const sel = trainer.sectionIndex;
  const shown = sel >= 0 ? mastery[sel] : null;
  const weakest = trainer.weakestSection;
  const allDone = mastery.every((m) => m.status === 'mastered');
  const detail = (m) =>
    m.takes === 0
      ? t('trainerx.mastery.detailNone', { n: m.index + 1 })
      : m.topTempo != null
      ? t('trainerx.mastery.detail', { n: m.index + 1, score: m.best, tempo: m.bestTempo, top: `${m.topTempo}%` })
      : t('trainerx.mastery.detailNoTop', { n: m.index + 1, score: m.best, tempo: m.bestTempo });
  return (
    <section className="lt-mastery" aria-label={t('trainerx.mastery.title')}>
      <div className="lt-mastery-head">
        <span className="lt-mastery-title">
          {t('trainerx.mastery.title')}
          <InfoTooltip text={t('trainerx.tip.mastery')} />
        </span>
        <span className="lt-mastery-legend">
          {['mastered', 'close', 'weak', 'none'].map((st) => (
            <span key={st} className={`lt-legend is-${st}`}>
              <i aria-hidden="true" />
              {t(`trainerx.mastery.${st}`)}
            </span>
          ))}
        </span>
      </div>
      <div className="lt-mastery-strip" dir="ltr" role="list">
        {mastery.map((m) => (
          <button
            key={m.index}
            type="button"
            role="listitem"
            className={`lt-seg is-${m.status}` + (m.index === sel ? ' active' : '')}
            onClick={() => trainer.setSectionIndex(m.index)}
            disabled={busy}
            title={`${t(`trainerx.mastery.${m.status}`)} · ${detail(m)}`}
            aria-label={`${detail(m)} · ${t(`trainerx.mastery.${m.status}`)}`}
          >
            <span className="lt-seg-n">{m.index + 1}</span>
            <span className="lt-seg-score">{m.best ?? '–'}</span>
          </button>
        ))}
      </div>
      <div className="lt-mastery-foot">
        <span className="lt-muted lt-small">
          {shown ? detail(shown) : allDone ? t('trainerx.mastery.allDone') : weakest != null ? t('trainerx.mastery.weakest', { n: weakest + 1 }) : ''}
        </span>
        {weakest != null && !allDone && weakest !== sel && (
          <button type="button" onClick={trainer.practiceWeakest} disabled={busy}>
            {t('trainerx.mastery.practise')}
          </button>
        )}
      </div>
    </section>
  );
}

const GP_ACCEPT = '.gp,.gp3,.gp4,.gp5,.gpx,.gp7,.gp8';

// Shown after a Guitar Pro file is picked: which track, how to split it,
// and how to file it in the library.
// Shared library: imported files on every device (api/library.js).
export function LibraryBar({ trainer, t, bare = false }) {
  const { library } = trainer;
  const [code, setCode] = useState('');
  // Off: just a one-line note with a button; the explanation and the code
  // field only appear when the player asks for them.
  const [open, setOpen] = useState(false);
  const needsCode = library.status === 'off' || library.status === 'bad-key';
  const message = {
    off: t('lickTrainer.libOff'),
    'bad-key': t('lickTrainer.libBadKey'),
    syncing: t('lickTrainer.libSyncing'),
    ok: t('lickTrainer.libOk', { n: library.count ?? 0 }),
    'not-configured': t('lickTrainer.libNotConfigured'),
    offline: t('lickTrainer.libOffline'),
    'too-big': t('lickTrainer.libTooBig'),
    error: t('lickTrainer.libError'),
  }[library.status];
  if (library.status === 'off' && !open) {
    return (
      <div className="lt-library is-off is-collapsed">
        <div className="lt-library-text">
          <span>
            {!bare && (
              <>
                <strong>{t('lickTrainer.libTitle')}</strong> ·{' '}
              </>
            )}
            {t('lickTrainer.libOffShort')}
          </span>
        </div>
        <div className="lt-library-form">
          <button type="button" onClick={() => setOpen(true)}>
            {t('lickTrainer.libSetup')}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className={`lt-library is-${library.status}`}>
      <div className="lt-library-text">
        {!bare && <strong>{t('lickTrainer.libTitle')}</strong>}
        <span>{message}</span>
      </div>
      {needsCode ? (
        <form
          className="lt-library-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) trainer.connectLibrary(code);
            setCode('');
          }}
        >
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('lickTrainer.libCode')}
            aria-label={t('lickTrainer.libCode')}
            autoComplete="current-password"
          />
          <button type="submit" disabled={!code.trim()}>
            {t('lickTrainer.libConnect')}
          </button>
        </form>
      ) : (
        <div className="lt-library-form">
          {['offline', 'error', 'too-big', 'not-configured'].includes(library.status) && (
            <button type="button" onClick={trainer.syncLibrary}>
              {t('lickTrainer.libRetry')}
            </button>
          )}
          {library.status !== 'syncing' && (
            <button type="button" className="lt-link" onClick={trainer.disconnectLibrary}>
              {t('lickTrainer.libDisconnect')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// What the fretboard markers show: note names or left-hand fingers.
export function NeckLabelToggle({ trainer, t }) {
  const auto = trainer.neckLabel === 'finger' && trainer.lick.notes.some((n) => n.fingerAuto);
  return (
    <div className="lt-necklabel">
      <span className="lt-necklabel-title">{t('lickTrainer.neckLabel')}</span>
      <div className="mode-toggle" role="group" aria-label={t('lickTrainer.neckLabel')}>
        <button type="button" className={trainer.neckLabel === 'note' ? 'active' : ''} onClick={() => trainer.setNeckLabel('note')}>
          {t('lickTrainer.neckNote')}
        </button>
        <button type="button" className={trainer.neckLabel === 'finger' ? 'active' : ''} onClick={() => trainer.setNeckLabel('finger')}>
          {t('lickTrainer.neckFinger')}
        </button>
      </div>
      {auto && <span className="lt-muted lt-small">{t('lickTrainer.fingerAuto')}</span>}
    </div>
  );
}

export function ImportPanel({ trainer, t, lang, forceSaveAs = null }) {
  const { info, fileName } = trainer.pendingImport;
  const firstPlayable = defaultTrackIndex(info);
  const [title, setTitle] = useState(info.title || fileName.replace(/\.[^.]+$/, ''));
  const [trackIndex, setTrackIndex] = useState(firstPlayable);
  const [chosenSaveAs, setSaveAs] = useState(info.barCount > 4 ? 'solo' : 'lick');
  const saveAs = forceSaveAs ?? chosenSaveAs;
  const [barsPerSection, setBarsPerSection] = useState(2);
  const [genre, setGenre] = useState('rock');
  const [level, setLevel] = useState('intermediate');
  return (
    <section className="lt-import" aria-label={t('lickTrainer.importTitle')}>
      <h3>{t('lickTrainer.importTitle')}</h3>
      <p className="lt-muted" dir="ltr">
        {fileName} · {info.artist ? `${info.artist} · ` : ''}
        {info.tempo} BPM · {t('lickTrainer.importBars', { count: info.barCount })}
      </p>
      <div className="lt-filters">
        <label className="lt-field lt-grow">
          <span>{t('lickTrainer.importName')}</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} dir="auto" />
        </label>
        <label className="lt-field">
          <span>{t('lickTrainer.importTrack')}</span>
          <select value={trackIndex} onChange={(e) => setTrackIndex(Number(e.target.value))}>
            {info.tracks.map((tr) => (
              <option key={tr.index} value={tr.index} disabled={tr.noteCount === 0 || tr.percussion}>
                {tr.name} ({tr.noteCount})
              </option>
            ))}
          </select>
        </label>
        {!forceSaveAs && (
        <label className="lt-field">
          <span>{t('lickTrainer.importSaveAs')}</span>
          <select value={saveAs} onChange={(e) => setSaveAs(e.target.value)}>
            <option value="solo">{t('lickTrainer.saveAsSolo')}</option>
            <option value="lick">{t('lickTrainer.saveAsLick')}</option>
          </select>
        </label>
        )}
        {saveAs === 'solo' && (
          <label className="lt-field">
            <span>{t('lickTrainer.importSplit')}</span>
            <select value={barsPerSection} onChange={(e) => setBarsPerSection(Number(e.target.value))}>
              {[1, 2, 4].map((n) => (
                <option key={n} value={n}>
                  {t('lickTrainer.importSplitBars', { count: n })}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="lt-field">
          <span>{t('lickTrainer.genre')}</span>
          <select value={genre} onChange={(e) => setGenre(e.target.value)}>
            {LICK_GENRES.map((g) => (
              <option key={g.key} value={g.key}>
                {localize(g.label, lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="lt-field">
          <span>{t('lickTrainer.level')}</span>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            {LICK_LEVELS.map((l) => (
              <option key={l.key} value={l.key}>
                {localize(l.label, lang)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="lt-muted lt-small">{t('lickTrainer.importWhere')}</p>
      <div className="lt-actions">
        <button
          type="button"
          className="primary"
          onClick={() => trainer.commitImport({ title: title.trim() || info.title || fileName, trackIndex, saveAs, barsPerSection, genre, level })}
        >
          {t('lickTrainer.save')}
        </button>
        <button type="button" onClick={trainer.cancelImport}>
          {t('lickTrainer.cancel')}
        </button>
      </div>
    </section>
  );
}

// variant 'licks' = Practice -> Lick Trainer (the lick library);
// variant 'solos' = the practice part of the GuitarPro section, which
// supplies the file choice, import and shared library itself.
export function LickTrainer({ trainer, variant = 'licks' }) {
  const fileRef = useRef(null);
  const { setMode } = trainer;
  useEffect(() => {
    setMode(variant);
  }, [variant, setMode]);
  // Practice -> Lick Trainer: start empty on every visit.
  const { resetLickChoice } = trainer;
  useEffect(() => {
    if (variant === 'licks') resetLickChoice();
  }, [variant, resetLickChoice]);
  const chosen = trainer.licksChosen;
  const [confirmDelete, setConfirmDelete] = useState(null);
  // Start decoding the guitar samples as soon as the trainer is opened.
  const { preloadSamples } = trainer;
  useEffect(() => {
    preloadSamples();
  }, [preloadSamples]);
  const { t, lang } = useLanguage();
  const { lick, phase, history } = trainer;
  const busy =
    phase === 'preparing' || phase === 'countIn' || phase === 'recording' || phase === 'analyzing' || phase === 'calibrating' || phase === 'waiting';
  const pm = trainer.practiceMode;
  // The tempo list, plus the current tempo if a launch set one off the list.
  const tempoOptions = TEMPO_OPTIONS.includes(trainer.tempoPct) ? TEMPO_OPTIONS : [...TEMPO_OPTIONS, trainer.tempoPct].sort((a, b) => a - b);
  const looping = trainer.loopActive || trainer.loopNext;
  const countdown =
    phase === 'countIn' && trainer.playheadBeat != null ? Math.max(1, Math.ceil(-trainer.playheadBeat)) : null;
  const dir = lang === 'he' ? 'rtl' : 'ltr';

  return (
    <div className="lick-trainer" dir={dir}>
      {variant === 'licks' && <p className="lt-intro">{t('lickTrainer.intro')}</p>}

      <div className="lt-filters">
        {trainer.mode === 'solos' ? (
          <>
            {trainer.activeSolo?.sections?.length > 0 && (
              <label className="lt-field">
                <span>{t('lickTrainer.section')}</span>
                <select value={trainer.sectionIndex} onChange={(e) => trainer.setSectionIndex(Number(e.target.value))} disabled={busy}>
                  <option value={-1}>{t('lickTrainer.wholeSolo')}</option>
                  {trainer.activeSolo.sections.map((sec, k) => (
                    <option key={k} value={k}>
                      {t('lickTrainer.sectionOption', { n: k + 1, bars: localize(sec.label, lang) })}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        ) : (
          <>
        <label className="lt-field">
          <span>{t('lickTrainer.genre')}</span>
          <select value={chosen ? trainer.genre : ''} onChange={(e) => trainer.chooseGenre(e.target.value)}>
            {!chosen && (
              <option value="" disabled>
                {t('lickTrainer.choose')}
              </option>
            )}
            <option value="all">{t('lickTrainer.all')}</option>
            <option value="mine">{t('lickTrainer.mine')}</option>
            {LICK_GENRES.map((g) => (
              <option key={g.key} value={g.key}>
                {localize(g.label, lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="lt-field">
          <span>{t('lickTrainer.level')}</span>
          <select value={chosen ? trainer.level : ''} onChange={(e) => trainer.chooseLevel(e.target.value)}>
            {!chosen && (
              <option value="" disabled>
                {t('lickTrainer.choose')}
              </option>
            )}
            <option value="all">{t('lickTrainer.all')}</option>
            {LICK_LEVELS.map((l) => (
              <option key={l.key} value={l.key}>
                {localize(l.label, lang)}
              </option>
            ))}
          </select>
        </label>
          </>
        )}
        {variant === 'licks' && (
        <>
        <button type="button" className="lt-import-btn" onClick={() => fileRef.current?.click()} disabled={busy}>
          {t('lickTrainer.import')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={GP_ACCEPT}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) trainer.readFile(file);
            e.target.value = '';
          }}
        />
        </>
        )}
      </div>


      {trainer.mode === 'solos' && <MasteryMap trainer={trainer} t={t} busy={busy} />}

      {variant === 'licks' && !chosen && !trainer.pendingImport && <p className="lt-muted lt-pick-hint">{t('lickTrainer.pickHint')}</p>}

      {variant === 'licks' && chosen && <NeckLabelToggle trainer={trainer} t={t} />}

      {variant === 'licks' && trainer.pendingImport && (
        <ImportPanel key={trainer.pendingImport.fileName} trainer={trainer} t={t} lang={lang} forceSaveAs="lick" />
      )}


      {trainer.mode === 'licks' && chosen && (
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

      )}

      {((trainer.mode === 'licks' && chosen) || (trainer.mode === 'solos' && trainer.activeSolo)) && (
      <section className="lt-lick">
        <div className="lt-lick-head">
          <h3 dir="auto">
            {localize(lick.title, lang)}
            {lick.sectionLabel && <span className="lt-section-label"> · {localize(lick.sectionLabel, lang)}</span>}
          </h3>
          <span style={{ display: 'flex', alignItems: 'center', flex: 'none' }}>
            <span className={'lt-badge' + (lick.source === 'user' || lick.source === 'import' ? ' verified' : '')}>
              {t(lick.source === 'import' ? 'lickTrainer.sourceImport' : lick.source === 'user' ? 'lickTrainer.sourceUser' : 'lickTrainer.sourceApp')}
            </span>
            <InfoTooltip text={t('tip.practice.lickSource')} />
          </span>
        </div>
        <p className="lt-meta">
          <bdi dir="ltr">
            {lick.scale ? `${lick.scale} · ` : ''}
            {tempoLabel(lick, lick.bpm)}
          </bdi>{' '}
          · {labelOf(LICK_LEVELS, lick.level, lang)}
        </p>
        <p className="lt-about" dir="auto">
          {localize(lick.about, lang)}
        </p>
        {lick.rhythmApprox && <p className="lt-muted">{t('lickTrainer.rhythmApprox')}</p>}
        {lick.simplified && <p className="lt-muted">{t('lickTrainer.simplified')}</p>}
        {lick.source === 'import' && variant === 'licks' && (
          <div className="lt-actions">
            {/* Two taps to delete: the whole imported file goes, so ask once. */}
            <button
              type="button"
              className={confirmDelete === lick.id ? 'danger' : ''}
              onClick={() => {
                if (confirmDelete === lick.id) {
                  setConfirmDelete(null);
                  trainer.deleteImport(trainer.mode === 'solos' ? trainer.activeSolo.id : lick.id);
                } else setConfirmDelete(lick.id);
              }}
              disabled={busy}
            >
              {t(confirmDelete === lick.id ? 'lickTrainer.deleteConfirm' : 'lickTrainer.delete')}
            </button>
          </div>
        )}
        {lick.credit && (
          <p className="lt-muted lt-small" dir="ltr">
            {lick.credit}
          </p>
        )}

        {trainer.mode === 'solos' && trainer.activeSolo ? (
          // The whole solo stays on screen; the chosen section is
          // highlighted and the playhead/results are placed inside it.
          <TabTimeline
            lick={trainer.activeSolo}
            playheadBeat={trainer.playheadBeat == null ? null : trainer.playheadBeat + (lick.view?.fromBeat ?? 0)}
            result={trainer.result}
            resultOffset={lick.view?.firstIndex ?? 0}
            highlight={
              trainer.build && trainer.build.end < trainer.build.total
                ? { fromBeat: lick.view?.fromBeat ?? 0, toBeat: (lick.view?.fromBeat ?? 0) + trainer.build.endBeat }
                : trainer.sectionIndex >= 0
                ? trainer.activeSolo.sections[trainer.sectionIndex]
                : null
            }
          />
        ) : (
          <TabTimeline
            lick={lick}
            playheadBeat={trainer.playheadBeat}
            result={trainer.result}
            highlight={trainer.build && trainer.build.end < trainer.build.total ? { fromBeat: 0, toBeat: trainer.build.endBeat } : null}
          />
        )}

        <div className="lt-controls">
          <label className="lt-field">
            <span>
              {t('trainerx.mode')}
              <InfoTooltip text={t('trainerx.tip.mode')} />
            </span>
            <select value={pm} onChange={(e) => trainer.setPracticeMode(e.target.value)} disabled={busy || looping}>
              <option value="normal">{t('trainerx.mode.normal')}</option>
              <option value="wait">{t('trainerx.mode.wait')}</option>
              <option value="build">{t('trainerx.mode.build')}</option>
            </select>
          </label>
          <label className="lt-field">
            <span>{t('lickTrainer.tempo')}</span>
            <select dir="ltr" value={trainer.tempoPct} onChange={(e) => trainer.setTempoPct(Number(e.target.value))} disabled={busy || looping}>
              {tempoOptions.map((v) => (
                <option key={v} value={v}>
                  {v}% · {tempoLabel(lick, Math.round((lick.bpm * v) / 100))}
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

          {pm === 'wait' ? (
            phase === 'waiting' ? (
              <button type="button" className="record active" onClick={trainer.stop}>
                {t('lickTrainer.stop')}
              </button>
            ) : (
              <button type="button" className="record" onClick={trainer.startWait} disabled={busy}>
                {t('trainerx.start')}
              </button>
            )
          ) : phase === 'countIn' || phase === 'recording' || (looping && phase !== 'listening') ? (
            <button type="button" className="record active" onClick={trainer.stop}>
              {t('lickTrainer.stop')}
            </button>
          ) : (
            <button type="button" className="record" onClick={trainer.record} disabled={busy}>
              {t('lickTrainer.record')}
            </button>
          )}

          {pm === 'wait' ? (
            <label className="lt-check">
              <input type="checkbox" checked={trainer.hearCue} onChange={(e) => trainer.setHearCue(e.target.checked)} disabled={busy} />
              {t('trainerx.hear')}
            </label>
          ) : (
            <label className="lt-check">
              <input type="checkbox" checked={trainer.clickDuring} onChange={(e) => trainer.setClickDuring(e.target.checked)} disabled={busy} />
              {t('lickTrainer.click')}
              <InfoTooltip text={t('tip.practice.lickClick')} />
            </label>
          )}
        </div>

        {pm !== 'wait' && (
          <div className="lt-auto">
            <label className="lt-check">
              <input
                type="checkbox"
                checked={trainer.autoTempo.on}
                onChange={(e) => trainer.setAutoTempo({ on: e.target.checked })}
                disabled={busy}
              />
              {t('trainerx.autoTempo')}
              <InfoTooltip text={t('trainerx.tip.autoTempo')} />
            </label>
            {trainer.autoTempo.on && (
              <label className="lt-inline-field">
                <span>{t('trainerx.target')}</span>
                <select dir="ltr" value={trainer.autoTempo.to} onChange={(e) => trainer.setAutoTempo({ to: Number(e.target.value) })} disabled={busy}>
                  {TEMPO_OPTIONS.filter((v) => v >= 60).map((v) => (
                    <option key={v} value={v}>
                      {v}%
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="lt-check">
              <input type="checkbox" checked={trainer.loop} onChange={(e) => trainer.setLoop(e.target.checked)} />
              {t('trainerx.loop')}
              <InfoTooltip text={t('trainerx.tip.loop')} />
            </label>
          </div>
        )}

        {trainer.build && (
          <div className="lt-build">
            <span>
              {t('trainerx.build.status', {
                step: trainer.build.step + 1,
                steps: trainer.build.steps,
                end: trainer.build.end,
                total: trainer.build.total,
              })}
            </span>
            {trainer.build.step > 0 && (
              <button type="button" onClick={trainer.restartBuild} disabled={busy || looping}>
                {t('trainerx.restart')}
              </button>
            )}
          </div>
        )}

        <WaitPanel trainer={trainer} t={t} />

        <div className="lt-status" aria-live="polite">
          {phase === 'preparing' && <span>{t('lickTrainer.preparing')}</span>}
          {phase === 'countIn' && countdown != null && <span className="lt-countdown">{countdown}</span>}
          {phase === 'countIn' && <span>{t('lickTrainer.getReady')}</span>}
          {phase === 'recording' && <span className="lt-rec-dot" aria-hidden="true" />}
          {phase === 'recording' && <span>{t('lickTrainer.recording')}</span>}
          {phase === 'analyzing' && <span>{t('lickTrainer.analyzing')}</span>}
          {phase === 'calibrating' && <span>{t('lickTrainer.calibrating')}</span>}
          {trainer.loopNext && phase === 'results' && <span className="lt-loop-next">{t('trainerx.loopNext')}</span>}
          {trainer.loopActive && !trainer.loopNext && phase !== 'results' && <span className="lt-muted">{t('trainerx.loopOn')}</span>}
          {(phase === 'recording' || phase === 'calibrating' || phase === 'countIn' || phase === 'waiting') && (
            <span className="lt-meter" aria-hidden="true">
              <span style={{ width: `${Math.min(100, trainer.inputLevel * 140)}%` }} />
            </span>
          )}
        </div>

        {trainer.error && (
          <p className="lt-warning">
            {trainer.error.key === 'mic'
              ? t('lickTrainer.error.mic', { message: trainer.error.message })
              : trainer.error.key === 'import'
              ? t('lickTrainer.error.import', { message: trainer.error.message })
              : trainer.error.key === 'importEmpty'
              ? t('lickTrainer.error.importEmpty')
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
      )}
    </div>
  );
}
