import { useEffect, useMemo, useState } from 'react';
import { SettingsPanel } from './components/SettingsPanel/SettingsPanel';
import { AppShell } from './components/AppShell/AppShell';
import { Stage } from './components/Stage/Stage';
import { MetronomeBar } from './components/MetronomeBar/MetronomeBar';
import { ComposeView } from './components/ComposeView/ComposeView';
import { ImproviseView } from './components/ImproviseView/ImproviseView';
import { PracticeView } from './components/PracticeView/PracticeView';
import { StudiesSection } from './components/StudiesSection/StudiesSection';
import { SongsView } from './components/SongsView/SongsView';
import { VocalTrainingView } from './components/VocalTrainingView/VocalTrainingView';
import { NoteColorLegend } from './components/NoteColorLegend/NoteColorLegend';
import { parseChordSymbol, capitalizeChordRoot, normalizeAmbiguousMinorM } from './music/chordSymbolParser';
import { computeChordPositions } from './music/computeChordPositions';
import { findClosestPositionIndex } from './music/matchPosition';
import { developMotif } from './music/motifDevelopment';
import { buildPhrase, flattenPhrase, buildCallAndResponse } from './music/phraseBuilder';
import { buildPositionRoadmap } from './music/positionRoadmap';
import { analyzeSolo } from './music/soloCoach';
import { computeLandingNotes, voiceLeadingHint } from './music/voiceLeading';
import { computeVoiceLeadingSequence } from './music/triadVoiceLeading';
import { computePianoVoiceLeadingSequence } from './music/pianoVoiceLeading';
import { soundingChordText, soundingKeyName, applyCapoToPosition, applyCapoToNotes, MAX_CAPO_FRET } from './music/capo';
import { transposeChordText } from './music/transpose';
import { analyzeScale, guessTonicPitchClass } from './music/scaleAnalyzer';
import { computeHeatMapNotes } from './music/heatMap';
import { computeTension } from './music/tensionMeter';
import { emotionProfile } from './music/emotionEngine';
import { colorForChord, colorForNextChord } from './styles/colors';
import { playPosition } from './audio/chordPlayer';
import { playLick } from './audio/lickPlayer';
import { playPianoNote, playPianoChord } from './audio/pianoPlayer';
import { computePianoChordTones } from './music/pianoChordTones';
import { computePianoScaleTones } from './music/pianoScaleTones';
import { CHORD_INVERSIONS, DEFAULT_INVERSION, applyInversion, inversionSummary } from './music/pianoInversions';
import { applyTwoHandVoicing } from './music/pianoTwoHand';
import { noteNameForMidi } from './music/earTraining';
import { useInstrument } from './instruments/useInstrument';
import { supportsInstrument } from './instruments/featureCapabilities';
import { useTheme } from './hooks/useTheme';
import { useAudioSettings } from './hooks/useAudioSettings';
import { useMetronome } from './hooks/useMetronome';
import { useDrumEngine } from './hooks/useDrumEngine';
import { usePracticeDrill } from './hooks/usePracticeDrill';
import { usePracticeHistory } from './hooks/usePracticeHistory';
import { useEarTraining } from './hooks/useEarTraining';
import { useRhythmGame } from './hooks/useRhythmGame';
import { useBendingTraining } from './hooks/useBendingTraining';
import { useSoloOpener } from './hooks/useSoloOpener';
import { usePianoPractice } from './hooks/usePianoPractice';
import { useFallingNotes } from './hooks/useFallingNotes';
import { useChordRhythm } from './hooks/useChordRhythm';
import { useGuitarChordRhythm } from './hooks/useGuitarChordRhythm';
import { useCagedProgress } from './hooks/useCagedProgress';
import { useScalesProgress } from './hooks/useScalesProgress';
import { useScalesLesson } from './hooks/useScalesLesson';
import { useCircleOfFifthsProgress } from './hooks/useCircleOfFifthsProgress';
import { useCircleOfFifthsLesson } from './hooks/useCircleOfFifthsLesson';
import { useHarmonyProgress } from './hooks/useHarmonyProgress';
import { useHarmonyLesson } from './hooks/useHarmonyLesson';
import { useChordsByEarProgress } from './hooks/useChordsByEarProgress';
import { useChordsByEarLesson } from './hooks/useChordsByEarLesson';
import { usePianoCurriculumProgress } from './hooks/usePianoCurriculumProgress';
import { usePianoCurriculumLesson } from './hooks/usePianoCurriculumLesson';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useGlobalShortcutListener } from './hooks/useGlobalShortcutListener';
import { CAGED_LESSONS, CAGED_REFERENCE_CHORD, resolveCagedStageProps } from './music/cagedCurriculum';
import { SCALES_LESSONS, resolveScaleStageProps } from './music/scalesCurriculum';
import { CIRCLE_LESSONS, keyByPosition, resolveCircleStageProps } from './music/circleOfFifthsCurriculum';
import { HARMONY_LESSONS, resolveHarmonyStageProps } from './music/harmonyCurriculum';
import { CHORDS_BY_EAR_LESSONS, resolveChordsByEarStageProps } from './music/chordsByEarCurriculum';
import { PIANO_LESSONS } from './music/pianoCurriculum';
import { mod, STANDARD_TUNING } from './music/notes';
import { TECHNIQUE_MASTERS_EXERCISES } from './music/techniqueMastersCurriculum';
import { useTechniqueVisualizer } from './hooks/useTechniqueVisualizer';
import { DRILLS } from './music/drills';
import { fivePositionWindows } from './music/scaleShapes';
import './App.css';

function App() {
  const { theme, setTheme } = useTheme();
  const { guitarProfile, setGuitarProfile, pianoProfile, setPianoProfile, pianoVolume, setPianoVolume } = useAudioSettings();
  const { instrument } = useInstrument();
  // The 3 top-level destinations (Compose/Improvise/Practice) — see
  // components/AppShell for the nav shell that drives this.
  const [activeSection, setActiveSection] = useState('compose');
  // Songs -> Video's currently-playing chord (from its own tapped-along
  // timeline, see hooks/useSongChordTimeline.js) — lifted here the same way
  // practiceTab is, so the shared Stage Fretboard/piano below can highlight
  // its voicing live while a play-along video plays.
  const [songActiveChord, setSongActiveChord] = useState(null);
  // Lifted out of PracticeView (rather than owned as local state there) so
  // the shared Stage's fretboard-content resolver below knows whether
  // Practice is currently showing Drills or Ear Training.
  const [practiceTab, setPracticeTab] = useState('drills');
  // Lifted the same way as practiceTab — the Studies -> CAGED course's
  // active lesson decides what the shared Stage Fretboard shows.
  const [studiesLessonId, setStudiesLessonId] = useState(CAGED_LESSONS[0].id);
  const cagedProgress = useCagedProgress();
  // Studies now holds two independent courses (CAGED + Scales) — which one
  // is showing, plus the Scales course's own lesson/key/position state and
  // progress, all lifted here the same way so the shared Stage resolver
  // below can read them.
  const [studiesCourse, setStudiesCourse] = useState('caged');
  const scalesProgress = useScalesProgress();
  const scalesLesson = useScalesLesson(SCALES_LESSONS);
  // Studies' 4th course — Circle of Fifths — same lifted lesson/progress
  // pattern as Scales above.
  const circleProgress = useCircleOfFifthsProgress();
  const circleLesson = useCircleOfFifthsLesson(CIRCLE_LESSONS);
  // Studies' 5th course — Harmony & Chord Theory — same lifted pattern.
  const harmonyProgress = useHarmonyProgress();
  const harmonyLesson = useHarmonyLesson(HARMONY_LESSONS);
  // Studies' 6th course — Chords by Ear — same lifted pattern.
  const chordsByEarProgress = useChordsByEarProgress();
  const chordsByEarLesson = useChordsByEarLesson(CHORDS_BY_EAR_LESSONS);
  const pianoCurriculumProgress = usePianoCurriculumProgress();
  const pianoLesson = usePianoCurriculumLesson(PIANO_LESSONS);
  // Switching instrument can make the currently-selected section/tab/course
  // guitar-only (or, in principle, piano-only) — e.g. Practice's "Drills"
  // tab while on Piano. Rather than land on a hidden tab and show nothing
  // (its own button no longer even renders, per AppShell/PracticeView/
  // StudiesSection's own capability filtering below), fall back to the
  // first tab/course/section that IS supported the moment that happens.
  useEffect(() => {
    if (!supportsInstrument('improvise', instrument) && activeSection === 'improvise') {
      setActiveSection('compose');
    }
  }, [instrument, activeSection]);
  useEffect(() => {
    const practiceFeatureByTab = {
      drills: 'drills',
      trainer: 'pitchTrainer',
      rhythm: 'rhythmGame',
      bending: 'bendingTraining',
      soloOpener: 'soloOpener',
      piano: 'pianoPractice',
      fallingNotes: 'fallingNotes',
      chordRhythm: 'chordRhythm',
      guitarChordRhythm: 'guitarChordRhythm',
      scalePractice: 'scalePractice',
    };
    const feature = practiceFeatureByTab[practiceTab];
    if (feature && !supportsInstrument(feature, instrument)) {
      setPracticeTab(instrument === 'piano' ? 'piano' : 'drills');
    }
  }, [instrument, practiceTab]);
  useEffect(() => {
    const studiesFeatureByCourse = { caged: 'caged', techniqueMasters: 'techniqueMasters', pianoCurriculum: 'pianoCurriculum' };
    const feature = studiesFeatureByCourse[studiesCourse];
    if (feature && !supportsInstrument(feature, instrument)) {
      setStudiesCourse('scales');
    }
  }, [instrument, studiesCourse]);
  // User-configurable keyboard shortcuts (Settings -> Keyboard Shortcuts) —
  // one shared instance so the Settings UI and the actual global key
  // listener (wired near the bottom of this component, once every handler
  // it dispatches to actually exists) stay in sync.
  const shortcuts = useKeyboardShortcuts();
  // Studies -> Technique & Guitar Masters' "Visualize" state (which exercise,
  // if any, and its animation step) — see hooks/useTechniqueVisualizer.js.
  const techniqueVisualizer = useTechniqueVisualizer();
  // Lifted here (rather than owned privately inside Metronome.jsx) so the
  // Practice Drill engine can start/stop this exact metronome instance and
  // read its live bpm/ticks — see hooks/usePracticeDrill.js.
  const metronome = useMetronome();
  const drums = useDrumEngine({
    bpm: metronome.bpm,
    beatsPerMeasure: metronome.beatsPerMeasure,
    isRunning: metronome.isRunning,
    // The single Volume fader/Mute button in the Metronome panel is a
    // master control over both the click and the drum machine, not just
    // the click — so the drum mixer's own per-instrument levels are scaled
    // by it too.
    masterVolume: metronome.isMuted ? 0 : metronome.volume / 100,
  });
  const practiceHistory = usePracticeHistory();
  const drill = usePracticeDrill(metronome, practiceHistory.logSession);
  const earTraining = useEarTraining();
  const rhythmGame = useRhythmGame(metronome);
  // Scale Practice reuses the EXACT same generic engine as Rhythm Practice
  // above (a second independent instance — same reasoning as this app's
  // other same-hook-twice cases: fully self-contained, no state to share)
  // fed a different content generator (music/scalePracticeContent.js)
  // instead of the Exercise Drawer's chord/lick catalog.
  const scalePractice = useRhythmGame(metronome);
  const bending = useBendingTraining();
  const soloOpener = useSoloOpener(metronome);
  const pianoPractice = usePianoPractice();
  const fallingNotes = useFallingNotes();
  const chordRhythm = useChordRhythm(metronome);
  const guitarChordRhythm = useGuitarChordRhythm(metronome);

  // Every practicable item across Practice -> Drills, Studies -> CAGED
  // workout, and Studies -> Scales practice, tagged the same way loadExercise
  // calls already tag their sessions (context) — this is the "catalog"
  // usePracticeHistory.recommendedExercise() picks from, built once here
  // rather than having that hook import every content file itself.
  const practiceCatalog = useMemo(
    () => [
      ...DRILLS.map((d) => ({ id: d.id, context: 'drills', title: d.title, exercise: d })),
      ...CAGED_LESSONS.filter((l) => l.kind === 'exercise').map((l) => ({ id: l.id, context: 'caged', title: l.title })),
      ...SCALES_LESSONS.filter((l) => l.kind === 'scale').map((l) => ({ id: l.id, context: 'scales', title: l.title })),
      ...CIRCLE_LESSONS.filter((l) => l.kind === 'exercise').map((l) => ({ id: l.id, context: 'circleOfFifths', title: l.title })),
    ],
    []
  );

  // The Practice Dashboard's "Recommended" tile — for a Drill this can load
  // straight into the shared drill engine; CAGED/Scales recommendations
  // instead navigate to that lesson in Studies (each course owns its own
  // practice flow from there).
  function handleSelectRecommendation(item) {
    if (item.context === 'drills' && item.exercise) {
      drill.loadExercise(item.exercise, 'drills');
      setPracticeTab('drills');
      setActiveSection('practice');
    } else if (item.context === 'caged') {
      setStudiesCourse('caged');
      setStudiesLessonId(item.id);
      setActiveSection('studies');
    } else if (item.context === 'scales') {
      setStudiesCourse('scales');
      scalesLesson.setLessonId(item.id);
      setActiveSection('studies');
    } else if (item.context === 'circleOfFifths') {
      setStudiesCourse('circleOfFifths');
      circleLesson.setLessonId(item.id);
      setActiveSection('studies');
    }
  }

  // "Leaves the exercise" also covers switching away from Practice/Studies
  // entirely while a drill is actively playing — auto-pause rather than
  // letting it keep ticking/clicking somewhere the user can't see it.
  useEffect(() => {
    if (drill.isPlaying && activeSection !== 'practice' && activeSection !== 'studies') {
      drill.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // Same safety for Rhythm Practice (Practice-only, not shared with
  // Studies) — leaving the section mid-session must not leave the mic open
  // or the metronome ticking somewhere the user can't see it.
  useEffect(() => {
    if (rhythmGame.isPlaying && activeSection !== 'practice') {
      rhythmGame.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // And within Practice itself — switching away from the Rhythm tab (e.g.
  // to Drills or Ear Training) should stop an in-progress session too.
  useEffect(() => {
    if (rhythmGame.isPlaying && practiceTab !== 'rhythm') {
      rhythmGame.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceTab]);

  // Same mic-session safety for String Bending — leaving Practice, or
  // switching to a different Practice tab, must not leave the mic open
  // somewhere the player can't see it.
  useEffect(() => {
    if (bending.isListening && activeSection !== 'practice') {
      bending.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  useEffect(() => {
    if (bending.isListening && practiceTab !== 'bending') {
      bending.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceTab]);

  // Falling Notes runs its own requestAnimationFrame loop and (optionally)
  // a live Web MIDI listener while a song is playing — leaving Practice, or
  // switching to a different Practice tab, must stop the clock rather than
  // let it keep scoring/animating somewhere the player can't see it.
  useEffect(() => {
    if (fallingNotes.isPlaying && activeSection !== 'practice') {
      fallingNotes.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  useEffect(() => {
    if (fallingNotes.isPlaying && practiceTab !== 'fallingNotes') {
      fallingNotes.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceTab]);

  // Chord Rhythm drives the shared metronome — leaving Practice, or
  // switching to a different Practice tab, must stop it the same way
  // Falling Notes/Rhythm Game/Bending above already do, rather than let it
  // keep advancing/judging chords with no visible target keyboard.
  useEffect(() => {
    if (chordRhythm.isPlaying && activeSection !== 'practice') {
      chordRhythm.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  useEffect(() => {
    if (chordRhythm.isPlaying && practiceTab !== 'chordRhythm') {
      chordRhythm.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceTab]);

  // Guitar Chord Rhythm also drives the shared metronome (plus the mic) —
  // same "leaving Practice/switching tabs stops it" rule as Chord Rhythm
  // above, doubly important here since it also has an open mic stream to
  // tear down.
  useEffect(() => {
    if (guitarChordRhythm.isPlaying && activeSection !== 'practice') {
      guitarChordRhythm.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  useEffect(() => {
    if (guitarChordRhythm.isPlaying && practiceTab !== 'guitarChordRhythm') {
      guitarChordRhythm.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceTab]);

  // Same mic-session safety for Scale Practice as Rhythm Practice above
  // (its own independent useRhythmGame instance, its own mic stream).
  useEffect(() => {
    if (scalePractice.isPlaying && activeSection !== 'practice') {
      scalePractice.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  useEffect(() => {
    if (scalePractice.isPlaying && practiceTab !== 'scalePractice') {
      scalePractice.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceTab]);

  // Solo Opener also drives the shared metronome — same "leaving
  // Practice/switching tabs stops it" rule as Chord Rhythm above.
  useEffect(() => {
    if (soloOpener.isPlaying && activeSection !== 'practice') {
      soloOpener.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  useEffect(() => {
    if (soloOpener.isPlaying && practiceTab !== 'soloOpener') {
      soloOpener.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceTab]);

  // Silences the plain click (without touching the user's own click
  // volume/mute — see useMetronome's setSilenced comment) whenever either:
  // Drum Machine-only sound source is active, or a Practice Drill's Live
  // Playback is in "Hear It" mode. The drill still drives its stepping off
  // this exact metronome instance either way (see usePracticeDrill.js's
  // header comment) — silencing only zeroes the click's own audio output,
  // the scheduler/currentBeat/tempo keep running so playback timing and
  // note audio (playNote, triggered per beat when hearAudio is on) stay
  // exactly in sync. Combined into one derived boolean since setSilenced is
  // a plain overwrite, not additive — either source turning its own
  // condition off must not un-silence a click the other source still wants
  // muted. Requires drill.exercise too: exit()/loadExercise() don't reset
  // mode/hearAudio, so without this a drill exited while in Live+Hear mode
  // would leave the standalone Metronome (and every other view) silenced
  // with no exercise loaded and no way to tell why.
  const drillHearSilencesClick = !!drill.exercise && drill.mode === 'live' && drill.hearAudio;
  useEffect(() => {
    metronome.setSilenced(drums.clickSilenced || drillHearSilencesClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drums.clickSilenced, drillHearSilencesClick]);
  const [progressionText, setProgressionText] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [mode, setMode] = useState('chord');
  const [labelMode, setLabelMode] = useState('note');
  const [autoPlay, setAutoPlay] = useState(false);
  // One position index per progression slot, so each chord remembers its
  // own shape instead of resetting to Open whenever you switch away from it.
  const [positionIndexByChord, setPositionIndexByChord] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState('slash');
  const [emotionKey, setEmotionKey] = useState(null);
  const [lick, setLick] = useState(null);
  const [lickTempo, setLickTempo] = useState(1); // 0.5x/0.75x/1x playback speed multiplier, Lick Library only
  const [motifKind, setMotifKind] = useState('original');
  const [playingNoteOrder, setPlayingNoteOrder] = useState(null);
  const [phrase, setPhrase] = useState(null);
  const [phrasePlayingOrder, setPhrasePlayingOrder] = useState(null);
  const [callResponse, setCallResponse] = useState(null);
  const [crPlaying, setCrPlaying] = useState(null);
  const [soloFeedback, setSoloFeedback] = useState(null);
  const [colorMode, setColorMode] = useState('chord');
  // One inversion per progression slot (piano's equivalent of
  // positionIndexByChord below), so setting an inversion for one chord
  // never touches any other chord's own choice — unlike guitar's
  // selectPosition, which deliberately re-arranges every other chord for
  // comfort/melodic matching, piano inversion is a pure per-chord pick
  // with no cross-chord side effect, per explicit request. Every chord
  // defaults to root position until the player picks otherwise.
  const [pianoInversionByChord, setPianoInversionByChord] = useState([]);
  const [twoHandView, setTwoHandView] = useState(false);
  const [showHeatMap, setShowHeatMap] = useState(false);
  // Compose -> Smooth: triad voice-leading overlay (guitar only — see
  // music/triadVoiceLeading.js). Off by default so it never changes what
  // Compose shows unless explicitly turned on.
  const [smoothMode, setSmoothMode] = useState(false);
  // Piano's own Smooth — same idea, different engine (pianoVoiceLeading.js):
  // overlays a per-chord inversion choice on TOP of pianoInversionByChord's
  // manual picks (which stay intact underneath, exactly like guitar's own
  // Smooth doesn't erase positionIndexByChord), picked to minimize how far
  // the chord tones move from one chord to the next.
  const [pianoSmoothMode, setPianoSmoothMode] = useState(false);
  // Compose -> Capo: which fret a capo sits on (0 = none). The chords typed
  // in the progression field always represent the shape being fingered, not
  // the sounding pitch — see music/capo.js's soundingChordText for how the
  // actual sounding chord is derived from this.
  const [capoFret, setCapoFret] = useState(0);
  // Compose -> Training handoff: captured progression "groups" (each one a
  // snapshot of progressionText + every chord's resolved fretboard voicing +
  // the mode/capo that produced it), built up one at a time by re-using the
  // SAME progression editor already on screen rather than a parallel
  // per-group editor UI — see buildCurrentTrainingGroup below. Sent as a
  // whole to Practice -> Chord Changes (useGuitarChordRhythm's
  // loadGroupsFromCompose) once the player is done adding groups.
  const [trainingGroups, setTrainingGroups] = useState([]);
  const [trainingFlowOpen, setTrainingFlowOpen] = useState(false);
  const [clickedNote, setClickedNote] = useState(null);
  // The last note clicked anywhere on the neck — the Voice Leading Assistant's
  // idea of "where the player currently is," since the app has no other
  // note-level cursor concept.
  const [lastPlayedNote, setLastPlayedNote] = useState(null);

  // "C G Am F" -> [{ text: 'C', parsed: {...} }, { text: 'G', parsed: {...} }, ...]
  // parsed is null for a token that isn't a recognized chord, so it still
  // shows up as a chip (visibly invalid) without breaking navigation between
  // the valid ones around it.
  const progression = useMemo(() => {
    return progressionText
      .split(/\s+/)
      .map((text) => text.trim())
      .filter((text) => text.length > 0)
      // Root letter always displayed uppercase (Em, not em) — normalized
      // here, at the one place progression tokens are built, so every
      // consumer (chord chips, the fretboard's position roadmap, lick/phrase
      // labels, etc.) inherits it automatically instead of each needing its
      // own fix. Quality suffix (m, maj7, dim, sus4, ...) is untouched — see
      // capitalizeChordRoot.
      .map((text) => capitalizeChordRoot(text))
      // "AM" always means minor here, not major — see
      // normalizeAmbiguousMinorM's own comment for why — so it's rewritten
      // to the unambiguous "Am" before it's ever displayed, not just before
      // parsing.
      .map((text) => normalizeAmbiguousMinorM(text))
      .map((text) => ({ text, parsed: parseChordSymbol(text) }));
  }, [progressionText]);

  // Detected parent key + suggested solo scales for the whole progression —
  // see music/scaleAnalyzer.js. Recomputes (and so "updates automatically")
  // whenever the progression itself changes.
  const scaleAnalysis = useMemo(() => analyzeScale(progression), [progression]);

  // Compose -> Capo: what the typed shapes actually sound like with the
  // capo on — null with no capo, so ComposeView can skip the extra line
  // entirely rather than show a redundant "sounds as: <same text>".
  const soundingProgressionText = useMemo(() => {
    if (!capoFret || progression.length === 0) return null;
    return progression.map((chord) => soundingChordText(chord.text, capoFret)).join(' ');
  }, [progression, capoFret]);

  // The key the progression actually sounds in with the capo on — derived
  // from the same scaleAnalysis every other key display already uses, just
  // transposed by capoFret, so it never disagrees with scaleAnalysis.key
  // (the fingered-shape key already shown next to Transpose).
  const soundingKey = capoFret ? soundingKeyName(scaleAnalysis?.key, capoFret) : null;

  // Every progression chord's playable positions, computed up front (not
  // just the active one) so a position choice on one chord can be compared
  // against every other chord's own positions for fret-proximity syncing.
  const chordPositionsList = useMemo(
    () => progression.map((chord) => computeChordPositions(chord.text, mode)),
    [progression, mode]
  );

  // Compose -> Smooth: one greedily-chosen triad shape per chord, each
  // picked to keep as many fingers stationary as possible versus the
  // previous chord's own chosen shape (see music/triadVoiceLeading.js).
  // Only computed while the mode is actually on — this is guitar-specific
  // and otherwise unused.
  //
  // Anchored on whatever position the player has manually picked for the
  // first chord via the normal (non-Smooth) Position Controls
  // (positionIndexByChord[0] — same state selectPosition/stepPosition
  // already write to), so moving that first chord's shape up/down the neck
  // moves the whole Smooth sequence with it instead of the sequence always
  // restarting from its own independent default.
  const voiceLeadingAnchor = chordPositionsList[0]?.positions[positionIndexByChord[0] ?? 0] ?? null;
  const voiceLeadingSequence = useMemo(
    () => (smoothMode ? computeVoiceLeadingSequence(progression, voiceLeadingAnchor) : []),
    [smoothMode, progression, voiceLeadingAnchor]
  );

  // The active chord's chosen shape, flattened into the fretted-string list
  // Fretboard's voiceLeadingNotes prop expects, with each note tagged pivot
  // (gold, unchanged from the previous chord) vs. moving (accent blue).
  const voiceLeadingNotes = useMemo(() => {
    const entry = voiceLeadingSequence[activeIndex];
    if (!entry) return [];
    return entry.position.strings
      .map((s, i) =>
        s.fret !== null
          ? { string: i, fret: s.fret, label: s.label, finger: entry.fingers[i], isPivot: entry.pivotMask[i] }
          : null
      )
      .filter(Boolean);
  }, [voiceLeadingSequence, activeIndex]);

  // Recommended left-hand movement across the whole progression (one step
  // per chord, using each chord's actual synced position) — see
  // music/positionRoadmap.js.
  const roadmap = useMemo(
    () => buildPositionRoadmap({ progression, chordPositionsList, positionIndexByChord }),
    [progression, chordPositionsList, positionIndexByChord]
  );

  // Keep activeIndex in range when the progression shrinks (e.g. deleting chords).
  useEffect(() => {
    if (activeIndex >= progression.length) {
      setActiveIndex(Math.max(0, progression.length - 1));
    }
  }, [progression.length, activeIndex]);

  // Keep positionIndexByChord the same length as the progression, clamping
  // any stored index that no longer fits (e.g. mode switched to triad and
  // that chord now has a different number of positions).
  useEffect(() => {
    setPositionIndexByChord((prev) =>
      progression.map((_, i) => {
        const maxIndex = Math.max(0, (chordPositionsList[i]?.positions.length ?? 1) - 1);
        return Math.min(prev[i] ?? 0, maxIndex);
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progression.length, mode]);

  // Keep pianoInversionByChord the same length as the progression — new
  // slots default to root position, same "root unless you say otherwise"
  // rule every chord already gets. Unlike positionIndexByChord above, there's
  // no clamping needed: every chord always has exactly the same 3 inversion
  // options (root/1st/2nd), regardless of quality or mode.
  useEffect(() => {
    setPianoInversionByChord((prev) => progression.map((_, i) => prev[i] ?? DEFAULT_INVERSION));
  }, [progression.length]);

  // Selecting a position for one chord also "arranges" every other chord in
  // the progression: each one snaps to whichever of its own positions best
  // matches by a combination of physical comfort (fret distance, staying on
  // the same strings) and melodic smoothness (how far the top note moves) —
  // see music/matchPosition.js. Fret distance alone isn't enough: two
  // positions can share a fret number while using completely different
  // strings, which is a hand jump, not a comfortable match.
  function selectPosition(chordIndex, positionIndex) {
    const targetPosition = chordPositionsList[chordIndex]?.positions[positionIndex];
    if (!targetPosition) return;

    setPositionIndexByChord(() =>
      chordPositionsList.map((cp, i) => {
        if (i === chordIndex) return positionIndex;
        if (cp.positions.length === 0) return 0;
        return findClosestPositionIndex(cp.positions, targetPosition);
      })
    );
  }

  function stepPosition(direction) {
    const cp = chordPositionsList[activeIndex];
    if (!cp || cp.positions.length === 0) return;
    const current = positionIndexByChord[activeIndex] ?? 0;
    const next = (current + direction + cp.positions.length) % cp.positions.length;
    selectPosition(activeIndex, next);
  }

  // Piano's equivalent of selectPosition — deliberately NOT like guitar's
  // own version: sets ONLY the given chord's inversion, with no
  // cross-chord re-arranging. Each chord's inversion is an independent
  // choice (default root position) unless Smooth mode overlays its own
  // computed choice on top for display — see pianoDisplayInversionByChord
  // below.
  function selectChordInversion(chordIndex, inversionKey) {
    setPianoInversionByChord((prev) => prev.map((key, i) => (i === chordIndex ? inversionKey : key ?? DEFAULT_INVERSION)));
  }

  // Piano's equivalent of stepPosition above — same shared ArrowUp/ArrowDown
  // shortcut, see shortcutActions.js's own comment on why this is one
  // action rather than two. Steps the ACTIVE chord's own inversion only.
  function stepInversion(direction) {
    const keys = CHORD_INVERSIONS.map((inv) => inv.key);
    const current = keys.indexOf(pianoInversionByChord[activeIndex] ?? DEFAULT_INVERSION);
    const next = (current + direction + keys.length) % keys.length;
    selectChordInversion(activeIndex, keys[next]);
  }

  const activeChordText = progression[activeIndex]?.text ?? '';
  const activeChordPositions = chordPositionsList[activeIndex] ?? { isValid: false, positions: [], bassNotInTriad: false };
  const { isValid, positions, bassNotInTriad } = activeChordPositions;
  const hasPositions = positions.length > 0;
  const currentIndex = Math.min(positionIndexByChord[activeIndex] ?? 0, Math.max(0, positions.length - 1));
  const currentPosition = hasPositions ? positions[currentIndex] : null;

  const chordColor = colorForChord(activeChordText);

  // Wraps around at the end, same as handleNextChord below — on the last
  // chord, "next" is the progression looping back to the first chord, not
  // nothing. Only meaningful with 2+ chords (a single chord has no "next").
  const nextIndex = progression.length > 1 ? (activeIndex + 1) % progression.length : null;
  const nextChordText = nextIndex !== null ? progression[nextIndex]?.text ?? null : null;
  // The actual position the next chord will show once you navigate to it —
  // same positionIndexByChord/chordPositionsList the comfort+melodic sync
  // (matchPosition.js) already keeps in agreement with the active chord, so
  // landing notes and the voice-leading hint always match what Next-chord
  // navigation is about to display, instead of guessing independently.
  const nextPositionList = nextIndex !== null ? chordPositionsList[nextIndex]?.positions ?? [] : [];
  const nextPosition = nextIndex !== null ? nextPositionList[positionIndexByChord[nextIndex] ?? 0] ?? null : null;

  // The next chord's own root/3rd/5th (and bass) — see music/voiceLeading.js.
  const landingNotes = useMemo(() => {
    if (!nextPosition) return [];
    return computeLandingNotes(nextPosition);
  }, [nextPosition]);

  const voiceLeadingMessage = useMemo(() => {
    if (!nextPosition || !lastPlayedNote) return null;
    return voiceLeadingHint(nextPosition, lastPlayedNote);
  }, [nextPosition, lastPlayedNote]);

  function handleNoteClick(info) {
    setClickedNote(info);
    setLastPlayedNote({ string: info.string, fret: info.fret });
  }

  // Heat Map and Tension Meter both need "what key are we in" for the
  // active chord — the whole-progression scaleAnalysis when there's one,
  // otherwise a single-chord best guess (see scaleAnalyzer.js).
  const activeParsed = progression[activeIndex]?.parsed ?? null;

  // Compose -> Smooth (piano): one greedily-chosen inversion per chord,
  // each picked to minimize how far the chord tones move versus the
  // previous chord's own chosen voicing (see music/pianoVoiceLeading.js —
  // the piano analogue of voiceLeadingSequence above). Anchored on
  // whatever inversion the player has manually picked for the first chord
  // via the normal (non-Smooth) Inversion Controls, same rationale as
  // guitar's own anchor.
  const pianoVoiceLeadingSequence = useMemo(
    () => (pianoSmoothMode ? computePianoVoiceLeadingSequence(progression, pianoInversionByChord[0] ?? DEFAULT_INVERSION) : []),
    [pianoSmoothMode, progression, pianoInversionByChord]
  );

  // What inversion the ACTIVE chord actually displays as — Smooth's
  // computed pick when it's on, otherwise exactly whatever was manually
  // set for that one chord (defaulting to root), never anything borrowed
  // from another chord's own setting.
  const activePianoInversion = pianoSmoothMode
    ? pianoVoiceLeadingSequence[activeIndex]?.inversionKey ?? DEFAULT_INVERSION
    : pianoInversionByChord[activeIndex] ?? DEFAULT_INVERSION;

  // Root position by default; the Inversion Controls (piano only) rotate
  // which tone sits lowest, per chord. Computed once and reused by both
  // the Stage display and the two playback call sites below, so what's
  // shown/highlighted always matches what's actually heard — inverting the
  // display without inverting playback would be a silent (pun intended)
  // inconsistency.
  const pianoChordTones = useMemo(() => {
    if (!activeParsed) return [];
    const inverted = applyInversion(computePianoChordTones(activeParsed), activePianoInversion);
    return twoHandView ? applyTwoHandVoicing(inverted) : inverted;
  }, [activeParsed, activePianoInversion, twoHandView]);
  const pianoChordToneSummary = pianoChordTones.length > 0 ? inversionSummary(pianoChordTones, noteNameForMidi) : '';
  const heatMapTonicPitchClass = scaleAnalysis
    ? scaleAnalysis.tonicPitchClass
    : activeParsed
      ? guessTonicPitchClass(activeParsed.root.pitchClass, activeParsed.qualityKey)
      : null;

  // Notes of the detected scale (and passing/avoid tones) near the current
  // shape — chord tones themselves are skipped here since the normal
  // fretboard dots already show those; see music/heatMap.js.
  const heatMapNotes = useMemo(() => {
    if (!showHeatMap || !activeParsed || !currentPosition) return [];
    const frets = currentPosition.strings.filter((s) => s.fret !== null && s.fret !== 0).map((s) => s.fret);
    const fretStart = frets.length > 0 ? Math.min(...frets) - 2 : 0;
    const fretEnd = frets.length > 0 ? Math.max(...frets) + 2 : 4;
    return computeHeatMapNotes({
      rootPitchClass: activeParsed.root.pitchClass,
      qualityKey: activeParsed.qualityKey,
      tonicPitchClass: heatMapTonicPitchClass,
      fretStart,
      fretEnd,
    }).filter((n) => n.tier !== 'chord');
  }, [showHeatMap, activeParsed, currentPosition, heatMapTonicPitchClass]);

  const tension = useMemo(() => {
    if (!activeParsed) return null;
    return computeTension({
      chordRootPitchClass: activeParsed.root.pitchClass,
      tonicPitchClass: heatMapTonicPitchClass,
      lastPlayedNoteRole: clickedNote?.role ?? null,
    });
  }, [activeParsed, heatMapTonicPitchClass, clickedNote]);

  // A stable fingerprint of what's currently on the neck, so auto-play only
  // fires when the actual note pattern changes (not on every keystroke while
  // typing, since parsing re-runs then too).
  const fretKey = currentPosition
    ? currentPosition.strings.map((s) => (s.fret === null ? 'x' : s.fret)).join('-')
    : null;

  useEffect(() => {
    if (!autoPlay) return;
    if (instrument === 'piano') {
      if (activeParsed) playPianoChord(pianoChordTones.map((n) => n.midi));
      return;
    }
    if (currentPosition) playPosition(currentPosition.strings, capoFret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fretKey, autoPlay, instrument, pianoChordTones, capoFret]);

  // A lick is anchored to the currently shown shape (via position.baseFret) —
  // once that shape changes, the old lick's markers would no longer line up
  // with what's on screen, so clear it rather than show something stale.
  // Call & Response is anchored the same way, so it clears here too.
  useEffect(() => {
    setLick(null);
    setMotifKind('original');
    setPlayingNoteOrder(null);
    setCallResponse(null);
    setCrPlaying(null);
    setSoloFeedback(null);
  }, [fretKey, activeChordText]);

  // A built phrase spans the whole progression (one bar per chord), so it
  // goes stale when the progression itself changes, not just the active
  // chord — cleared separately from the lick/call-response above.
  useEffect(() => {
    setPhrase(null);
    setPhrasePlayingOrder(null);
    setSoloFeedback(null);
  }, [progressionText]);

  // The lick actually shown/played — either exactly as generated, or one of
  // Motif Development's algorithmic transforms of it (switchable instantly,
  // no regeneration needed). See music/motifDevelopment.js.
  const displayedLick = useMemo(() => {
    if (!lick || motifKind === 'original') return lick;
    return { ...lick, notes: developMotif(motifKind, lick.notes, lick.chordSymbol) };
  }, [lick, motifKind]);

  function handlePlay() {
    if (instrument === 'piano') {
      if (activeParsed) playPianoChord(pianoChordTones.map((n) => n.midi));
      return;
    }
    if (currentPosition) playPosition(currentPosition.strings, capoFret);
  }

  // Loads a curated Lick Library entry (music/lickLibrary.js) as the active
  // lick — replaces the old random generateLick() call, but the lick still
  // flows through the exact same displayedLick/Motif Development/Solo Coach
  // machinery below, since a library entry has the same {notes, chordSymbol,
  // ...} shape a generated one did.
  function handleSelectLibraryLick(entry) {
    setLick(entry);
    setMotifKind('original');
    setSoloFeedback(null);
    // A previously-built phrase otherwise permanently outranks any lick
    // selected afterward (soloCoachSubject always prefers a phrase when one
    // exists) — clearing it here means Solo Coach follows whichever you
    // picked most recently, matching what you'd actually expect to see.
    setPhrase(null);
    setPhrasePlayingOrder(null);
  }

  function handlePlayLick() {
    if (!displayedLick) return;
    // Tempo scales note duration, not pitch — a higher multiplier (faster)
    // means shorter durations, hence the inverse.
    const notes = displayedLick.notes.map((n) => ({ ...n, durationMultiplier: (n.durationMultiplier ?? 1) / lickTempo }));
    playLick(notes, {
      onNoteStart: (note) => setPlayingNoteOrder(note.order),
      onDone: () => setPlayingNoteOrder(null),
    });
  }

  const flatPhraseNotes = useMemo(() => (phrase ? flattenPhrase(phrase) : []), [phrase]);

  // Solo Coach analyzes whichever generated solo is available — a built
  // Phrase Builder phrase preferred (it's the fullest "solo," and the only
  // one with real bar-to-bar position data for the "stayed in one position
  // too long" check), falling back to a plain generated lick.
  const soloCoachSubject = phrase
    ? { notes: flatPhraseNotes, roadmap, label: 'the built phrase' }
    : displayedLick
      ? { notes: displayedLick.notes, roadmap: null, label: `the ${activeChordText} lick` }
      : null;

  function handleAnalyzeSolo() {
    if (!soloCoachSubject) return;
    setSoloFeedback(analyzeSolo({ notes: soloCoachSubject.notes, roadmap: soloCoachSubject.roadmap }));
  }

  // Whatever's actually sounding right now takes over the fretboard overlay
  // — a playing phrase bar, or a playing call/response side — falling back
  // to the regular generated lick the rest of the time. Reuses the exact
  // same lick-marker rendering and "now playing" ring Fretboard already has;
  // notes carry their own real string/fret, so they don't depend on
  // whichever chord happens to be "active."
  const isPhrasePlaying = phrase && phrasePlayingOrder !== null;
  const isCallResponsePlaying = callResponse && crPlaying !== null;
  const fretboardLick = isPhrasePlaying
    ? { notes: flatPhraseNotes }
    : isCallResponsePlaying
      ? { notes: crPlaying.which === 'call' ? callResponse.call.notes : callResponse.response.notes }
      : displayedLick;
  const fretboardPlayingOrder = isPhrasePlaying ? phrasePlayingOrder : isCallResponsePlaying ? crPlaying.order : playingNoteOrder;

  function handleArtistChange(artistKey) {
    setSelectedArtist(artistKey);
    setLick(null);
    setMotifKind('original');
    setPlayingNoteOrder(null);
    setSoloFeedback(null);
  }

  function handleEmotionChange(key) {
    setEmotionKey(key);
    setLick(null);
    setMotifKind('original');
    setPlayingNoteOrder(null);
    setPhrase(null);
    setCallResponse(null);
    setSoloFeedback(null);
  }

  function handleMotifChange(kind) {
    setMotifKind(kind);
    setPlayingNoteOrder(null);
  }

  function handleBuildPhrase() {
    setPhrase(buildPhrase({ artistKey: selectedArtist, progression, chordPositionsList, positionIndexByChord, emotionKey }));
    setPhrasePlayingOrder(null);
    setSoloFeedback(null);
  }

  function handlePlayPhrase() {
    if (!phrase) return;
    playLick(flattenPhrase(phrase), {
      onNoteStart: (note) => setPhrasePlayingOrder(note.order),
      onDone: () => setPhrasePlayingOrder(null),
    });
  }

  function handleBuildCallResponse() {
    if (!currentPosition) return;
    setCallResponse(
      buildCallAndResponse({ artistKey: selectedArtist, chordSymbol: activeChordText, position: currentPosition, emotionKey })
    );
    setCrPlaying(null);
  }

  function handlePlayCall() {
    if (!callResponse) return;
    playLick(callResponse.call.notes, {
      onNoteStart: (note) => setCrPlaying({ which: 'call', order: note.order }),
      onDone: () => setCrPlaying(null),
    });
  }

  function handlePlayResponse() {
    if (!callResponse) return;
    playLick(callResponse.response.notes, {
      onNoteStart: (note) => setCrPlaying({ which: 'response', order: note.order }),
      onDone: () => setCrPlaying(null),
    });
  }

  function handlePlayCallAndResponse() {
    if (!callResponse) return;
    const callLength = callResponse.call.notes.length;
    const combined = [...callResponse.call.notes, ...callResponse.response.notes].map((n, i) => ({ ...n, order: i + 1 }));
    playLick(combined, {
      onNoteStart: (note) =>
        setCrPlaying(
          note.order <= callLength
            ? { which: 'call', order: note.order }
            : { which: 'response', order: note.order - callLength }
        ),
      onDone: () => setCrPlaying(null),
    });
  }

  // Static Overview shows the whole exercise at once (start note
  // emphasized); Live Playback shows only current/next/one-past around the
  // active step — see components/Fretboard/Fretboard.jsx for tier styling.
  const drillNotes = useMemo(() => {
    if (!drill.exercise) return [];
    const { sequence } = drill.exercise;
    // 1-based position in the exercise's own play order — attached
    // regardless of labelMode so Fretboard can show it on demand (see
    // usePracticeDrill's noteLabelMode) without needing the whole sequence
    // separately.
    if (drill.mode === 'static') {
      return sequence.map((s, i) => ({ ...s, order: i + 1, tier: i === 0 ? 'start' : 'all' }));
    }
    const notes = [];
    const current = sequence[drill.stepIndex];
    if (current) notes.push({ ...current, order: drill.stepIndex + 1, tier: 'current' });
    const nextIndex = (drill.stepIndex + 1) % sequence.length;
    if (nextIndex !== drill.stepIndex) notes.push({ ...sequence[nextIndex], order: nextIndex + 1, tier: 'next' });
    const prevIndex = (drill.stepIndex - 1 + sequence.length) % sequence.length;
    if (prevIndex !== drill.stepIndex && prevIndex !== nextIndex) notes.push({ ...sequence[prevIndex], order: prevIndex + 1, tier: 'past' });
    return notes;
  }, [drill.exercise, drill.mode, drill.stepIndex]);

  // Piano's equivalent of drillNotes above — same tiered {order, tier}
  // entries, just each {string, fret} converted to a MIDI note via the
  // string's own open pitch (same math as chordsByEar.js's midiForCell).
  // Reuses drillNotes directly rather than recomputing from drill.exercise
  // a second time, so this and the Fretboard's own drill display can never
  // drift out of sync with each other. This is what lets a Scales/Circle of
  // Fifths practice drill (loaded via the Studies course's own "Load
  // Practice" button, not gated to guitar-only) actually show current/
  // next/past note highlighting on the piano keyboard — previously that
  // case rendered a blank keyboard (see stagePianoProps below).
  const pianoDrillNotes = useMemo(
    () =>
      drillNotes
        .filter((n) => n.string != null && n.fret != null)
        .map((n) => ({ midi: STANDARD_TUNING[n.string].baseMidi + n.fret, order: n.order, tier: n.tier })),
    [drillNotes]
  );

  // Rhythm Practice's own current/next/past highlighting — same shape and
  // DRILL_TIER_STYLE tiers as drillNotes above, computed separately since
  // it's driven by useRhythmGame's own stepIndex rather than usePracticeDrill's.
  // stepIndex starts at -1 (nothing played yet), so nothing renders until
  // the first beat of a session.
  const rhythmGameDrillNotes = useMemo(() => {
    if (!rhythmGame.exercise || rhythmGame.stepIndex < 0) return [];
    const { sequence } = rhythmGame.exercise;
    const notes = [];
    const current = sequence[rhythmGame.stepIndex];
    if (current) notes.push({ ...current, order: rhythmGame.stepIndex + 1, tier: 'current' });
    const nextIndex = rhythmGame.stepIndex + 1;
    if (nextIndex < sequence.length) notes.push({ ...sequence[nextIndex], order: nextIndex + 1, tier: 'next' });
    const prevIndex = rhythmGame.stepIndex - 1;
    if (prevIndex >= 0) notes.push({ ...sequence[prevIndex], order: prevIndex + 1, tier: 'past' });
    return notes;
  }, [rhythmGame.exercise, rhythmGame.stepIndex]);

  // Scale Practice's own current/next/past highlighting — identical shape,
  // driven by its own independent useRhythmGame instance's stepIndex.
  const scalePracticeDrillNotes = useMemo(() => {
    if (!scalePractice.exercise || scalePractice.stepIndex < 0) return [];
    const { sequence } = scalePractice.exercise;
    const notes = [];
    const current = sequence[scalePractice.stepIndex];
    if (current) notes.push({ ...current, order: scalePractice.stepIndex + 1, tier: 'current' });
    const nextIndex = scalePractice.stepIndex + 1;
    if (nextIndex < sequence.length) notes.push({ ...sequence[nextIndex], order: nextIndex + 1, tier: 'next' });
    const prevIndex = scalePractice.stepIndex - 1;
    if (prevIndex >= 0) notes.push({ ...sequence[prevIndex], order: prevIndex + 1, tier: 'past' });
    return notes;
  }, [scalePractice.exercise, scalePractice.stepIndex]);

  // C major reference positions for the Studies -> CAGED course — cheap to
  // recompute per render, same as every other derived value here.
  const cagedPositions = computeChordPositions(CAGED_REFERENCE_CHORD, 'chord').positions;
  const activeCagedLesson = CAGED_LESSONS.find((l) => l.id === studiesLessonId) ?? CAGED_LESSONS[0];

  // Studies -> Scales: same idea, resolved from the Scales course's own
  // lifted lesson/key/position state.
  const activeScaleLesson = SCALES_LESSONS.find((l) => l.id === scalesLesson.lessonId) ?? SCALES_LESSONS[0];
  const scalePositions = activeScaleLesson.hasPositions ? fivePositionWindows(scalesLesson.rootPitchClass) : [];
  const activeScalePosition = scalePositions[scalesLesson.positionIndex] ?? null;

  // Studies -> Circle of Fifths: the selected key's tonic-chord positions,
  // only actually computed when the active lesson needs a chord shape (same
  // guard style as songChordPositions below) — cheap either way, but no
  // reason to run the chord engine on lessons that never look at it.
  const activeCircleLesson = CIRCLE_LESSONS.find((l) => l.id === circleLesson.lessonId) ?? CIRCLE_LESSONS[0];
  const selectedCircleKey = keyByPosition(circleLesson.keyPosition);
  const circleTonicPositions =
    activeCircleLesson.fretboard?.type === 'chord' ? computeChordPositions(selectedCircleKey.majorName, 'chord').positions : null;

  // Studies -> Harmony & Chord Theory: every demo widget (chord toggle,
  // diatonic table, progression row, inversion picker) reduces to one
  // "currently previewed chord" string, lifted in useHarmonyLesson.js — only
  // run the chord engine when there's actually something to preview.
  const harmonyTonicPositions = harmonyLesson.previewChordText
    ? computeChordPositions(harmonyLesson.previewChordText, 'chord').positions
    : null;

  // Studies -> Chords by Ear: same "every demo/drill reduces to one
  // currently-previewed chord" role as harmonyTonicPositions above.
  const chordsByEarTonicPositions = chordsByEarLesson.previewChordText
    ? computeChordPositions(chordsByEarLesson.previewChordText, 'chord').positions
    : null;

  // What the one shared Stage Fretboard currently shows — resolved from
  // activeSection (+ practiceTab, for Practice) against values already
  // computed above for Compose/Improvise, or from the Drill/Ear Training
  // state for Practice. Compose and Improvise intentionally share the same
  // chord/lick/insight overlay: Improvise's generated licks/phrases/call &
  // response already flow into `fretboardLick`/`fretboardPlayingOrder`
  // above regardless of which section is showing them.
  // Plain object construction, not an expensive computation — no useMemo
  // needed, and every value on the right is already cheap to read.
  const visualizedTechniqueExercise = TECHNIQUE_MASTERS_EXERCISES.find((e) => e.id === techniqueVisualizer.exerciseId) ?? null;

  // Songs -> Video's active chord, resolved to an actual playable position
  // the same way Compose resolves its own currentPosition — just always the
  // first/simplest voicing (positions[0]) rather than a user-navigable one,
  // since there's no position-picker UI for a chord that's changing on its
  // own as the video plays.
  const songChordPositions = songActiveChord ? computeChordPositions(songActiveChord, 'chord') : null;
  const songCurrentPosition = songChordPositions?.positions?.[0] ?? null;

  const stageFretboardProps =
    activeSection === 'practice'
      ? practiceTab === 'ear-training'
        ? {
            position: null,
            quizCells: earTraining.quizCells,
            quizRevealCells: earTraining.quizRevealCells,
            quizFeedbackCell: earTraining.feedback?.cell ? earTraining.feedback : null,
            onQuizCellClick: earTraining.handleFretClick,
          }
        : practiceTab === 'trainer'
        ? { position: null }
        : practiceTab === 'rhythm'
        ? {
            position: null,
            drillNotes: rhythmGameDrillNotes,
            labelMode: 'note',
            quizFeedbackCell: rhythmGame.feedbackCell,
          }
        : practiceTab === 'scalePractice'
        ? {
            position: null,
            drillNotes: scalePracticeDrillNotes,
            labelMode: 'note',
            quizFeedbackCell: scalePractice.feedbackCell,
          }
        : practiceTab === 'bending'
        ? {
            position: null,
            // Solid start dot -> line -> outlined target ring, reusing the
            // same Slide visual Studies -> Technique Masters already draws
            // (see Fretboard.jsx's actionOverlay handling) rather than
            // inventing a second "two markers, styled differently" renderer.
            actionOverlay: [
              {
                step: 0,
                string: bending.step.stringNumber,
                fret: bending.step.startFret,
                targetFret: bending.step.targetFret,
                action: 'Slide',
                label: bending.step.startNoteName,
              },
            ],
            activeOverlayStep: null,
          }
        : { position: null, drillNotes, labelMode: drill.noteLabelMode }
      : activeSection === 'studies'
      ? studiesCourse === 'scales'
        ? drill.exercise
          ? { position: null, drillNotes, labelMode: drill.noteLabelMode }
          : resolveScaleStageProps(activeScaleLesson, scalesLesson.rootPitchClass, scalesLesson.labelMode, activeScalePosition)
        : studiesCourse === 'techniqueMasters'
        ? visualizedTechniqueExercise
          ? {
              position: null,
              actionOverlay: visualizedTechniqueExercise.fretboardMapping.positions,
              activeOverlayStep: techniqueVisualizer.isPlaying ? techniqueVisualizer.activeStep : null,
            }
          : { position: null }
        : studiesCourse === 'circleOfFifths'
        ? drill.exercise
          ? { position: null, drillNotes, labelMode: drill.noteLabelMode }
          : resolveCircleStageProps(activeCircleLesson, selectedCircleKey, circleLesson.labelMode, circleTonicPositions)
        : studiesCourse === 'harmony'
        ? resolveHarmonyStageProps(harmonyLesson.previewChordText, harmonyTonicPositions)
        : studiesCourse === 'chordsByEar'
        ? resolveChordsByEarStageProps(
            chordsByEarLesson.previewChordText,
            chordsByEarTonicPositions,
            chordsByEarLesson.previewScaleContext,
            chordsByEarLesson.previewPosition
          )
        : studiesCourse === 'pianoCurriculum'
        ? { position: null } // piano-only course; guitar mode can never actually select it (gated in StudiesSection)
        : activeCagedLesson.kind === 'exercise'
        ? { position: null, drillNotes, labelMode: drill.noteLabelMode }
        : resolveCagedStageProps(activeCagedLesson, cagedPositions)
      : activeSection === 'songs'
      ? {
          position: songCurrentPosition,
          chordColor: songActiveChord ? colorForChord(songActiveChord) : undefined,
          labelMode: 'note',
        }
      : {
          // Smooth replaces the normal chord-tone dots with its own overlay
          // (below) rather than layering both — showing the same notes
          // twice, once per system, reads as visual noise, not extra info.
          //
          // Everything below runs through applyCapoToPosition/
          // applyCapoToNotes right before it's handed to the Fretboard —
          // currentPosition/landingNotes/voiceLeadingNotes themselves (and
          // every hook/effect that produced them: matchPosition sync, the
          // roadmap, Smooth's own greedy sequence) stay on the real,
          // capo-agnostic shape throughout; only what's actually drawn gets
          // shifted, since a capo changes where your fingers physically land
          // (frets behind it become unreachable, "open" strings now ring at
          // the capo itself), not which shape you're fingering.
          position: smoothMode ? null : applyCapoToPosition(currentPosition, capoFret),
          chordColor,
          labelMode,
          lick: fretboardLick,
          playingNoteOrder: fretboardPlayingOrder,
          colorMode,
          onNoteClick: handleNoteClick,
          landingNotes: applyCapoToNotes(landingNotes, capoFret),
          landingNotesColor: nextChordText ? colorForNextChord(nextChordText, chordColor) : undefined,
          heatMapNotes,
          roadmap,
          voiceLeadingNotes: smoothMode ? applyCapoToNotes(voiceLeadingNotes, capoFret) : [],
          capoFret,
        };

  // Piano's equivalent of stageFretboardProps above — same branching
  // structure, resolved from the same state, but through the piano-specific
  // (much simpler, no fret-fitting) tone helpers. Guitar-only branches
  // (Drills, CAGED) resolve to an empty display here; their UI is already
  // hidden by InstrumentGate in Piano mode, so nothing ever tries to show
  // that empty state to a user.
  // Sound profile (acoustic/electric/organ/synth) is spread onto every
  // branch below via the trailing `pianoProfile`/`onPianoProfileChange`
  // — the on-keyboard sound selector panel is a fixed, always-visible part
  // of PianoKeyboard itself (not tied to whichever section/lesson is
  // active), so it always needs these two regardless of which branch's
  // notes/labelMode/etc. is in play.
  const stagePianoPropsBase =
    activeSection === 'practice'
      ? practiceTab === 'ear-training'
        ? {
            notes: [],
            quizKeys: earTraining.quizPianoKeys,
            quizRevealKeys: earTraining.quizRevealPianoKeys,
            quizFeedbackKey:
              earTraining.feedback?.cell?.midi != null
                ? { midi: earTraining.feedback.cell.midi, correct: earTraining.feedback.correct }
                : null,
            onQuizKeyClick: earTraining.handlePianoKeyClick,
          }
        : practiceTab === 'chordRhythm'
        ? {
            notes: [],
            quizKeys: chordRhythm.quizKeys,
            quizFeedbackKeys: chordRhythm.quizFeedbackKeys,
            onQuizKeyClick: chordRhythm.onQuizKeyClick,
          }
        : { notes: [] }
      : activeSection === 'studies'
      ? studiesCourse === 'scales'
        ? drill.exercise
          ? { notes: [], drillNotes: pianoDrillNotes }
          : { notes: computePianoScaleTones(scalesLesson.rootPitchClass, activeScaleLesson.scaleKey), labelMode: scalesLesson.labelMode }
        : studiesCourse === 'circleOfFifths'
        ? drill.exercise
          ? { notes: [], drillNotes: pianoDrillNotes }
          : activeCircleLesson.fretboard?.type === 'scale'
          ? {
              notes: computePianoScaleTones(
                activeCircleLesson.fretboard.relative ? mod(selectedCircleKey.pitchClass + 9, 12) : selectedCircleKey.pitchClass,
                activeCircleLesson.fretboard.family
              ),
              labelMode: circleLesson.labelMode,
            }
          : activeCircleLesson.fretboard?.type === 'interval'
          ? {
              // Both ends of the interval get colored (not just the root) —
              // this demo's whole point is showing the 2-note relationship,
              // not picking out one note as more important than the other.
              notes: [
                { midi: 60 + selectedCircleKey.pitchClass, isRoot: true },
                { midi: 60 + selectedCircleKey.pitchClass + 7, isRoot: true },
              ],
              labelMode: 'note',
            }
          : { notes: [] }
        : studiesCourse === 'harmony'
        ? harmonyLesson.previewChordText
          ? {
              notes: applyInversion(computePianoChordTones(parseChordSymbol(harmonyLesson.previewChordText)), harmonyLesson.inversionKey),
              labelMode: 'note',
            }
          : { notes: [] }
        : studiesCourse === 'chordsByEar'
        ? chordsByEarLesson.previewScaleContext
          ? { notes: computePianoScaleTones(chordsByEarLesson.previewScaleContext.rootPitchClass, 'major'), labelMode: 'note' }
          : chordsByEarLesson.previewChordText
          ? { notes: computePianoChordTones(parseChordSymbol(chordsByEarLesson.previewChordText)), labelMode: 'note' }
          : { notes: [] }
        : studiesCourse === 'pianoCurriculum'
        ? {
            notes: pianoLesson.previewNotes,
            fingerNumbers: pianoLesson.previewFingers,
            quizFeedbackKey: pianoLesson.quizFeedbackKey,
            labelMode: 'note',
            // PianoKeyboard already plays the note itself after calling
            // onNoteClick (see its own handleKeyClick) — this just routes
            // the click to whichever demo/quiz currently owns it.
            onNoteClick: (midi) => pianoLesson.onKeyClick?.(midi),
          }
        : { notes: [] }
      : activeSection === 'songs'
      ? {
          notes: songChordPositions?.parsed ? computePianoChordTones(songChordPositions.parsed) : [],
          chordColor: songActiveChord ? colorForChord(songActiveChord) : undefined,
          labelMode: 'note',
          onNoteClick: (midi) => playPianoNote(midi),
        }
      : {
          notes: pianoChordTones,
          chordColor,
          colorMode,
          labelMode,
          onNoteClick: (midi) => playPianoNote(midi),
        };

  const stagePianoProps = {
    ...stagePianoPropsBase,
    pianoProfile,
    onPianoProfileChange: setPianoProfile,
    pianoVolume,
    onPianoVolumeChange: setPianoVolume,
    // Slim subset of the metronome hook's full surface (see
    // hooks/useMetronome.js) — just enough for the on-keyboard panel's
    // Play/Pause + BPM ± buttons, which are a second, always-visible way
    // to reach the exact same metronome state/engine MetronomeBar already
    // controls (same isRunning/toggle/bpm/setBpm), not a separate one.
    metronomeIsRunning: metronome.isRunning,
    onMetronomeToggle: metronome.toggle,
    metronomeBpm: metronome.bpm,
    onMetronomeBpmChange: metronome.setBpm,
  };

  function handlePrevChord() {
    setActiveIndex((i) => (i - 1 + progression.length) % progression.length);
  }

  function handleNextChord() {
    setActiveIndex((i) => (i + 1) % progression.length);
  }

  // Compose -> Transpose: actually rewrites the typed progression by a half
  // step (fitting a song to a singer's actual range), unlike Capo above
  // which never changes what's typed. Rewrites from `progression`'s already
  //-normalized `.text` (capitalized, ambiguous-M-resolved — see the
  // progression useMemo) rather than raw progressionText, so transposing
  // never re-introduces a form normalizeAmbiguousMinorM already cleaned up.
  function transposeProgression(semitones) {
    if (progression.length === 0) return;
    setProgressionText(progression.map((chord) => transposeChordText(chord.text, semitones)).join(' '));
  }

  // Capo field's "N-" shorthand: rewrites the typed progression down N
  // semitones (same transposeProgression a manual Transpose − click would
  // do) instead of setting an actual capo, then clears the field — see
  // CapoInput.jsx's own comment for the use case this serves.
  function handleCancelCapo(n) {
    transposeProgression(-n);
    setCapoFret(0);
  }

  // Snapshots the CURRENT Compose progression — every valid chord's own
  // resolved voicing (whichever position the player actually picked, or
  // Smooth's own greedily-chosen shape if that's on) — into one "training
  // group" object. Pure/no side effects; callers decide what to do with the
  // result (push it onto trainingGroups, or send it straight to Practice).
  // Raw (capo-unaware) voicings + the capoFret that produced them are kept
  // together, exactly like Compose's own Fretboard rendering does — see
  // App.jsx's stageFretboardProps resolver applying applyCapoToPosition at
  // DISPLAY time, never baked into stored state.
  function buildCurrentTrainingGroup() {
    const chords = progression
      .map((chord, i) => {
        if (!chord.parsed) return null;
        const voicing = smoothMode
          ? voiceLeadingSequence[i]?.position ?? null
          : chordPositionsList[i]?.positions?.[positionIndexByChord[i] ?? 0] ?? null;
        return { chordText: chord.text, rootPitchClass: chord.parsed.root.pitchClass, qualityKey: chord.parsed.qualityKey, voicing };
      })
      .filter(Boolean);
    if (chords.length === 0) return null;
    return { id: `${Date.now()}-${Math.random()}`, chordsText: progressionText, chords, capoFret };
  }

  function handleOpenTrainingFlow() {
    setTrainingFlowOpen(true);
  }

  // "+" — banks the progression on screen as its own group, then clears the
  // editor so the player builds the NEXT one (e.g. a chorus) with the exact
  // same controls, instead of a second parallel editor appearing anywhere.
  function handleAddCurrentTrainingGroup() {
    const group = buildCurrentTrainingGroup();
    if (!group) return;
    setTrainingGroups((groups) => [...groups, group]);
    setProgressionText('');
  }

  function handleRemoveTrainingGroup(id) {
    setTrainingGroups((groups) => groups.filter((g) => g.id !== id));
  }

  function handleCancelTrainingFlow() {
    setTrainingGroups([]);
    setTrainingFlowOpen(false);
  }

  // Finishes the flow: whatever's still sitting in the editor becomes the
  // LAST group (so a player who never clicks "+" and just fills in one
  // progression, then hits Send, gets exactly that one group — no separate
  // "add another?" prompt needed, the flow's own UI already offers it).
  function handleSendTrainingGroups() {
    const current = buildCurrentTrainingGroup();
    const groups = current ? [...trainingGroups, current] : trainingGroups;
    if (groups.length === 0) return;
    guitarChordRhythm.loadGroupsFromCompose(groups);
    setTrainingGroups([]);
    setTrainingFlowOpen(false);
    setPracticeTab('guitarChordRhythm');
    setActiveSection('practice');
  }

  // The live handler each configurable shortcut actually calls — a plain
  // object, rebuilt every render (cheap: just function references), so it
  // always closes over the current progression/metronome state rather than
  // a stale render's. See keyboard/shortcutActions.js for the id catalog
  // this must stay in sync with.
  useGlobalShortcutListener(shortcuts.bindings, {
    nextChord: handleNextChord,
    prevChord: handlePrevChord,
    nextPosition: () => (instrument === 'guitar' ? stepPosition(1) : stepInversion(1)),
    prevPosition: () => (instrument === 'guitar' ? stepPosition(-1) : stepInversion(-1)),
    playChord: handlePlay,
    toggleMute: metronome.toggleMute,
    volumeUp: () => metronome.setVolume(metronome.volume + 5),
    volumeDown: () => metronome.setVolume(metronome.volume - 5),
    tempoUp: () => metronome.setBpm(metronome.bpm + 5),
    tempoDown: () => metronome.setBpm(metronome.bpm - 5),
  });

  return (
    <AppShell
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      settingsSlot={
        <SettingsPanel
          theme={theme}
          onThemeChange={setTheme}
          guitarProfile={guitarProfile}
          onGuitarProfileChange={setGuitarProfile}
          pianoProfile={pianoProfile}
          onPianoProfileChange={setPianoProfile}
          shortcuts={shortcuts}
        />
      }
      metronomeSlot={<MetronomeBar metronome={metronome} drums={drums} />}
      stage={
        <Stage
          fretboardProps={stageFretboardProps}
          pianoProps={stagePianoProps}
          legendSlot={activeSection === 'compose' && colorMode === 'function' ? <NoteColorLegend /> : null}
        />
      }
    >
      {activeSection === 'compose' && (
        <ComposeView
          progressionText={progressionText}
          setProgressionText={setProgressionText}
          progression={progression}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          handlePrevChord={handlePrevChord}
          handleNextChord={handleNextChord}
          mode={mode}
          setMode={setMode}
          labelMode={labelMode}
          setLabelMode={setLabelMode}
          colorMode={colorMode}
          setColorMode={setColorMode}
          activePianoInversion={activePianoInversion}
          selectChordInversion={selectChordInversion}
          pianoSmoothMode={pianoSmoothMode}
          setPianoSmoothMode={setPianoSmoothMode}
          twoHandView={twoHandView}
          setTwoHandView={setTwoHandView}
          pianoChordToneSummary={pianoChordToneSummary}
          showHeatMap={showHeatMap}
          setShowHeatMap={setShowHeatMap}
          autoPlay={autoPlay}
          setAutoPlay={setAutoPlay}
          handlePlay={handlePlay}
          currentPosition={currentPosition}
          isValid={isValid}
          hasPositions={hasPositions}
          positions={positions}
          currentIndex={currentIndex}
          chordColor={chordColor}
          stepPosition={stepPosition}
          selectPosition={selectPosition}
          bassNotInTriad={bassNotInTriad}
          landingNotes={landingNotes}
          roadmap={roadmap}
          scaleAnalysis={scaleAnalysis}
          emphasizeMood={emotionKey ? emotionProfile(emotionKey)?.scaleMood ?? null : null}
          tension={tension}
          clickedNote={clickedNote}
          nextChordText={nextChordText}
          voiceLeadingMessage={voiceLeadingMessage}
          smoothMode={smoothMode}
          setSmoothMode={setSmoothMode}
          capoFret={capoFret}
          setCapoFret={setCapoFret}
          onCancelCapo={handleCancelCapo}
          soundingProgressionText={soundingProgressionText}
          soundingKey={soundingKey}
          onTranspose={transposeProgression}
          training={{
            groups: trainingGroups,
            flowOpen: trainingFlowOpen,
            onOpen: handleOpenTrainingFlow,
            onAddCurrent: handleAddCurrentTrainingGroup,
            onRemoveGroup: handleRemoveTrainingGroup,
            onSend: handleSendTrainingGroups,
            onCancel: handleCancelTrainingFlow,
          }}
        />
      )}

      {activeSection === 'improvise' && (
        <ImproviseView
          emotionKey={emotionKey}
          handleEmotionChange={handleEmotionChange}
          selectedArtist={selectedArtist}
          handleArtistChange={handleArtistChange}
          displayedLick={displayedLick}
          handleSelectLibraryLick={handleSelectLibraryLick}
          handlePlayLick={handlePlayLick}
          lickTempo={lickTempo}
          handleLickTempoChange={setLickTempo}
          currentPosition={currentPosition}
          motifKind={motifKind}
          handleMotifChange={handleMotifChange}
          playingNoteOrder={playingNoteOrder}
          phrase={phrase}
          flatPhraseNotes={flatPhraseNotes}
          handleBuildPhrase={handleBuildPhrase}
          handlePlayPhrase={handlePlayPhrase}
          phrasePlayingOrder={phrasePlayingOrder}
          callResponse={callResponse}
          handleBuildCallResponse={handleBuildCallResponse}
          handlePlayCall={handlePlayCall}
          handlePlayResponse={handlePlayResponse}
          handlePlayCallAndResponse={handlePlayCallAndResponse}
          crPlaying={crPlaying}
          progressionLength={progression.length}
          soloCoachSubject={soloCoachSubject}
          soloFeedback={soloFeedback}
          handleAnalyzeSolo={handleAnalyzeSolo}
        />
      )}

      {activeSection === 'practice' && (
        <PracticeView
          drill={drill}
          earTraining={earTraining}
          rhythmGame={rhythmGame}
          bending={bending}
          soloOpener={soloOpener}
          pianoPractice={pianoPractice}
          fallingNotes={fallingNotes}
          chordRhythm={chordRhythm}
          guitarChordRhythm={guitarChordRhythm}
          scalePractice={scalePractice}
          metronome={metronome}
          activeTab={practiceTab}
          onTabChange={setPracticeTab}
          practiceHistory={practiceHistory}
          practiceCatalog={practiceCatalog}
          onSelectRecommendation={handleSelectRecommendation}
        />
      )}

      {activeSection === 'studies' && (
        <StudiesSection
          course={studiesCourse}
          onCourseChange={setStudiesCourse}
          cagedLessonId={studiesLessonId}
          onSelectCagedLesson={setStudiesLessonId}
          cagedProgress={cagedProgress}
          cagedRoadmap={activeCagedLesson.kind === 'connecting' ? stageFretboardProps.roadmap : null}
          scalesLesson={scalesLesson}
          scalesProgress={scalesProgress}
          drill={drill}
          metronome={metronome}
          onOpenScaleEarTraining={() => {
            earTraining.setModeKey('scaleid');
            earTraining.start();
            setPracticeTab('ear-training');
            setActiveSection('practice');
          }}
          techniqueVisualizer={techniqueVisualizer}
          circleLesson={circleLesson}
          circleProgress={circleProgress}
          harmonyLesson={harmonyLesson}
          harmonyProgress={harmonyProgress}
          chordsByEarLesson={chordsByEarLesson}
          chordsByEarProgress={chordsByEarProgress}
          pianoLesson={pianoLesson}
          pianoCurriculumProgress={pianoCurriculumProgress}
        />
      )}

      {activeSection === 'songs' && <SongsView onSongActiveChordChange={setSongActiveChord} />}

      {activeSection === 'vocal' && <VocalTrainingView />}
    </AppShell>
  );
}

export default App;
