import { useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import './PracticeDrillPanel.css';

// Space = play/pause, arrow keys = manual step when paused — only active
// while an exercise is loaded.
function useDrillKeyboard(drill) {
  useEffect(() => {
    if (!drill.exercise) return undefined;
    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === ' ') {
        e.preventDefault();
        drill.isPlaying ? drill.pause() : drill.play();
      } else if (e.key === 'ArrowRight' && !drill.isPlaying) {
        drill.stepManual(1);
      } else if (e.key === 'ArrowLeft' && !drill.isPlaying) {
        drill.stepManual(-1);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drill]);
}

// m:ss, so half a minute in reads "0:30" not "0m 30s" — compact enough to
// sit next to the step counter in the header.
function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function PracticeDrillPanel({ drill }) {
  useDrillKeyboard(drill);
  const { t, lang } = useLanguage();

  if (!drill.exercise) return null;
  const { exercise, mode, setMode, stepIndex, elapsedMs, isPlaying, hearAudio, setHearAudio, noteLabelMode, setNoteLabelMode } = drill;

  return (
    <div className="practice-drill-panel">
      <div className="practice-drill-header">
        <div>
          <h2 className="practice-drill-title" dir="auto">
            {localize(exercise.title, lang)}
          </h2>
          <p className="practice-drill-meta">
            {t('practiceDrillPanel.stepLabel', { index: stepIndex + 1, total: exercise.sequence.length })}
            {' · '}
            <span className="practice-drill-timer">{formatElapsed(elapsedMs)}</span>
          </p>
        </div>
        <button type="button" className="practice-drill-exit" onClick={drill.exit}>
          {t('practiceDrillPanel.exit')}
        </button>
      </div>

      <div className="practice-drill-controls">
        <div className="mode-toggle" role="group" aria-label={t('practiceDrillPanel.viewModeLabel')}>
          <button type="button" className={mode === 'static' ? 'active' : ''} onClick={() => setMode('static')}>
            {t('practiceDrillPanel.staticOverview')}
          </button>
          <button type="button" className={mode === 'live' ? 'active' : ''} onClick={() => setMode('live')}>
            {t('practiceDrillPanel.livePlayback')}
          </button>
        </div>

        {/* What the fretboard's note dots show — the note's letter name, or
            its 1-based position in the play order, so you can tell "this is
            note 4" at a glance instead of counting dots yourself. */}
        <div className="mode-toggle" role="group" aria-label={t('practiceDrillPanel.noteLabelModeLabel')}>
          <button type="button" className={noteLabelMode === 'note' ? 'active' : ''} onClick={() => setNoteLabelMode('note')}>
            {t('practiceDrillPanel.noteNames')}
          </button>
          <button type="button" className={noteLabelMode === 'order' ? 'active' : ''} onClick={() => setNoteLabelMode('order')}>
            {t('practiceDrillPanel.noteOrder')}
          </button>
        </div>

        {mode === 'live' && (
          <button
            type="button"
            className={'practice-drill-hear' + (hearAudio ? ' active' : '')}
            onClick={() => setHearAudio((v) => !v)}
            aria-pressed={hearAudio}
            title={t('practiceDrillPanel.hearItHint')}
          >
            {hearAudio ? '🔊' : '🔈'} {t('practiceDrillPanel.hearIt')}
          </button>
        )}

        <button
          type="button"
          className={'metronome-toggle' + (isPlaying ? ' running' : '')}
          onClick={() => (isPlaying ? drill.pause() : drill.play())}
        >
          {isPlaying ? t('practiceDrillPanel.pause') : t('practiceDrillPanel.play')}
        </button>

        {!isPlaying && (
          <button
            type="button"
            className="practice-drill-reset-timer"
            onClick={drill.resetTimer}
            disabled={elapsedMs === 0}
            aria-label={t('practiceDrillPanel.resetTimer')}
            title={t('practiceDrillPanel.resetTimer')}
          >
            ↺
          </button>
        )}
      </div>

      <p className="practice-drill-hint">{t('practiceDrillPanel.hint')}</p>
    </div>
  );
}
