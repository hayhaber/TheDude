// Client side of /api/song-search (v1.0.230): find songs by name or by
// artist (Apple's catalogue) and, for a chosen one, its YouTube video.
const cache = new Map();

export async function searchSongs(q, lang) {
  const term = q.trim();
  if (term.length < 2) return [];
  const c = lang === 'he' ? 'IL' : 'US';
  const k = c + '|' + term.toLowerCase();
  if (cache.has(k)) return cache.get(k);
  const r = await fetch(`/api/song-search?q=${encodeURIComponent(term)}&c=${c}`);
  if (!r.ok) throw new Error('search ' + r.status);
  const { results = [] } = await r.json();
  cache.set(k, results);
  return results;
}

/** The link to keep for a chosen song: its YouTube video when the server
 *  has a YouTube key, else the Apple Music page. */
export async function linkFor(song) {
  try {
    const r = await fetch(`/api/song-search?yt=${encodeURIComponent(song.title + ' ' + song.artist)}`);
    if (r.ok) {
      const { youtube } = await r.json();
      if (youtube) return youtube;
    }
  } catch {
    /* offline: fall back */
  }
  return song.apple || null;
}

export const songLabel = (s) => (s.artist ? `${s.title} – ${s.artist}` : s.title);

/** Time-stamped lyrics for a song (LRCLIB through our server), or null. */
export async function fetchLrc(title, artist, dur) {
  try {
    const p = new URLSearchParams({ lrc: '1', t: title || '', a: artist || '', d: dur ? String(Math.round(dur)) : '' });
    const r = await fetch(`/api/song-search?${p}`);
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j.lrc === 'string' ? j.lrc : null;
  } catch {
    return null;
  }
}

// v1.0.300 (user: "a button that opens the song's page — Ultimate Guitar for
// an English song, Tab4u for a Hebrew one"): the chord site's own search for
// the song, opened by the user. Nothing is fetched or copied by the app.
const HEB = /[֐-׿]/;
export function chartSite(title, artist = '') {
  const t = String(title || '').trim();
  const a = String(artist || '').trim();
  if (!t) return null;
  if (HEB.test(t + a))
    return { site: 'tab4u', url: 'https://www.tab4u.com/resultsSimple?tab=songs&q=' + encodeURIComponent(t) };
  return { site: 'ug', url: 'https://www.ultimate-guitar.com/search.php?search_type=title&value=' + encodeURIComponent((t + ' ' + a).trim()) };
}
