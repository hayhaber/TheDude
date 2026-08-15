import { useState } from 'react';
import { getYoutubeApiKey, setYoutubeApiKey } from '../audio/youtubeApiKeyStore';

// Settings UI's source of truth for the user's own YouTube Data API key —
// mirrors every change into youtubeApiKeyStore.js (read by
// SongVideoPlayer.jsx's Guitar-Pro-import auto-search) and into
// localStorage, same split useAudioInputSettings.js already uses.
export function useYoutubeApiKey() {
  const [apiKey, setApiKeyState] = useState(() => getYoutubeApiKey());

  function setApiKey(value) {
    setApiKeyState(value);
    setYoutubeApiKey(value);
  }

  return { apiKey, setApiKey };
}
