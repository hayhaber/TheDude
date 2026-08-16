import { ExerciseDrawer } from '../ExerciseDrawer/ExerciseDrawer';
import { PracticeDrillPanel } from '../PracticeDrillPanel/PracticeDrillPanel';
import { EarTrainingModal } from '../EarTrainingModal/EarTrainingModal';
import { PracticeStatsBar } from '../PracticeStatsBar/PracticeStatsBar';
import { GuitarPracticeTrainer } from '../GuitarPracticeTrainer/GuitarPracticeTrainer';
import { RhythmGamePanel } from '../RhythmGamePanel/RhythmGamePanel';
import { BendingPracticePanel } from '../BendingPracticePanel/BendingPracticePanel';
import { SoloOpenerPanel } from '../SoloOpenerPanel/SoloOpenerPanel';
import { PianoPracticePanel } from '../PianoPracticePanel/PianoPracticePanel';
import { FallingNotesPanel } from '../FallingNotesPanel/FallingNotesPanel';
import { ChordRhythmPanel } from '../ChordRhythmPanel/ChordRhythmPanel';
import { GuitarChordRhythmPanel } from '../GuitarChordRhythmPanel/GuitarChordRhythmPanel';
import { ScalePracticePanel } from '../ScalePracticePanel/ScalePracticePanel';
import { useInstrument } from '../../instruments/useInstrument';
import { supportsInstrument } from '../../instruments/featureCapabilities';
import { useLanguage } from '../../i18n/LanguageContext';
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
  metronome,
  activeTab,
  onTabChange,
  practiceHistory,
  practiceCatalog,
  onSelectRecommendation,
}) {
  const { t } = useLanguage();
  const { instrument } = useInstrument();
  const visibleTabs = TABS.filter((tab) => !tab.feature || supportsInstrument(tab.feature, instrument));

  return (
    <div className="practice-view">
      <div>
        <h1>{t('practice.title')}</h1>
        <p className="subtitle">{t('practice.subtitle')}</p>
      </div>

      <PracticeStatsBar
        practiceHistory={practiceHistory}
        drill={drill}
        catalog={practiceCatalog}
        onSelectRecommendation={onSelectRecommendation}
      />

      <div className="mode-toggle wrap practice-tabs" role="group" aria-label={t('practice.tabsLabel')}>
        {visibleTabs.map((tab) => (
          <button key={tab.key} type="button" className={activeTab === tab.key ? 'active' : ''} onClick={() => onTabChange(tab.key)}>
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {activeTab === 'drills' && (
        <div className="practice-drills">
          <ExerciseDrawer variant="inline" onLoadExercise={(ex) => drill.loadExercise(ex, 'drills')} />
          <PracticeDrillPanel drill={drill} />
        </div>
      )}

      {activeTab === 'ear-training' && <EarTrainingModal earTraining={earTraining} onClose={earTraining.exit} variant="inline" />}

      {activeTab === 'trainer' && <GuitarPracticeTrainer />}

      {activeTab === 'rhythm' && <RhythmGamePanel rhythmGame={rhythmGame} metronome={metronome} />}

      {activeTab === 'bending' && <BendingPracticePanel bending={bending} />}

      {activeTab === 'soloOpener' && <SoloOpenerPanel soloOpener={soloOpener} metronome={metronome} />}

      {activeTab === 'piano' && <PianoPracticePanel pianoPractice={pianoPractice} />}

      {activeTab === 'fallingNotes' && <FallingNotesPanel fallingNotes={fallingNotes} />}

      {activeTab === 'chordRhythm' && <ChordRhythmPanel chordRhythm={chordRhythm} metronome={metronome} />}

      {activeTab === 'guitarChordRhythm' && <GuitarChordRhythmPanel guitarChordRhythm={guitarChordRhythm} metronome={metronome} />}

      {activeTab === 'scalePractice' && <ScalePracticePanel scalePractice={scalePractice} metronome={metronome} />}
    </div>
  );
}
