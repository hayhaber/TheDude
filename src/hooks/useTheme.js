import { useEffect, useState } from 'react';

const STORAGE_KEY = 'theme';

function getInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  // Light, always, on first launch — deliberately NOT following the OS/
  // browser's own prefers-color-scheme. A first-time visitor whose device
  // happens to be in Dark Mode (very common by default on iOS) shouldn't
  // land on a dark app before they've ever made a choice here; Dark stays
  // one tap away in Settings and is remembered from then on.
  return 'light';
}

// Persists the user's explicit Light/Dark choice and stamps it onto <html>
// as data-theme, which index.css keys off of — once set, this always wins
// over whatever the OS/browser happens to prefer.
export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return { theme, setTheme };
}
