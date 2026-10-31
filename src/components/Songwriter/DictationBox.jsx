import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Icon } from './icons';
import { appendPhrase, loadDictationLang, saveDictationLang, useDictation } from './useDictation';

/**
 * Lyrics text box with a Dictate key: speak and each phrase becomes a line.
 * Controlled (`text` / `onText`). `autoStart` begins listening at once.
 */
export function DictationBox({ text, onText, autoFocus = false, autoStart = false, onBlur, rows = 4 }) {
  const { t, lang } = useLanguage();
  const [dLang, setDLang] = useState(() => loadDictationLang(lang));
  const ref = useRef(null);
  const textRef = useRef(text);
  textRef.current = text;
  const d = useDictation({
    lang: dLang,
    onPhrase: (line) => {
      const next = appendPhrase(textRef.current, line);
      textRef.current = next;
      onText(next);
    },
  });

  useEffect(() => {
    if (autoStart && d.supported) d.start();
    else if (autoFocus) {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the newest dictated words in view.
  useEffect(() => {
    const el = ref.current;
    if (el && d.listening) el.scrollTop = el.scrollHeight;
  }, [text, d.listening]);

  return (
    <div className={'sw-dict' + (d.listening ? ' is-listening' : '')}>
      <textarea
        ref={ref}
        dir="auto"
        rows={rows}
        value={text}
        placeholder={t(d.supported ? 'sw.dict.hint' : 'sw.idea.wordsHint')}
        onChange={(e) => onText(e.target.value)}
        onBlur={(e) => {
          // Tapping the dictation keys must not close the box.
          if (e.relatedTarget?.closest?.('.sw-dict')) return;
          if (!d.listening) onBlur?.();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onBlur?.();
        }}
      />
      {d.listening && (
        <p className="sw-dict-live" dir="auto">
          <span className="sw-rec-dot" />
          <span>{d.interim || t('sw.dict.listening')}</span>
        </p>
      )}
      {d.error && <p className="sw-error">{t('sw.dict.err.' + d.error)}</p>}
      {d.supported && (
        <div className="sw-dict-keys">
          <button type="button" className={'sw-btn is-small' + (d.listening ? ' is-danger' : '')} onClick={() => (d.listening ? d.stop() : d.start())}>
            <Icon name={d.listening ? 'stop' : 'mic'} size={16} />
            {d.listening ? t('sw.stop') : t('sw.dict.go')}
          </button>
          <span className="mode-toggle sw-dict-lang" dir="ltr" role="group" aria-label={t('sw.dict.lang')}>
            {['he', 'en'].map((k) => (
              <button
                key={k}
                type="button"
                className={dLang === k ? 'active' : ''}
                disabled={d.listening}
                onClick={() => {
                  setDLang(k);
                  saveDictationLang(k);
                }}
              >
                {k === 'he' ? 'עב' : 'EN'}
              </button>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
