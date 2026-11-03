import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../pages/WelcomePage.css';
import { PublicAccessContext } from '../context/PublicAccessContext';
import AuthModal from './AuthModal';

const THEME_KEY = 'forbook.welcome.theme';
function initialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* La preferencia es opcional si el navegador bloquea almacenamiento. */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function WelcomeLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [accessMode, setAccessMode] = useState(null);
  const openAccess = useCallback(mode => setAccessMode(mode), []);
  const closeAccess = useCallback(() => setAccessMode(null), []);
  useEffect(() => {
    if (location.state?.authMode) {
      if (user) { navigate('/inicio', { replace: true }); return; }
      setAccessMode(location.state.authMode);
      navigate('/', { replace: true, state: null });
    }
  }, [location.state, navigate, user]);
  const [theme, setTheme] = useState(initialTheme);
  const dark = theme === 'dark';
  function toggleTheme() {
    const next = dark ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); }
    catch { /* La interfaz sigue funcionando sin persistir esta preferencia. */ }
  }
  return <PublicAccessContext.Provider value={{ openAccess }}><div className="welcome-shell" data-theme={theme}>
    <a className="welcome-skip" href="#main">Saltar al contenido</a>
    <header className="welcome-header welcome-width">
      <Link className="welcome-wordmark" to="/" aria-label="Forbook, inicio">forbook.</Link>
      <nav className="welcome-nav" aria-label="Navegación principal">
        <button className="welcome-theme" type="button" onClick={toggleTheme}
          aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
          title={dark ? 'Activar modo claro' : 'Activar modo oscuro'} aria-pressed={dark}>
          {dark ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20.5 13.4A8.7 8.7 0 0 1 10.6 3.5a8.7 8.7 0 1 0 9.9 9.9Z"/></svg>}
        </button>
        {user ? <Link className="welcome-login" to="/inicio">Mi inicio</Link>
          : <button className="welcome-login" type="button" onClick={() => openAccess('login')}>Ingresar</button>}
      </nav>
    </header>
    <main id="main" className="welcome-main welcome-width"><Outlet/></main>
    <footer className="welcome-footer welcome-width"><p>Información para tus primeros pasos.</p></footer>
    {accessMode && <AuthModal mode={accessMode} onClose={closeAccess} onModeChange={setAccessMode}/>}
  </div></PublicAccessContext.Provider>;
}
