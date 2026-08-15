import { useLanguage } from '../../i18n/LanguageContext';
import './SoloCoachPanel.css';

function scoreClass(score) {
  if (score >= 80) return 'good';
  if (score >= 55) return 'ok';
  return 'weak';
}

// Analyzes whichever generated solo is available (a built Phrase Builder
// phrase preferred, falling back to a plain generated lick) and shows
// feedback + a 1-100 score — see music/soloCoach.js. `feedback.issues` are
// fixed English strings from soloCoach.js — translated here via the
// `soloCoach.issue.*` dictionary keyed by the exact string, rather than
// changing what that pure-logic module returns.
export function SoloCoachPanel({ disabled, subjectLabel, feedback, onAnalyze }) {
  const { t } = useLanguage();

  return (
    <div className="solo-coach-panel">
      <div className="solo-coach-header">
        <h2 className="solo-coach-title">{t('soloCoach.title')}</h2>
        <button type="button" className="play-button" onClick={onAnalyze} disabled={disabled}>
          {feedback ? t('soloCoach.reanalyze') : t('soloCoach.analyze')}
        </button>
      </div>

      {!disabled && subjectLabel && <p className="solo-coach-subject">{t('soloCoach.analyzing', { subject: subjectLabel })}</p>}

      {feedback && (
        <div className="solo-coach-result">
          <div className={`solo-coach-score ${scoreClass(feedback.score)}`}>{feedback.score}</div>
          <div className="solo-coach-feedback">
            {feedback.issues.length === 0 ? (
              <p className="solo-coach-item good">{t('soloCoach.noIssues')}</p>
            ) : (
              feedback.issues.map((issue) => (
                <p key={issue} className="solo-coach-item" dir="auto">
                  {t(`soloCoach.issue.${issue}`)}
                </p>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
