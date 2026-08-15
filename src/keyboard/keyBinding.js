// Normalizes a KeyboardEvent into the same "Ctrl+Shift+X" style string
// bindings are stored/compared as — modifiers always in a fixed order
// (Ctrl, Alt, Shift) so the same physical combo always normalizes
// identically regardless of press order.
export function normalizeKeyEvent(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl'); // metaKey (Cmd) treated the same as Ctrl
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();
  parts.push(key);

  return parts.join('+');
}

// Bare (no-modifier) keys reserved for typing a chord symbol directly into
// ChordInput: the 7 note letters (A-G), 0-9 (extensions/scale degrees, e.g.
// "add9"), and the most common single-character quality/accidental
// shorthand this app's own chord parser recognizes bare (m for minor, b for
// flat). This is deliberately scoped to single characters a player would
// actually type while naming a chord, not every letter that appears
// anywhere inside a longer alias like "maj"/"dim"/"sus" (blocking every
// such letter would leave almost no bindable keys at all) — see
// music/chordQualities.js for the full alias list this is a practical
// subset of. A key held with ANY modifier (Ctrl/Alt/Shift) is never
// reserved, since a modified combo can't be typed into a text field as a
// literal character in the first place.
const RESERVED_BARE_KEYS = new Set([...'ABCDEFG', ...'0123456789', 'M', 'B', '#']);

export function isReservedKey(binding) {
  if (!binding || binding.includes('+')) return false; // any modifier present -> never reserved
  return RESERVED_BARE_KEYS.has(binding.toUpperCase());
}

// Human-readable form for the settings list — mostly the stored string
// as-is, just with arrow keys shown as arrows for a more compact row.
const ARROW_GLYPHS = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
export function formatBinding(binding) {
  if (!binding) return '';
  return binding
    .split('+')
    .map((part) => ARROW_GLYPHS[part] ?? part)
    .join(' + ');
}
