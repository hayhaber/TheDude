import { useEffect, useState } from 'react';
import { InfoTooltipsContext } from './infoTooltipsContextInstance';

const STORAGE_KEY = 'infoTooltipsEnabled';

// Default ON — InfoTooltip icons already existed and were always visible
// before this master switch was added, so defaulting to enabled preserves
// that behavior; the new "i" toggle next to Settings (see AppShell) is an
// opt-OUT for people who find the ⓘ icons cluttered, not an opt-in gate
// hiding a feature no one's seen yet.
function getInitial() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === 'true';
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
