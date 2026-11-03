import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../pages/WelcomePage.css';
import { PublicAccessContext } from '../context/PublicAccessContext';
import AuthModal from './AuthModal';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';

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
  const { theme } = useTheme();
  return <PublicAccessContext.Provider value={{ openAccess }}><div className="welcome-shell" data-theme={theme}>
    <a className="welcome-skip" href="#main">Saltar al contenido</a>
    <header className="welcome-header welcome-width">
      <Link className="welcome-wordmark" to="/" aria-label="Forbook, inicio">forbook.</Link>
      <nav className="welcome-nav" aria-label="Navegación principal">
        <ThemeToggle/>
        {user ? <Link className="welcome-login" to="/inicio">Mi inicio</Link>
          : <button className="welcome-login" type="button" onClick={() => openAccess('login')}>Ingresar</button>}
      </nav>
    </header>
    <main id="main" className="welcome-main welcome-width"><Outlet/></main>
    <footer className="welcome-footer welcome-width"><p>Información para tus primeros pasos.</p></footer>
    {accessMode && <AuthModal mode={accessMode} onClose={closeAccess} onModeChange={setAccessMode}/>}
  </div></PublicAccessContext.Provider>;
}
