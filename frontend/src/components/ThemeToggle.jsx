import { useTheme } from '../context/ThemeContext';
import { MoonIcon, SunIcon } from './Icons';

// Botón para pasar de modo claro a oscuro. Con withLabel muestra el texto (se usa en el menú del celular).
export default function ThemeToggle({ className = '', withLabel = false }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const label = dark ? 'Activar modo claro' : 'Activar modo oscuro';
  if (withLabel) return <button className={`btn btn-outline ${className}`} type="button" onClick={toggleTheme}>{dark ? <SunIcon/> : <MoonIcon/>}{label}</button>;
  return <button className={`icon-button ${className}`} type="button" onClick={toggleTheme} aria-label={label} title={label}>{dark ? <SunIcon/> : <MoonIcon/>}</button>;
}
