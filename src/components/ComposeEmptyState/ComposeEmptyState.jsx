import { useLanguage } from '../../i18n/LanguageContext';
import './ComposeEmptyState.css';

// Generic starter progressions — only shown to a player with no typing
// history yet. Once there IS a recent history, "here's something you
// might not know" is less useful than "here's what you were just doing,"
// so those take over instead (see MAX_RECENT_CHIPS below).
const EXAMPLES = ['C G Am F', 'Em C G D'];
const MAX_RECENT_CHIPS = 2;

// Shown only while the chord-progression input is empty — the very first
// thing a new user sees has no obvious next step otherwise (a blank input
// with only a placeholder). For a returning player, the more useful "next
// step" isn't a generic example — it's picking back up a progression they
// typed but never saved (recent, from useSavedProgressions.js) — so those
// take priority whenever any exist, per explicit design feedback.
export function ComposeEmptyState({ onPick, recent }) {
  const { t } = useLanguage();
  const recentChips = (recent ?? []).slice(0, MAX_RECENT_CHIPS);
  const showRecent = recentChips.length > 0;

  return (
    <div className="compose-empty-state" dir="auto">
      <p className="compose-empty-hint">{t('composeEmpty.hint')}</p>
      <div className="compose-empty-examples">
        <span className="compose-empty-examples-label">
          {t(showRecent ? 'composeEmpty.continueLabel' : 'composeEmpty.tryLabel')}
        </span>
        {(showRecent ? recentChips.map((entry) => entry.text) : EXAMPLES).map((example) => (
          <button key={example} type="button" className="compose-empty-example-chip" onClick={() => onPick(example)}>
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
