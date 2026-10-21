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
import { ShowcaseReel } from './ShowcaseReel';
import { IosGuide, IosArrow } from './IosGuide';
import './IosGuide.css';
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
function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
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
  const [iosStep, setIosStep] = useState(0);
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
        <li key={i} className={platform === 'ios-safari' && i === iosStep ? 'is-now' : undefined}>
          <span className="inst-step-icon">{icon}</span>
          <span className="inst-step-text">
            <b>{title}</b>
            {sub && <span>{sub}</span>}
          </span>
        </li>
      ))}
    </ol>
  );

  // Two screens (user's request 2026-10-21): the page we designed with ONE
  // Install button, then — only where the browser can't install by itself —
  // the steps (iPhone/iPad: with the moving demo and the arrow).
  const [view, setView] = useState('intro');
  const inApp = platform === 'ios-inapp' || platform === 'android-inapp';
  const installed = standalone || done;
  const onInstall = () => {
    if (prompt) install();
    else if (!inApp && platform !== 'desktop-other') setView('guide');
  };

  let guide = null;
  if (platform === 'ios-safari') {
    // Safari (iOS 26): Share lives in the ••• menu
    guide = steps([
      [<MoreIcon key="m" />, t('inst.ios.0'), t('inst.ios.0.sub')],
      [<ShareIcon key="s" />, t('inst.ios.1'), t('inst.ios.1.sub')],
      [<AddIcon key="a" />, t('inst.ios.2'), t('inst.ios.2.sub')],
      [<CheckIcon key="c" />, t('inst.ios.3'), t('inst.ios.3.sub')],
    ]);
  } else if (platform === 'ios-other') {
    guide = steps([
      [<ShareIcon key="s" />, t('inst.ios.1'), t('inst.iosOther.1.sub')],
      [<AddIcon key="a" />, t('inst.ios.2'), t('inst.ios.2.sub')],
      [<CheckIcon key="c" />, t('inst.ios.3'), t('inst.ios.3.sub')],
    ]);
  } else if (platform === 'android') {
    guide = steps([
      [<MenuIcon key="m" />, t('inst.android.1'), t('inst.android.1.sub')],
      [<AddIcon key="a" />, t('inst.android.2')],
      [<CheckIcon key="c" />, t('inst.android.3'), t('inst.android.3.sub')],
    ]);
  } else if (platform === 'mac-safari') {
    guide = steps([
      [<ShareIcon key="s" />, t('inst.mac.1'), t('inst.mac.1.sub')],
      [<CheckIcon key="c" />, t('inst.mac.2')],
    ]);
  } else {
    guide = steps([
      [<MonitorIcon key="d" />, t('inst.desktop.1'), t('inst.desktop.1.sub')],
      [<CheckIcon key="c" />, t('inst.desktop.2')],
    ]);
  }

  const showQr = !isPhoneOrTablet(platform) && !standalone && view === 'intro';
  const inGuide = view === 'guide' && !installed;
  // iPhone / iPad Safari guide: the 4-tap demo + the arrow to the real •••
  const iosDemo = inGuide && platform === 'ios-safari';

  const linkRow = (
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
  );

  return (
    <div className={'inst-page' + (showQr ? ' has-qr' : '') + (inGuide ? ' is-guide' : '')} dir={lang === 'he' ? 'rtl' : 'ltr'}>
      {iosDemo && <IosArrow />}
      <main className="inst-main">
        {!inGuide ? (
          <section className="inst-card inst-guide">
            <div className="inst-lang">
              <LanguageToggle />
            </div>
            <img className="inst-icon" src="/pwa-192.png" alt="" width="96" height="96" />
            <h1>{t('inst.title')}</h1>
            <p className="inst-sub">{t('inst.subtitle')}</p>
            {installed ? (
              <div className="inst-state">
                <span className="inst-ok">
                  <CheckIcon />
                </span>
                <p>{t(done ? 'inst.done' : 'inst.already')}</p>
                {standalone && (
                  <button type="button" className="inst-btn is-primary is-big" onClick={onOpen}>
                    {t('inst.open')}
                  </button>
                )}
              </div>
            ) : inApp ? (
              <>
                <p className="inst-warn">{t('inst.inapp')}</p>
                {linkRow}
              </>
            ) : platform === 'desktop-other' ? (
              <p className="inst-warn">{t('inst.desktopOther')}</p>
            ) : (
              <div className="inst-state">
                <button type="button" className="inst-btn is-primary is-big" onClick={onInstall}>
                  {t('inst.install')}
                </button>
                <p className="inst-note">{t(prompt ? 'inst.oneTap' : platform.startsWith('ios') ? 'inst.iosNote' : 'inst.guideNote')}</p>
              </div>
            )}
            {!standalone && (
              <button type="button" className="inst-open" onClick={onOpen}>
                {t('inst.browser')}
              </button>
            )}
          </section>
        ) : (
          <section className="inst-card inst-guide is-steps">
            <button type="button" className="inst-back" onClick={() => setView('intro')}>
              <span aria-hidden="true">{lang === 'he' ? '›' : '‹'}</span> {t('inst.back')}
            </button>
            <h1>{t(platform.startsWith('ios') ? 'inst.guide.ios' : platform === 'android' ? 'inst.guide.android' : 'inst.guide.desktop')}</h1>
            {guide}
          </section>
        )}
        {(!inGuide || iosDemo) && (
          <section className="inst-card inst-showcase">{iosDemo ? <IosGuide onStep={setIosStep} /> : <ShowcaseReel />}</section>
        )}
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
