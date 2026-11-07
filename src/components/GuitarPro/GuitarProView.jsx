import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import { getAudioInputSettings } from '../../audio/audioInputSettingsStore';
import { LickTrainer, ImportPanel, NeckLabelToggle } from '../LickTrainer/LickTrainer';
import { GpSongPlayer } from './GpSongPlayer';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { onSoundFontProgress, prefetchGpSoundFont } from '../../audio/alphaTabSound';
import { MoreMenu } from '../MoreMenu/MoreMenu';
import { PdfSheetView } from './PdfSheetView';
import { deleteSheet, isPdf, listSheets, saveSheet } from '../../music/sheets/sheetStore';
import './GuitarProView.css';

// MusicXML too (e.g. sheet music converted from a PDF): alphaTab reads it the same way.
// …and sheet-music PDFs, shown as they are (PdfSheetView).
const GP_ACCEPT = '.gp,.gp3,.gp4,.gp5,.gpx,.musicxml,.mxl,.xml,.pdf,application/pdf';

// Which of the file's tracks sound. The practiced part is marked; drums,
// bass and keys start on (the rhythm section), everything else is up to
// the player. Shared by Song (all checked tracks play) and Practice (Listen
// plays them all; during a take your own part stays silent).
function TrackMixer({ trainer, t, busy }) {
  const tracks = trainer.tracks.filter((tr) => tr.noteCount > 0);
  if (tracks.length === 0) return null;
  const on = new Set(trainer.mix);
  return (
    <div className="gp-mixer">
      <span className="gp-mixer-label">{t('gp.tracks')}</span>
      <div className="mode-toggle wrap" role="group" aria-label={t('gp.tracks')}>
        {tracks.map((tr) => (
          <button
            key={tr.index}
            type="button"
            className={on.has(tr.index) ? 'active' : ''}
            aria-pressed={on.has(tr.index)}
            onClick={() => trainer.toggleTrack(tr.index)}
            disabled={busy}
            dir="auto"
          >
            <span className="gp-track-state" aria-hidden="true">
              {on.has(tr.index) ? '♪' : '–'}
            </span>
            {tr.name}
            {tr.index === trainer.practiceTrack && <span className="gp-track-you">{t('gp.yourPart')}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GuitarProView({ trainer, pianoProfile, bassProfile, onFindSongs, openPractice, onSheetOpen }) {
  const { t, lang } = useLanguage();
  const fileRef = useRef(null);
  const [view, setView] = useState('song'); // 'song' | 'practice' | 'chords'
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [dragging, setDragging] = useState(false);
  // Sheet-music PDFs (this device): the list, and the one open (null = a
  // Guitar Pro / MusicXML file is shown as before).
  const [sheets, setSheets] = useState([]);
  const [sheetId, setSheetId] = useState(null);
  const [sheetBusy, setSheetBusy] = useState(false);
  useEffect(() => {
    listSheets().then(setSheets);
  }, []);
  const addFile = async (file) => {
    if (!file) return;
    if (!isPdf(file)) {
      setSheetId(null);
      trainer.readFile(file);
      return;
    }
    setSheetBusy(true);
    try {
      const rec = await saveSheet(file);
      setSheets(await listSheets());
      trainer.stop();
      setSheetId(rec.id);
    } finally {
      setSheetBusy(false);
    }
  };
  const sheet = sheets.find((x) => x.id === sheetId) ?? null;
  const sheetOpen = !!sheet;
  useEffect(() => {
    onSheetOpen?.(sheetOpen);
  }, [sheetOpen, onSheetOpen]);
  useEffect(() => () => onSheetOpen?.(false), [onSheetOpen]);
  // A chosen file opens its "add" form: bring it into view.
  const importRef = useRef(null);
  const pendingName = trainer.pendingImport?.fileName;
  useEffect(() => {
    if (pendingName) importRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [pendingName]);
  // The teacher's solo goal opens straight into Practice.
  useEffect(() => {
    if (openPractice) setView('practice');
  }, [openPractice]);
  const { setMode } = trainer;
  useEffect(() => {
    setMode('solos');
  }, [setMode]);
  // The guitar/band sounds (~9 MB the first time): fetch as soon as the
  // section opens, and show the progress — Play waits for them.
  const [soundProgress, setSoundProgress] = useState(0);
  useEffect(() => {
    prefetchGpSoundFont();
    return onSoundFontProgress(setSoundProgress);
  }, []);

  const phase = trainer.phase;
  const busy = ['preparing', 'countIn', 'recording', 'analyzing', 'calibrating'].includes(phase);
  const solo = trainer.activeSolo;
  const piano = trainer.pianoMode;
  // Piano and bass: song view only.
  const songOnly = piano || trainer.bassMode;
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  // Bass / keys / vocals / drums are shown, not practiced.
  const canPractice = !!solo && !solo.displayOnly && !solo.practiceOff;
  // Neck note / finger labels: guitar (Song + Practice) and bass, not piano.
  const showNeckLabels = !!solo && (trainer.bassMode || !songOnly);
  const micWithBand =
    !songOnly &&
    view === 'practice' && trainer.backingTracks.length > 0 && getAudioInputSettings().inputMode === 'microphone';

  return (
    <div
      className="gp-view"
      dir={dir}
      onDragOver={(e) => {
        if (busy || !e.dataTransfer?.types?.includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) setDragging(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer?.files?.length) return;
        e.preventDefault();
        setDragging(false);
        if (!busy) addFile(e.dataTransfer.files[0]);
      }}
    >
      {/* With a file open the song itself is the title (flow review
          2026-11-06: the score gets the room) — the page title stays for
          screen readers only. */}
      <div className={'gp-head' + (solo || sheet ? ' is-compact' : '')}>
        <h1>{t(trainer.pianoMode ? 'nav.pianopro' : 'gp.title')}</h1>
        <p className="subtitle">{t(trainer.pianoMode ? 'gp.pianoSubtitle' : 'gp.subtitle')}</p>
      </div>

      <div className="lt-filters gp-file-row">
        <label className="lt-field gp-file-field">
          <span>{t('gp.file')}</span>
          <select
            value={sheet ? 'pdf:' + sheet.id : trainer.activeSoloId ?? ''}
            onChange={(e) => {
              setConfirmDelete(null);
              const v = e.target.value;
              if (v.startsWith('pdf:')) {
                trainer.stop();
                setSheetId(v.slice(4));
              } else {
                setSheetId(null);
                trainer.selectSolo(v);
              }
            }}
            disabled={busy || (trainer.solos.length === 0 && sheets.length === 0)}
            dir="auto"
          >
            {trainer.solos.map((so) => (
              <option key={so.id} value={so.id}>
                {localize(so.title, lang)}
                {so.artist ? ` — ${so.artist}` : ''}
              </option>
            ))}
            {sheets.length > 0 && (
              <optgroup label={t('sheet.group')}>
                {sheets.map((x) => (
                  <option key={x.id} value={'pdf:' + x.id}>
                    {x.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        {/* Adding a file: one obvious target — click it, or drop a file on it
            (or anywhere on this page). */}
        <button
          type="button"
          className={'gp-drop' + (dragging ? ' is-dragging' : '')}
          onClick={() => fileRef.current?.click()}
          title={t('gp.addHint')}
          disabled={busy || sheetBusy}
        >
          <svg className="gp-drop-icon" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M12 16V4M7 9l5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="gp-drop-text">
            <strong>{t(dragging ? 'gp.dropHere' : 'gp.addShort')}</strong>
          </span>
        </button>
        {/* Secondary: the neck's labels and deleting an import. */}
        <MoreMenu label={t('gp.more')}>
            {showNeckLabels && !sheet && <NeckLabelToggle trainer={trainer} t={t} />}
            {sheet && (
              <button
                type="button"
                className="more-menu-item is-danger"
                onClick={async () => {
                  if (confirmDelete !== sheet.id) {
                    setConfirmDelete(sheet.id);
                    return;
                  }
                  setConfirmDelete(null);
                  await deleteSheet(sheet.id);
                  setSheetId(null);
                  setSheets(await listSheets());
                }}
              >
                {t(confirmDelete === sheet.id ? 'sheet.deleteConfirm' : 'sheet.delete')}
              </button>
            )}
            {!sheet && solo?.source === 'import' && (
              // Two taps: the file goes from every device.
              <button
                type="button"
                className="more-menu-item is-danger"
                onClick={() => {
                  if (confirmDelete === solo.id) {
                    setConfirmDelete(null);
                    trainer.deleteImport(solo.id);
                  } else setConfirmDelete(solo.id);
                }}
                disabled={busy}
              >
                {t(confirmDelete === solo?.id ? 'lickTrainer.deleteConfirm' : 'lickTrainer.delete')}
              </button>
            )}
            {/* Finding a song on the web (was a Play tab of its own). */}
            {onFindSongs && (
              <button type="button" className="more-menu-item" onClick={onFindSongs}>
                {t('gp.findSongs')}
              </button>
            )}
          </MoreMenu>
        {/* Song | Practice | Chords: on the file's row on wide screens. */}
        {solo && !songOnly && !sheet && (
              <div className="gp-modes">
                <div className="mode-toggle" role="group" aria-label={t('gp.viewLabel')} style={{ margin: 0 }}>
                  <button
                    type="button"
                    className={view === 'song' ? 'active' : ''}
                    onClick={() => {
                      trainer.stop();
                      setView('song');
                    }}
                    disabled={busy}
                  >
                    {t('gp.viewSong')}
                  </button>
                  <button type="button" className={view === 'practice' ? 'active' : ''} onClick={() => setView('practice')}>
                    {t('gp.viewPractice')}
                  </button>
                  {/* The song as a chord sheet (same player as Song). */}
                  <button
                    type="button"
                    className={view === 'chords' ? 'active' : ''}
                    onClick={() => {
                      trainer.stop();
                      setView('chords');
                    }}
                    disabled={busy}
                  >
                    {t('gpx.viewChords')}
                  </button>
                </div>
                <InfoTooltip text={t('tip.tools.gpView')} />
              </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={GP_ACCEPT}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) addFile(file);
            e.target.value = '';
          }}
        />
      </div>


      {!sheet && soundProgress === -1 && (
        <p className="lt-warning" role="alert">
          {t('gp.soundFailed')}{' '}
          <button type="button" className="gp-retry" onClick={() => window.location.reload()}>
            {t('lickTrainer.libRetry')}
          </button>
        </p>
      )}
      {!sheet && soundProgress !== 1 && soundProgress !== -1 && (
        <p className="gp-sound-loading" role="status">
          <span className="gp-sound-bar" aria-hidden="true">
            <span style={{ width: `${Math.round((soundProgress ?? 0.5) * 100)}%` }} />
          </span>
          {soundProgress == null
            ? t('gp.soundLoading')
            : t('gp.soundLoadingPct', { pct: Math.round(soundProgress * 100) })}
        </p>
      )}

      {/* Sync lives in Settings; here only a problem is mentioned. */}
      {['bad-key', 'offline', 'error', 'too-big'].includes(trainer.library.status) && (
        <p className="lt-warning lt-small">{t('gp.syncProblem')}</p>
      )}

      {trainer.error?.key === 'import' && !trainer.pendingImport && (
        <p className="lt-warning">{t('lickTrainer.error.import', { message: trainer.error.message })}</p>
      )}
      {trainer.pendingImport && (
        <div ref={importRef}>
          <ImportPanel key={trainer.pendingImport.fileName} trainer={trainer} t={t} lang={lang} forceSaveAs="solo" />
        </div>
      )}

      {sheet ? (
        <PdfSheetView key={sheet.id} sheetId={sheet.id} t={t} />
      ) : !solo ? (
        <p className="lt-muted">{t('lickTrainer.noSolos')}</p>
      ) : (
        <>
          {/* Piano and bass: song view only (the instrument lights up with the part). */}
          {!songOnly && (
            <>

              {/* Song view has its tracks in a rail beside the score. */}
              {view === 'practice' && canPractice && <TrackMixer trainer={trainer} t={t} busy={busy} />}
              {view === 'practice' && canPractice && trainer.tracks.length > 0 && (
                <p className="lt-muted lt-small">{t('gp.practiceMixHint')}</p>
              )}
              {micWithBand && <p className="lt-warning">{t('gp.micHint')}</p>}
            </>
          )}

          {view === 'song' || view === 'chords' || songOnly ? (
            <GpSongPlayer
              trainer={trainer}
              t={t}
              pianoProfile={pianoProfile}
              bassProfile={bassProfile}
              view={songOnly ? 'song' : view}
            />
          ) : !canPractice ? (
            <p className="lt-muted">{t(solo.pending ? 'gp.buildingPart' : 'gp.practiceGuitarOnly')}</p>
          ) : (
            <LickTrainer trainer={trainer} variant="solos" />
          )}
        </>
      )}
    </div>
  );
}
