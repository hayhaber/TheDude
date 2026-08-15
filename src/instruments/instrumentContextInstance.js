import { createContext } from 'react';

// The raw Context object, in its own file so both InstrumentContext.jsx
// (the Provider component) and useInstrument.js (the hook) can import it
// without either file ending up exporting a mix of components and
// non-components — keeps both Fast-Refresh-friendly.
export const InstrumentContext = createContext(null);
