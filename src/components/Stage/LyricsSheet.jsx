import { useEffect, useMemo, useState } from 'react';
import { rememberArt } from '../../music/sheets/songArt';
import { useLanguage } from '../../i18n/LanguageContext';
import { Segmented } from '../ui/controls';
import { getSheet } from '../../music/sheets/sheetStore';
import { pdfLines, songToLyrics } from '../../music/sheets/lyricsText';
import { loadPdfDocument } from '../../music/pdfTextExtractor';
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
      const doc = await loadPdfDocument(rec.blob);
      const pages = [];
      for (let i = 1; i <= doc.numPages; i += 1) {
        const c = await (await doc.getPage(i)).getTextContent();
        pages.push(pdfLines(c.items).join('\n'));
      }
      doc.destroy?.();
      const all = pages.join('\n\n').trim();
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
            <textarea
              className="stg-ly-text"
              dir="auto"
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
