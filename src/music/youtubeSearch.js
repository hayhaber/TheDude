const SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';

// Searches YouTube via the official Data API v3, using the PLAYER'S OWN key
// (see hooks/useYoutubeApiKey.js) — never a key this app ships or shares.
// This is the official, ToS-compliant API (not scraping search-results
// HTML), the same one YouTube's own "Data API" product is built for
// third-party apps to call. Returns the single top result as
// `{ videoId, title, channelTitle, thumbnailUrl }`, or `null` if there were
// no results — the caller (SongVideoPlayer.jsx) always shows this as a
// one-click suggestion to confirm, never auto-loads it silently, since a
// title/artist match from a Guitar Pro file's own (often sparse or
// misspelled) metadata isn't guaranteed to be the right video.
export async function searchYoutubeTopResult(query, apiKey) {
  const url = `${SEARCH_ENDPOINT}?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || `YouTube search failed (${response.status})`);
  }
  const data = await response.json();
  const item = data.items?.[0];
  if (!item) return null;
  return {
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnailUrl: item.snippet.thumbnails?.default?.url ?? null,
  };
}
