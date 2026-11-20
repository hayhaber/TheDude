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
