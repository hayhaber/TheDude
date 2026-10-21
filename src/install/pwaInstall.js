// Installing DudeStar as an app (user's request 2026-10-21). The app is
// already an installable PWA (vite-plugin-pwa manifest + service worker);
// this decides HOW the visitor installs it:
//  - Chrome / Edge / Samsung on Android and desktop fire `beforeinstallprompt`
//    -> one "Install" button opens the browser's own install dialog.
//  - iPhone / iPad: Apple allows no programmatic install — Share -> Add to
//    Home Screen, shown as a short guide.
//  - Safari on a Mac (17+): File -> Add to Dock.
// The prompt event fires once, early, so it is caught here at start-up
// (captureInstallPrompt() in main.jsx) and kept for later.

let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

export function captureInstallPrompt() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep it for our own button
    deferred = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    try {
      localStorage.setItem('dudestar-installed', '1');
    } catch {
      /* ignore */
    }
    notify();
  });
}

export const canPrompt = () => !!deferred;

export function subscribeInstall(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Opens the browser's install dialog; resolves to 'accepted' | 'dismissed' | 'unavailable'. */
export async function promptInstall() {
  if (!deferred) return 'unavailable';
  const e = deferred;
  deferred = null;
  notify();
  try {
    await e.prompt();
    const choice = await e.userChoice;
    return choice?.outcome ?? 'dismissed';
  } catch {
    return 'dismissed';
  }
}

/** Running as the installed app (from the home screen / dock)? */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return !!(window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: window-controls-overlay)').matches || window.navigator.standalone);
}

/**
 * The visitor's platform, for the install guide:
 * 'ios-safari' | 'ios-other' (Chrome/Firefox/Edge on iOS) | 'ios-inapp'
 * (WhatsApp / Instagram / Facebook / Google app browsers — no Add to Home
 * Screen there) | 'android' | 'mac-safari' | 'desktop' | 'desktop-other'
 * (a desktop browser that can't install, e.g. Firefox).
 */
export function detectPlatform(ua = typeof navigator !== 'undefined' ? navigator.userAgent : '', touch = typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0) {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touch > 1);
  const inApp = /FBAN|FBAV|Instagram|WhatsApp|Line\/|GSA\/|Snapchat|TikTok|LinkedInApp/i.test(ua);
  if (ios) {
    if (inApp) return 'ios-inapp';
    if (/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua)) return 'ios-other';
    return 'ios-safari';
  }
  if (/Android/i.test(ua)) return inApp ? 'android-inapp' : 'android';
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) return 'mac-safari';
  if (/Firefox/i.test(ua)) return 'desktop-other';
  return 'desktop';
}

export const isPhoneOrTablet = (p) => p.startsWith('ios') || p.startsWith('android');

export const INSTALL_URL = 'https://the-dude.vercel.app/install';
