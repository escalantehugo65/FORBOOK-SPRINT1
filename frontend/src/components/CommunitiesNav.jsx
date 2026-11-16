import { NavLink } from 'react-router-dom';

// Pestañas de la sección: comunidades con chat, misiones y los espacios sugeridos (épica 6).
export default function CommunitiesNav({ claimable = 0 }) {
  return <nav className="mod-nav" aria-label="Secciones de comunidades">
    <NavLink to="/comunidades" end>Comunidades</NavLink>
    <NavLink to="/misiones">Misiones{claimable > 0 && <span className="nav-count" aria-label={`: ${claimable} para cobrar`}>{claimable}</span>}</NavLink>
    <NavLink to="/espacios">Espacios sugeridos</NavLink>
  </nav>;
}
