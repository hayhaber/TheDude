import { useState } from 'react';
import { SHORTCUT_ACTIONS, SHORTCUT_CATEGORIES, SHORTCUT_CATEGORY_LABELS } from '../../keyboard/shortcutActions';
import { normalizeKeyEvent, isReservedKey, formatBinding } from '../../keyboard/keyBinding';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';
import './KeyboardShortcutsSettings.css';

const CATEGORY_ORDER = [SHORTCUT_CATEGORIES.CHORDS, SHORTCUT_CATEGORIES.PLAYBACK, SHORTCUT_CATEGORIES.METRONOME];

// One action's row: shows its current binding, and turns into a live key
// -capture field on click. Reserved bare keys (A-G, 0-9, m, b, # — see
// keyBinding.js) are rejected outright with an inline reason; a key already
// bound to a different action is instead SWAPPED onto this action (and the
// other action receives this row's old binding) rather than silently
// leaving that other action unbound.
function ShortcutRow({ action, binding, onRecord, isRecording, onStartRecording, onStopRecording, onReset, error }) {
  const { t, lang } = useLanguage();

  function handleKeyDown(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') {
      onStopRecording();
      return;
    }
    // A bare modifier key on its own (still waiting for the real key) isn't
    // a complete combo yet — keep listening.
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
    onRecord(action.id, normalizeKeyEvent(e));
  }

  return (
    <div className="shortcut-row">
      <span className="shortcut-row-label" dir="auto">
        {localize(action.label, lang)}
      </span>
      <button
        type="button"
        className={'shortcut-row-key' + (isRecording ? ' recording' : '')}
        onClick={() => onStartRecording(action.id)}
        onKeyDown={isRecording ? handleKeyDown : undefined}
        onBlur={onStopRecording}
      >
        {isRecording ? t('settings.shortcuts.pressKey') : binding ? formatBinding(binding) : t('settings.shortcuts.unbound')}
      </button>
      <button type="button" className="shortcut-row-reset" title={t('settings.shortcuts.reset')} aria-label={t('settings.shortcuts.reset')} onClick={() => onReset(action.id)}>
        ↺
      </button>
      {error && (
        <span className="shortcut-row-error" dir="auto">
          {error}
        </span>
      )}
    </div>
  );
}

export function KeyboardShortcutsSettings({ shortcuts }) {
  const { t, lang } = useLanguage();
  const { bindings, setBinding, resetToDefault, resetAll, actionForKey } = shortcuts;
  const [recordingActionId, setRecordingActionId] = useState(null);
  const [rowError, setRowError] = useState(null);

  function handleRecord(actionId, key) {
    if (isReservedKey(key)) {
      setRowError(t('settings.shortcuts.reserved', { key: formatBinding(key) }));
      return;
    }

    const conflictingAction = actionForKey(key, actionId);
    if (conflictingAction) {
      // Swap: the other action takes this row's old key instead of being
      // silently left unbound.
      const previousKey = bindings[actionId];
      setBinding(conflictingAction, previousKey);
    }
    setBinding(actionId, key);
    setRecordingActionId(null);
    setRowError(null);
  }

  function startRecording(actionId) {
    setRecordingActionId(actionId);
    setRowError(null);
  }

  function stopRecording() {
    setRecordingActionId(null);
  }

  return (
    <div className="keyboard-shortcuts-settings">
      {CATEGORY_ORDER.map((category) => (
        <div key={category} className="shortcut-category">
          <p className="shortcut-category-label" dir="auto">
            {localize(SHORTCUT_CATEGORY_LABELS[category], lang)}
          </p>
          {SHORTCUT_ACTIONS.filter((a) => a.category === category).map((action) => (
            <ShortcutRow
              key={action.id}
              action={action}
              binding={bindings[action.id]}
              isRecording={recordingActionId === action.id}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onRecord={handleRecord}
              onReset={resetToDefault}
              error={recordingActionId === action.id ? rowError : null}
            />
          ))}
        </div>
      ))}

      <div className="shortcut-actions-row">
        <button type="button" className="shortcut-reset-all" onClick={resetAll}>
          {t('settings.shortcuts.resetAll')}
        </button>
      </div>
      <span className="settings-attribution" dir="auto">
        {t('settings.shortcuts.hint')}
      </span>
    </div>
  );
}
