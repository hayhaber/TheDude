import { createContext, useContext, useEffect, useState } from 'react';
import { STRINGS } from './strings';

const STORAGE_KEY = 'lang';

function getInitialLang() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'he') return stored;
  return navigator.language?.toLowerCase().startsWith('he') ? 'he' : 'en';
}

function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

const LanguageContext = createContext(null);

// Same persistence pattern as useTheme.js — seeded from localStorage, synced
// back on change. Unlike theme (purely CSS-variable driven), every leaf
// component needs the current language to pick which string to render, so
// this is exposed via Context rather than threaded prop-by-prop through
// every intermediate view.
export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(getInitialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  function t(key, vars) {
    const template = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
    return interpolate(template, vars);
  }

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
