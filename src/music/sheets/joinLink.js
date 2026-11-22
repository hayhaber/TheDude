// A band invite LINK (v1.0.238): https://the-dude.vercel.app/?band=CODE.
// Opening it stores the code on this device (it survives a Google sign-in
// redirect and the first-run screens) and the Band screen opens with the
// code already typed. Device key — the person signing in may not have a
// profile yet.

const KEY = 'dudestar-join-code';
const MAX_AGE = 7 * 24 * 3600 * 1000;
const CODE_RE = /^[A-Z0-9]{4,12}$/;

export function inviteUrl(code) {
  return `https://the-dude.vercel.app/?band=${encodeURIComponent(code)}`;
}

/** Read ?band= from the address once, keep it, take it out of the address. */
export function captureJoinCode() {
  try {
    const url = new URL(window.location.href);
    const raw = (url.searchParams.get('band') || '').trim().toUpperCase();
    if (!raw) return;
    if (CODE_RE.test(raw)) localStorage.setItem(KEY, JSON.stringify({ code: raw, at: Date.now() }));
    // Inside WhatsApp / Instagram's own browser the link stays as it is: the
    // person will be told to open it in Safari / Chrome (Google won't sign in
    // there), and that browser has its own storage — the code goes with the link.
    if (/FBAN|FBAV|Instagram|WhatsApp|Line\/|GSA\/|Snapchat|TikTok|LinkedInApp/i.test(navigator.userAgent)) return;
    url.searchParams.delete('band');
    window.history.replaceState(window.history.state, '', url.pathname + (url.search || '') + url.hash);
  } catch {
    /* private mode */
  }
}

export function pendingJoinCode() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!v || !CODE_RE.test(v.code || '') || Date.now() - (v.at || 0) > MAX_AGE) return null;
    return v.code;
  } catch {
    return null;
  }
}

export function clearJoinCode() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
