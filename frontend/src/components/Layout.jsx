import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorMessage } from './Feedback';

export function Brand() { return <Link className="brand" to="/" aria-label="Forbook, inicio"><span className="brand-mark" aria-hidden="true">f.</span>forbook<span className="brand-dot">.</span></Link>; }
export default function Layout() {
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const close = async () => { setBusy(true); setError(''); try { await logout(); } catch (error) { setError(error.message); } finally { setBusy(false); } };
  return <><a className="skip" href="#main">Saltar al contenido</a><header className="site-header"><div className="header-inner"><Brand/>
    <nav aria-label="Navegación principal">{user ? <><NavLink to="/inicio">Mi inicio</NavLink><NavLink to="/conozcamos">Conozcamos Formosa</NavLink><button className="text-button" disabled={busy} onClick={close}>{busy ? 'Cerrando…' : 'Cerrar sesión'}</button></>
      : <><NavLink to="/ingresar">Ingresar</NavLink><Link className="button small" to="/registro">Crear cuenta <span aria-hidden="true">↗</span></Link></>}</nav></div></header>
    {error && <div className="container"><ErrorMessage message={error}/></div>}
    <main id="main"><Outlet/></main><footer className="site-footer"><div className="container footer-inner"><Brand/><p>Un nuevo lugar. Tu próximo comienzo.</p><span>Hecho para tu llegada a Formosa.</span></div></footer></>;
}
