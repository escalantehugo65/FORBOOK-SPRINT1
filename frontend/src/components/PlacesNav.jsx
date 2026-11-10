import { NavLink } from 'react-router-dom';

// Pestañas de la épica 4: el mapa de lugares y las rutas hacia las instituciones.
export default function PlacesNav() {
  return <nav className="mod-nav" aria-label="Secciones de lugares">
    <NavLink to="/mapa">Lugares</NavLink>
    <NavLink to="/rutas">Rutas</NavLink>
  </nav>;
}
