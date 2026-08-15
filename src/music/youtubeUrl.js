// Pure parsing — pulls an 11-character YouTube video ID out of whatever
// format the user pastes (watch?v=, youtu.be/, /shorts/, /embed/, or the
// bare ID itself). No network calls, no YouTube Data API — the id is only
// ever handed to the official IFrame Player embed, never used to fetch or
// download anything.
const VIDEO_ID_RE = /^[\w-]{11}$/;

export function extractYouTubeVideoId(input) {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return null;
  if (VIDEO_ID_RE.test(trimmed)) return trimmed;

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.hostname.replace(/^www\./, '') === 'youtu.be') {
    const id = url.pathname.slice(1);
    return VIDEO_ID_RE.test(id) ? id : null;
  }

  const vParam = url.searchParams.get('v');
  if (vParam && VIDEO_ID_RE.test(vParam)) return vParam;

  const pathMatch = url.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{11})/);
  if (pathMatch) return pathMatch[1];

  return null;
}
