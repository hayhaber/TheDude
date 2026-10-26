import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { autoHyphenate, parseLine } from '../../music/songwriter/lyrics';
import { sortNotes } from '../../music/songwriter/song';
import { schedulePianoNotes } from '../../audio/pianoPlayer';
import { MelodyLane, fixOverlaps } from './MelodyLane';
import { laneFor } from './swHelpers';
import { Icon } from './icons';
import { fmt } from './LyricLine';

/**
 * A line's melody, editable: the roll (tap / drag / stretch), the selected
 * note's keys (move, delete, Join = sings the syllable before), the grid,
 * the line's syllables (hyphens, e.g. "ye-ru-sha-la-yim") and Record /
 * Hear.
 */
export function MelodyEditor({ song, line, inKey, audio, finding, recTick, onChange, onGrid, onRecord, onStopRec, onClose }) {
  const { t, lang } = useLanguage();
  const [sel, setSel] = useState(-1);
  const boxRef = useRef(null);
  const [width, setWidth] = useState(600);
  const lane = laneFor(song, line, 1);
  const notes = lane.notes;
  const { text } = parseLine(line.raw);
  const rec = audio.rec?.target?.line === line.id ? audio.rec : null;
  const playing = audio.playing?.scope === 'line:' + line.id;
  const tl = audio.playing?.handle.timeline;
  const playBeat = playing && tl && audio.pos != null ? (audio.pos - (tl.lines[0]?.downbeat ?? 0)) / (60 / song.bpm) : null;

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, select, textarea')) return;
      if (e.key === 'Escape') onClose();
      if (sel < 0) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        del();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        shift(e.shiftKey ? 12 : 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        shift(e.shiftKey ? -12 : -1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const setNotes = (next, select = sel) => {
    onChange((l) => ({ ...l, melody: next.length ? { ...(l.melody ?? {}), notes: next } : undefined }));
    setSel(select);
  };
  const hear = (n) => schedulePianoNotes([{ midi: n.p, start: 0, dur: 0.5 }], undefined, { velocity: 90 });

  const shift = (d) => {
    if (sel < 0) return;
    const next = notes.map((n, i) => (i === sel ? { ...n, p: Math.max(24, Math.min(108, n.p + d)) } : n));
    setNotes(next);
    hear(next[sel]);
  };
  const del = () => {
    if (sel < 0) return;
    setNotes(notes.filter((_, i) => i !== sel), -1);
  };
  const toggleJoin = () => {
    if (sel <= 0) return;
    setNotes(notes.map((n, i) => (i === sel ? { ...n, c: n.c ? undefined : true } : n)));
  };

  const nSyl = lane.syl.length;
  const nSung = lane.sylOf.filter((x, i) => x >= 0 && (i === 0 || x !== lane.sylOf[i - 1])).length;
  const extra = lane.sylOf.filter((x) => x === -1).length;

  return (
    <div className="sw-sheet-back" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sw-sheet" role="dialog" aria-label={t('sw.melody')} dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <header className="sw-sheet-head">
          <div>
            <h2>{t('sw.melody')}</h2>
            <p className="sw-sheet-line" dir="auto">
              {text || t('sw.line.empty')}
            </p>
          </div>
          <button type="button" className="sw-btn is-primary" onClick={onClose}>
            {t('sw.done')}
          </button>
        </header>

        <div className="sw-sheet-tools">
          {rec ? (
            <div className="sw-rec-strip" dir="ltr">
              {rec.phase === 'count' && (
                <span className="sw-rec-count">
                  {Array.from({ length: rec.bpb }, (_, k) => (
                    <span key={k} className={'sw-beat-dot' + (k <= recTick.beat ? ' is-on' : '')} />
                  ))}
                  <b>{Math.max(1, rec.bpb - recTick.beat)}</b>
                </span>
              )}
              {rec.phase === 'rec' && (
                <>
                  <span className="sw-rec-dot" />
                  <span className="sw-rec-time">{fmt(recTick.elapsed)}</span>
                  <span className="sw-level">
                    <span style={{ width: `${Math.min(100, Math.round(Math.sqrt(recTick.level) * 100))}%` }} />
                  </span>
                </>
              )}
              {rec.phase === 'opening' && <span className="sw-muted">{t('sw.rec.opening')}</span>}
              {rec.phase === 'error' && <span className="sw-error">{t(rec.error === 'denied' ? 'sw.rec.denied' : 'sw.rec.failed')}</span>}
              {rec.phase !== 'saving' && rec.phase !== 'error' && (
                <button type="button" className="sw-btn is-danger" onClick={onStopRec}>
                  {t('sw.stop')}
                </button>
              )}
              {rec.phase === 'saving' && <span className="sw-muted">{t('sw.rec.finding')}</span>}
            </div>
          ) : finding ? (
            <span className="sw-muted">{t('sw.rec.finding')}</span>
          ) : (
            <>
              <button type="button" className="sw-tool is-rec" onClick={onRecord}>
                <Icon name="rec" />
                <span>{t('sw.record')}</span>
              </button>
              <button type="button" className={'sw-tool' + (playing ? ' is-on' : '')} onClick={() => audio.play(song, 'line:' + line.id, { line: line.id })} disabled={!notes.length}>
                <Icon name={playing ? 'stop' : 'play'} />
                <span>{playing ? t('sw.stop') : t('sw.play')}</span>
              </button>
              <label className="sw-field is-inline">
                <span>{t('sw.grid')}</span>
                <select value={lane.grid} onChange={(e) => onGrid(Number(e.target.value))}>
                  {(song.time.endsWith('/8') ? [1, 0.5] : [1, 0.5, 0.25]).map((g) => (
                    <option key={g} value={g}>
                      {t('sw.grid.' + gridKey(g, song.time))}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>

        <div className="sw-roll" ref={boxRef}>
          <MelodyLane
            {...lane}
            inKey={inKey}
            width={width}
            selected={sel}
            onSelect={(i) => {
              setSel(i);
              if (i >= 0) hear(notes[i]);
            }}
            onChange={(next, i) => {
              setNotes(fixOverlaps(sortNotes(next)), i);
              if (i >= 0 && next[i]) hear(next[i]);
            }}
            playBeat={playBeat}
          />
        </div>

        <div className="sw-note-tools" aria-live="polite">
          {sel >= 0 ? (
            <>
              <button type="button" className="sw-icon-btn" onClick={() => shift(1)} aria-label={t('sw.note.up')} title={t('sw.note.up')}>
                <Icon name="up" />
              </button>
              <button type="button" className="sw-icon-btn" onClick={() => shift(-1)} aria-label={t('sw.note.down')} title={t('sw.note.down')}>
                <Icon name="down" />
              </button>
              <button type="button" className={'sw-btn is-small' + (notes[sel]?.c ? ' is-on' : '')} onClick={toggleJoin} disabled={sel <= 0}>
                {t('sw.join')}
              </button>
              <button type="button" className="sw-icon-btn is-danger" onClick={del} aria-label={t('sw.delete')} title={t('sw.delete')}>
                <Icon name="trash" />
              </button>
              <span className="sw-muted sw-join-hint">{t('sw.join.hint')}</span>
            </>
          ) : (
            <span className="sw-muted">{notes.length ? t('sw.melody.hint') : t('sw.melody.emptyHint')}</span>
          )}
        </div>

        <div className={'sw-fit' + (extra || (notes.length && nSung < nSyl) ? ' is-off' : '')}>
          {t('sw.melody.count', { notes: notes.length, syl: nSyl })}
          {extra > 0 && <> · {t('sw.melody.extra', { n: extra })}</>}
          {notes.length > 0 && nSung < nSyl && <> · {t('sw.melody.short', { n: nSyl - nSung })}</>}
        </div>

        <label className="sw-field sw-syl-field">
          <span>{t('sw.syllables')}</span>
          <span className="sw-syl-row">
            <input
              className="sw-input"
              dir="auto"
              value={line.syl ?? autoHyphenate(text)}
              onChange={(e) => onChange((l) => ({ ...l, syl: e.target.value }))}
              spellCheck="false"
              autoComplete="off"
            />
            <button type="button" className="sw-btn is-small" onClick={() => onChange((l) => ({ ...l, syl: undefined }))} disabled={line.syl == null}>
              {t('sw.auto')}
            </button>
          </span>
          <small className="sw-muted">{t('sw.syllables.hint')}</small>
        </label>
      </div>
    </div>
  );
}

function gridKey(g, time) {
  const eighthBeat = time.endsWith('/8');
  const v = eighthBeat ? g / 2 : g; // in quarter notes
  return v === 1 ? 'quarter' : v === 0.5 ? 'eighth' : 'sixteenth';
}
