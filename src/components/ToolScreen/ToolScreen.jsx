import { useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { HomeButton } from '../HomeButton/HomeButton';
import { Metronome } from '../Metronome/Metronome';
import { DrumMachine } from '../Metronome/DrumMachine';
import { GuitarTuner } from '../GuitarTuner/GuitarTuner';
import { SettingsBody } from '../SettingsPanel/SettingsPanel';
import { AmpView } from '../AmpView/AmpView';
import { RecorderView } from '../RecorderView/RecorderView';
import '../SettingsPanel/SettingsPanel.css';
import '../ModeToggle/ModeToggle.css';
import './ToolScreen.css';

/**
 * A tool on its own screen (from the home screen's Tools card): just the
 * metronome, the tuner, the amp, the recorder or the settings, no
 * instrument page around it. The logo / Back / Escape return to the home
 * screen. Amp and Recorder close the mic when this screen goes away.
 */
export function ToolScreen({ tool, onBack, tunerMode, onTunerModeChange, settingsProps, metronome, drums }) {
  const { t, lang } = useLanguage();
  // The Metronome | Tuner switch only belongs to those two.

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  return (
    <div className="tool-screen" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <header className="tool-screen-top">
        <HomeButton className="tool-screen-home" onClick={onBack} />
        {/* No Metronome | Tuner switch (user's request): each tool opens from
            its own shortcut on the Tools card. */}
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </header>

      <main className="tool-screen-body">
        <h1 className="tool-screen-title">
          {t(
            tool === 'tuner'
              ? tunerMode === 'bass'
                ? 'toolScreen.bassTuner'
                : 'toolScreen.guitarTuner'
              : tool === 'settings'
                ? 'settings.title'
                : tool === 'amp'
                  ? 'amp.title'
                  : tool === 'record'
                    ? 'rec.title'
                    : tool === 'drums'
                      ? 'drums.title'
                      : 'metronome.title'
          )}
        </h1>
        {tool === 'tuner' && (
          <div className="mode-toggle tool-screen-mode" role="group" aria-label={t('tunerBar.label')}>
            {['guitar', 'bass'].map((m) => (
              <button key={m} type="button" className={tunerMode === m ? 'active' : ''} onClick={() => onTunerModeChange(m)}>
                {t(`instrument.${m}`)}
              </button>
            ))}
          </div>
        )}
        <div className={'tool-screen-card' + (tool === 'amp' || tool === 'record' ? ' is-wide' : '') + (tool === 'tuner' || tool === 'drums' ? ' is-device' : '')}>
          {tool === 'tuner' ? (
            <GuitarTuner mode={tunerMode} />
          ) : tool === 'amp' ? (
            <AmpView />
          ) : tool === 'record' ? (
            <RecorderView metronome={metronome} />
          ) : tool === 'drums' ? (
            <DrumMachine {...metronome} drums={drums} resetOnLeave />
          ) : tool === 'settings' ? (
            <div className="settings-drawer-body">
              <SettingsBody {...settingsProps} allSounds />
            </div>
          ) : (
            <Metronome {...metronome} drums={drums} />
          )}
        </div>
      </main>
    </div>
  );
}
