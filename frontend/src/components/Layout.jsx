import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PublicAccessContext } from '../context/PublicAccessContext';
import { firstName } from '../utils/content';
import AuthModal from './AuthModal';
import ThemeToggle from './ThemeToggle';
import { ErrorMessage } from './Feedback';
import { CloseIcon, MenuIcon } from './Icons';

// Secciones de la bienvenida a las que lleva la navegación pública.
const sections = [['funciones', 'Funciones'], ['conozcamos', 'Conozcamos Formosa'], ['mapa', 'Mapa'], ['puntos', 'Puntos']];

export function Brand() {
  return <Link className="brand" to="/" aria-label="Forbook, página principal"><span className="brand-mark" aria-hidden="true">f</span><span className="brand-name" aria-hidden="true">forbook</span></Link>;
}

export default function Layout() {
  const { user, checking, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [access, setAccess] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const openAccess = useCallback((mode, returnTo) => { setMenuOpen(false); setAccess({ mode, returnTo }); }, []);
  const closeAccess = useCallback(() => setAccess(null), []);
  const changeMode = useCallback(mode => setAccess(previous => ({ ...previous, mode })), []);

  // /ingresar, /registro y las rutas privadas llegan con state.authMode: se abre la ventana correspondiente.
  useEffect(() => {
    const mode = location.state?.authMode;
    if (!mode || checking) return;
    const returnTo = location.state?.from;
    if (user) { navigate(returnTo || '/inicio', { replace: true }); return; }
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state: null });
    setAccess({ mode, returnTo });
  }, [location, checking, user, navigate]);

  // Con la sesión iniciada no tiene sentido dejar abierta la ventana de acceso.
  useEffect(() => { if (user) setAccess(null); }, [user]);
  useEffect(() => { setMenuOpen(false); }, [location.pathname, location.hash]);
  useEffect(() => {
    if (!menuOpen) return;
    const wide = window.matchMedia('(min-width: 901px)');
    const closeOnWide = () => { if (wide.matches) setMenuOpen(false); };
    const closeOnEscape = event => { if (event.key === 'Escape') setMenuOpen(false); };
    wide.addEventListener('change', closeOnWide);
    document.addEventListener('keydown', closeOnEscape);
    return () => { wide.removeEventListener('change', closeOnWide); document.removeEventListener('keydown', closeOnEscape); };
  }, [menuOpen]);

  async function closeSession() {
    setBusy(true); setError('');
    // Primero se sale de la ruta privada; así no se abre la ventana de ingreso al cerrar la sesión.
    navigate('/', { replace: true });
    try { await logout(); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }

  const name = user ? firstName(user.name) : '';
  const links = user
    ? <><NavLink to="/inicio">Mi inicio</NavLink><NavLink to="/conozcamos">Conozcamos Formosa</NavLink><NavLink to="/preguntas">Preguntas</NavLink></>
    : sections.map(([id, label]) => <Link key={id} to={{ pathname: '/', hash: `#${id}` }}>{label}</Link>);

  return <PublicAccessContext.Provider value={{ openAccess }}>
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <header className="site-header">
      <div className="container header-inner">
        <Brand/>
        {!checking && <nav className="main-nav" aria-label="Navegación principal">{links}</nav>}
        <div className="header-actions">
          {checking ? <span className="header-placeholder" aria-hidden="true"/> : <>
            <ThemeToggle className="desktop-only"/>
            {user ? <>
              <span className="user-chip desktop-only"><span className="avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span><span>{name}</span></span>
              <button className="btn btn-outline btn-small desktop-only" type="button" onClick={closeSession} disabled={busy}>{busy ? 'Cerrando…' : 'Cerrar sesión'}</button>
            </> : <>
              <button className="btn btn-outline btn-small" type="button" onClick={() => openAccess('login')}>Ingresar</button>
              <button className="btn btn-primary btn-small desktop-only" type="button" onClick={() => openAccess('register')}>Crear cuenta</button>
            </>}
            <button className="icon-button menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <CloseIcon/> : <MenuIcon/>}</button>
          </>}
        </div>
      </div>
      {menuOpen && <div id="mobile-menu" className="mobile-menu"><div className="container">
        <nav aria-label="Navegación principal">{links}</nav>
        <div className="menu-actions">
          {user && <p className="menu-user"><span className="avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>{user.name}</p>}
          <ThemeToggle withLabel/>
          {user
            ? <button className="btn btn-outline" type="button" onClick={closeSession} disabled={busy}>{busy ? 'Cerrando…' : 'Cerrar sesión'}</button>
            : <button className="btn btn-primary" type="button" onClick={() => openAccess('register')}>Crear cuenta</button>}
        </div>
      </div></div>}
    </header>
    {error && <div className="container header-error"><ErrorMessage message={error}/></div>}
    <main id="main" tabIndex="-1"><Outlet/></main>
    <footer className="site-footer"><div className="container footer-inner"><Brand/><p>Hecho para tu llegada a Formosa.</p></div></footer>
    {access && <AuthModal mode={access.mode} returnTo={access.returnTo} onClose={closeAccess} onModeChange={changeMode}/>}
  </PublicAccessContext.Provider>;
}
