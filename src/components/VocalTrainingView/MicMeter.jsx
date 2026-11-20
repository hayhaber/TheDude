import { useLanguage } from '../../i18n/LanguageContext';
import { midiName } from '../../music/vocal/voiceRange';

// "Does the mic hear me at all?" (v1.0.227, user's iPad: singing wasn't
// heard and he couldn't tell whether it was him or the mic). A live LED
// meter of the RAW input — it moves for any hum, even one too quiet to read
// as a note — plus one line saying what the app hears. Every singing screen
// shows it; with the mic off it offers a Test key.

const SEGS = 16;
const LOW_DB = -72;
const HIGH_DB = -12;

export function MicMeter({ mic, paused = false, onTest = null, compact = false }) {
  const { t } = useLanguage();
  const on = mic.listening;
  const db = on ? (mic.live.db ?? -120) : -120;
  const lit = Math.max(0, Math.min(SEGS, Math.round(((db - LOW_DB) / (HIGH_DB - LOW_DB)) * SEGS)));
  let state;
  let text;
  if (!on) {
    state = 'off';
    text = paused ? t('vocal.mic.paused') : t('vocal.mic.off');
  } else if (mic.deadInput) {
    state = 'dead';
    text = t('vocal.mic.dead');
  } else if (mic.live.midi != null) {
    state = 'pitch';
    text = t('vocal.mic.pitch', { note: midiName(Math.round(mic.live.midi)) });
  } else if (mic.live.voiced) {
    state = 'voice';
    text = t('vocal.mic.voice');
  } else {
    state = 'quiet';
    text = t('vocal.mic.quiet');
  }
  return (
    <div className={'vocal-mic-meter is-' + state + (compact ? ' is-compact' : '')} role="status" aria-live="polite">
      <span className="vocal-mic-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
          {state === 'dead' && <path d="M4 4l16 16" />}
        </svg>
      </span>
      <span className="vocal-mic-bars" dir="ltr" aria-hidden="true">
        {Array.from({ length: SEGS }, (_, i) => (
          <i key={i} className={i < lit ? (i >= SEGS - 2 ? 'is-red' : i >= SEGS - 5 ? 'is-amber' : 'is-on') : ''} />
        ))}
      </span>
      <span className="vocal-mic-text" dir="auto">
        {text}
      </span>
      {!on && onTest && !paused && (
        <button type="button" className="vocal-mic-test" onClick={onTest}>
          {t('vocal.mic.test')}
        </button>
      )}
    </div>
  );
}
