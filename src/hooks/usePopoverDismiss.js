import { useEffect, useRef } from 'react';

// Closes an open popover on outside click or Escape, without any backdrop
// element — the previous pattern (a transparent position:fixed; inset:0 div
// behind the popover) caught every pointer/wheel event on the page while
// open, which for a lightweight anchored dropdown (not an actual modal)
// meant the rest of the app — nav, fretboard, page scroll — went dead the
// moment it opened. Listening for a real outside click instead leaves the
// rest of the page fully interactive and scrollable the whole time.
export function usePopoverDismiss(open, onClose) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return ref;
}
