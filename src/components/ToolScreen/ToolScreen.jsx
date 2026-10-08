import { useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { AppLogo } from '../AppLogo/AppLogo';
import { Metronome } from '../Metronome/Metronome';
import { GuitarTuner } from '../GuitarTuner/GuitarTuner';
import '../ModeToggle/ModeToggle.css';
import './ToolScreen.css';

/**
 * A tool on its own screen (from the home screen's Tools card): just the
 * metronome or the tuner, no instrument page around it. The logo / Back /
 * Escape return to the home screen.
 */
export function ToolScreen({ tool, onToolChange, onBack, metronome, drums }) {
  const { t, lang } = useLanguage();

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
        <button type="button" className="tool-screen-back" onClick={onBack} aria-label={t('home.open')}>
          <span aria-hidden="true">{lang === 'he' ? '›' : '‹'}</span>
          {t('toolScreen.back')}
        </button>
        <div className="mode-toggle tool-screen-switch" role="group" aria-label={t('home.tools.title')}>
          <button type="button" className={tool === 'metronome' ? 'active' : ''} onClick={() => onToolChange('metronome')}>
            {t('metronome.title')}
          </button>
          <button type="button" className={tool === 'tuner' ? 'active' : ''} onClick={() => onToolChange('tuner')}>
            {t('tunerBar.label')}
          </button>
        </div>
        <button type="button" className="tool-screen-brand" onClick={onBack} aria-label={t('home.open')}>
          <AppLogo size={30} />
        </button>
      </header>

      <main className="tool-screen-body">
        <h1 className="tool-screen-title">{t(tool === 'tuner' ? 'tunerBar.label' : 'metronome.title')}</h1>
        <div className="tool-screen-card">
          {tool === 'tuner' ? <GuitarTuner /> : <Metronome {...metronome} drums={drums} />}
        </div>
      </main>
    </div>
  );
}
