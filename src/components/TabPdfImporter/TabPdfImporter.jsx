import { useRef, useState } from 'react';
import { extractPdfTextRows } from '../../music/pdfTextExtractor';
import { parseAsciiTab } from '../../music/tabPdfParser';
import { playLick } from '../../audio/lickPlayer';
import { useLanguage } from '../../i18n/LanguageContext';
import './TabPdfImporter.css';

const SPEED_OPTIONS = [
  { key: 'slow', multiplier: 2 },
  { key: 'normal', multiplier: 1 },
  { key: 'fast', multiplier: 0.6 },
];

// Upload a plain-text guitar TAB (the "one line per string, dashes as
// filler, digits as fret numbers" layout most tab sites export — see
// tabPdfParser.js's own top comment for exactly which layout this reads),
// and play it back note-by-note on the shared Stage Fretboard, reusing the
// EXACT same lick-playback overlay Improvise -> Licks already has
// (`onLickChange`/`onPlayingOrderChange` bubble up to App.jsx, which feeds
// them into the Songs branch of stageFretboardProps — see that file's own
// comment on why no explicit "which Songs mode is active" flag is needed).
export function TabPdfImporter({ onLickChange, onPlayingOrderChange }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState('idle'); // idle | parsing | ready | error
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [notes, setNotes] = useState([]);
  const [speed, setSpeed] = useState('normal');
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setStatus('parsing');
    setError(null);
    setNotes([]);
    onLickChange?.(null);
    try {
      const rows = await extractPdfTextRows(file);
      const parsed = parseAsciiTab(rows);
      if (parsed.length === 0) throw new Error(t('songs.tabPdf.noNotesFound'));
      setNotes(parsed);
      setFileName(file.name);
      setStatus('ready');
      onLickChange?.({ notes: parsed });
    } catch (err) {
      setStatus('error');
      setError(err.message || String(err));
    }
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
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="tab-pdf-file-input"
          onChange={handleFile}
        />
        <button type="button" className="tab-pdf-upload-btn" onClick={() => fileInputRef.current?.click()}>
          {t('songs.tabPdf.upload')}
        </button>
        {fileName && (
          <span className="tab-pdf-filename" dir="auto">
            {fileName}
          </span>
        )}
      </div>

      {status === 'parsing' && <p className="tab-pdf-status">{t('songs.tabPdf.parsing')}</p>}
      {status === 'error' && (
        <p className="tab-pdf-error" dir="auto">
          {t('songs.tabPdf.error', { message: error })}
        </p>
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
