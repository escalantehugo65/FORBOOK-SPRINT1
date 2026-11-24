import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Secciones del panel de administración y de moderación. Moderación tiene una sola sección (reportes),
// así que las pestañas se muestran solo a las cuentas de administración.
const adminLinks = [
  ['/admin', 'Resumen', true],
  ['/admin/usuarios', 'Usuarios'],
  ['/admin/apelaciones', 'Apelaciones'],
  ['/moderacion', 'Reportes', true],
  ['/moderacion/historial', 'Historial'],
  ['/admin/comunidades', 'Comunidades'],
  ['/moderacion/fichas', 'Fichas'],
  ['/moderacion/catalogo', 'Categorías y fuentes'],
  ['/moderacion/lugares', 'Lugares del mapa'],
  ['/moderacion/rutas', 'Rutas'],
  ['/admin/tienda', 'Tienda'],
];

export default function ModerationNav() {
  const { user } = useAuth();
  if (user?.role !== 'admin') return null;
  return <nav className="mod-nav" aria-label="Secciones de administración">
    {adminLinks.map(([path, label, end]) => <NavLink key={path} to={path} end={end}>{label}</NavLink>)}
  </nav>;
}
