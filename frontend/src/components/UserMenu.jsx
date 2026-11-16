import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Avatar from './Avatar';
import DecoratedName from './DecoratedName';
import LevelBadge from './LevelBadge';
import { BagIcon, ChevronIcon, LogoutIcon, PointsIcon, UserIcon } from './Icons';
import { firstName } from '../utils/content';
import { pointsLabel } from '../utils/shop';

// Menú de la cuenta en el encabezado (computadora): perfil, tienda, puntos y cerrar sesión.
// Es un menú desplegable simple: se abre con el botón y se cierra con Escape, con un clic afuera o al navegar.
export default function UserMenu({ user, busy, onLogout }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const button = useRef(null);
  const panelId = useId();
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!box.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);

  return <div className="user-menu desktop-only" ref={box} onBlur={event => { if (open && !box.current?.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={button} className="user-chip" type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
      <Avatar person={user}/>
      <span className="user-chip-name">{firstName(user.name)}</span>
      <ChevronIcon/>
      <span className="sr-only">: menú de tu cuenta</span>
    </button>
    <div id={panelId} className="user-menu-panel" hidden={!open}>
      <div className="user-menu-head">
        <Avatar person={user} size="large"/>
        <div>
          <DecoratedName as="strong" name={user.name} color={user.decorations?.nameColor}/>
          <LevelBadge level={user.level}/>
        </div>
      </div>
      <nav aria-label="Tu cuenta">
        <Link to="/perfil"><UserIcon/>Mi perfil</Link>
        <Link to="/tienda"><BagIcon/>Tienda de decoraciones</Link>
        <Link to="/tienda?ver=puntos"><PointsIcon/>Mis puntos <span className="menu-points">{pointsLabel(user.points ?? 0)}</span></Link>
      </nav>
      <button className="user-menu-logout" type="button" onClick={onLogout} disabled={busy}><LogoutIcon/>{busy ? 'Cerrando…' : 'Cerrar sesión'}</button>
    </div>
  </div>;
}
