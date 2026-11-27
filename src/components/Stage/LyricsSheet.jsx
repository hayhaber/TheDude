import { useEffect, useMemo, useState } from 'react';
import { rememberArt } from '../../music/sheets/songArt';
import { useLanguage } from '../../i18n/LanguageContext';
import { Segmented } from '../ui/controls';
import { getSheet } from '../../music/sheets/sheetStore';
import { songToLyrics } from '../../music/sheets/lyricsText';
import { pdfWords } from '../../music/sheets/pdfWords';
import { SONGS_KEY } from '../Songwriter/useSongs';
import { SongSearchField } from './SongSearchField';
import { linkFor, songLabel } from '../../music/sheets/songSearch';
import { serviceOf } from '../../music/sheets/songLink';

// A song's words for the singer (v1.0.206): typed / pasted, brought from a
// song written in the Songwriter, or pulled out of the song's chart PDF
// (when the PDF holds its words as text — a scan has none). The words are
// always shown in the text field to check and fix before saving.

function readWritten() {
  try {
    const all = JSON.parse(localStorage.getItem(SONGS_KEY) || '{}');
    return (all.songs ?? []).filter((s) => (s.sections ?? []).some((sec) => (sec.lines ?? []).some((l) => String(l.raw ?? '').replace(/\[[^\]]*\]/g, '').trim())));
  } catch {
    return [];
  }
}

/**
 * `songId` = the song whose words these are (null = a new words-only song:
 * a name field too). onSave({name, text, start}) — start = the first sung
 * note when it came from a written song with a melody.
 */
export function LyricsSheet({ songId = null, name: initialName = '', text: initialText = '', hasPdf = false, onSave, onClose }) {
  const { t, lang } = useLanguage();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const [name, setName] = useState(initialName);
  const [link, setLink] = useState(null); // from a picked search result
  const [finding, setFinding] = useState(false);
  const [text, setText] = useState(initialText);
  // v1.0.271: ONE direction for the whole text (Pages / Notes), not one per
  // line — a line starting with a chord or a Latin word no longer jumps to
  // the left. Hebrew in the text -> right to left; the key beside the field
  // flips it by hand.
  const [dirPick, setDirPick] = useState(null);
  const autoDir = /[\u0590-\u05FF]/.test(text) ? 'rtl' : text.trim() ? 'ltr' : lang === 'he' ? 'rtl' : 'ltr';
  const textDir = dirPick ?? autoDir;
  const [start, setStart] = useState(null);
  const [src, setSrc] = useState('type');
  const [pdfState, setPdfState] = useState(null); // null | 'busy' | 'none' | 'error'
  const written = useMemo(readWritten, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fromWritten = (song) => {
    const out = songToLyrics(song, (k) => t('sw.kind.' + k));
    setText(out.text);
    if (out.start != null) setStart(out.start);
    if (!songId && !name.trim() && song.title) setName(song.title);
    setSrc('type');
  };

  const fromPdf = async () => {
    setPdfState('busy');
    try {
      const rec = await getSheet(songId);
      const all = await pdfWords(rec.blob);
      if (!all) {
        setPdfState('none');
        return;
      }
      setText(all);
      setPdfState(null);
      setSrc('type');
    } catch {
      setPdfState('error');
    }
  };

  // a new song may start as a name (+ its listening link) alone
  const canSave = songId || name.trim();
  const options = [
    { value: 'type', label: t('stage.ly.srcType') },
    { value: 'mine', label: t('stage.ly.srcMine') },
    ...(hasPdf && songId ? [{ value: 'pdf', label: 'PDF' }] : []),
  ];

  return (
    <div className="stg-sheet-scrim stg-ly-scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="stg-sheet stg-ly-sheet glass" role="dialog" aria-label={t('stage.ly.title')} dir={dir}>
        <header className="stg-ly-head">
          <button type="button" className="stg-ly-cancel" onClick={onClose}>
            {t('stage.ly.cancel')}
          </button>
          <strong>{songId ? t('stage.ly.title') : t('stage.ly.newTitle')}</strong>
          <button type="button" className="stg-capsule is-primary stg-ly-save" disabled={!canSave} onClick={() => onSave({ name: name.trim(), text: text.replace(/\s+$/, ''), start, link })}>
            {t('stage.ly.save')}
          </button>
        </header>

        {!songId && (
          <>
            <SongSearchField
              label={t('stage.ly.name')}
              value={name}
              placeholder={t('stage.ly.namePh')}
              autoFocus
              onChange={(v) => {
                setName(v);
                setLink(null);
              }}
              onPick={async (song) => {
                setName(songLabel(song));
                rememberArt(song.title, song.artist, song.art);
                setLink(song.apple || null);
                setFinding(true);
                const l = await linkFor(song);
                setLink(l);
                setFinding(false);
              }}
            />
            {(finding || link) && <p className="stg-ss-note">{finding ? t('stage.ss.finding') : t('stage.ss.linked', { svc: t('stage.listen.svc.' + (serviceOf(link) || 'web')) })}</p>}
          </>
        )}

        <Segmented options={options} value={src} onChange={setSrc} ariaLabel={t('stage.ly.from')} />

        {src === 'type' && (
          <>
            <div className="stg-ly-dirrow">
              <button
                type="button"
                className="stg-ly-dir"
                onClick={() => setDirPick(textDir === 'rtl' ? 'ltr' : 'rtl')}
                aria-label={t(textDir === 'rtl' ? 'stage.ly.dirToLtr' : 'stage.ly.dirToRtl')}
                title={t(textDir === 'rtl' ? 'stage.ly.dirToLtr' : 'stage.ly.dirToRtl')}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  {textDir === 'rtl' ? (
                    <path d="M20 6H8M20 10H11M20 14H8M20 18H11M6 8l-3 4 3 4" />
                  ) : (
                    <path d="M4 6h12M4 10h9M4 14h12M4 18h9M18 8l3 4-3 4" />
                  )}
                </svg>
                <span>{t(textDir === 'rtl' ? 'stage.ly.dirRtl' : 'stage.ly.dirLtr')}</span>
              </button>
            </div>
            <textarea
              className="stg-ly-text"
              dir={textDir}
              value={text}
              placeholder={t('stage.ly.placeholder')}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              autoFocus={!!songId}
            />
            <p className="stg-fine stg-ly-hint">{t('stage.ly.hint')}</p>
          </>
        )}

        {src === 'mine' &&
          (written.length ? (
            <div className="ph-group stg-group stg-ly-list">
              {written.map((s) => (
                <button key={s.id} type="button" className="ph-row" onClick={() => fromWritten(s)}>
                  <span className="ph-text">
                    <span className="ph-title" dir="auto">
                      {s.title || t('stage.ly.untitled')}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="stg-empty-text">{t('stage.ly.noneWritten')}</p>
          ))}

        {src === 'pdf' && (
          <div className="stg-ly-pdf">
            <p className="stg-sheet-text">{t('stage.ly.pdfText')}</p>
            <button type="button" className="stg-capsule is-primary" onClick={fromPdf} disabled={pdfState === 'busy'}>
              {pdfState === 'busy' ? '…' : t('stage.ly.pdfBtn')}
            </button>
            {pdfState === 'none' && <p className="stg-err">{t('stage.ly.pdfNone')}</p>}
            {pdfState === 'error' && <p className="stg-err">{t('stage.error')}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
