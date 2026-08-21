import { useEffect, useState } from 'react';
import { INSTRUMENTS, DEFAULT_INSTRUMENT } from './instrumentRegistry';
import { getSplendidPiano } from '../audio/instrumentEngine';
import { preloadBassSamples } from '../audio/bassPlayer';
import { InstrumentContext } from './instrumentContextInstance';

const STORAGE_KEY = 'instrument';

function getInitialInstrument() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return INSTRUMENTS.some((i) => i.key === stored) ? stored : DEFAULT_INSTRUMENT;
}

// Same Context+localStorage pattern as i18n/LanguageContext.jsx — the
// selected instrument is read by learning tools scattered throughout the
// component tree (Stage, every feature that gates itself via
// InstrumentGate, App.jsx's stage-prop resolvers), so it's exposed via
// Context rather than threaded prop-by-prop through every intermediate
// view, exactly like language already is. The Context object itself and
// the `useInstrument` hook each live in their own file (see
// instrumentContextInstance.js/useInstrument.js) rather than here, so this
// file only exports a component — keeps it Fast-Refresh-friendly, unlike
// LanguageContext.jsx's Provider+hook-in-one-file baseline exception.
export function InstrumentProvider({ children }) {
  const [instrument, setInstrument] = useState(getInitialInstrument);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, instrument);
    // Kick off the piano sample download the moment Piano mode is selected
    // (same "preload on selection, not on first note" pattern as
    // useAudioSettings.js's guitar profile), so the Stage's first chord/
    // scale display isn't the one paying the full download latency.
    if (instrument === 'piano') getSplendidPiano();
    // Same preload-on-selection pattern for Bass's sampled instrument.
    if (instrument === 'bass') preloadBassSamples();
  }, [instrument]);

  return <InstrumentContext.Provider value={{ instrument, setInstrument }}>{children}</InstrumentContext.Provider>;
}
