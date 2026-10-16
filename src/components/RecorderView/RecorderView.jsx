import { useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import * as P from '../../audio/studio/project';
import { useStudio } from './useStudio';
import { Deck } from './Deck';
import { Timeline } from './Timeline';
import { DrumsPanel, FilePanel, RackHead, RangePanel, RegionTools, SongBar, SyncPanel } from './StudioControls';
import { Library } from './Library';
import '../ModeToggle/ModeToggle.css';
import '../AmpView/AmpView.css';
import './RecorderView.css';
import './Studio.css';

/**
 * Record yourself (Tools card -> Record): a reel-to-reel deck driving a
 * small multitrack studio — up to 4 tracks, takes placed to the sample,
 * editing (split / trim / move / fades / normalize), loop + punch with
 * pre/post-roll, take lanes and comping, a drum track, import and WAV / MP3
 * export. Everything is kept on this device, per profile.
 */
export function RecorderView({ metronome }) {
  const { t, lang } = useLanguage();
  const studio = useStudio({ t, initialBpm: metronome?.bpm });
  const { project, phase, error, notice } = studio;
  const songLength = project ? P.projectLength(project) : 0;

  // Desktop keys: Space play/pause, R record, Delete region, S split,
  // Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z (or Y) redo.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag) || e.target?.isContentEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) studio.redo();
        else studio.undo();
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        studio.redo();
        return;
      }
      if (mod || e.altKey) return;
      if (e.key === ' ' && tag !== 'BUTTON') {
        e.preventDefault();
        if (studio.phase === 'playing') studio.pause();
        else if (studio.phase === 'recording') studio.stop();
        else studio.play();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && studio.selection) {
        e.preventDefault();
        const id = studio.selection;
        studio.setSelection(null);
        studio.update((p) => P.deleteRegion(p, id));
      } else if ((e.key === 's' || e.key === 'S') && studio.selection) {
        const at = studio.positionStore.get().position;
        let rightId = null;
        studio.update((p) => {
          const res = P.splitAt(p, studio.selection, at);
          rightId = res.rightId;
          return res.project;
        });
        if (rightId) studio.setSelection(rightId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [studio]);

  return (
    <div className="rec-view">
      <Deck t={t} lang={lang} studio={studio} songLength={songLength} metronome={metronome} />
      <p className="rec-note">{t(studio.prefs.sound === 'amp' ? 'rec.ampNote' : 'rec.dryNote')}</p>
      {notice && (
        <p className="rec-note" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="amp-error" role="alert">
          {error}
        </p>
      )}

      <section className="st-studio" aria-label={t('rec.studio')}>
        {/* The multitrack unit: song display + keys, the screen, the edit keys. */}
        <div className="rk-unit rk-black mt-unit">
          <RackHead name={t('rec.studio')} model="MT-4" led={phase === 'recording' || phase === 'playing'} />
          <SongBar t={t} studio={studio} />
          <div className="mt-bezel">
            <Timeline t={t} studio={studio} />
          </div>
          <RegionTools t={t} studio={studio} />
          {project && project.tracks.every((x) => !x.regions.length) && phase === 'idle' && <p className="st-hint">{t('rec.studioHint')}</p>}
        </div>
        <div className="st-panels">
          <RangePanel t={t} studio={studio} />
          <DrumsPanel t={t} studio={studio} />
          <FilePanel t={t} studio={studio} />
          <SyncPanel t={t} studio={studio} />
        </div>
      </section>

      <Library t={t} lang={lang} studio={studio} />
    </div>
  );
}
