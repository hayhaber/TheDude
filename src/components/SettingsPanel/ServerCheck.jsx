import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useCloud } from '../../cloud/useCloud';
import { Button } from '../ui/controls';

// Settings › Advanced › Server (v1.0.288): checks by itself, when the page
// opens, which Supabase setup scripts ran; all in = one green line, else the
// missing ones by number with what each turns on and how to run it.
export function ServerCheck() {
  const { t, lang } = useLanguage();
  const cloud = useCloud();
  const signedIn = !!cloud.email;
  const [state, setState] = useState({ busy: false, res: null, error: null });

  const run = useCallback(async () => {
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      const [{ cloudClient }, { checkServer }] = await Promise.all([import('../../cloud/cloudSync'), import('../../cloud/serverCheck')]);
      // no answer in 10 s = offline (the client retries a lost connection for long)
      const res = await Promise.race([checkServer(cloudClient()), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 10000))]);
      setState({ busy: false, res, error: null });
    } catch (e) {
      setState({ busy: false, res: null, error: e?.message || 'offline' });
    }
  }, []);

  useEffect(() => {
    if (signedIn) run();
  }, [signedIn, run]);

  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const res = state.res;
  let line;
  let tone = '';
  if (!signedIn) line = t('srv.signIn');
  else if (state.busy && !res) line = t('srv.checking');
  else if (state.error) {
    line = t('srv.offline');
    tone = 'is-warn';
  } else if (res && !res.missing.length) {
    line = t('srv.ok');
    tone = 'is-ok';
  } else if (res) {
    line = t('srv.missing', { n: res.missing.length });
    tone = 'is-warn';
  }

  return (
    <div className="srv" dir={dir}>
      <div className="srv-head">
        <span className={'srv-dot ' + tone} aria-hidden="true">
          {tone === 'is-ok' ? '✓' : tone === 'is-warn' ? '!' : ''}
        </span>
        <span className="srv-line">{line}</span>
        {signedIn && (
          <Button size="sm" variant="gray" onClick={run} disabled={state.busy}>
            {state.busy ? t('srv.checking') : t('srv.check')}
          </Button>
        )}
      </div>
      {res && res.missing.length > 0 && (
        <>
          <ul className="srv-list">
            {res.missing.map((m) => (
              <li key={m.n} className="srv-row">
                <span className="srv-num" dir="ltr">
                  {String(m.n).padStart(3, '0')}
                </span>
                <span className="srv-text">
                  <span className="srv-what">{t('srv.m.' + m.n)}</span>
                  <code className="srv-file" dir="ltr">
                    {m.file}
                  </code>
                </span>
              </li>
            ))}
          </ul>
          <p className="set-footnote">{t('srv.how')}</p>
        </>
      )}
    </div>
  );
}
