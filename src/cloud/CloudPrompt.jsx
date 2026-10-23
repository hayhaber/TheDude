// App-wide pieces of the cloud sync: the "both have data" choice after a
// first sign-in on a device that already has its own data, and a short
// notice after signing in.
import { useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { loadCloud, setCloudState } from './cloudState';
import { useCloud } from './useCloud';
import './Cloud.css';

export function CloudPrompt() {
  const { t, lang } = useLanguage();
  const cloud = useCloud();

  useEffect(() => {
    if (!cloud.notice) return undefined;
    const id = setTimeout(() => setCloudState({ notice: null }), 5000);
    return () => clearTimeout(id);
  }, [cloud.notice]);

  const dir = lang === 'he' ? 'rtl' : 'ltr';
  if (cloud.status === 'choose')
    return (
      <div className="cloud-modal-backdrop" dir={dir}>
        <div className="cloud-modal" role="dialog" aria-modal="true" aria-labelledby="cloud-choose-title">
          <h2 id="cloud-choose-title">{t('cloud.chooseTitle')}</h2>
          <p>{t('cloud.chooseText')}</p>
          <p className="cloud-modal-note">{t('cloud.chooseNote')}</p>
          <div className="cloud-modal-actions">
            <button type="button" className="cloud-modal-btn is-primary" onClick={() => loadCloud().then((m) => m.choose('cloud'))}>
              {t('cloud.keepCloud')}
            </button>
            <button type="button" className="cloud-modal-btn" onClick={() => loadCloud().then((m) => m.choose('device'))}>
              {t('cloud.keepDevice')}
            </button>
          </div>
        </div>
      </div>
    );
  const text = cloud.notice === 'uploaded' ? t('cloud.uploaded') : cloud.error === 'signin' ? t('cloud.errorSignin') : null;
  if (!text) return null;
  return (
    <div className="cloud-toast" role="status" dir={dir}>
      {text}
    </div>
  );
}
