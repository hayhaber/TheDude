import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import './SoloOpenerPanel.css';

// Practice -> Solo Opener: a metronome-driven loop that hands the player a
// fresh, randomized constraint on how to START their next improvised phrase
// (timing / starting string / note count / rhythm feel) every N bars — no
// scoring, no right/wrong, just a nudge off whatever their default "opening
// habit" is. All timing/state lives in hooks/useSoloOpener.js; this
// component is the prompt display + transport chrome.
export function SoloOpenerPanel({ soloOpener, metronome }) {
  const { t, lang } = useLanguage();
  const { bars, setBars, prompt, isPlaying, currentBar, roundCount, play, stop, shuffle } = soloOpener;

  return (
    <div className="solo-opener-panel">
      <div>
        <h1>{t('soloOpener.title')}</h1>
        <p className="subtitle">{t('soloOpener.subtitle')}</p>
      </div>

      <div className="solo-opener-controls">
        <label className="solo-opener-field">
          {t('soloOpener.loopLength')}
          <select value={bars} onChange={(e) => setBars(Number(e.target.value))} disabled={isPlaying}>
            {[2, 4, 8].map((n) => (
              <option key={n} value={n}>
                {t('soloOpener.bars', { count: n })}
              </option>
            ))}
          </select>
        </label>

        <div className="solo-opener-field">
          <span className="solo-opener-field-label" aria-hidden="true">
            &nbsp;
          </span>
          <button type="button" className="play-button" onClick={isPlaying ? stop : play}>
            {isPlaying ? t('vocal.stop') : t('vocal.start')}
          </button>
        </div>

        {isPlaying && (
          <div className="solo-opener-field">
            <span className="solo-opener-field-label" aria-hidden="true">
              &nbsp;
            </span>
            <button type="button" className="solo-opener-shuffle" onClick={shuffle}>
              {t('soloOpener.newIdea')}
            </button>
          </div>
        )}
      </div>

      {prompt && (
        <div className="solo-opener-card" dir="auto">
          <p className="solo-opener-prompt-line solo-opener-prompt-lead">{t('soloOpener.startWith')}</p>
          <ul className="solo-opener-prompt-list">
            <li>
              <span className="solo-opener-prompt-key">{t('soloOpener.when')}</span>
              {localize(prompt.timing, lang)}
            </li>
            <li>
              <span className="solo-opener-prompt-key">{t('soloOpener.what')}</span>
              {localize(prompt.string, lang)}
            </li>
            <li>
              <span className="solo-opener-prompt-key">{t('soloOpener.howMany')}</span>
              {localize(prompt.density, lang)}
            </li>
            <li>
              <span className="solo-opener-prompt-key">{t('soloOpener.rhythm')}</span>
              {localize(prompt.rhythm, lang)}
            </li>
          </ul>
        </div>
      )}

      {isPlaying && (
        <p className="solo-opener-status" dir="auto">
          {t('soloOpener.barLabel', { current: currentBar, total: bars })} · {t('rhythmGame.bpm', { bpm: metronome.bpm })} ·{' '}
          {t('soloOpener.round', { count: roundCount })}
        </p>
      )}

      <p className="solo-opener-hint" dir="auto">
        {t('soloOpener.hint')}
      </p>
    </div>
  );
}
