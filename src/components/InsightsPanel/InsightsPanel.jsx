import { ScaleAnalysisPanel } from '../ScaleAnalysisPanel/ScaleAnalysisPanel';
import { PositionRoadmapPanel } from '../PositionRoadmapPanel/PositionRoadmapPanel';
import { TensionMeter } from '../TensionMeter/TensionMeter';
import { NoteInfoPanel } from '../NoteInfoPanel/NoteInfoPanel';
import { useLanguage } from '../../i18n/LanguageContext';
import './InsightsPanel.css';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';

// Pure layout wrapper — every child here is the exact same component with
// the exact same props it always had, just grouped into a side panel next
// to the fretboard instead of stacked in the main scroll above it.
export function InsightsPanel({
  scaleAnalysis,
  emphasizeMood,
  progression,
  roadmap,
  tension,
  clickedNote,
  landingNotes,
  nextChordText,
  voiceLeadingMessage,
  activeChordText,
  roadmapShapes,
  onRoadmapPick,
}) {
  const { t } = useLanguage();

  return (
    <div className="insights-panel">
      <h2 className="insights-panel-title">{t('insightsPanel.title')}</h2>

      <ScaleAnalysisPanel analysis={scaleAnalysis} emphasizeMood={emphasizeMood} progression={progression} />
      <PositionRoadmapPanel roadmap={roadmap} shapesFor={roadmapShapes} onPick={onRoadmapPick} />
      {/* the chord now playing sits in the meter's own row (v1.0.174 — it
          used to be an absolutely-positioned label laid over the meter) */}
      <TensionMeter tension={tension} chord={activeChordText} />
      <NoteInfoPanel note={clickedNote} />

      {landingNotes.length > 0 && (
        <p className="landing-notes-hint" dir="auto">
          {t('insightsPanel.landingNotes', { chord: nextChordText, notes: landingNotes.map((n) => n.label).join(', ') })}
          {voiceLeadingMessage ? ` — ${voiceLeadingMessage}` : ''}
          <InfoTooltip text={t('tip.compose.landingNotes')} />
        </p>
      )}
    </div>
  );
}
