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
  const [ocr, setOcr] = useState(null);

  const run = useCallback(async () => {
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      const [{ cloudClient }, { checkServer }] = await Promise.all([import('../../cloud/cloudSync'), import('../../cloud/serverCheck')]);
      // every probe runs at once; no answer at all in 20 s = too slow
      const slow = new Promise((_, no) => setTimeout(() => no(Object.assign(new Error('timeout'), { kind: 'slow' })), 20000));
      const res = await Promise.race([checkServer(cloudClient()), slow]);
      setState({ busy: false, res, error: null });
      // reading scanned charts needs the AI key on Vercel (v1.0.292)
      fetch('/api/chart-ocr')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setOcr(!!d.ready))
        .catch(() => {});
    } catch (e) {
      const kind = e?.kind || (typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error');
      setState({ busy: false, res: null, error: { kind, msg: kind === 'error' ? e?.message || '' : '' } });
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
    line = t({ offline: 'srv.offline', slow: 'srv.slow', session: 'srv.session' }[state.error.kind] || 'srv.error');
    tone = 'is-warn';
  } else if (res && !res.missing.length && res.unsure.length) {
    line = t('srv.unsure', { n: res.unsure.length });
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
      {state.error?.msg && (
        <p className="set-footnote srv-why" dir="ltr">
          {state.error.msg}
        </p>
      )}
      {res && !res.missing.length && res.unsure.length > 0 && (
        <p className="set-footnote" dir="ltr">
          {res.unsure.map((u) => String(u.n).padStart(3, '0')).join(' · ')}
          {res.unsure[0]?.why ? ' — ' + res.unsure[0].why : ''}
        </p>
      )}
      {ocr != null && (
        <p className="set-footnote">{ocr ? t('srv.ocrOk') : t('srv.ocrSetup')}</p>
      )}
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
