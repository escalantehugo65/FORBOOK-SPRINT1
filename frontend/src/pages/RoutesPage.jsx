import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { catalogService } from '../services/catalog';
import { placeService } from '../services/places';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage, EmptyState } from '../components/Feedback';
import Field from '../components/Field';
import PlacesNav from '../components/PlacesNav';
import { routeModes } from '../utils/places';
import { sourceNames, sourceBadge } from '../utils/content';

// Rutas orientativas (FF-22). Arranca con la institución del estudiante: /rutas?institutionId=2 cambia a otra.
export default function RoutesPage() {
  usePageTitle('Rutas orientativas');
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const institutionId = params.get('institutionId') || String(user.institutionId);
  const institutionLoader = useCallback(signal => catalogService.institutions(signal), []);
  const routeLoader = useCallback(signal => placeService.routes({ institutionId }, signal), [institutionId]);
  const institutions = useFetch(institutionLoader);
  const routes = useFetch(routeLoader);
  const name = routes.result?.meta.institution.name;

  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Rutas</p>
      <h1>Cómo llegar a tu institución.</h1>
      <p className="lead">Recorridos explicados con referencias que se reconocen en la calle, no solo con coordenadas.</p>
    </header>
    <PlacesNav/>
    {institutions.result && <div className="place-filters">
      <Field label="Institución" name="institutionId" value={institutionId} onChange={event => setParams(event.target.value === String(user.institutionId) ? {} : { institutionId: event.target.value })}>
        {institutions.result.data.map(item => <option key={item.id} value={item.id}>{item.name}{item.id === user.institutionId ? ' (la tuya)' : ''}</option>)}
      </Field>
    </div>}
    {routes.loading ? <Loading text="Cargando rutas…"/>
      : routes.error ? <ErrorMessage message={routes.error.message} retry={routes.retry}/>
      : routes.result.data.length ? <>
        <div className="results-head"><h2>{name}</h2><span className="results-count">{routes.result.data.length} {routes.result.data.length === 1 ? 'ruta' : 'rutas'}</span></div>
        <div className="content-grid">{routes.result.data.map(route => <article className="content-card" key={route.id}>
          <p className="card-category">{routeModes[route.mode]}</p>
          <h3><Link to={`/rutas/${route.id}`}>{route.title}</Link></h3>
          <p className="summary">Desde {route.originLabel}</p>
          <div className="card-meta"><span className={sourceBadge[route.sourceType]}>{sourceNames[route.sourceType]}</span></div>
        </article>)}</div>
      </>
      : <EmptyState title={`Todavía no hay rutas para ${name}`}>Preferimos no publicar recorridos que nadie comprobó. Mientras tanto, buscá la dirección en el mapa o preguntale a la comunidad.</EmptyState>}
    <p className="note">Las rutas son orientativas: los recorridos y los horarios del transporte pueden cambiar.</p>
  </div>;
}
