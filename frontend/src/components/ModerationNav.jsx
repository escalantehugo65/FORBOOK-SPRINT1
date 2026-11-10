import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Pestañas de moderación. Solo administración tiene más de una sección, así que solo ahí se muestran.
export default function ModerationNav() {
  const { user } = useAuth();
  if (user?.role !== 'admin') return null;
  return <nav className="mod-nav" aria-label="Secciones de moderación">
    <NavLink to="/moderacion" end>Reportes</NavLink>
    <NavLink to="/moderacion/historial">Historial</NavLink>
    <NavLink to="/moderacion/catalogo">Categorías y fuentes</NavLink>
    <NavLink to="/moderacion/lugares">Lugares del mapa</NavLink>
  </nav>;
}
