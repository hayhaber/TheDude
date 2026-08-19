import { useRef, useState } from 'react';
import { extractPdfTextRows } from '../../music/pdfTextExtractor';
import { ocrPdfToTextRows } from '../../music/tabOcr';
import { parseAsciiTab } from '../../music/tabPdfParser';
import { playLick } from '../../audio/lickPlayer';
import { useLanguage } from '../../i18n/LanguageContext';
import './TabPdfImporter.css';

const SPEED_OPTIONS = [
  { key: 'slow', multiplier: 2 },
  { key: 'normal', multiplier: 1 },
  { key: 'fast', multiplier: 0.6 },
];

// Upload a guitar TAB PDF and play it back note-by-note on the shared
// Stage Fretboard, reusing the EXACT same lick-playback overlay
// Improvise -> Licks already has (`onLickChange`/`onPlayingOrderChange`
// bubble up to App.jsx — see that file's own comment on the Songs branch
// of stageFretboardProps).
//
// Two extraction paths, tried in order:
// 1. A real PDF text layer (tabPdfParser.js's ASCII-tab format) — fast,
//    exact, no recognition errors possible.
// 2. OCR (tabOcr.js), only if (1) found nothing — some tab PDFs are
//    actually a rasterized IMAGE of the tab (discovered the hard way: a
//    page that LOOKS like clean monospace text can still have zero real
//    text objects in it), which pdf.js's text layer can't read at all.
//    OCR on dense tab notation is inherently not 100% reliable, so
//    EITHER path's result is shown as an editable preview before
//    parsing — the player reviews/fixes the recognized text, THEN parses
//    it into playable notes, rather than risking wrong frets going
//    straight to playback silently.
export function TabPdfImporter({ onLickChange, onPlayingOrderChange }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState('idle'); // idle | extracting | ocr | review | ready | error
  const [ocrProgress, setOcrProgress] = useState(0);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [rowsText, setRowsText] = useState('');
  const [usedOcr, setUsedOcr] = useState(false);
  const [notes, setNotes] = useState([]);
  const [speed, setSpeed] = useState('normal');
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef(null);

  function resetForNewFile() {
    setError(null);
    setNotes([]);
    setRowsText('');
    setUsedOcr(false);
    setOcrProgress(0);
    onLickChange?.(null);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    resetForNewFile();
    setFileName(file.name);
    setStatus('extracting');
    try {
      const textRows = await extractPdfTextRows(file);
      if (parseAsciiTab(textRows).length > 0) {
        setRowsText(textRows.join('\n'));
        setStatus('review');
        return;
      }

      // No real text layer found — fall back to OCR, same File object
      // (its own ArrayBuffer read again from scratch; a File can be read
      // more than once, unlike a Response body).
      setStatus('ocr');
      setUsedOcr(true);
      const ocrRows = await ocrPdfToTextRows(file, { onProgress: setOcrProgress });
      // Always show what OCR actually recognized, even if it doesn't
      // parse cleanly as-is — that's the whole point of the review step
      // (OCR on dense tab notation is never fully reliable): the player
      // gets to see and fix it via "Parse & Preview" (handleParse already
      // surfaces its own error there) instead of the raw text being
      // silently discarded the one time it's most likely to need a fix.
      if (ocrRows.every((r) => r.trim() === '')) throw new Error(t('songs.tabPdf.noNotesFound'));
      setRowsText(ocrRows.join('\n'));
      setStatus('review');
    } catch (err) {
      setStatus('error');
      setError(err.message || String(err));
    }
  }

  function handleParse() {
    const parsed = parseAsciiTab(rowsText.split('\n'));
    if (parsed.length === 0) {
      setError(t('songs.tabPdf.noNotesFound'));
      return;
    }
    setError(null);
    setNotes(parsed);
    setStatus('ready');
    onLickChange?.({ notes: parsed });
  }

  function handlePlay() {
    if (notes.length === 0) return;
    const multiplier = SPEED_OPTIONS.find((s) => s.key === speed).multiplier;
    const scaled = notes.map((n) => ({ ...n, durationMultiplier: (n.durationMultiplier ?? 1) * multiplier }));
    setIsPlaying(true);
    playLick(scaled, {
      onNoteStart: (note) => onPlayingOrderChange?.(note.order),
      onDone: () => {
        setIsPlaying(false);
        onPlayingOrderChange?.(null);
      },
    });
  }

  return (
    <div className="tab-pdf-importer">
      <p className="tab-pdf-hint" dir="auto">
        {t('songs.tabPdf.hint')}
      </p>

      <div className="tab-pdf-upload-row">
        <input ref={fileInputRef} type="file" accept=".pdf" className="tab-pdf-file-input" onChange={handleFile} />
        <button type="button" className="tab-pdf-upload-btn" onClick={() => fileInputRef.current?.click()}>
          {t('songs.tabPdf.upload')}
        </button>
        {fileName && (
          <span className="tab-pdf-filename" dir="auto">
            {fileName}
          </span>
        )}
      </div>

      {status === 'extracting' && <p className="tab-pdf-status">{t('songs.tabPdf.parsing')}</p>}

      {status === 'ocr' && (
        <div className="tab-pdf-ocr-progress">
          <p className="tab-pdf-status" dir="auto">
            {t('songs.tabPdf.ocrRunning')}
          </p>
          <div className="tab-pdf-progress-track">
            <div className="tab-pdf-progress-fill" style={{ width: `${Math.round(ocrProgress * 100)}%` }} />
          </div>
        </div>
      )}

      {status === 'error' && (
        <p className="tab-pdf-error" dir="auto">
          {t('songs.tabPdf.error', { message: error })}
        </p>
      )}

      {(status === 'review' || status === 'ready') && (
        <div className="tab-pdf-review">
          {usedOcr && (
            <p className="tab-pdf-ocr-note" dir="auto">
              {t('songs.tabPdf.ocrNote')}
            </p>
          )}
          <label className="tab-pdf-review-label" htmlFor="tab-pdf-rows">
            {t('songs.tabPdf.reviewLabel')}
          </label>
          <textarea
            id="tab-pdf-rows"
            className="tab-pdf-rows-textarea"
            value={rowsText}
            onChange={(e) => {
              setRowsText(e.target.value);
              if (status === 'ready') setStatus('review'); // edited after parsing — needs re-parsing
            }}
            dir="ltr"
            spellCheck={false}
            rows={10}
          />
          {status === 'review' && error && (
            <p className="tab-pdf-error" dir="auto">
              {t('songs.tabPdf.error', { message: error })}
            </p>
          )}
          <button type="button" className="tab-pdf-upload-btn" onClick={handleParse}>
            {t('songs.tabPdf.parseButton')}
          </button>
        </div>
      )}

      {status === 'ready' && (
        <div className="tab-pdf-ready">
          <p className="tab-pdf-status" dir="auto">
            {t('songs.tabPdf.noteCount', { count: notes.length })}
          </p>

          <div className="tab-pdf-controls">
            <label className="tab-pdf-speed-field">
              {t('songs.tabPdf.speed')}
              <select value={speed} onChange={(e) => setSpeed(e.target.value)} disabled={isPlaying}>
                {SPEED_OPTIONS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {t(`songs.tabPdf.speed.${s.key}`)}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="tab-pdf-play-btn" onClick={handlePlay} disabled={isPlaying}>
              {isPlaying ? t('songs.tabPdf.playing') : `▶ ${t('songs.tabPdf.play')}`}
            </button>
          </div>

          <p className="tab-pdf-tuning-note" dir="auto">
            {t('songs.tabPdf.tuningNote')}
          </p>
        </div>
      )}
    </div>
  );
}
