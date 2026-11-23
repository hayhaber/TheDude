import { useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { BackSlotContext } from '../HomeButton/BackButton';
import { HomeButton } from '../HomeButton/HomeButton';
import { ProfileChip } from '../../profile/ProfileChip';
import { StageView } from './StageView';
import './Stage.css';

/**
 * The Stage home card's own screen (v1.0.206): the show is not an
 * instrument's — the singer and every player come here the same way.
 * `start` = sets | songs | band | continue (the card's shortcuts / button).
 */
export function StageScreen({ start = 'sets', onBack, onAccount }) {
  const { lang } = useLanguage();
  const [slot, setSlot] = useState(null);
  const slots = useMemo(() => [slot], [slot]);
  return (
    <div className="stg-screen" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      {/* Home at the reading start (right in Hebrew), like every screen; a
          screen's Back circle beside it. */}
      <header className="stg-screen-top">
        <HomeButton className="stg-screen-home" onClick={onBack} />
        <span className="app-back-slot" ref={setSlot} />
        {/* who you are, at the reading end — like every inner screen */}
        <span className="stg-screen-me">
          <ProfileChip compact onSettings={onAccount} />
        </span>
      </header>
      <main className="stg-screen-main">
        <BackSlotContext.Provider value={slots}>
          <StageView start={start} onAccount={onAccount} />
        </BackSlotContext.Provider>
      </main>
    </div>
  );
}
