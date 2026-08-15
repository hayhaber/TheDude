import { colorForChord } from '../../styles/colors';
import { useLanguage } from '../../i18n/LanguageContext';
import { LEAD_TIME_S } from '../../hooks/useChordRhythm';
import './ChordRhythmPanel.css';

// Same range useChordRhythm.js's own LENIENT_RANGE covers — used here only
// to map a chord's root note to a position, so consecutive falling
// blocks/timeline chips spread out roughly matching where their notes
// actually sit on the keyboard below, instead of every block stacking in
// the exact same spot.
const KEYBOARD_RANGE = { from: 48, to: 84 }; // C3..C6

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function xPercentForChord(chord) {
  const rootMidi = chord.tones[0]?.midi ?? 60;
  const clamped = Math.min(KEYBOARD_RANGE.to, Math.max(KEYBOARD_RANGE.from, rootMidi));
  const ratio = (clamped - KEYBOARD_RANGE.from) / (KEYBOARD_RANGE.to - KEYBOARD_RANGE.from);
  return 12 + ratio * 76; // keep clear of the lane's own left/right edges
}

// Falling-blocks vertical journey: spawn near the top, fall smoothly to the
// hit-line by the chord's own startTime, then keep falling AT THE SAME
// CONTINUOUS RATE past the line until its window's endTime — i.e. the
// block visibly crosses the line over its full beatsPerChord duration
// instead of stopping there, exactly per the user's spec. Both legs are a
// pure function of `now` and the chord's own fixed startTime/endTime, so
// there is nothing that can drift or need to "catch up".
const LANE_SPAWN_Y = -40;
const LANE_HIT_Y = 150;
const LANE_EXIT_Y = 240; // past the 200px lane's visible/clipped area

function fallingTop(chord, now) {
  if (now <= chord.startTime) {
    const p = clamp01((now - (chord.startTime - LEAD_TIME_S)) / LEAD_TIME_S);
    return LANE_SPAWN_Y + p * (LANE_HIT_Y - LANE_SPAWN_Y);
  }
  const p = clamp01((now - chord.startTime) / (chord.endTime - chord.startTime));
  return LANE_HIT_Y + p * (LANE_EXIT_Y - LANE_HIT_Y);
}

// Timeline's horizontal journey mirrors the falling lane's vertical one:
// enters from the right, crosses the playhead over the chord's own
// startTime..endTime window, exits left. The "spread by keyboard position"
// principle the falling view uses for its horizontal axis is applied here
// too, just on the vertical axis instead — that's the one still free once
// horizontal is spoken for by time (see timelineTop below), same idea as a
// piano-roll: scrolls by time, stacked by pitch.
const TIMELINE_SPAWN_X = 112;
const TIMELINE_PLAYHEAD_X = 50;
const TIMELINE_EXIT_X = -12;

function timelineLeft(chord, now) {
  if (now <= chord.startTime) {
    const p = clamp01((now - (chord.startTime - LEAD_TIME_S)) / LEAD_TIME_S);
    return TIMELINE_SPAWN_X + p * (TIMELINE_PLAYHEAD_X - TIMELINE_SPAWN_X);
  }
  const p = clamp01((now - chord.startTime) / (chord.endTime - chord.startTime));
  return TIMELINE_PLAYHEAD_X + p * (TIMELINE_EXIT_X - TIMELINE_PLAYHEAD_X);
}

function timelineTop(chord, chipHeight) {
  const rootMidi = chord.tones[0]?.midi ?? 60;
  const clamped = Math.min(KEYBOARD_RANGE.to, Math.max(KEYBOARD_RANGE.from, rootMidi));
  const ratio = (clamped - KEYBOARD_RANGE.from) / (KEYBOARD_RANGE.to - KEYBOARD_RANGE.from);
  const usableHeight = 90 - chipHeight - 16;
  return 8 + (1 - ratio) * usableHeight; // higher-pitched chords sit higher
}

export function ChordRhythmPanel({ chordRhythm, metronome }) {
  const { t } = useLanguage();
  const {
    source,
    setSource,
    generatedLabel,
    customText,
    setCustomText,
    beatsPerChord,
    setBeatsPerChord,
    strictMode,
    setStrictMode,
    viewMode,
    setViewMode,
    sequence,
    now,
    results,
    isPlaying,
    ended,
    play,
    restart,
    stop,
    score,
    combo,
    maxCombo,
    accuracyPct,
  } = chordRhythm;

  // Block size preps for a future "hold the chord for the whole window"
  // exercise — more beats per chord (a longer window, i.e. a longer
  // line-crossing journey) reads as a taller, narrower bar instead of every
  // window looking like the same square, even though only a point-in-time
  // hit/miss is actually scored today.
  const blockWidth = Math.max(56, 96 - beatsPerChord * 4);
  const blockHeight = Math.min(70, 22 + beatsPerChord * 4);

  // Any chord currently between its own spawn time and the end of its
  // window is rendered — a continuous time-window filter (same idea as
  // useFallingNotes.js's own visibleNotes), never an index slice, so a
  // chord already on screen is never abruptly unmounted mid-flight when
  // the next one appears.
  const visible = isPlaying
    ? sequence
        .map((chord, i) => ({ chord, i }))
        .filter(({ chord }) => now >= chord.startTime - LEAD_TIME_S && now <= chord.endTime)
    : [];

  // "Is anything actually in its playable window RIGHT NOW" — drives the
  // hit-zone band and hit-line/playhead lighting up, so the exact moment
  // you should be playing is an unmistakable state change, not something
  // you have to infer from a block's position relative to a static line.
  const anyActive = visible.some(({ chord }) => now >= chord.startTime && now < chord.endTime);

  return (
    <div className="chord-rhythm-panel">
      <div>
        <h1>{t('chordRhythm.title')}</h1>
        <p className="subtitle">{t('chordRhythm.subtitle')}</p>
      </div>

      <div className="chord-rhythm-controls">
        <div className="chord-rhythm-field">
          <span className="chord-rhythm-field-label" aria-hidden="true">
            {t('chordRhythm.source')}
          </span>
          <div className="mode-toggle" role="group" aria-label={t('chordRhythm.source')}>
            <button type="button" className={source === 'preset' ? 'active' : ''} onClick={() => setSource('preset')} disabled={isPlaying}>
              {t('chordRhythm.source.preset')}
            </button>
            <button type="button" className={source === 'custom' ? 'active' : ''} onClick={() => setSource('custom')} disabled={isPlaying}>
              {t('chordRhythm.source.custom')}
            </button>
          </div>
        </div>

        {source === 'preset' ? (
          <div className="chord-rhythm-field">
            <span className="chord-rhythm-field-label" aria-hidden="true">
              {t('chordRhythm.presetLabel')}
            </span>
            <p className="chord-rhythm-generated" dir="ltr">
              {generatedLabel || t('chordRhythm.generatedHint')}
            </p>
          </div>
        ) : (
          <label className="chord-rhythm-field">
            {t('chordRhythm.customLabel')}
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              disabled={isPlaying}
              placeholder="C G Am F"
              dir="ltr"
            />
          </label>
        )}

        <label className="chord-rhythm-field">
          {t('chordRhythm.beatsPerChord')}
          <select value={beatsPerChord} onChange={(e) => setBeatsPerChord(Number(e.target.value))} disabled={isPlaying}>
            {[2, 4, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="chord-rhythm-field">
          <span className="chord-rhythm-field-label" aria-hidden="true">
            {t('chordRhythm.strictness')}
          </span>
          <div className="mode-toggle" role="group" aria-label={t('chordRhythm.strictness')}>
            <button type="button" className={!strictMode ? 'active' : ''} onClick={() => setStrictMode(false)} disabled={isPlaying}>
              {t('chordRhythm.lenient')}
            </button>
            <button type="button" className={strictMode ? 'active' : ''} onClick={() => setStrictMode(true)} disabled={isPlaying}>
              {t('chordRhythm.strict')}
            </button>
          </div>
        </div>

        <div className="chord-rhythm-field">
          <span className="chord-rhythm-field-label" aria-hidden="true">
            {t('chordRhythm.view')}
          </span>
          <div className="mode-toggle" role="group" aria-label={t('chordRhythm.view')}>
            <button type="button" className={viewMode === 'falling' ? 'active' : ''} onClick={() => setViewMode('falling')}>
              {t('chordRhythm.view.falling')}
            </button>
            <button type="button" className={viewMode === 'timeline' ? 'active' : ''} onClick={() => setViewMode('timeline')}>
              {t('chordRhythm.view.timeline')}
            </button>
          </div>
        </div>

        <div className="chord-rhythm-field">
          <span className="chord-rhythm-field-label" aria-hidden="true">
            &nbsp;
          </span>
          <button type="button" className="play-button" onClick={isPlaying ? stop : ended ? restart : play}>
            {isPlaying ? t('vocal.stop') : ended ? t('chordRhythm.tryAgain') : t('vocal.start')}
          </button>
        </div>
      </div>

      {viewMode === 'falling' ? (
        <div className="chord-rhythm-lane">
          <div className={'chord-rhythm-hit-zone' + (anyActive ? ' active' : '')} />
          {visible.map(({ chord, i }) => {
            const result = results[i];
            const color = result === 'hit' ? '#34c759' : result === 'miss' ? 'var(--danger)' : colorForChord(chord.text);
            const crossing = now >= chord.startTime && now < chord.endTime;
            const xPercent = xPercentForChord(chord);
            const top = fallingTop(chord, now);
            return (
              <div
                key={i}
                className={'chord-rhythm-block' + (crossing ? ' landed' : '') + (result ? ` ${result}` : '')}
                style={{
                  left: `${xPercent}%`,
                  top,
                  width: blockWidth,
                  height: blockHeight,
                  background: color,
                  borderColor: color,
                }}
              >
                {crossing && !result ? '▶ ' : ''}
                {chord.text}
              </div>
            );
          })}
          <div className={'chord-rhythm-hitline' + (anyActive ? ' active' : '')} />
        </div>
      ) : (
        <div className="chord-rhythm-timeline">
          <div className={'chord-rhythm-hit-zone timeline' + (anyActive ? ' active' : '')} />
          <div className={'chord-rhythm-playhead' + (anyActive ? ' active' : '')} />
          {visible.map(({ chord, i }) => {
            const result = results[i];
            const color = result === 'hit' ? '#34c759' : result === 'miss' ? 'var(--danger)' : colorForChord(chord.text);
            const crossing = now >= chord.startTime && now < chord.endTime;
            const left = `${timelineLeft(chord, now)}%`;
            const top = timelineTop(chord, 40);
            return (
              <div
                key={i}
                className={'chord-rhythm-chip' + (crossing ? ' landed' : '') + (result ? ` ${result}` : '')}
                style={{
                  left,
                  top,
                  background: color,
                  borderColor: color,
                }}
              >
                {crossing && !result ? '▶ ' : ''}
                {chord.text}
              </div>
            );
          })}
        </div>
      )}

      {(isPlaying || ended) && (
        <p className="chord-rhythm-score">
          {t('chordRhythm.score')}: {score.hits} / {score.hits + score.misses}
          {accuracyPct != null && ` · ${accuracyPct}%`} · {t('chordRhythm.combo')}: {combo} ({t('chordRhythm.maxCombo')}: {maxCombo})
        </p>
      )}

      {ended && <p className="chord-rhythm-complete">{t('vocal.complete')}</p>}
    </div>
  );
}
