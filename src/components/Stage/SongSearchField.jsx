import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { searchSongs } from '../../music/sheets/songSearch';

// A text field that suggests songs as you type (v1.0.230, user: "type a
// song's name and the band + a YouTube link are added; type a band and
// pick from its songs"). iOS search suggestions: rows with the album art,
// the song and the artist under the field; a tap = onPick(song). Typing on
// stays plain text, so nothing is forced.
export function SongSearchField({ label, value, onChange, onPick, placeholder, autoFocus = false, onEnter }) {
  const { t, lang } = useLanguage();
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const typed = useRef(false);
  useEffect(() => {
    if (!typed.current) return undefined;
    const q = value.trim();
    if (q.length < 2) {
      setList([]);
      return undefined;
    }
    const n = ++seq.current;
    const id = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await searchSongs(q, lang);
        if (n === seq.current) {
          setList(r);
          setOpen(true);
        }
      } catch {
        if (n === seq.current) setList([]);
      } finally {
        if (n === seq.current) setBusy(false);
      }
    }, 320);
    return () => clearTimeout(id);
  }, [value, lang]);

  // v1.0.301: the results open under the field — bring all of them into
  // the sheet's view (the sheet scrolls as one; the list has no scroller)
  const listRef = useRef(null);
  const shown = open && list.length > 0;
  useEffect(() => {
    if (shown) listRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [shown, list]);

  const pick = (s) => {
    typed.current = false;
    setOpen(false);
    setList([]);
    onPick(s);
  };
  return (
    <div className="stg-search-field">
      <label className="stg-field">
        <span>{label}</span>
        <input
          dir="auto"
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={open && list.length > 0}
          aria-autocomplete="list"
          onChange={(e) => {
            typed.current = true;
            onChange(e.target.value);
          }}
          onFocus={() => list.length && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && open) {
              e.stopPropagation();
              setOpen(false);
            } else if (e.key === 'Enter') onEnter?.();
          }}
        />
      </label>
      {busy && !list.length && <p className="stg-ss-note">{t('stage.ss.searching')}</p>}
      {open && list.length > 0 && (
        <ul ref={listRef} className="stg-ss-list" role="listbox" aria-label={t('stage.ss.title')}>
          {list.map((s) => (
            <li key={s.title + '|' + s.artist}>
              <button type="button" className="stg-ss-row" role="option" aria-selected="false" onClick={() => pick(s)}>
                {s.art ? <img src={s.art} alt="" width="40" height="40" loading="lazy" /> : <span className="stg-ss-art" aria-hidden="true" />}
                <span className="stg-ss-text">
                  <span className="stg-ss-title" dir="auto">{s.title}</span>
                  <span className="stg-ss-artist" dir="auto">{s.artist}</span>
                </span>
              </button>
            </li>
          ))}
          <li className="stg-ss-foot">{t('stage.ss.source')}</li>
        </ul>
      )}
    </div>
  );
}
