// A tiny module-level mirror of the user's own YouTube Data API key — same
// pattern as audioInputSettingsStore.js. This app never ships/shares a key
// of its own (a shared key embedded in client code would have its quota
// exhausted or abused across every user of this app); Songs -> Video's
// "search YouTube for this Guitar Pro file" feature only runs once the
// player has their own free key from Google Cloud Console entered here.
const STORAGE_KEY = 'youtube-api-key';

const DEFAULTS = { apiKey: '' };

function loadInitial() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || typeof stored.apiKey !== 'string') return { ...DEFAULTS };
    return { apiKey: stored.apiKey };
  } catch {
    return { ...DEFAULTS };
  }
}

let current = loadInitial();

export function getYoutubeApiKey() {
  return current.apiKey;
}

export function setYoutubeApiKey(apiKey) {
  current = { apiKey };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}
