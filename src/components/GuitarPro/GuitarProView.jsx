import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import { getAudioInputSettings } from '../../audio/audioInputSettingsStore';
import { LickTrainer, LibraryBar, ImportPanel } from '../LickTrainer/LickTrainer';
import { GpSongPlayer } from './GpSongPlayer';
import './GuitarProView.css';

const GP_ACCEPT = '.gp,.gp3,.gp4,.gp5,.gpx';

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

export function GuitarProView({ trainer }) {
  const { t, lang } = useLanguage();
  const fileRef = useRef(null);
  const [view, setView] = useState('song'); // 'song' | 'practice'
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { setMode } = trainer;
  useEffect(() => {
    setMode('solos');
  }, [setMode]);

  const phase = trainer.phase;
  const busy = ['preparing', 'countIn', 'recording', 'analyzing', 'calibrating'].includes(phase);
  const solo = trainer.activeSolo;
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const micWithBand =
    view === 'practice' && trainer.backingTracks.length > 0 && getAudioInputSettings().inputMode === 'microphone';

  return (
    <div className="gp-view" dir={dir}>
      <div>
        <h1>{t('gp.title')}</h1>
        <p className="subtitle">{t('gp.subtitle')}</p>
      </div>

      <div className="lt-filters gp-file-row">
        <label className="lt-field lt-grow">
          <span>{t('gp.file')}</span>
          <select
            value={solo?.id ?? ''}
            onChange={(e) => {
              setConfirmDelete(null);
              trainer.selectSolo(e.target.value);
            }}
            disabled={busy || trainer.solos.length === 0}
          >
            {trainer.solos.map((so) => (
              <option key={so.id} value={so.id}>
                {localize(so.title, lang)}
                {so.artist ? ` — ${so.artist}` : ''}
              </option>
            ))}
          </select>
        </label>
        {solo?.source === 'import' && (
          // Two taps: the file goes from every device.
          <button
            type="button"
            className={'gp-delete' + (confirmDelete === solo.id ? ' danger' : '')}
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
      </div>

      <LibraryBar trainer={trainer} t={t} />

      {trainer.error?.key === 'import' && !trainer.pendingImport && (
        <p className="lt-warning">{t('lickTrainer.error.import', { message: trainer.error.message })}</p>
      )}
      {trainer.pendingImport && (
        <ImportPanel key={trainer.pendingImport.fileName} trainer={trainer} t={t} lang={lang} forceSaveAs="solo" />
      )}

      {!solo ? (
        <p className="lt-muted">{t('lickTrainer.noSolos')}</p>
      ) : (
        <>
          <div className="mode-toggle" role="group" aria-label={t('gp.viewLabel')}>
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
          </div>

          <TrackMixer trainer={trainer} t={t} busy={busy} />
          {view === 'practice' && trainer.tracks.length > 0 && (
            <p className="lt-muted lt-small">{t('gp.practiceMixHint')}</p>
          )}
          {micWithBand && <p className="lt-warning">{t('gp.micHint')}</p>}

          {view === 'song' ? <GpSongPlayer trainer={trainer} t={t} /> : <LickTrainer trainer={trainer} variant="solos" />}
        </>
      )}
    </div>
  );
}
