// Song search for the Band screen (v1.0.230).
//   GET /api/song-search?q=<song or artist>&c=IL   -> {results: [{title, artist, art, apple}]}
//     Apple's public iTunes Search API (no key). Typing a band's name
//     returns its songs; a song's name returns the matching recordings.
//   GET /api/song-search?yt=<title artist>          -> {youtube: url | null, ready: bool}
//     The best YouTube video for a chosen song, through the YouTube Data
//     API v3 — only when the env var YOUTUBE_API_KEY is set on Vercel
//     (the key never reaches the browser). One call per CHOSEN song
//     (100 quota units; the free 10,000 / day = ~100 songs a day).

//   GET /api/song-search?lrc=1&t=<title>&a=<artist>&d=<seconds>  -> {lrc: text | null, duration}
//     Time-stamped lyrics from LRCLIB (lrclib.net, free, no key; v1.0.260):
//     the result with synced lyrics whose length is closest to the
//     recording's. The app keeps only the TIMES (matched to the user's own
//     words); the text is not stored.

const clean = (s, n = 120) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

async function itunes(q, country) {
  const u = new URL('https://itunes.apple.com/search');
  u.searchParams.set('term', q);
  u.searchParams.set('media', 'music');
  u.searchParams.set('entity', 'song');
  u.searchParams.set('limit', '12');
  u.searchParams.set('country', country);
  const r = await fetch(u, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error('itunes ' + r.status);
  const data = await r.json();
  const seen = new Set();
  const out = [];
  for (const x of data.results || []) {
    const title = clean(x.trackName);
    const artist = clean(x.artistName);
    if (!title || !artist) continue;
    const key = (title + '|' + artist).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      title,
      artist,
      art: typeof x.artworkUrl100 === 'string' ? x.artworkUrl100.replace('100x100', '120x120') : null,
      apple: typeof x.trackViewUrl === 'string' && x.trackViewUrl.startsWith('https://') ? x.trackViewUrl.split('&uo=')[0] : null,
    });
    if (out.length >= 8) break;
  }
  return out;
}

async function youtube(q, key) {
  const u = new URL('https://www.googleapis.com/youtube/v3/search');
  u.searchParams.set('part', 'snippet');
  u.searchParams.set('type', 'video');
  u.searchParams.set('maxResults', '1');
  u.searchParams.set('videoEmbeddable', 'true');
  u.searchParams.set('q', q);
  u.searchParams.set('key', key);
  const r = await fetch(u);
  if (!r.ok) throw new Error('youtube ' + r.status);
  const data = await r.json();
  const id = data.items?.[0]?.id?.videoId;
  return id && /^[\w-]{6,20}$/.test(id) ? `https://youtu.be/${id}` : null;
}

async function lrclib(title, artist, dur) {
  const ask = async (params) => {
    const u = new URL('https://lrclib.net/api/search');
    for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v);
    const r = await fetch(u, { headers: { accept: 'application/json', 'user-agent': 'DudeStar (https://the-dude.vercel.app)' } });
    if (!r.ok) throw new Error('lrclib ' + r.status);
    const data = await r.json();
    return (Array.isArray(data) ? data : []).filter((x) => typeof x.syncedLyrics === 'string' && x.syncedLyrics.includes('['));
  };
  let found = await ask({ track_name: title, artist_name: artist });
  if (!found.length && artist) found = await ask({ q: `${title} ${artist}` });
  if (!found.length) return { lrc: null };
  const d = Number(dur) || 0;
  found.sort((x, y) => (d ? Math.abs((x.duration || 0) - d) - Math.abs((y.duration || 0) - d) : 0));
  const best = found[0];
  return { lrc: best.syncedLyrics.slice(0, 60000), duration: best.duration || null };
}

export default async function handler(req, res) {
  const { q, yt, c, lrc, t, a, d } = req.query || {};
  try {
    if (lrc) {
      const title = clean(t, 150);
      if (title.length < 1) return res.status(200).json({ lrc: null });
      const out = await lrclib(title, clean(a, 150), d);
      res.setHeader('cache-control', 's-maxage=604800, stale-while-revalidate=86400');
      return res.status(200).json(out);
    }
    if (yt) {
      const key = process.env.YOUTUBE_API_KEY;
      if (!key) return res.status(200).json({ youtube: null, ready: false });
      const url = await youtube(clean(yt, 200), key);
      res.setHeader('cache-control', 's-maxage=604800, stale-while-revalidate=86400');
      return res.status(200).json({ youtube: url, ready: true });
    }
    const term = clean(q, 100);
    if (term.length < 2) return res.status(200).json({ results: [] });
    const country = /^[A-Z]{2}$/.test(c || '') ? c : 'US';
    const results = await itunes(term, country);
    res.setHeader('cache-control', 's-maxage=86400, stale-while-revalidate=86400');
    return res.status(200).json({ results });
  } catch (e) {
    return res.status(502).json({ error: String(e?.message || e).slice(0, 120) });
  }
}
