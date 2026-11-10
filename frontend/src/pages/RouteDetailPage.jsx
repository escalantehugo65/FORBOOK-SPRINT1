import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { placeService } from '../services/places';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import { ArrowIcon } from '../components/Icons';
import SourceLine from '../components/SourceLine';
import { routeModes } from '../utils/places';

// Detalle de una ruta (FF-22). Un tiempo solo se presenta como dato si viene de una fuente oficial.
export default function RouteDetailPage() {
  const { id } = useParams();
  const loader = useCallback(signal => placeService.route(id, signal), [id]);
  const { result, loading, error, retry } = useFetch(loader);
  const route = result?.data;
  usePageTitle(route?.title || 'Ruta');
  const back = <Link className="back-link" to={route ? `/rutas?institutionId=${route.institution.id}` : '/rutas'}><ArrowIcon/>Volver a las rutas</Link>;
  if (loading) return <div className="container page">{back}<Loading/></div>;
  if (error) return <div className="container page">{back}<ErrorMessage message={error.message} retry={error.status === 404 ? null : retry}/></div>;
  const official = route.sourceType === 'official';

  return <div className="container page">
    {back}
    <header className="detail-head">
      <p className="card-category">{routeModes[route.mode]} · {route.institution.name}</p>
      <h1>{route.title}</h1>
      <p className="detail-summary">Salida: {route.originLabel}</p>
    </header>
    <div className="detail-grid">
      <section className="article-body" aria-labelledby="steps-title">
        <h2 id="steps-title" className="steps-title">Paso a paso</h2>
        <ol className="route-steps">{route.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
        {route.destination && <p className="route-destination">Llegás a <strong>{route.destination.name}</strong>{route.destination.addressLabel ? ` (${route.destination.addressLabel})` : ''}.
          {route.destination.location && <> <Link to={`/mapa?lugar=${route.destination.id}`}>Ver en el mapa</Link></>}</p>}
      </section>
      <aside className="source-panel" aria-labelledby="route-data-title">
        <h2 id="route-data-title">Datos de la ruta</h2>
        <dl className="source-list">
          <div><dt>Tiempo</dt><dd>{!route.durationLabel ? 'Sin tiempo estimado: no hay una fuente confiable.' : official ? `${route.durationLabel}, según la fuente oficial.` : `Aproximado: ${route.durationLabel}. No es un dato oficial.`}</dd></div>
        </dl>
        <SourceLine item={route}/>
        <p className="source-note">El tránsito, los recorridos y los horarios del transporte cambian. Revisá la fecha de revisión antes de salir.</p>
      </aside>
    </div>
  </div>;
}
