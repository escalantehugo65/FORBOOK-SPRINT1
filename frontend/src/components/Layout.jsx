import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PublicAccessContext } from '../context/PublicAccessContext';
import Avatar from './Avatar';
import DecoratedName from './DecoratedName';
import UserMenu from './UserMenu';
import { canModerate } from '../utils/moderation';
import { friendService } from '../services/friends';
import { formatPoints, pointsLabel } from '../utils/shop';
import AuthModal from './AuthModal';
import ThemeToggle from './ThemeToggle';
import { ErrorMessage } from './Feedback';
import { BlockedAccount, RestrictedBanner } from './AccountNotice';
import { CloseIcon, MenuIcon, PointsIcon, SearchIcon } from './Icons';

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
  const [unread, setUnread] = useState(0);
  const [requests, setRequests] = useState(0);
  const account = user?.account || { state: 'active', sanction: null };
  const blocked = ['suspended', 'banned'].includes(account.state);

  // Mensajes sin leer de las comunidades y solicitudes de amistad: se consulta al entrar, cada medio minuto
  // y cuando el chat o la lista de amigos avisan que algo cambió. Con la cuenta suspendida no se consulta.
  const userId = user?.id;
  useEffect(() => {
    if (!userId || blocked) { setUnread(0); setRequests(0); return undefined; }
    let active = true;
    const check = () => {
      if (document.hidden) return;
      friendService.summary().then(result => { if (active) { setUnread(result.data.messages); setRequests(result.data.friendRequests); } }).catch(() => {});
    };
    check();
    const timer = setInterval(check, 30000);
    window.addEventListener('forbook:unread', check);
    window.addEventListener('forbook:friends', check);
    document.addEventListener('visibilitychange', check);
    return () => { active = false; clearInterval(timer); window.removeEventListener('forbook:unread', check); window.removeEventListener('forbook:friends', check); document.removeEventListener('visibilitychange', check); };
  }, [userId, blocked]);

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
  // Con sesión el encabezado tiene más botones, así que el menú del celular se usa hasta los 1100 px.
  const wideFrom = user ? 1101 : 901;
  useEffect(() => {
    if (!menuOpen) return;
    const wide = window.matchMedia(`(min-width: ${wideFrom}px)`);
    const closeOnWide = () => { if (wide.matches) setMenuOpen(false); };
    const closeOnEscape = event => { if (event.key === 'Escape') setMenuOpen(false); };
    wide.addEventListener('change', closeOnWide);
    document.addEventListener('keydown', closeOnEscape);
    return () => { wide.removeEventListener('change', closeOnWide); document.removeEventListener('keydown', closeOnEscape); };
  }, [menuOpen, wideFrom]);

  async function closeSession() {
    setBusy(true); setError('');
    // Primero se sale de la ruta privada; así no se abre la ventana de ingreso al cerrar la sesión.
    navigate('/', { replace: true });
    try { await logout(); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }

  const links = user
    ? blocked ? null : <><NavLink to="/inicio">Mi inicio</NavLink><NavLink to="/conozcamos">Conozcamos Formosa</NavLink><NavLink to="/preguntas">Preguntas</NavLink><NavLink to="/mapa" className={({ isActive }) => isActive || location.pathname.startsWith('/rutas') ? 'active' : undefined}>Mapa</NavLink><NavLink to="/comunidades" className={({ isActive }) => isActive || ['/espacios', '/misiones', '/personas', '/amigos'].some(path => location.pathname.startsWith(path)) ? 'active' : undefined}>Comunidades{unread > 0 && <span className="nav-count" aria-label={`: ${unread} mensajes sin leer`}>{unread > 99 ? '99+' : unread}</span>}</NavLink>{user.role === 'admin' ? <NavLink to="/admin" className={({ isActive }) => isActive || location.pathname.startsWith('/moderacion') ? 'active' : undefined}>Administración</NavLink> : canModerate(user) && <NavLink to="/moderacion">Moderación</NavLink>}</>
    : sections.map(([id, label]) => <Link key={id} to={{ pathname: '/', hash: `#${id}` }}>{label}</Link>);

  return <PublicAccessContext.Provider value={{ openAccess }}>
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <header className={user ? 'site-header has-session' : 'site-header'}>
      <div className="container header-inner">
        <Brand/>
        {!checking && <nav className="main-nav" aria-label="Navegación principal">{links}</nav>}
        <div className="header-actions">
          {checking ? <span className="header-placeholder" aria-hidden="true"/> : <>
            <ThemeToggle className="desktop-only"/>
            {user ? <>
              {!blocked && <><Link className="icon-button desktop-only" to="/buscar" aria-label="Buscar" title="Buscar"><SearchIcon/></Link>
              <Link className="points-pill desktop-only" to="/tienda" title="Tus puntos: abrir la tienda"><PointsIcon/>{formatPoints(user.points ?? 0)}<span className="sr-only"> puntos. Ir a la tienda</span></Link></>}
              <UserMenu user={user} busy={busy} onLogout={closeSession} friendRequests={requests}/>
            </> : <>
              <button className="btn btn-outline btn-small" type="button" onClick={() => openAccess('login')}>Ingresar</button>
              <button className="btn btn-primary btn-small desktop-only" type="button" onClick={() => openAccess('register')}>Crear cuenta</button>
            </>}
            <button className="icon-button menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <CloseIcon/> : <MenuIcon/>}</button>
          </>}
        </div>
      </div>
      {menuOpen && <div id="mobile-menu" className="mobile-menu"><div className="container">
        <nav aria-label="Navegación principal">{links}{user && !blocked && <><NavLink to="/personas">Personas</NavLink><NavLink to="/amigos">Amigos{requests > 0 && <span className="nav-count" aria-label={`: ${requests} solicitudes`}>{requests}</span>}</NavLink><NavLink to="/buscar">Buscar</NavLink><NavLink to="/tienda">Tienda y puntos</NavLink><NavLink to="/sanciones">Mis sanciones</NavLink></>}</nav>
        <div className="menu-actions">
          {user && <Link className="menu-user" to="/perfil"><Avatar person={user}/><span><DecoratedName name={user.name} color={user.decorations?.nameColor}/><small>Ver mi perfil · {pointsLabel(user.points ?? 0)}</small></span></Link>}
          <ThemeToggle withLabel/>
          {user
            ? <button className="btn btn-outline" type="button" onClick={closeSession} disabled={busy}>{busy ? 'Cerrando…' : 'Cerrar sesión'}</button>
            : <button className="btn btn-primary" type="button" onClick={() => openAccess('register')}>Crear cuenta</button>}
        </div>
      </div></div>}
    </header>
    {error && <div className="container header-error"><ErrorMessage message={error}/></div>}
    {user && account.state === 'restricted' && <RestrictedBanner sanction={account.sanction}/>}
    <main id="main" tabIndex="-1">{user && blocked ? <BlockedAccount account={account} onLogout={closeSession} busy={busy}/> : <Outlet/>}</main>
    <footer className="site-footer"><div className="container footer-inner"><Brand/><p>Hecho para tu llegada a Formosa.</p></div></footer>
    {access && <AuthModal mode={access.mode} returnTo={access.returnTo} onClose={closeAccess} onModeChange={changeMode}/>}
  </PublicAccessContext.Provider>;
}
