import { ExerciseDrawer } from '../ExerciseDrawer/ExerciseDrawer';
import { PracticeDrillPanel } from '../PracticeDrillPanel/PracticeDrillPanel';
import { EarTrainingModal } from '../EarTrainingModal/EarTrainingModal';
import { LickTrainer } from '../LickTrainer/LickTrainer';
import { RhythmGamePanel } from '../RhythmGamePanel/RhythmGamePanel';
import { BendingPracticePanel } from '../BendingPracticePanel/BendingPracticePanel';
import { SoloOpenerPanel } from '../SoloOpenerPanel/SoloOpenerPanel';
import { PianoPracticePanel } from '../PianoPracticePanel/PianoPracticePanel';
import { FallingNotesPanel } from '../FallingNotesPanel/FallingNotesPanel';
import { ChordRhythmPanel } from '../ChordRhythmPanel/ChordRhythmPanel';
import { GuitarChordRhythmPanel } from '../GuitarChordRhythmPanel/GuitarChordRhythmPanel';
import { ScalePracticePanel } from '../ScalePracticePanel/ScalePracticePanel';
import { MinuteChanges } from '../MinuteChanges/MinuteChanges';
import { useInstrument } from '../../instruments/useInstrument';
import { supportsInstrument } from '../../instruments/featureCapabilities';
import { useLanguage } from '../../i18n/LanguageContext';
import { PracticeHome, BackButton } from './PracticeHome';
import { itemFor, rememberPracticeTab } from './practiceLibrary';
import { useEffect } from 'react';
import './PracticeView.css';

// `feature` is the featureCapabilities.js key gating this tab (null = works
// on every instrument, e.g. Ear Training) — used to hide tabs that don't
// apply at all to the current instrument instead of showing them and then
// blocking their content behind a "not available" message.
const TABS = [
  { key: 'drills', labelKey: 'practice.tab.drills', feature: 'drills' },
  { key: 'ear-training', labelKey: 'practice.tab.earTraining', feature: null },
  { key: 'trainer', labelKey: 'practice.tab.trainer', feature: 'pitchTrainer' },
  { key: 'rhythm', labelKey: 'practice.tab.rhythm', feature: 'rhythmGame' },
  { key: 'bending', labelKey: 'practice.tab.bending', feature: 'bendingTraining' },
  { key: 'soloOpener', labelKey: 'practice.tab.soloOpener', feature: 'soloOpener' },
  { key: 'piano', labelKey: 'practice.tab.piano', feature: 'pianoPractice' },
  { key: 'fallingNotes', labelKey: 'practice.tab.fallingNotes', feature: 'fallingNotes' },
  { key: 'chordRhythm', labelKey: 'practice.tab.chordRhythm', feature: 'chordRhythm' },
  { key: 'guitarChordRhythm', labelKey: 'practice.tab.guitarChordRhythm', feature: 'guitarChordRhythm' },
  { key: 'minuteChanges', labelKey: 'minute.tab', feature: 'minuteChanges' },
  { key: 'scalePractice', labelKey: 'practice.tab.scalePractice', feature: 'scalePractice' },
];

// Skill-building tools. The Metronome used to have its own tab here, but
// it's now global chrome (see MetronomeBar, always visible in the Stage
// above every section) — Practice is just Drills and Ear Training now. Both
// render inline (variant='inline') instead of as a drawer/modal, and both
// feed the shared Stage Fretboard via App.jsx's stageFretboardProps
// resolver rather than owning their own Fretboard instance.
export function PracticeView({
  drill,
  earTraining,
  rhythmGame,
  bending,
  soloOpener,
  pianoPractice,
  fallingNotes,
  chordRhythm,
  guitarChordRhythm,
  scalePractice,
  scalePracticeSeed,
  minuteSeed,
  onScalePracticeSeedConsumed,
  scalePracticeLabelMode,
  onScalePracticeLabelModeChange,
  metronome,
  activeTab,
  onTabChange,
  lickTrainer,
  onSetLevel,
}) {
  const { t, lang } = useLanguage();
  const { instrument } = useInstrument();
  const visibleTabs = TABS.filter((tab) => !tab.feature || supportsInstrument(tab.feature, instrument));

  const dir = lang === 'he' ? 'rtl' : 'ltr';
  // 'home' = the library (the root of Practice, stage 4 of the redesign).
  const atHome = activeTab === 'home' || !visibleTabs.some((tab) => tab.key === activeTab);
  useEffect(() => {
    if (!atHome) rememberPracticeTab(activeTab);
  }, [activeTab, atHome]);

  if (atHome) {
    return (
      <div className="practice-view">
        <PracticeHome onOpen={onTabChange} onSetLevel={onSetLevel} />
      </div>
    );
  }

  const item = itemFor(activeTab);
  return (
    <div className="practice-view is-detail" dir={dir}>
      {/* iOS: a back button to the library; tapping the Practice tab again does the same. */}
      {activeTab !== 'trainer' && (
      <div className="practice-detail-head" dir={dir}>
        <BackButton label={t('ph.back')} onClick={() => onTabChange('home')} />
        {/* One header for every exercise (flow review 2026-11-06): the name
            it has in the list + its one-line description. The tools' own
            titles are hidden here (PracticeHome.css). */}
        {item && <h1 className="ph-detail-title">{t(`ph.ex.${item.tab}.title`)}</h1>}
        {item && <p className="subtitle ph-detail-sub">{t(`ph.ex.${item.tab}.desc`)}</p>}
      </div>
      )}

      {activeTab === 'drills' && (
        <div className="practice-drills">
          <ExerciseDrawer variant="inline" onLoadExercise={(ex) => drill.loadExercise(ex, 'drills')} />
          <PracticeDrillPanel drill={drill} />
        </div>
      )}

      {activeTab === 'ear-training' && <EarTrainingModal earTraining={earTraining} onClose={earTraining.exit} variant="inline" />}

      {/* The Lick Trainer draws its own header (genres -> licks -> player). */}
      {activeTab === 'trainer' && <LickTrainer trainer={lickTrainer} onExit={() => onTabChange('home')} />}

      {activeTab === 'rhythm' && <RhythmGamePanel rhythmGame={rhythmGame} metronome={metronome} />}

      {activeTab === 'bending' && <BendingPracticePanel bending={bending} />}

      {activeTab === 'soloOpener' && <SoloOpenerPanel soloOpener={soloOpener} metronome={metronome} />}

      {activeTab === 'piano' && <PianoPracticePanel pianoPractice={pianoPractice} />}

      {activeTab === 'fallingNotes' && <FallingNotesPanel fallingNotes={fallingNotes} metronome={metronome} />}

      {activeTab === 'chordRhythm' && <ChordRhythmPanel chordRhythm={chordRhythm} metronome={metronome} />}

      {activeTab === 'guitarChordRhythm' && <GuitarChordRhythmPanel guitarChordRhythm={guitarChordRhythm} metronome={metronome} />}

      {activeTab === 'minuteChanges' && (
        <MinuteChanges key={minuteSeed?.n ?? 'free'} initialChords={minuteSeed?.chords} />
      )}

      {activeTab === 'scalePractice' && (
        <ScalePracticePanel
          scalePractice={scalePractice}
          seed={scalePracticeSeed}
          onSeedConsumed={onScalePracticeSeedConsumed}
          labelMode={scalePracticeLabelMode}
          onLabelModeChange={onScalePracticeLabelModeChange}
          metronome={metronome}
        />
      )}
    </div>
  );
}
