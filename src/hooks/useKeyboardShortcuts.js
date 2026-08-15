import { useEffect, useState } from 'react';
import { DEFAULT_BINDINGS, SHORTCUT_ACTIONS } from '../keyboard/shortcutActions';

const STORAGE_KEY = 'keyboard-shortcuts';

function getInitialBindings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || typeof stored !== 'object') return { ...DEFAULT_BINDINGS };
    // Merge over the defaults (not replace) so a newly added action always
    // has a sensible default even for a user who customized bindings before
    // that action existed, and drop any stored id that no longer exists.
    const merged = { ...DEFAULT_BINDINGS };
    for (const action of SHORTCUT_ACTIONS) {
      if (typeof stored[action.id] === 'string') merged[action.id] = stored[action.id];
    }
    return merged;
  } catch {
    return { ...DEFAULT_BINDINGS };
  }
}

// User-customizable keyboard-shortcut bindings (Settings -> Keyboard
// Shortcuts) — same localStorage persistence pattern as every other
// settings store in the app (audioInputSettingsStore.js,
// youtubeApiKeyStore.js). `bindings` maps actionId -> normalized key string
// (keyboard/keyBinding.js's format) or '' for "unbound".
export function useKeyboardShortcuts() {
  const [bindings, setBindings] = useState(getInitialBindings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  }, [bindings]);

  // null clears the binding (unbound) rather than deleting the key, so a
  // deliberately-cleared action doesn't silently revert to its default the
  // next time defaults are merged in above.
  function setBinding(actionId, key) {
    setBindings((prev) => ({ ...prev, [actionId]: key ?? '' }));
  }

  function resetToDefault(actionId) {
    setBindings((prev) => ({ ...prev, [actionId]: DEFAULT_BINDINGS[actionId] }));
  }

  function resetAll() {
    setBindings({ ...DEFAULT_BINDINGS });
  }

  // Which action (if any) already owns this exact key combo — used both to
  // warn before overwriting and to swap the two bindings instead of leaving
  // the other action silently unbound.
  function actionForKey(key, excludeActionId = null) {
    return Object.entries(bindings).find(([id, k]) => id !== excludeActionId && k && k === key)?.[0] ?? null;
  }

  return { bindings, setBinding, resetToDefault, resetAll, actionForKey };
}
