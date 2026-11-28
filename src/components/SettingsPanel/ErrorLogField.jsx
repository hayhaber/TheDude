import { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { clearErrorLog, errorLog, onErrorLog } from '../../debug/errorLog';
import { shareErrorLog } from '../../debug/ErrorBoundary';
import { Button } from '../ui/controls';

// Settings › Advanced › Errors on this device (v1.0.288).
export function ErrorLogField() {
  const { t, lang } = useLanguage();
  const [list, setList] = useState(errorLog);
  const [msg, setMsg] = useState('');
  useEffect(() => onErrorLog(() => setList(errorLog())), []);
  const last = list[list.length - 1];
  const when = last ? new Date(last.at).toLocaleString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div className="srv" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <div className="srv-head">
        <span className={'srv-dot ' + (list.length ? 'is-warn' : 'is-ok')} aria-hidden="true">
          {list.length ? '!' : '✓'}
        </span>
        <span className="srv-line">{list.length ? t('errlog.count', { n: list.length, when }) : t('errlog.none')}</span>
      </div>
      {list.length > 0 && (
        <div className="errlog-keys">
          <Button
            size="sm"
            variant="gray"
            onClick={async () => {
              const r = await shareErrorLog();
              setMsg(r === 'copied' ? t('errlog.copied') : '');
            }}
          >
            {t('errlog.share')}
          </Button>
          <Button size="sm" variant="plain" danger onClick={() => clearErrorLog()}>
            {t('errlog.clear')}
          </Button>
        </div>
      )}
      {msg && <p className="set-footnote">{msg}</p>}
      <p className="set-footnote">{t('errlog.note')}</p>
    </div>
  );
}
