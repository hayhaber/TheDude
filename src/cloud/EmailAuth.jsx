// Email + password for the account row (CloudField): ONE form for everyone
// (user's call 2026-10-25) — email + password + Continue signs in, or opens
// a new account when the address has none (6-digit code by email); forgot
// password = code -> new password.
import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { loadCloud } from './cloudState';

const call = (fn, ...args) => loadCloud().then((m) => m[fn](...args));

export function EmailAuth({ onDone }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState('main'); // main | forgot | code | newPassword
  const [created, setCreated] = useState(false);
  const [codeType, setCodeType] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const [suggest, setSuggest] = useState(null); // a likely typo in the address' domain

  const go = (m) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  const run = async (fn, ...args) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const r = await call(fn, ...args);
      if (r?.error) setError(r.error);
      else if (r?.next === 'code') {
        setCodeType(r.type);
        setCreated(!!r.created);
        setCode('');
        setMode('code');
      } else if (r?.next === 'newPassword') {
        setPassword('');
        setMode('newPassword');
      } else if (r?.ok) onDone?.();
    } catch {
      setError('cloud.err.network');
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (busy) return;
    const em = email.trim();
    if ((mode === 'main' || mode === 'forgot') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setError('cloud.err.email');
    if ((mode === 'main' || mode === 'forgot') && !suggest) {
      const fix = fixDomain(em);
      if (fix) return setSuggest(fix); // ask once; a second tap goes ahead as typed
    }
    if (mode === 'main' && !password) return setError('cloud.err.password');
    if (mode === 'code' && code.length < 6) return setError('cloud.err.code');
    if (mode === 'main') run('emailContinue', em, password);
    else if (mode === 'forgot') run('emailForgot', em);
    else if (mode === 'code') run('emailVerify', em, code, codeType);
    else if (mode === 'newPassword') {
      if (password.length < 8) return setError('cloud.err.weak');
      run('emailNewPassword', password);
    }
  };

  const resend = async () => {
    setBusy(true);
    const r = await call('emailResend', email.trim(), codeType).catch(() => ({ error: 'cloud.err.network' }));
    setBusy(false);
    if (r?.error) setError(r.error);
    else setInfo('cloud.resent');
  };

  const emailInput = (
    <input
      className="cloud-input"
      type="email"
      inputMode="email"
      autoComplete="email"
      dir="ltr"
      required
      placeholder={t('cloud.email')}
      aria-label={t('cloud.email')}
      value={email}
      onChange={(e) => {
        setEmail(e.target.value);
        setSuggest(null);
      }}
    />
  );
  const passwordInput = (label, auto) => (
    <input
      className="cloud-input"
      type="password"
      autoComplete={auto}
      dir="ltr"
      required
      minLength={mode === 'main' ? undefined : 8}
      placeholder={label}
      aria-label={label}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />
  );

  const primary = { main: 'cloud.continue', forgot: 'cloud.send', code: 'cloud.confirm', newPassword: 'cloud.save' }[mode];

  return (
    <form className="cloud-form" onSubmit={submit} noValidate>
      {mode === 'forgot' && <p className="cloud-form-text">{t('cloud.forgotText')}</p>}
      {mode === 'code' && <p className="cloud-form-text">{t(created ? 'cloud.codeSentNew' : 'cloud.codeSent', { email: email.trim() })}</p>}
      {mode === 'code' && <p className="cloud-form-hint">{t('cloud.checkAddress')}</p>}
      {mode === 'newPassword' && <p className="cloud-form-text">{t('cloud.newPasswordText')}</p>}

      {(mode === 'main' || mode === 'forgot') && emailInput}
      {mode === 'main' && passwordInput(t('cloud.password'), 'current-password')}
      {mode === 'main' && <p className="cloud-form-hint">{t('cloud.newHint')}</p>}
      {mode === 'newPassword' && passwordInput(t('cloud.newPassword'), 'new-password')}
      {mode === 'code' && (
        <input
          className="cloud-input cloud-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          dir="ltr"
          required
          maxLength={10}
          placeholder={t('cloud.code')}
          aria-label={t('cloud.code')}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
      )}

      {suggest && (mode === 'main' || mode === 'forgot') && (
        <p className="cloud-form-info">
          {t('cloud.didYouMean')}{' '}
          <button
            type="button"
            className="cloud-link"
            dir="ltr"
            onClick={() => {
              setEmail(suggest);
              setSuggest(null);
            }}
          >
            {suggest}
          </button>
        </p>
      )}
      {error && <p className="cloud-form-error">{t(error)}</p>}
      {info && <p className="cloud-form-info">{t(info)}</p>}

      <div className="cloud-form-actions">
        <button type="submit" className="settings-install-btn is-primary" disabled={busy}>
          {busy ? t('cloud.syncing').replace(/[.…]+$/, '…') : t(primary)}
        </button>
        {mode === 'code' && (
          <button type="button" className="settings-install-btn" disabled={busy} onClick={resend}>
            {t('cloud.resend')}
          </button>
        )}
        {mode !== 'main' && mode !== 'newPassword' && (
          <button type="button" className="settings-install-btn" onClick={() => go('main')}>
            {t(mode === 'code' ? 'cloud.changeEmail' : 'cloud.back')}
          </button>
        )}
      </div>

      {mode === 'main' && (
        <div className="cloud-form-links">
          <button type="button" className="cloud-link" onClick={() => go('forgot')}>
            {t('cloud.forgot')}
          </button>
        </div>
      )}
    </form>
  );
}

// Common misspellings of the big mail domains -> the right one (a code sent to
// a wrong address never arrives, and the person can't tell why).
const DOMAINS = ['gmail.com', 'walla.co.il', 'walla.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'live.com', 'me.com'];
function dist(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1)
    for (let j = 1; j <= b.length; j += 1)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
        i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] ? d[i - 2][j - 2] + 1 : Infinity);
  return d[a.length][b.length];
}
export function fixDomain(email) {
  const at = email.lastIndexOf('@');
  const dom = email.slice(at + 1).toLowerCase();
  if (DOMAINS.includes(dom)) return null;
  let best = null;
  for (const d of DOMAINS) {
    const k = dist(dom, d);
    if (k > 0 && k <= 2 && (!best || k < best.k)) best = { d, k };
  }
  return best ? email.slice(0, at + 1) + best.d : null;
}
