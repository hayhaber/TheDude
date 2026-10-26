import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

/**
 * Chord over a word: the key's chords (I–vii°), the ones already in the song,
 * or any typed symbol. A small popover by the word (a sheet on phones).
 */
export function ChordPicker({ anchor, current, diatonic, used, onPick, onClose, isValid }) {
  const { t } = useLanguage();
  const ref = useRef(null);
  const [text, setText] = useState('');
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !anchor) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw <= 640) {
      setPos({ sheet: true });
      return;
    }
    let left = anchor.left + anchor.width / 2 - w / 2;
    left = Math.max(12, Math.min(vw - w - 12, left));
    let top = anchor.bottom + 8;
    if (top + h > vh - 12) top = Math.max(12, anchor.top - h - 8);
    setPos({ left, top });
  }, [anchor]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown, true);
    };
  }, [onClose]);

  const others = used.filter((c) => !diatonic.includes(c));
  const typed = text.trim();
  const ok = typed && isValid(typed);

  return (
    <div
      ref={ref}
      className={'sw-picker' + (pos?.sheet ? ' is-sheet' : '')}
      style={pos && !pos.sheet ? { left: pos.left, top: pos.top } : pos ? undefined : { visibility: 'hidden' }}
      role="dialog"
      aria-label={t('sw.chord.title')}
    >
      {diatonic.length > 0 && (
        <>
          <div className="sw-picker-label">{t('sw.chord.inKey')}</div>
          <div className="sw-picker-chips" dir="ltr">
            {diatonic.map((c) => (
              <button key={c} type="button" className={'sw-chip' + (c === current ? ' is-on' : '')} onClick={() => onPick(c)}>
                {c}
              </button>
            ))}
          </div>
        </>
      )}
      {others.length > 0 && (
        <>
          <div className="sw-picker-label">{t('sw.chord.used')}</div>
          <div className="sw-picker-chips" dir="ltr">
            {others.map((c) => (
              <button key={c} type="button" className={'sw-chip' + (c === current ? ' is-on' : '')} onClick={() => onPick(c)}>
                {c}
              </button>
            ))}
          </div>
        </>
      )}
      <form
        className="sw-picker-form"
        dir="ltr"
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onPick(typed);
        }}
      >
        <input
          className="sw-input"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[֐-׿]/g, ''))}
          placeholder={t('sw.chord.typeHint')}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          aria-label={t('sw.chord.other')}
        />
        <button type="submit" className="sw-btn is-primary" disabled={!ok}>
          {t('sw.add')}
        </button>
      </form>
      {current && (
        <button type="button" className="sw-btn is-danger sw-picker-remove" onClick={() => onPick(null)}>
          {t('sw.remove')}
        </button>
      )}
    </div>
  );
}
