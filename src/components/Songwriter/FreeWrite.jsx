import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { DURATIONS, PROMPTS, nextPrompt, pieces, wordCount } from '../../music/songwriter/freewrite';
import { Icon } from './icons';

// Timed free writing (v1.0.163; the songwriters' review: write without
// stopping, judge later). Three quiet screens over everything:
//   setup  — a prompt to dive into, the time (3 / 5 / 10 min), Start;
//   write  — a blank page, the time left in a glass bar, nothing else;
//   pick   — the text in pieces: tap the "diamonds" worth keeping; Save
//            makes them an Idea (the whole text is kept with it).

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

export function FreeWrite({ onClose, onSave }) {
  const { t, lang } = useLanguage();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const [stage, setStage] = useState('setup');
  const [promptIdx, setPromptIdx] = useState(() => nextPrompt());
  const [minutes, setMinutes] = useState(5);
  const [text, setText] = useState('');
  const [endAt, setEndAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [picked, setPicked] = useState(() => new Set());
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const taRef = useRef(null);
  const prompt = PROMPTS[promptIdx][lang] ?? PROMPTS[promptIdx].en;

  // the clock (a quiet second tick while writing)
  useEffect(() => {
    if (stage !== 'write') return undefined;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [stage]);
  const left = Math.ceil((endAt - now) / 1000);
  const over = stage === 'write' && left <= 0;

  useEffect(() => {
    if (stage === 'write') taRef.current?.focus();
  }, [stage]);

  // Escape: leaves the setup; while writing it does nothing (no accidents)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && stage === 'setup') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage, onClose]);

  const start = () => {
    setEndAt(Date.now() + minutes * 60000);
    setNow(Date.now());
    setStage('write');
  };
  const finish = () => {
    if (!text.trim()) {
      onClose();
      return;
    }
    setStage('pick');
  };
  const parts = useMemo(() => (stage === 'pick' ? pieces(text) : []), [stage, text]);
  const toggle = (i) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  const save = () => {
    const chosen = parts.filter((_, i) => picked.has(i)).map((p) => p.text);
    onSave({ text: chosen.length ? chosen.join('\n') : text.trim(), free: text.trim(), prompt, minutes });
  };

  return createPortal(
    <div className={'sw-fw is-' + stage} dir={dir} role="dialog" aria-label={t('sw.fw.title')}>
      {stage === 'setup' && (
        <div className="sw-fw-setup">
          <header className="sw-fw-head">
            <button type="button" className="sw-icon-btn" onClick={onClose} aria-label={t('sw.fw.close')}>
              <Icon name="close" />
            </button>
          </header>
          <h1 className="sw-fw-title">{t('sw.fw.title')}</h1>
          <p className="sw-fw-how">{t('sw.fw.how')}</p>
          <section className="sw-fw-prompt">
            <span className="sw-fw-eyebrow">{t('sw.fw.prompt')}</span>
            <p className="sw-fw-prompt-text" dir="auto">
              {prompt}
            </p>
            <button type="button" className="sw-btn is-small is-quiet" onClick={() => setPromptIdx((i) => nextPrompt(i))}>
              <Icon name="spark" />
              {t('sw.fw.another')}
            </button>
          </section>
          <p className="sw-fw-senses">{t('sw.fw.senses')}</p>
          <div className="sw-fw-go">
            <label className="sw-fw-time">
              <span>{t('sw.fw.time')}</span>
              <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
                {DURATIONS.map((m) => (
                  <option key={m} value={m}>
                    {t('sw.fw.min', { n: m })}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="sw-btn is-primary is-big" onClick={start}>
              {t('sw.fw.start')}
            </button>
          </div>
          <p className="sw-fw-source">{t('sw.fw.source')}</p>
        </div>
      )}

      {stage === 'write' && (
        <div className="sw-fw-write">
          <div className="sw-fw-bar glass">
            <span className="sw-fw-bar-prompt" dir="auto">
              {prompt}
            </span>
            <span className={'sw-fw-clock' + (over ? ' is-over' : '')} dir="ltr">
              {over ? t('sw.fw.timeUp') : fmtTime(left)}
            </span>
            {over && (
              <button type="button" className="sw-btn is-small is-quiet" onClick={() => setEndAt(Date.now() + 2 * 60000)}>
                {t('sw.fw.more')}
              </button>
            )}
            <button type="button" className={'sw-btn is-small' + (over ? ' is-primary' : ' is-tint')} onClick={finish}>
              {t('sw.done')}
            </button>
          </div>
          <textarea
            ref={taRef}
            className="sw-fw-page"
            dir="auto"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('sw.fw.placeholder')}
            spellCheck={false}
            autoCorrect="off"
          />
          <span className="sw-fw-count" dir="ltr">
            {t('sw.fw.words', { n: wordCount(text) })}
          </span>
        </div>
      )}

      {stage === 'pick' && (
        <div className="sw-fw-pick">
          <header className="sw-fw-head">
            <h1 className="sw-fw-title">{t('sw.fw.pickTitle')}</h1>
          </header>
          <p className="sw-fw-how">{t('sw.fw.pickHow')}</p>
          <ul className="sw-fw-pieces">
            {parts.map((p, i) => (
              <li key={i}>
                <button type="button" className={'sw-fw-piece' + (picked.has(i) ? ' is-on' : '')} aria-pressed={picked.has(i)} onClick={() => toggle(i)} dir="auto">
                  {p.text}
                </button>
              </li>
            ))}
          </ul>
          <div className="sw-fw-foot glass">
            {confirmDiscard ? (
              <button type="button" className="sw-btn is-small is-danger" onClick={onClose}>
                {t('sw.fw.discardSure')}
              </button>
            ) : (
              <button type="button" className="sw-btn is-small is-quiet-danger" onClick={() => setConfirmDiscard(true)}>
                {t('sw.fw.discard')}
              </button>
            )}
            <span className="sw-fw-foot-note">{picked.size ? t('sw.fw.picked', { n: picked.size }) : t('sw.fw.pickNone')}</span>
            <button type="button" className="sw-btn is-primary" onClick={save}>
              {t('sw.fw.save')}
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
