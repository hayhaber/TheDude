import { ScaleAnalysisPanel } from '../ScaleAnalysisPanel/ScaleAnalysisPanel';
import { PositionRoadmapPanel } from '../PositionRoadmapPanel/PositionRoadmapPanel';
import { TensionMeter } from '../TensionMeter/TensionMeter';
import { NoteInfoPanel } from '../NoteInfoPanel/NoteInfoPanel';
import { useLanguage } from '../../i18n/LanguageContext';
import './InsightsPanel.css';

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
}) {
  const { t } = useLanguage();

  return (
    <div className="insights-panel">
      <h2 className="insights-panel-title">{t('insightsPanel.title')}</h2>

      <ScaleAnalysisPanel analysis={scaleAnalysis} emphasizeMood={emphasizeMood} progression={progression} />
      <PositionRoadmapPanel roadmap={roadmap} />
      {/* position:relative anchor for .compose-now-playing below — an
          absolutely-positioned overlay contributes ZERO height to the flow,
          so TensionMeter and whatever comes right after it (NoteInfoPanel /
          the landing-notes-hint paragraph) stay exactly as adjacent as they
          were before this existed. It still scrolls together with Tension
          (same as any other absolutely-positioned child of an in-flow
          ancestor), it just no longer pushes anything else down/apart. */}
      <div className="tension-with-chord-label">
        <TensionMeter tension={tension} />
        {activeChordText && (
          <div className="compose-now-playing" dir="ltr">
            {activeChordText}
          </div>
        )}
      </div>
      <NoteInfoPanel note={clickedNote} />

      {landingNotes.length > 0 && (
        <p className="landing-notes-hint" dir="auto">
          {t('insightsPanel.landingNotes', { chord: nextChordText, notes: landingNotes.map((n) => n.label).join(', ') })}
          {voiceLeadingMessage ? ` — ${voiceLeadingMessage}` : ''}
        </p>
      )}
    </div>
  );
}
