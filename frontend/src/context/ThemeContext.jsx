import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const KEY = 'forbook.welcome.theme'; // Conserva la preferencia de las versiones anteriores.
function initialTheme() {
  try { const saved = localStorage.getItem(KEY); if (saved === 'light' || saved === 'dark') return saved; }
  catch { /* La preferencia es opcional. */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(KEY, theme); } catch { /* El tema funciona sin almacenamiento. */ }
  }, [theme]);
  const toggleTheme = () => setTheme(previous => previous === 'dark' ? 'light' : 'dark');
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
