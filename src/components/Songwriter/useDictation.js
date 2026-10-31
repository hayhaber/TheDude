import { useCallback, useEffect, useRef, useState } from 'react';

// Speech -> text with the browser's own recognizer (Chrome / Edge / Android
// send the audio to Google, Safari to Apple's Siri service). No key, no
// server of ours. Each finished phrase (a pause) is one lyric line; saying
// "new section" / "קטע חדש" leaves a blank line.

const Recognizer = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
export const DICTATION_SUPPORTED = !!Recognizer;

const LANG_KEY = 'dudestar-dictation-lang';
export const DICTATION_LANGS = { he: 'he-IL', en: 'en-US' };

export function loadDictationLang(fallback) {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v && DICTATION_LANGS[v]) return v;
  } catch {
    /* ignore */
  }
  return DICTATION_LANGS[fallback] ? fallback : 'en';
}

export function saveDictationLang(v) {
  try {
    localStorage.setItem(LANG_KEY, v);
  } catch {
    /* ignore */
  }
}

const SECTION_WORDS = /^(new (section|verse|chorus|part)|קטע חדש|בית חדש|פזמון)$/i;

/** One recognized phrase -> a lyric line ('' = section break, null = nothing). */
export function cleanPhrase(s) {
  let x = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (!x) return null;
  if (SECTION_WORDS.test(x.replace(/[.,!?]+$/, ''))) return '';
  // Lyrics don't end lines with a full stop or comma.
  x = x.replace(/[.,;:]+$/, '').trim();
  return x || null;
}

/** Appends a dictated line to the text (a section break = an empty line). */
export function appendPhrase(text, line) {
  const base = text.replace(/[ \t]+$/, '');
  if (line === '') return base && !base.endsWith('\n\n') ? base.replace(/\n?$/, '\n\n') : base;
  if (!base) return line;
  return base.endsWith('\n') ? base + line : base + '\n' + line;
}

export function useDictation({ lang, onPhrase }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);
  const rec = useRef(null);
  const want = useRef(false);
  const committed = useRef(0); // results of this session already turned into lines
  const pending = useRef(''); // the not-yet-final words (Safari may never finalize)
  const onPhraseRef = useRef(onPhrase);
  onPhraseRef.current = onPhrase;
  const startedAt = useRef(0);

  const commit = (s) => {
    const line = cleanPhrase(s);
    if (line != null) onPhraseRef.current(line);
  };

  const flushPending = () => {
    if (pending.current) commit(pending.current);
    pending.current = '';
    setInterim('');
  };

  const begin = useCallback(() => {
    const r = new Recognizer();
    r.lang = DICTATION_LANGS[lang] ?? 'en-US';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    committed.current = 0;
    pending.current = '';
    r.onresult = (e) => {
      let tail = '';
      for (let i = committed.current; i < e.results.length; i += 1) {
        const res = e.results[i];
        if (res.isFinal && i === committed.current) {
          commit(res[0].transcript);
          committed.current = i + 1;
        } else {
          tail += res[0].transcript;
        }
      }
      pending.current = tail.trim();
      setInterim(pending.current);
    };
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      want.current = false;
      setError(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : e.error === 'network' ? 'network' : 'failed');
    };
    r.onend = () => {
      flushPending();
      // Chrome ends a session after a long silence: carry on while wanted
      // (not if it ended at once — that would spin).
      if (want.current && Date.now() - startedAt.current > 1500) {
        try {
          begin();
          return;
        } catch {
          /* fall through */
        }
      }
      want.current = false;
      rec.current = null;
      setListening(false);
    };
    rec.current = r;
    startedAt.current = Date.now();
    r.start();
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(() => {
    if (!Recognizer || rec.current) return;
    setError(null);
    want.current = true;
    try {
      begin();
      setListening(true);
    } catch {
      want.current = false;
      setError('failed');
    }
  }, [begin]);

  const stop = useCallback(() => {
    want.current = false;
    const r = rec.current;
    if (!r) return;
    try {
      r.stop();
    } catch {
      /* ignore */
    }
  }, []);

  // Leaving the screen (or changing language) ends the session.
  useEffect(
    () => () => {
      want.current = false;
      try {
        rec.current?.abort();
      } catch {
        /* ignore */
      }
      rec.current = null;
    },
    [lang]
  );

  return { supported: DICTATION_SUPPORTED, listening, interim, error, start, stop };
}
