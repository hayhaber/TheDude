import { Component } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { errorLogText, logError } from './errorLog';
import '../components/ui/ui.css';
import './ErrorBoundary.css';

// A screen that throws while drawing used to leave a blank page (v1.0.288):
// now it's logged, and an iOS-style page offers Reload and the report.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error, info) {
    logError({ message: error?.message || String(error), stack: (error?.stack || '') + '\n' + (info?.componentStack || '').split('\n').slice(0, 4).join('\n') }, 'screen');
  }
  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}

export async function shareErrorLog() {
  const text = errorLogText();
  try {
    if (navigator.share) {
      await navigator.share({ title: 'DudeStar', text });
      return 'shared';
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancel';
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

function Fallback() {
  const { t, lang } = useLanguage();
  return (
    <div className="err-page" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <div className="err-card">
        <div className="err-icon" aria-hidden="true">!</div>
        <h1>{t('err.title')}</h1>
        <p>{t('err.text')}</p>
        <button type="button" className="ui-btn is-filled is-lg" onClick={() => window.location.reload()}>
          <span className="ui-btn-label">{t('err.reload')}</span>
        </button>
        <button type="button" className="ui-btn is-plain is-md" onClick={() => shareErrorLog()}>
          <span className="ui-btn-label">{t('err.send')}</span>
        </button>
      </div>
    </div>
  );
}
