import { useEffect, useState } from 'react';

// vexflow is ~1 MB; it loads only when a notation is first drawn (v1.0.288),
// not with the app.
let VF = null;
let loading = null;
export const vexflow = () => VF;

/** The vexflow module once loaded (re-renders the caller when it arrives). */
export function useVexflow() {
  const [mod, setMod] = useState(VF);
  useEffect(() => {
    if (VF) return undefined;
    let live = true;
    loading = loading || import('vexflow').then((m) => (VF = m));
    loading.then((m) => live && setMod(m)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return mod;
}
