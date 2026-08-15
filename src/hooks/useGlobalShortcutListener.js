import { useEffect } from 'react';
import { normalizeKeyEvent } from '../keyboard/keyBinding';

const FORM_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

// App-wide keydown listener for the user-configurable shortcuts (Settings ->
// Keyboard Shortcuts) — mounted once in App.jsx. Same "skip while typing in
// a form field" guard PracticeDrillPanel's own useDrillKeyboard already
// uses, so a bound arrow key (the defaults use plenty of them) never
// hijacks normal text-cursor movement inside ChordInput/CapoInput/etc.
// `handlers` is a plain { actionId: () => void } map of the CURRENT
// callbacks — passed fresh every render (cheap: just function references),
// captured via a ref so the listener itself is only ever attached once.
export function useGlobalShortcutListener(bindings, handlers) {
  useEffect(() => {
    function onKeyDown(e) {
      if (FORM_TAGS.has(e.target.tagName) || e.target.isContentEditable) return;
      const pressed = normalizeKeyEvent(e);
      const actionId = Object.entries(bindings).find(([, key]) => key && key === pressed)?.[0];
      if (!actionId) return;
      const handler = handlers[actionId];
      if (!handler) return;
      e.preventDefault();
      handler();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bindings, handlers]);
}
