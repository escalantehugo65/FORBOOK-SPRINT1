import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { placeService } from '../services/places';
import { useFetch } from '../hooks/useFetch';
import { ArrowIcon, PinIcon } from './Icons';

// Acceso rápido a la ruta de la institución (FF-14), con las rutas de FF-22.
export default function InstitutionRoute() {
  const { user } = useAuth();
  const institution = user.institution?.name || 'Tu institución';
  const loader = useCallback(signal => placeService.routes({}, signal), [user.institutionId]);
  const { result, loading, error } = useFetch(loader);
  const routes = result?.data || [];

  return <section className="home-section" aria-labelledby="route-title">
    <div className="section-row">
      <div>
        <p className="eyebrow">Tu llegada</p>
        <h2 id="route-title">Cómo llegar a tu institución</h2>
      </div>
    </div>
    <article className="route-card">
      <span className="icon-tile tile-yellow"><PinIcon/></span>
      <div>
        <h3>{institution}</h3>
        <p>{loading ? 'Buscando rutas…'
          : error ? 'No pudimos cargar las rutas ahora. Probá desde la sección Rutas.'
          : routes.length ? `${routes.length === 1 ? 'Hay una ruta orientativa' : `Hay ${routes.length} rutas orientativas`} para llegar.`
          : 'Todavía no hay una ruta cargada para tu institución. Mientras tanto, ubicala en el mapa.'}</p>
      </div>
      {routes.length === 1 ? <Link className="btn btn-primary btn-small" to={`/rutas/${routes[0].id}`}>Ver la ruta <ArrowIcon/></Link>
        : routes.length > 1 ? <Link className="btn btn-primary btn-small" to="/rutas">Ver las rutas <ArrowIcon/></Link>
        : !loading && <Link className="btn btn-outline btn-small" to="/mapa">Abrir el mapa</Link>}
    </article>
  </section>;
}
