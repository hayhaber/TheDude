import { computeScaleDegreeUsage } from '../../music/scaleDegreeUsage';
import { useLanguage } from '../../i18n/LanguageContext';
import './ScaleAnalysisPanel.css';

// Shows the detected parent key, its 7 scale tones (with which ones the
// current progression actually uses, and how — see below), suggested solo
// scales, and any borrowed (non-diatonic) chords for the whole typed
// progression — see music/scaleAnalyzer.js + music/scaleDegreeUsage.js.
// Renders nothing until there are 2+ valid chords (a single chord doesn't
// imply a key). `emphasizeMood` ('major' | 'minor', from the selected
// Emotion — see music/emotionEngine.js) bolds whichever already-valid
// suggested scale(s) best match that mood; major/relative-minor share the
// same notes, so this only changes emphasis, never correctness.
export function ScaleAnalysisPanel({ analysis, emphasizeMood = null, progression = [] }) {
  const { t } = useLanguage();
  if (!analysis) return null;

  const usage = computeScaleDegreeUsage(progression, analysis.tonicPitchClass, analysis.mode);

  return (
    <div className="scale-analysis-panel">
      <p className="scale-analysis-title">
        {t('scaleAnalysis.detectedKey')} <strong>{analysis.key}</strong>
      </p>

      {/* Scale-tone strip: degree number (small) above the note letter,
          Roman numeral (same size as the degree number) below it — the
          degree number is a plain ordinal ("this is the 3rd note"), the
          Roman numeral is the quality-aware harmonic label ("as a chord,
          this is iii, minor"), so the two rows carry different information
          rather than repeating each other. A colored ring marks degrees the
          current progression actually plays: green for a diatonic use,
          amber for a borrowed (mode-mixture) chord sharing that root, red
          specifically when the borrowed chord's own altered tone clashes a
          half-step against the plain diatonic chord it stands in for (see
          scaleDegreeUsage.js's hasHalfStepClash for exactly what that
          checks — there's no live melody input in this app to compare
          against directly, so this is the closest real, computable proxy).
          Borrowed roots outside the 7 diatonic tones entirely (bVI, bVII, …)
          render as extra chips appended after the 7. */}
      <div className="scale-degree-strip" dir="ltr">
        {usage.degrees.map((d) => (
          <div key={d.degree} className={'scale-degree-cell usage-' + (d.usage ?? 'none')}>
            <span className="scale-degree-number">{d.degree}</span>
            <span className="scale-degree-note-ring">{d.noteName}</span>
            <span className="scale-degree-roman">{d.roman}</span>
          </div>
        ))}
        {usage.extras.map((x) => (
          <div key={x.noteName + x.roman} className={'scale-degree-cell usage-' + x.usage}>
            <span className="scale-degree-number">♭</span>
            <span className="scale-degree-note-ring">{x.noteName}</span>
            <span className="scale-degree-roman">{x.roman}</span>
          </div>
        ))}
      </div>

      <p className="scale-analysis-scales">
        {t('scaleAnalysis.suggestedScales')}{' '}
        {analysis.suggestedScales.map((scale, i) => {
          const isMinor = scale.toLowerCase().includes('minor');
          const emphasized = emphasizeMood && (emphasizeMood === 'minor') === isMinor;
          return (
            <span key={scale} className={emphasized ? 'scale-analysis-emphasized' : undefined}>
              {scale}
              {i < analysis.suggestedScales.length - 1 ? ' · ' : ''}
            </span>
          );
        })}
      </p>
      {analysis.borrowedChords.length > 0 && (
        <p className="scale-analysis-borrowed">
          {t('scaleAnalysis.borrowedChords')}{' '}
          {analysis.borrowedChords.map((chordText, i) => (
            <span key={chordText + i} className={'scale-analysis-borrowed-chord usage-' + (usage.chordSeverity.get(chordText) ?? 'borrowed')}>
              {chordText}
              {i < analysis.borrowedChords.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
