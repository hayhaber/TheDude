import { createContext } from 'react';

// The raw Context object, in its own file so both InfoTooltipsContext.jsx
// (the Provider) and useInfoTooltipsEnabled.js (the hook) can import it
// without either file mixing components and non-components — same
// Fast-Refresh-friendly split as instruments/instrumentContextInstance.js.
export const InfoTooltipsContext = createContext({ enabled: true, setEnabled: () => {} });
