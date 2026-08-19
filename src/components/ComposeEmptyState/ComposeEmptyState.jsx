import { useLanguage } from '../../i18n/LanguageContext';
import './ComposeEmptyState.css';

// Shown only while the chord-progression input is empty — the very first
// thing a new user sees has no obvious next step otherwise (a blank input
// with only a placeholder). Two ready-to-click example progressions plus a
// one-line format hint turn "what do I type here?" into "oh, like that."
const EXAMPLES = ['C G Am F', 'Em C G D'];

export function ComposeEmptyState({ onPick }) {
  const { t } = useLanguage();

  return (
    <div className="compose-empty-state" dir="auto">
      <p className="compose-empty-hint">{t('composeEmpty.hint')}</p>
      <div className="compose-empty-examples">
        <span className="compose-empty-examples-label">{t('composeEmpty.tryLabel')}</span>
        {EXAMPLES.map((example) => (
          <button key={example} type="button" className="compose-empty-example-chip" onClick={() => onPick(example)}>
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
