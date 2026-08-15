import { ChordInput } from '../ChordInput/ChordInput';
import { CapoInput } from '../CapoInput/CapoInput';
import { ChordChips } from '../ChordChips/ChordChips';
import { PositionControls } from '../PositionControls/PositionControls';
import { PianoInversionControls } from '../PianoInversionControls/PianoInversionControls';
import { DisplayOptionsMenu } from '../DisplayOptionsMenu/DisplayOptionsMenu';
import { HeatMapLegend } from '../HeatMapLegend/HeatMapLegend';
import { PlaybackControls } from '../PlaybackControls/PlaybackControls';
import { InsightsPanel } from '../InsightsPanel/InsightsPanel';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { useLanguage } from '../../i18n/LanguageContext';
import { useInstrument } from '../../instruments/useInstrument';
import './ComposeView.css';

// The home section: build a chord progression. The neck itself now lives in
// the persistent Stage above every section (see App.jsx's stageFretboardProps
// resolver) — this view is just the controls that shape what's on it, plus
// the supporting Insights panel. Every child here is the exact same
// component/props the old flat page used; this is a pure layout
// reorganization.
export function ComposeView({
  progressionText,
  setProgressionText,
  progression,
  activeIndex,
  setActiveIndex,
  handlePrevChord,
  handleNextChord,
  mode,
  setMode,
  labelMode,
  setLabelMode,
  colorMode,
  setColorMode,
  activePianoInversion,
  selectChordInversion,
  pianoSmoothMode,
  setPianoSmoothMode,
  twoHandView,
  setTwoHandView,
  pianoChordToneSummary,
  showHeatMap,
  setShowHeatMap,
  autoPlay,
  setAutoPlay,
  handlePlay,
  currentPosition,
  isValid,
  hasPositions,
  positions,
  currentIndex,
  chordColor,
  stepPosition,
  selectPosition,
  bassNotInTriad,
  landingNotes,
  roadmap,
  scaleAnalysis,
  emphasizeMood,
  tension,
  clickedNote,
  nextChordText,
  voiceLeadingMessage,
  smoothMode,
  setSmoothMode,
  capoFret,
  setCapoFret,
  onCancelCapo,
  soundingProgressionText,
  soundingKey,
  onTranspose,
}) {
  const { t } = useLanguage();
  const { instrument } = useInstrument();
  const isGuitar = instrument === 'guitar';
  const activeChordText = progression[activeIndex]?.text ?? '';

  return (
    <div className="compose-view">
      <div>
        <h1>{t('compose.title')}</h1>
        <p className="subtitle">{t(isGuitar ? 'compose.subtitle' : 'compose.subtitlePiano')}</p>
      </div>

      <div className="compose-input-row">
        <ChordInput value={progressionText} onChange={setProgressionText} />
      </div>

      {isGuitar && soundingProgressionText && (
        <p className="compose-sounding-progression" dir="auto">
          {soundingKey
            ? t('compose.soundsAsWithKey', { chords: soundingProgressionText, key: soundingKey })
            : t('compose.soundsAs', { chords: soundingProgressionText })}
        </p>
      )}

      <ChordChips
        progression={progression}
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
        onPrev={handlePrevChord}
        onNext={handleNextChord}
      />

      <div className="compose-toggle-row">
        <DisplayOptionsMenu
          mode={mode}
          setMode={setMode}
          labelMode={labelMode}
          setLabelMode={setLabelMode}
          colorMode={colorMode}
          setColorMode={setColorMode}
          twoHandView={twoHandView}
          setTwoHandView={setTwoHandView}
          showHeatMap={showHeatMap}
          setShowHeatMap={setShowHeatMap}
        />
        {/* Transpose — rewrites the actual typed progression a half step at
            a time (fitting a song to a singer's range), unlike Capo which
            never changes what's typed. Works for both instruments, unlike
            Smooth/Capo below, since shifting chord letters has an obvious
            piano equivalent too. Always rendered (disabled, not hidden, with
            nothing to transpose) — same convention ChordChips' own Prev/Next
            already uses for "nothing to act on yet" — so the control is
            discoverable even before you've typed a progression. */}
        <div className="compose-transpose">
          <button
            type="button"
            className="compose-transpose-button"
            aria-label={t('compose.transposeDown')}
            disabled={progression.length === 0}
            onClick={() => onTranspose(-1)}
          >
            −
          </button>
          <span className="compose-transpose-key">{t('compose.keyLabel', { key: scaleAnalysis?.key ?? '—' })}</span>
          <button
            type="button"
            className="compose-transpose-button"
            aria-label={t('compose.transposeUp')}
            disabled={progression.length === 0}
            onClick={() => onTranspose(1)}
          >
            +
          </button>
          {/* Capo — guitar-only, same reason Smooth is guitar-only: a
              capo's "shape you finger vs. what it actually sounds like"
              concept has no piano equivalent. Sits right next to the Key
              readout above (both are "what key/shape you're actually
              playing in" info), rather than up in the input row. */}
          {isGuitar && <CapoInput capoFret={capoFret} setCapoFret={setCapoFret} onCancelCapo={onCancelCapo} />}
        </div>
        {/* Triad voice-leading overlay — guitar-only (a fretboard shape's
            "which finger moves" concept has no piano equivalent, unlike
            Inversion above which is piano-only for the same reason). */}
        {isGuitar && (
          <span className="compose-smooth-toggle-row">
            <button
              type="button"
              className={'compose-smooth-toggle' + (smoothMode ? ' active' : '')}
              aria-pressed={smoothMode}
              onClick={() => setSmoothMode((v) => !v)}
            >
              {t('compose.smooth')}
            </button>
            <InfoTooltip text={t('compose.smoothTooltip')} label={t('compose.smoothTooltipLabel')} />
          </span>
        )}
        {/* Piano's equivalent of guitar's Smooth above — same idea (an
            overlay that picks each chord's voicing to minimize movement
            from the previous one), different engine (inversion choice
            instead of fretboard shape). Doesn't erase any chord's manually
            set inversion underneath — see App.jsx's activePianoInversion. */}
        {!isGuitar && (
          <span className="compose-smooth-toggle-row">
            <button
              type="button"
              className={'compose-smooth-toggle' + (pianoSmoothMode ? ' active' : '')}
              aria-pressed={pianoSmoothMode}
              onClick={() => setPianoSmoothMode((v) => !v)}
            >
              {t('compose.smooth')}
            </button>
            <InfoTooltip text={t('compose.pianoSmoothTooltip')} label={t('compose.smoothTooltipLabel')} />
          </span>
        )}
      </div>

      {smoothMode && isGuitar && (
        <p className="compose-smooth-hint" dir="auto">
          {t('compose.smoothHint')}
        </p>
      )}

      {showHeatMap && <HeatMapLegend />}

      {/* Piano-only: the literal "C - E - G" style readout the inversion
          picker's spec asked for — guitar has no equivalent concept (a
          fretboard shape doesn't reorder which tone is lowest the way a
          keyboard voicing does). */}
      {!isGuitar && pianoChordToneSummary && <p className="compose-piano-inversion-summary">{pianoChordToneSummary}</p>}

      <PlaybackControls autoPlay={autoPlay} onToggleAutoPlay={setAutoPlay} onPlay={handlePlay} disabled={!currentPosition} />

      {isGuitar && isValid && hasPositions && (
        <PositionControls
          currentIndex={currentIndex}
          positions={positions}
          chordColor={chordColor}
          onNext={() => stepPosition(1)}
          onBack={() => stepPosition(-1)}
          onSelect={(index) => selectPosition(activeIndex, index)}
        />
      )}

      {/* Piano's equivalent of PositionControls above — same spot, same
          shape, same styling, per explicit request. Inversion is piano's
          "which voicing am I looking at" choice, exactly parallel to
          position on guitar. */}
      {/* Stays interactive during Smooth, same as guitar's PositionControls —
          Smooth only overlays what's DISPLAYED (see App.jsx's
          activePianoInversion); the manual per-chord pick underneath still
          takes effect immediately if Smooth is turned back off, and chord 0's
          own pick is what Smooth anchors its whole sequence to. */}
      {!isGuitar && isValid && (
        <PianoInversionControls
          inversion={activePianoInversion}
          setInversion={(key) => selectChordInversion(activeIndex, key)}
          chordColor={chordColor}
        />
      )}

      {isGuitar && isValid && !hasPositions && (
        <p className="no-positions" dir="auto">
          {t('compose.noPositions')}
        </p>
      )}

      {isGuitar && isValid && mode === 'triad' && bassNotInTriad && (
        <p className="no-positions" dir="auto">
          {t('compose.bassNotInTriad')}
        </p>
      )}

      <InsightsPanel
        scaleAnalysis={scaleAnalysis}
        emphasizeMood={emphasizeMood}
        progression={progression}
        roadmap={roadmap}
        tension={tension}
        clickedNote={clickedNote}
        landingNotes={landingNotes}
        nextChordText={nextChordText}
        voiceLeadingMessage={voiceLeadingMessage}
        activeChordText={isValid ? activeChordText : ''}
      />
    </div>
  );
}
