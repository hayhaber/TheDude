// Settings row "Your account": sign in with Google / synced as … / Sync,
// Disconnect, Delete account (cloud/cloudSync.js does the work).
import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { getLink, loadCloud } from './cloudState';
import { useCloud } from './useCloud';
import './Cloud.css';

export function GoogleG() {
  return (
    <svg className="cloud-g" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function useNow(ms) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function CloudField() {
  const { t } = useLanguage();
  const cloud = useCloud();
  const now = useNow(30000);
  const [confirm, setConfirm] = useState(false);
  const link = getLink();
  const email = cloud.email || link?.email;
  const signIn = () => loadCloud().then((m) => m.signIn());

  const when = (iso) => {
    if (!iso) return t('cloud.never');
    const min = Math.floor((now - Date.parse(iso)) / 60000);
    if (min < 1) return t('cloud.justNow');
    if (min < 60) return t('cloud.minAgo', { n: min });
    return new Date(iso).toLocaleString();
  };

  let body;
  if (!link || !email) {
    body = (
      <>
        <span className="settings-install-text">{cloud.error === 'signin' ? t('cloud.errorSignin') : t('cloud.intro')}</span>
        <span className="settings-install-actions">
          <button type="button" className="settings-install-btn cloud-google" onClick={signIn}>
            <GoogleG />
            {t('cloud.signIn')}
          </button>
        </span>
      </>
    );
  } else if (cloud.status === 'signedOut') {
    body = (
      <>
        <span className="settings-install-text">{t('cloud.expired', { email })}</span>
        <span className="settings-install-actions">
          <button type="button" className="settings-install-btn cloud-google" onClick={signIn}>
            <GoogleG />
            {t('cloud.signIn')}
          </button>
        </span>
      </>
    );
  } else if (confirm) {
    body = (
      <>
        <span className="settings-install-text">{t('cloud.deleteConfirm')}</span>
        <span className="settings-install-actions">
          <button
            type="button"
            className="settings-install-btn cloud-danger"
            onClick={() => loadCloud().then((m) => m.deleteAccount()).then(() => setConfirm(false))}
          >
            {t('cloud.deleteBtn')}
          </button>
          <button type="button" className="settings-install-btn" onClick={() => setConfirm(false)}>
            {t('cloud.cancel')}
          </button>
        </span>
      </>
    );
  } else {
    const busy = cloud.status === 'syncing';
    body = (
      <>
        <span className="settings-install-text cloud-status">
          <span className="cloud-email">{t('cloud.signedAs', { email })}</span>
          <span className={'cloud-sub' + (cloud.status === 'error' ? ' is-error' : '')}>
            {busy ? t('cloud.syncing') : cloud.status === 'error' ? t('cloud.error') : t('cloud.lastSync', { when: when(cloud.lastSync || link.lastSync) })}
          </span>
        </span>
        <span className="settings-install-actions">
          <button type="button" className="settings-install-btn is-primary" disabled={busy} onClick={() => loadCloud().then((m) => m.syncNowFromUi())}>
            {cloud.status === 'error' ? t('cloud.retry') : t('cloud.sync')}
          </button>
          <button type="button" className="settings-install-btn" onClick={() => loadCloud().then((m) => m.signOut())}>
            {t('cloud.signOut')}
          </button>
        </span>
        <button type="button" className="cloud-delete-link" onClick={() => setConfirm(true)}>
          {t('cloud.delete')}
        </button>
      </>
    );
  }

  return (
    <div className="settings-field settings-install cloud-field">
      <span className="settings-field-label">{t('cloud.title')}</span>
      {body}
    </div>
  );
}
