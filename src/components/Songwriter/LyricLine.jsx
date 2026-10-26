import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { parseLine, words, chordsByWord } from '../../music/songwriter/lyrics';
import { MelodyLane } from './MelodyLane';
import { Icon } from './icons';

/**
 * One lyric line: chords over the words (tap the space above a word = chord),
 * the words (tap = edit; Enter = new line, Backspace at the start = join
 * with the line above, paste several lines = several lines), syllable count
 * and rhyme letter at the end, the melody under it, and — on the selected
 * line — its tools: Record, Play, Melody, Takes.
 */
export function LyricLine({
  line,
  selected,
  editing,
  caret,
  sylCount,
  rhyme,
  laneProps,
  playing,
  recording,
  recTick,
  onSelect,
  onEdit,
  onText,
  onEnter,
  onJoinUp,
  onMove,
  onPaste,
  onChordAt,
  onRecord,
  onStopRec,
  onPlay,
  onMelody,
  onTakes,
  takesOpen,
  takesSlot,
  hasMelody,
  placeholder,
}) {
  const { t } = useLanguage();
  const inputRef = useRef(null);
  const { text } = parseLine(line.raw);
  const ws = words(text);
  const chordOf = chordsByWord(line.raw);
  const anyChord = chordOf.some(Boolean);

  useLayoutEffect(() => {
    if (!editing || !inputRef.current) return;
    const el = inputRef.current;
    el.focus({ preventScroll: false });
    const c = caret == null ? el.value.length : Math.min(caret, el.value.length);
    try {
      el.setSelectionRange(c, c);
    } catch {
      /* not a text input */
    }
    // Only when editing starts / the caret is placed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, caret]);

  const onKeyDown = (e) => {
    const el = e.currentTarget;
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter(el.selectionStart ?? el.value.length);
    } else if (e.key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0) {
      e.preventDefault();
      onJoinUp();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onMove(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onMove(1);
    } else if (e.key === 'Escape') {
      el.blur();
    }
  };

  const recPhase = recording?.phase;
  const countLeft = recPhase === 'count' ? Math.max(1, recording.bpb - recTick.beat) : null;

  return (
    <div
      className={'sw-line' + (selected ? ' is-selected' : '') + (playing ? ' is-playing' : '') + (recording ? ' is-recording' : '')}
      data-line={line.id}
      onPointerDown={() => !selected && onSelect()}
    >
      <div className="sw-line-main">
        {editing ? (
          <input
            ref={inputRef}
            className="sw-line-input"
            dir="auto"
            value={text}
            placeholder={placeholder}
            onChange={(e) => onText(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={(e) => {
              const s = e.clipboardData?.getData('text') ?? '';
              if (/\r?\n/.test(s.trim())) {
                e.preventDefault();
                onPaste(s, e.currentTarget.selectionStart ?? text.length);
              }
            }}
            onBlur={() => onEdit(null)}
            enterKeyHint="next"
            autoComplete="off"
          />
        ) : (
          <div className={'sw-line-words' + (anyChord || selected ? ' has-chords' : '')} dir="auto">
            {ws.length === 0 && (
              <button type="button" className="sw-line-empty" onClick={() => onEdit(0)}>
                {placeholder}
              </button>
            )}
            {ws.map((w, i) => (
              <span key={i} className="sw-word">
                <button
                  type="button"
                  className={'sw-chord-slot' + (chordOf[i] ? ' has-chord' : '')}
                  onClick={(e) => onChordAt(i, e.currentTarget.getBoundingClientRect())}
                  aria-label={chordOf[i] ? t('sw.chord.change', { chord: chordOf[i] }) : t('sw.chord.add')}
                  dir="ltr"
                >
                  {chordOf[i] ?? (selected ? '+' : '')}
                </button>
                <span className="sw-word-text" onClick={() => onEdit(w.end)}>
                  {w.w}
                </span>
              </span>
            ))}
          </div>
        )}
        <div className="sw-line-meta" dir="ltr">
          {sylCount > 0 && (
            <span className="sw-syl-count" title={t('sw.syllables')}>
              {sylCount}
            </span>
          )}
          {rhyme?.letter && (
            <span className={'sw-rhyme' + (rhyme.rhymes ? ' is-on' : '')} title={t('sw.rhyme')}>
              {rhyme.letter}
            </span>
          )}
          {line.takes?.length > 0 && !selected && (
            <span className="sw-take-count" title={t('sw.takes')}>
              <Icon name="mic" size={13} />
              {line.takes.length}
            </span>
          )}
        </div>
      </div>

      {hasMelody && (
        <button type="button" className="sw-line-lane" onClick={onMelody} aria-label={t('sw.melody.open')}>
          <MelodyLane compact {...laneProps} />
        </button>
      )}

      {recording && (
        <div className="sw-rec-strip" dir="ltr" aria-live="polite">
          {recPhase === 'opening' && <span className="sw-muted">{t('sw.rec.opening')}</span>}
          {recPhase === 'count' && (
            <span className="sw-rec-count">
              {Array.from({ length: recording.bpb }, (_, k) => (
                <span key={k} className={'sw-beat-dot' + (k <= recTick.beat ? ' is-on' : '')} />
              ))}
              <b>{countLeft}</b>
            </span>
          )}
          {recPhase === 'rec' && (
            <>
              <span className="sw-rec-dot" />
              <span className="sw-rec-time">{fmt(recTick.elapsed)}</span>
              <span className="sw-level">
                <span style={{ width: `${Math.min(100, Math.round(Math.sqrt(recTick.level) * 100))}%` }} />
              </span>
            </>
          )}
          {recPhase === 'saving' && <span className="sw-muted">{t('sw.rec.finding')}</span>}
          {recPhase === 'error' && <span className="sw-error">{t(recording.error === 'denied' ? 'sw.rec.denied' : 'sw.rec.failed')}</span>}
          {(recPhase === 'count' || recPhase === 'rec' || recPhase === 'opening') && (
            <button type="button" className="sw-btn is-danger sw-rec-stop" onClick={onStopRec}>
              {t('sw.stop')}
            </button>
          )}
        </div>
      )}

      {selected && !recording && (
        <div className="sw-line-tools">
          <button type="button" className="sw-tool is-rec" onClick={onRecord}>
            <Icon name="rec" />
            <span>{t('sw.record')}</span>
          </button>
          <button type="button" className={'sw-tool' + (playing ? ' is-on' : '')} onClick={onPlay} disabled={!hasMelody && !parseLine(line.raw).chords.length}>
            <Icon name={playing ? 'stop' : 'play'} />
            <span>{playing ? t('sw.stop') : t('sw.play')}</span>
          </button>
          <button type="button" className="sw-tool" onClick={onMelody}>
            <Icon name="notes" />
            <span>{t('sw.melody')}</span>
          </button>
          <button type="button" className={'sw-tool' + (takesOpen ? ' is-on' : '')} onClick={onTakes} disabled={!line.takes?.length}>
            <Icon name="mic" />
            <span>
              {t('sw.takes')}
              {line.takes?.length ? ` ${line.takes.length}` : ''}
            </span>
          </button>
        </div>
      )}
      {selected && takesOpen && takesSlot}
    </div>
  );
}

export function fmt(s) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function useOutside(ref, fn) {
  useEffect(() => {
    const on = (e) => ref.current && !ref.current.contains(e.target) && fn();
    window.addEventListener('pointerdown', on);
    return () => window.removeEventListener('pointerdown', on);
  }, [ref, fn]);
}
