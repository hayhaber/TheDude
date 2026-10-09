import { useEffect, useState } from 'react';
import { InfoTooltipsContext } from './infoTooltipsContextInstance';

const STORAGE_KEY = 'infoTooltipsEnabled';

// Default OFF: the ⓘ marks appear only once the user turns on the "i"
// switch (user's request — explanations across the whole app, shown on
// demand rather than cluttering every screen).
function getInitial() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'true';
}

// Same Context+localStorage pattern as instruments/InstrumentContext.jsx —
// every InfoTooltip anywhere in the tree (Capo, Smooth, Tension, ...) reads
// this via useInfoTooltipsEnabled() so flipping the master switch hides/
// shows all of them at once without threading a prop through every
// intermediate component between here and each usage site.
export function InfoTooltipsProvider({ children }) {
  const [enabled, setEnabled] = useState(getInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }, [enabled]);

  return <InfoTooltipsContext.Provider value={{ enabled, setEnabled }}>{children}</InfoTooltipsContext.Provider>;
}
