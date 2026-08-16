import { useEffect, useState } from 'react';
import { buildPositionExercise, buildLinearExercise, buildTransitionExercise } from '../../music/scalePracticeContent';
import { useLanguage } from '../../i18n/LanguageContext';
import { ChevronIcon } from '../ChevronIcon/ChevronIcon';
import { LabelModeToggle } from '../LabelModeToggle/LabelModeToggle';
import './ScalePracticePanel.css';

const SCALE_KEYS = ['minorPentatonic', 'majorPentatonic', 'major', 'naturalMinor'];
const ROOT_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const STRING_NAMES = ['scalePractice.string.lowE', 'scalePractice.string.a', 'scalePractice.string.d', 'scalePractice.string.g', 'scalePractice.string.b', 'scalePractice.string.highE'];
const MODES = ['position', 'linear', 'transition'];

// Practice -> Scale Practice: picks a scale family/root/mode, generates the
// matching sequence (music/scalePracticeContent.js), and drives the SAME
// generic metronome + mic-judged engine Rhythm Practice already uses
// (hooks/useRhythmGame.js, a second independent instance — see App.jsx).
// The exercise regenerates automatically whenever a control changes (not on
// every keystroke — only real state changes), never mid-session; Play/Stop/
// score chrome mirrors RhythmGamePanel's own layout for the same feature.
export function ScalePracticePanel({ scalePractice, labelMode, onLabelModeChange, metronome }) {
  const { t } = useLanguage();
  const [scaleKey, setScaleKey] = useState('minorPentatonic');
  const [root, setRoot] = useState(9); // A — the classic first pentatonic key taught (Am pentatonic)
  const [mode, setMode] = useState('position');
  const [positionIndex, setPositionIndex] = useState(0);
  const [stringIndex, setStringIndex] = useState(2); // D string — comfortable middle string for a linear run
  const [stringCount, setStringCount] = useState(1);
  const [includeBlueNote, setIncludeBlueNote] = useState(false);

  const { exercise, stepIndex, isPlaying, ended, play, restart, stop, score, combo, maxCombo, accuracyPct, micIsListening, micError } =
    scalePractice;

  // 'transition' only has 4 valid starting positions (each bridges N into
  // N+1, so there's no position 5 to bridge from) — 'position' has all 5.
  const maxPositionIndex = mode === 'transition' ? 3 : 4;

  // Switching into 'transition' while sitting on position 5 would otherwise
  // point at a non-existent pair — pull it back onto the last valid one.
  useEffect(() => {
    if (positionIndex > maxPositionIndex) setPositionIndex(maxPositionIndex);
  }, [maxPositionIndex, positionIndex]);

  useEffect(() => {
    if (isPlaying) return;
    const blueNoteOpts = { includeBlueNote: scaleKey === 'minorPentatonic' && includeBlueNote };
    const built =
      mode === 'position'
        ? buildPositionExercise(scaleKey, root, positionIndex, blueNoteOpts)
        : mode === 'linear'
        ? buildLinearExercise(scaleKey, root, { stringIndex, stringCount, ...blueNoteOpts })
        : buildTransitionExercise(scaleKey, root, positionIndex, blueNoteOpts);
    scalePractice.loadExercise(built);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleKey, root, mode, positionIndex, stringIndex, stringCount, includeBlueNote, isPlaying]);

  const total = exercise?.sequence.length ?? 0;

  return (
    <div className="scale-practice-panel">
      <div>
        <h1>{t('scalePractice.title')}</h1>
        <p className="subtitle">{t('scalePractice.subtitle')}</p>
      </div>

      <div className="scale-practice-controls">
        <div className="scale-practice-field">
          <span className="scale-practice-field-label align-start" aria-hidden="true">
            {t('scalePractice.scale')}
          </span>
          <div className="mode-toggle wrap" role="group" aria-label={t('scalePractice.scale')}>
            {SCALE_KEYS.map((key) => (
              <button key={key} type="button" className={scaleKey === key ? 'active' : ''} onClick={() => setScaleKey(key)} disabled={isPlaying}>
                {t(`scalePractice.scale.${key}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="scale-practice-field">
          <span className="scale-practice-field-label" aria-hidden="true">
            {t('scalePractice.root')}
          </span>
          <select value={root} onChange={(e) => setRoot(Number(e.target.value))} disabled={isPlaying}>
            {ROOT_NAMES.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="scale-practice-field">
          <span className="scale-practice-field-label" aria-hidden="true">
            {t('scalePractice.mode')}
          </span>
          <div className="mode-toggle" role="group" aria-label={t('scalePractice.mode')}>
            {MODES.map((key) => (
              <button key={key} type="button" className={mode === key ? 'active' : ''} onClick={() => setMode(key)} disabled={isPlaying}>
                {t(`scalePractice.mode.${key}`)}
              </button>
            ))}
          </div>
        </div>

        {(mode === 'position' || mode === 'transition') && (
          <div className="scale-practice-field">
            <span className="scale-practice-field-label" aria-hidden="true">
              {mode === 'position' ? t('scalePractice.position') : t('scalePractice.transitionPosition')}
            </span>
            <div className="scale-practice-stepper">
              <button
                type="button"
                className="scale-practice-stepper-btn"
                onClick={() => setPositionIndex((i) => Math.max(0, i - 1))}
                disabled={isPlaying || positionIndex === 0}
                aria-label={t('scalePractice.positionPrev')}
              >
                <ChevronIcon direction="left" size={15} />
              </button>
              <span className="scale-practice-stepper-label" dir="auto">
                {mode === 'transition'
                  ? t('scalePractice.positionPairLabel', { n: positionIndex + 1, next: positionIndex + 2 })
                  : t('scalePractice.positionLabel', { n: positionIndex + 1 })}
              </span>
              <button
                type="button"
                className="scale-practice-stepper-btn"
                onClick={() => setPositionIndex((i) => Math.min(maxPositionIndex, i + 1))}
                disabled={isPlaying || positionIndex === maxPositionIndex}
                aria-label={t('scalePractice.positionNext')}
              >
                <ChevronIcon direction="right" size={15} />
              </button>
            </div>
          </div>
        )}

        {mode === 'linear' && (
          <>
            <div className="scale-practice-field">
              <span className="scale-practice-field-label" aria-hidden="true">
                {t('scalePractice.startString')}
              </span>
              <select value={stringIndex} onChange={(e) => setStringIndex(Number(e.target.value))} disabled={isPlaying}>
                {STRING_NAMES.slice(0, stringCount === 2 ? 5 : 6).map((key, i) => (
                  <option key={key} value={i}>
                    {t(key)}
                  </option>
                ))}
              </select>
            </div>
            <div className="scale-practice-field">
              <span className="scale-practice-field-label" aria-hidden="true">
                {t('scalePractice.strings')}
              </span>
              <div className="mode-toggle" role="group" aria-label={t('scalePractice.strings')}>
                <button type="button" className={stringCount === 1 ? 'active' : ''} onClick={() => setStringCount(1)} disabled={isPlaying}>
                  {t('scalePractice.strings.one')}
                </button>
                <button type="button" className={stringCount === 2 ? 'active' : ''} onClick={() => setStringCount(2)} disabled={isPlaying}>
                  {t('scalePractice.strings.two')}
                </button>
              </div>
            </div>
          </>
        )}

        <div className="scale-practice-field">
          <span className="scale-practice-field-label" aria-hidden="true">
            {t('labelModeToggle.label')}
          </span>
          <LabelModeToggle labelMode={labelMode} onChange={onLabelModeChange} />
        </div>

        {scaleKey === 'minorPentatonic' && (
          <div className="scale-practice-field">
            <span className="scale-practice-field-label" aria-hidden="true">
              &nbsp;
            </span>
            <label className="scale-practice-switch">
              <input
                type="checkbox"
                checked={includeBlueNote}
                onChange={(e) => setIncludeBlueNote(e.target.checked)}
                disabled={isPlaying}
              />
              <span className="scale-practice-switch-track">
                <span className="scale-practice-switch-thumb" />
              </span>
              {t('scalePractice.blueNote')}
            </label>
          </div>
        )}

        <div className="scale-practice-field">
          <span className="scale-practice-field-label" aria-hidden="true">
            &nbsp;
          </span>
          <button type="button" className="play-button" onClick={isPlaying ? stop : ended ? restart : play}>
            {isPlaying ? t('vocal.stop') : ended ? t('chordRhythm.tryAgain') : t('vocal.start')}
          </button>
        </div>
      </div>

      {(isPlaying || ended) && (
        <p className="scale-practice-score" dir="auto">
          {t('rhythmGame.stepLabel', { index: Math.max(stepIndex + 1, isPlaying ? 1 : 0), total })}
          {' · '}
          {t('chordRhythm.score')}: {score.hits} / {score.hits + score.misses}
          {accuracyPct != null && ` · ${accuracyPct}%`} · {t('chordRhythm.combo')}: {combo} ({t('chordRhythm.maxCombo')}: {maxCombo})
          {' · '}
          {t('rhythmGame.bpm', { bpm: metronome.bpm })}
        </p>
      )}

      {isPlaying && (
        <p className="scale-practice-mic-status" dir="auto">
          {micError ? t('trainer.micError', { message: micError }) : micIsListening ? t('rhythmGame.listening') : t('earTraining.mic.permission')}
        </p>
      )}

      {ended && <p className="scale-practice-complete">{t('vocal.complete')}</p>}

      <p className="scale-practice-hint" dir="auto">
        {t(`scalePractice.hint.${mode}`)}
      </p>
    </div>
  );
}
