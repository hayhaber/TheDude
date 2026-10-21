// /install — the link that gets DudeStar onto a phone, tablet or computer
// as an app (icon on the home screen, full screen, offline). Shows only what
// fits the visitor's device: one Install button where the browser allows it
// (Android / Chrome / Edge), a 3-step Share -> Add to Home Screen guide on
// iPhone / iPad, a QR code on a computer to carry the link to a phone.
import { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle/LanguageToggle';
import { INSTALL_URL, canPrompt, detectPlatform, isPhoneOrTablet, isStandalone, promptInstall, subscribeInstall } from './pwaInstall';
import './InstallPage.css';

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
      <path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 10H16" />
    </svg>
  );
}
function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 12.5 4 4 8-9" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="6" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="12" cy="18" r="1.4" />
    </svg>
  );
}
function MonitorIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M9 20h6M12 16v4M12 7v5M9.5 9.5 12 12l2.5-2.5" />
    </svg>
  );
}

function Qr({ text }) {
  const svg = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { n, d };
  }, [text]);
  return (
    <svg className="inst-qr" viewBox={`-2 -2 ${svg.n + 4} ${svg.n + 4}`} role="img" aria-label={text} shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={svg.n + 4} height={svg.n + 4} fill="#fff" />
      <path d={svg.d} fill="#000" />
    </svg>
  );
}

export function InstallPage({ onOpen }) {
  const { t, lang } = useLanguage();
  const platform = useMemo(() => detectPlatform(), []);
  const [standalone] = useState(isStandalone);
  const [prompt, setPrompt] = useState(canPrompt);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(
    () =>
      subscribeInstall(() => {
        setPrompt(canPrompt());
      }),
    []
  );
  useEffect(() => {
    const onInstalled = () => setDone(true);
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  const install = async () => {
    const r = await promptInstall();
    if (r === 'accepted') setDone(true);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the link is shown on the page anyway */
    }
  };
  const share = () => navigator.share?.({ title: 'DudeStar', url: INSTALL_URL }).catch(() => {});

  const steps = (list) => (
    <ol className="inst-steps">
      {list.map(([icon, title, sub], i) => (
        <li key={i}>
          <span className="inst-step-icon">{icon}</span>
          <span className="inst-step-text">
            <b>{title}</b>
            {sub && <span>{sub}</span>}
          </span>
        </li>
      ))}
    </ol>
  );

  let body;
  if (standalone || done) {
    body = (
      <div className="inst-state">
        <span className="inst-ok">
          <CheckIcon />
        </span>
        <p>{t(done ? 'inst.done' : 'inst.already')}</p>
        {standalone && (
          <button type="button" className="inst-btn is-primary" onClick={onOpen}>
            {t('inst.open')}
          </button>
        )}
      </div>
    );
  } else if (prompt) {
    body = (
      <div className="inst-state">
        <button type="button" className="inst-btn is-primary is-big" onClick={install}>
          {t('inst.install')}
        </button>
        <p className="inst-note">{t('inst.oneTap')}</p>
      </div>
    );
  } else if (platform === 'ios-safari' || platform === 'ios-other') {
    body = steps([
      [<ShareIcon key="s" />, t('inst.ios.1'), t(platform === 'ios-other' ? 'inst.iosOther.1.sub' : 'inst.ios.1.sub')],
      [<AddIcon key="a" />, t('inst.ios.2'), t('inst.ios.2.sub')],
      [<CheckIcon key="c" />, t('inst.ios.3'), t('inst.ios.3.sub')],
    ]);
  } else if (platform === 'ios-inapp' || platform === 'android-inapp') {
    body = <p className="inst-warn">{t('inst.inapp')}</p>;
  } else if (platform === 'android') {
    body = steps([
      [<MenuIcon key="m" />, t('inst.android.1'), t('inst.android.1.sub')],
      [<AddIcon key="a" />, t('inst.android.2')],
      [<CheckIcon key="c" />, t('inst.android.3'), t('inst.android.3.sub')],
    ]);
  } else if (platform === 'mac-safari') {
    body = steps([
      [<ShareIcon key="s" />, t('inst.mac.1'), t('inst.mac.1.sub')],
      [<CheckIcon key="c" />, t('inst.mac.2')],
    ]);
  } else if (platform === 'desktop-other') {
    body = <p className="inst-warn">{t('inst.desktopOther')}</p>;
  } else {
    body = steps([
      [<MonitorIcon key="d" />, t('inst.desktop.1'), t('inst.desktop.1.sub')],
      [<CheckIcon key="c" />, t('inst.desktop.2')],
    ]);
  }

  const showQr = !isPhoneOrTablet(platform) && !standalone;

  return (
    <div className={'inst-page' + (showQr ? ' has-qr' : '')} dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <div className="inst-lang">
        <LanguageToggle />
      </div>
      <main className="inst-main">
        <section className="inst-card">
          <img className="inst-icon" src="/pwa-192.png" alt="" width="96" height="96" />
          <h1>{t('inst.title')}</h1>
          <p className="inst-sub">{t('inst.subtitle')}</p>
          {body}
          <div className="inst-link">
            <span dir="ltr">{INSTALL_URL.replace('https://', '')}</span>
            <button type="button" className="inst-btn" onClick={copy}>
              {copied ? t('inst.copied') : t('inst.copy')}
            </button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button type="button" className="inst-btn" onClick={share}>
                {t('inst.share')}
              </button>
            )}
          </div>
          {!standalone && (
            <button type="button" className="inst-open" onClick={onOpen}>
              {t('inst.open')} {'\u2066DudeStar\u2069'}
            </button>
          )}
        </section>
        {showQr && (
          <section className="inst-card inst-qr-card">
            <h2>{t('inst.qr.title')}</h2>
            <Qr text={INSTALL_URL} />
            <p className="inst-note">{t('inst.qr.text')}</p>
          </section>
        )}
      </main>
    </div>
  );
}
