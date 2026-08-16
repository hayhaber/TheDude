import { colorForChord } from '../../styles/colors';
import { useLanguage } from '../../i18n/LanguageContext';
import { GUITAR_CHORD_RHYTHM_MODES, getChordToneLabels, parseGuitarChordProgressionText } from '../../music/guitarChordRhythmContent';
import { computeChordPositions } from '../../music/computeChordPositions';
import { applyCapoToPosition } from '../../music/capo';
import { Fretboard } from '../Fretboard/Fretboard';
import { LEAD_TIME_S } from '../../hooks/useGuitarChordRhythm';
import './GuitarChordRhythmPanel.css';

// Once a chord's own judging window has this little time left (real
// seconds) and it's STILL unanswered, show what notes it's actually made
// of — a late assist for a chord the player doesn't recognize by name yet,
// not a giveaway from the start (the name itself is visible the whole
// time; this only adds the spelled notes once time's nearly up).
const HINT_WINDOW_S = 1.2;

// Same continuous "position is a pure function of elapsed time" falling-
// blocks/timeline rendering as the piano ChordRhythmPanel, ported rather
// than shared (different data shape: rootPitchClass/qualityKey instead of
// tones/pitchClasses, no PianoKeyboard quiz plumbing to route through) —
// see that component's own comments for the full reasoning behind the
// motion math and the in-place hit/miss coloring.
function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

const LANE_SPAWN_Y = -40;
const LANE_HIT_Y = 150;
const LANE_EXIT_Y = 240;

function fallingTop(chord, now) {
  if (now <= chord.startTime) {
    const p = clamp01((now - (chord.startTime - LEAD_TIME_S)) / LEAD_TIME_S);
    return LANE_SPAWN_Y + p * (LANE_HIT_Y - LANE_SPAWN_Y);
  }
  const p = clamp01((now - chord.startTime) / (chord.endTime - chord.startTime));
  return LANE_HIT_Y + p * (LANE_EXIT_Y - LANE_HIT_Y);
}

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

// Falling blocks spread horizontally by root pitch class (0-11 -> across
// the lane) instead of piano's "spread by keyboard position" — there's no
// keyboard below to line up with here, but the same "consecutive chords
// don't all stack in one column" principle still applies and still reads
// as meaningful (same root always lands in the same column).
function xPercentForChord(chord) {
  const ratio = chord.rootPitchClass / 11;
  return 12 + ratio * 76;
}

function timelineTop(chord, chipHeight) {
  const ratio = chord.rootPitchClass / 11;
  const usableHeight = 90 - chipHeight - 16;
  return 8 + (1 - ratio) * usableHeight;
}

const REPEAT_OPTIONS = [1, 2, 3, 4, 5, 6, 8];

export function GuitarChordRhythmPanel({ guitarChordRhythm, metronome }) {
  const { t } = useLanguage();
  const {
    source,
    setSource,
    mode,
    setMode,
    autoDuration,
    setAutoDuration,
    customText,
    setCustomText,
    groups,
    addGroup,
    removeGroup,
    updateGroupText,
    updateGroupRepeats,
    loop,
    setLoop,
    beatsPerChord,
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
    micIsListening,
    micError,
    micGuess,
    micMatchStatus,
  } = guitarChordRhythm;

  const blockWidth = Math.max(56, 96 - beatsPerChord * 4);
  const blockHeight = Math.min(70, 22 + beatsPerChord * 4);

  const visible = isPlaying
    ? sequence
        .map((chord, i) => ({ chord, i }))
        .filter(({ chord }) => now >= chord.startTime - LEAD_TIME_S && now <= chord.endTime)
    : [];

  const anyActive = visible.some(({ chord }) => now >= chord.startTime && now < chord.endTime);

  // The active-and-still-unanswered chord whose window is about to close —
  // at most one at a time, since only one chord's window is ever open.
  const hintEntry = visible.find(
    ({ chord, i }) => now >= chord.startTime && now < chord.endTime && results[i] == null && chord.endTime - now <= HINT_WINDOW_S
  );
  const hintTones = hintEntry ? getChordToneLabels(hintEntry.chord.rootPitchClass, hintEntry.chord.qualityKey) : null;

  // Whichever chord is crossing the hit-line right now — shown on a live
  // Fretboard below the lane. A group imported from Compose carries the
  // EXACT voicing the player chose there (`chord.voicing`); anything else
  // (auto-generated, typed) falls back to a sensible default shape via
  // computeChordPositions. Purely a reference display — the mic judging
  // above can confirm WHICH chord was played, never which shape, so this
  // never marks itself right/wrong on its own (see guitarChordRhythmContent.js's
  // own top comment on that limitation).
  const activeEntry = visible.find(({ chord }) => now >= chord.startTime && now < chord.endTime);
  const activeChord = activeEntry?.chord ?? null;
  const activeVoicing = activeChord
    ? activeChord.voicing
      ? applyCapoToPosition(activeChord.voicing, activeChord.capoFret || 0)
      : computeChordPositions(activeChord.chordText, 'chord').positions[0] ?? null
    : null;

  // Before pressing Start (or after Stop), preview the FIRST chord of
  // whatever's actually typed/loaded — 'custom'/'song' content is already
  // fully known upfront (unlike 'auto', which is only decided once Start
  // generates it), so there's no reason to make the player wait until
  // mid-session to see what shape they're about to practice.
  const previewChord =
    !isPlaying && source === 'custom'
      ? parseGuitarChordProgressionText(customText)[0] ?? null
      : !isPlaying && source === 'song'
      ? groups[0]?.chords?.[0] ?? parseGuitarChordProgressionText(groups[0]?.text ?? '')[0] ?? null
      : null;
  const previewVoicing = previewChord
    ? previewChord.voicing
      ? applyCapoToPosition(previewChord.voicing, previewChord.capoFret || 0)
      : computeChordPositions(previewChord.chordText, 'chord').positions[0] ?? null
    : null;

  return (
    <div className="guitar-chord-rhythm-panel">
      <div>
        <h1>{t('guitarChordRhythm.title')}</h1>
        <p className="subtitle">{t('guitarChordRhythm.subtitle')}</p>
      </div>

      <div className="guitar-chord-rhythm-controls">
        <div className="guitar-chord-rhythm-field">
          <span className="guitar-chord-rhythm-field-label" aria-hidden="true">
            {t('guitarChordRhythm.source')}
          </span>
          <div className="mode-toggle wrap" role="group" aria-label={t('guitarChordRhythm.source')}>
            {['auto', 'custom', 'song'].map((key) => (
              <button key={key} type="button" className={source === key ? 'active' : ''} onClick={() => setSource(key)} disabled={isPlaying}>
                {t(`guitarChordRhythm.source.${key}`)}
              </button>
            ))}
          </div>
        </div>

        {source === 'auto' && (
          <>
            <div className="guitar-chord-rhythm-field">
              <span className="guitar-chord-rhythm-field-label" aria-hidden="true">
                {t('guitarChordRhythm.mode')}
              </span>
              <div className="mode-toggle wrap" role="group" aria-label={t('guitarChordRhythm.mode')}>
                {GUITAR_CHORD_RHYTHM_MODES.map((m) => (
                  <button key={m.key} type="button" className={mode === m.key ? 'active' : ''} onClick={() => setMode(m.key)} disabled={isPlaying}>
                    {t(`guitarChordRhythm.mode.${m.key}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="guitar-chord-rhythm-field">
              <span className="guitar-chord-rhythm-field-label" aria-hidden="true">
                {t('guitarChordRhythm.duration')}
              </span>
              <div className="mode-toggle wrap" role="group" aria-label={t('guitarChordRhythm.duration')}>
                {['fixed', 'timer', 'endless'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={autoDuration === key ? 'active' : ''}
                    onClick={() => setAutoDuration(key)}
                    disabled={isPlaying}
                  >
                    {t(`guitarChordRhythm.duration.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {source === 'custom' && (
          <label className="guitar-chord-rhythm-field">
            {t('guitarChordRhythm.customLabel')}
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              disabled={isPlaying}
              placeholder={t('guitarChordRhythm.groupPlaceholder')}
              dir="ltr"
            />
          </label>
        )}

        {source === 'song' && (
          <div className="guitar-chord-rhythm-groups">
            {groups.map((group, i) => (
              <div className="guitar-chord-rhythm-group" key={group.id}>
                <label className="guitar-chord-rhythm-field">
                  {t('guitarChordRhythm.groupLabel', { n: i + 1 })}
                  <input
                    type="text"
                    value={group.text}
                    onChange={(e) => updateGroupText(group.id, e.target.value)}
                    disabled={isPlaying}
                    placeholder={t('guitarChordRhythm.groupPlaceholder')}
                    dir="ltr"
                  />
                </label>
                <label className="guitar-chord-rhythm-field">
                  {t('guitarChordRhythm.repeats')}
                  <select value={group.repeats} onChange={(e) => updateGroupRepeats(group.id, Number(e.target.value))} disabled={isPlaying}>
                    {REPEAT_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                {groups.length > 1 && (
                  <button
                    type="button"
                    className="guitar-chord-rhythm-remove-group"
                    onClick={() => removeGroup(group.id)}
                    disabled={isPlaying}
                    aria-label={t('guitarChordRhythm.removeGroup')}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="guitar-chord-rhythm-add-group" onClick={addGroup} disabled={isPlaying}>
              + {t('guitarChordRhythm.addGroup')}
            </button>
          </div>
        )}

        {(source === 'custom' || source === 'song') && (
          <div className="guitar-chord-rhythm-field">
            <span className="guitar-chord-rhythm-field-label" aria-hidden="true">
              {t('guitarChordRhythm.loop')}
            </span>
            <div className="mode-toggle" role="group" aria-label={t('guitarChordRhythm.loop')}>
              <button type="button" className={!loop ? 'active' : ''} onClick={() => setLoop(false)} disabled={isPlaying}>
                {t('guitarChordRhythm.loop.off')}
              </button>
              <button type="button" className={loop ? 'active' : ''} onClick={() => setLoop(true)} disabled={isPlaying}>
                {t('guitarChordRhythm.loop.on')}
              </button>
            </div>
          </div>
        )}

        <div className="guitar-chord-rhythm-field">
          <span className="guitar-chord-rhythm-field-label" aria-hidden="true">
            {t('guitarChordRhythm.view')}
          </span>
          <div className="mode-toggle" role="group" aria-label={t('guitarChordRhythm.view')}>
            <button type="button" className={viewMode === 'falling' ? 'active' : ''} onClick={() => setViewMode('falling')}>
              {t('chordRhythm.view.falling')}
            </button>
            <button type="button" className={viewMode === 'timeline' ? 'active' : ''} onClick={() => setViewMode('timeline')}>
              {t('chordRhythm.view.timeline')}
            </button>
          </div>
        </div>

        <div className="guitar-chord-rhythm-field">
          <span className="guitar-chord-rhythm-field-label" aria-hidden="true">
            &nbsp;
          </span>
          <button type="button" className="play-button" onClick={isPlaying ? stop : ended ? restart : play}>
            {isPlaying ? t('vocal.stop') : ended ? t('chordRhythm.tryAgain') : t('vocal.start')}
          </button>
        </div>
      </div>

      {viewMode === 'falling' ? (
        <div className="guitar-chord-rhythm-lane">
          <div className={'guitar-chord-rhythm-hit-zone' + (anyActive ? ' active' : '')} />
          {visible.map(({ chord, i }) => {
            const result = results[i];
            const color = result === 'hit' ? '#34c759' : result === 'miss' ? 'var(--danger)' : colorForChord(chord.chordText);
            const crossing = now >= chord.startTime && now < chord.endTime;
            const micClass = crossing && !result && micMatchStatus === 'mismatch' ? ' mic-mismatch' : '';
            const xPercent = xPercentForChord(chord);
            const top = fallingTop(chord, now);
            return (
              <div
                key={i}
                className={'guitar-chord-rhythm-block' + (crossing ? ' landed' : '') + (result ? ` ${result}` : '') + micClass}
                style={{ left: `${xPercent}%`, top, width: blockWidth, height: blockHeight, background: color, borderColor: color }}
              >
                {crossing && !result ? '▶ ' : ''}
                {chord.chordText}
              </div>
            );
          })}
          <div className={'guitar-chord-rhythm-hitline' + (anyActive ? ' active' : '')} />
        </div>
      ) : (
        <div className="guitar-chord-rhythm-timeline">
          <div className={'guitar-chord-rhythm-hit-zone timeline' + (anyActive ? ' active' : '')} />
          <div className={'guitar-chord-rhythm-playhead' + (anyActive ? ' active' : '')} />
          {visible.map(({ chord, i }) => {
            const result = results[i];
            const color = result === 'hit' ? '#34c759' : result === 'miss' ? 'var(--danger)' : colorForChord(chord.chordText);
            const crossing = now >= chord.startTime && now < chord.endTime;
            const micClass = crossing && !result && micMatchStatus === 'mismatch' ? ' mic-mismatch' : '';
            const left = `${timelineLeft(chord, now)}%`;
            const top = timelineTop(chord, 40);
            return (
              <div
                key={i}
                className={'guitar-chord-rhythm-chip' + (crossing ? ' landed' : '') + (result ? ` ${result}` : '') + micClass}
                style={{ left, top, background: color, borderColor: color }}
              >
                {crossing && !result ? '▶ ' : ''}
                {chord.chordText}
              </div>
            );
          })}
        </div>
      )}

      {isPlaying && activeChord && activeVoicing && (
        <div className="guitar-chord-rhythm-fretboard">
          <Fretboard position={activeVoicing} chordColor={colorForChord(activeChord.chordText)} capoFret={activeChord.capoFret || 0} />
        </div>
      )}

      {previewChord && previewVoicing && (
        <div className="guitar-chord-rhythm-fretboard">
          <p className="guitar-chord-rhythm-preview-label" dir="auto">
            {t('guitarChordRhythm.preview', { chord: previewChord.chordText })}
          </p>
          <Fretboard position={previewVoicing} chordColor={colorForChord(previewChord.chordText)} capoFret={previewChord.capoFret || 0} />
        </div>
      )}

      {isPlaying && hintTones && hintTones.length > 0 && (
        <p className="guitar-chord-rhythm-hint" dir="auto">
          {t('guitarChordRhythm.hint', { tones: hintTones.join(' · ') })}
        </p>
      )}

      {isPlaying && (
        <p className={'guitar-chord-rhythm-mic-status' + (micMatchStatus === 'match' ? ' good' : micMatchStatus === 'mismatch' ? ' bad' : '')} dir="auto">
          {micError
            ? t('trainer.micError', { message: micError })
            : micIsListening
            ? micGuess
              ? t(micMatchStatus === 'mismatch' ? 'guitarChordRhythm.hearingWrong' : 'guitarChordRhythm.hearing', {
                  chord: micGuess.chord,
                  confidence: Math.round(micGuess.confidence * 100),
                })
              : t('guitarChordRhythm.listening')
            : t('earTraining.mic.permission')}
        </p>
      )}

      {(isPlaying || ended) && (
        <p className="guitar-chord-rhythm-score">
          {t('chordRhythm.score')}: {score.hits} / {score.hits + score.misses}
          {accuracyPct != null && ` · ${accuracyPct}%`} · {t('chordRhythm.combo')}: {combo} ({t('chordRhythm.maxCombo')}: {maxCombo})
          {' · '}
          {t('rhythmGame.bpm', { bpm: metronome.bpm })}
        </p>
      )}

      {ended && <p className="guitar-chord-rhythm-complete">{t('vocal.complete')}</p>}
    </div>
  );
}
