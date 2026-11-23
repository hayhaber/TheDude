// A song's listening link (v1.0.227): YouTube, Spotify, Apple Music or any
// other https page. Kept in the song's sheet prefs (`link`), synced to the
// band through the charts row's `link` column (migration 006).

const HOSTS = [
  ['youtube', /(^|\.)(youtube\.com|youtu\.be)$/i],
  ['spotify', /(^|\.)(spotify\.com|spotify\.link)$/i],
  ['apple', /(^|\.)(music\.apple\.com|itunes\.apple\.com)$/i],
];

/** A clean https URL or null (http is upgraded; anything else refused). */
export function cleanLink(text) {
  const s = (text || '').trim();
  if (!s) return null;
  let u;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : 'https://' + s);
  } catch {
    return null;
  }
  if (u.protocol === 'http:') u.protocol = 'https:';
  if (u.protocol !== 'https:' || !u.hostname.includes('.')) return null;
  const out = u.toString();
  return out.length <= 500 ? out : null;
}

/** 'youtube' | 'spotify' | 'apple' | 'web' (null for no / bad link). */
export function serviceOf(link) {
  const c = cleanLink(link);
  if (!c) return null;
  const host = new URL(c).hostname;
  for (const [k, re] of HOSTS) if (re.test(host)) return k;
  return 'web';
}

/**
 * An in-app player for the link (v1.0.229): {src, ratio | height} for a
 * YouTube video, a Spotify track / album / playlist or an Apple Music
 * song / album; null when the service has no embed (the link opens outside).
 */
export function embedOf(link) {
  const c = cleanLink(link);
  if (!c) return null;
  const u = new URL(c);
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be' || /(^|\.)youtube\.com$/.test(host)) {
    let id = null;
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (u.searchParams.get('v')) id = u.searchParams.get('v');
    else {
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
      if (m) id = m[1];
    }
    if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
    const t = parseInt(u.searchParams.get('t') || '', 10);
    // enablejsapi: the player reports its time / state by postMessage, so the
    // chart can follow the recording (play-along, v1.0.257)
    const origin = typeof location !== 'undefined' ? '&origin=' + encodeURIComponent(location.origin) : '';
    return { kind: 'youtube', id, start: t > 0 ? t : 0, src: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&autoplay=1&enablejsapi=1${origin}${t > 0 ? '&start=' + t : ''}`, ratio: 16 / 9 };
  }
  if (/(^|\.)spotify\.com$/.test(host)) {
    const m = u.pathname.match(/^\/(?:intl-[a-z]{2}\/)?(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
    if (!m) return null;
    return { kind: 'spotify', src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, height: 152 };
  }
  if (host === 'music.apple.com') {
    if (!/\/(album|song|playlist)\//.test(u.pathname)) return null;
    return { kind: 'apple', src: `https://embed.music.apple.com${u.pathname}${u.search}`, height: 175 };
  }
  return null;
}
