import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import './PracticeStatsBar.css';

// Whole minutes, rounded down — a few seconds of a session showing as "0m"
// is more honest than rounding up to a minute that wasn't actually practiced.
function formatMinutes(ms) {
  return Math.floor(ms / 60000);
}

// m:ss — same compact format as PracticeDrillPanel's live timer, used here
// for the one tile ("Current session") that needs sub-minute resolution.
function formatClock(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// The Adaptive Practice Coach's first surface: a compact, at-a-glance read
// of the cross-context practice log (see hooks/usePracticeHistory.js), fed
// from the one shared usePracticeDrill instance — covers Practice -> Drills,
// Studies -> CAGED workout, and Studies -> Scales practice alike. Shown once
// here, at the top of Practice, rather than duplicated per view.
export function PracticeStatsBar({ practiceHistory, drill, catalog, onSelectRecommendation }) {
  const { t, lang } = useLanguage();
  const todayMinutes = formatMinutes(practiceHistory.todayTotalMs());
  const weekMinutes = formatMinutes(practiceHistory.weekTotalMs());
  const streak = practiceHistory.longestStreak();
  const completedToday = practiceHistory.todayCompletedCount();
  const avgMinutes = formatMinutes(practiceHistory.averageSessionMs());
  const highestBpm = practiceHistory.highestBpmToday();
  const recommended = practiceHistory.recommendedExercise(catalog);
  const currentlyPracticing = !!drill?.exercise;

  return (
    <div className="practice-stats-bar">
      <div className="practice-stat">
        <span className="practice-stat-value">{todayMinutes}m</span>
        <span className="practice-stat-label">{t('practiceStats.today')}</span>
      </div>
      <div className="practice-stat">
        <span className="practice-stat-value">{weekMinutes}m</span>
        <span className="practice-stat-label">{t('practiceStats.week')}</span>
      </div>
      <div className={'practice-stat' + (currentlyPracticing ? ' live' : '')}>
        <span className="practice-stat-value">{currentlyPracticing ? formatClock(drill.elapsedMs) : '—'}</span>
        <span className="practice-stat-label">{t('practiceStats.current')}</span>
      </div>
      <div className="practice-stat">
        <span className="practice-stat-value">{streak}</span>
        <span className="practice-stat-label">{t('practiceStats.streak')}</span>
      </div>
      <div className="practice-stat">
        <span className="practice-stat-value">{completedToday}</span>
        <span className="practice-stat-label">{t('practiceStats.completed')}</span>
      </div>
      <div className="practice-stat">
        <span className="practice-stat-value">{avgMinutes}m</span>
        <span className="practice-stat-label">{t('practiceStats.average')}</span>
      </div>
      <div className="practice-stat">
        <span className="practice-stat-value">{highestBpm ?? '—'}</span>
        <span className="practice-stat-label">{t('practiceStats.bestBpm')}</span>
      </div>
      <button
        type="button"
        className={'practice-stat practice-stat-recommend' + (recommended ? ' actionable' : '')}
        onClick={() => recommended && onSelectRecommendation?.(recommended)}
        disabled={!recommended}
      >
        <span className="practice-stat-value practice-stat-recommend-title" dir="auto">
          {recommended ? localize(recommended.title, lang) : t('practiceStats.noRecommendation')}
        </span>
        <span className="practice-stat-label">{t('practiceStats.recommended')}</span>
      </button>
    </div>
  );
}
