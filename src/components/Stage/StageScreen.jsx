import { useLanguage } from '../../i18n/LanguageContext';
import { HomeButton } from '../HomeButton/HomeButton';
import { StageView } from './StageView';
import './Stage.css';

/**
 * The Stage home card's own screen (v1.0.206): the show is not an
 * instrument's — the singer and every player come here the same way.
 * `start` = sets | songs | band | continue (the card's shortcuts / button).
 */
export function StageScreen({ start = 'sets', onBack, onAccount }) {
  const { lang } = useLanguage();
  return (
    <div className="stg-screen" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <header className="stg-screen-top">
        <HomeButton className="stg-screen-home" onClick={onBack} />
      </header>
      <main className="stg-screen-main">
        <StageView start={start} onAccount={onAccount} />
      </main>
    </div>
  );
}
