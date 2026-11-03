import { useTheme } from '../context/ThemeContext';
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const label = dark ? 'Activar modo claro' : 'Activar modo oscuro';
  return <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={label} title={label} aria-pressed={dark}>
    {dark ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>
      : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20.5 13.4A8.7 8.7 0 0 1 10.6 3.5a8.7 8.7 0 1 0 9.9 9.9Z"/></svg>}
  </button>;
}
