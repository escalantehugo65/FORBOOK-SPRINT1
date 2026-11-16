import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { placeService } from '../services/places';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import { ArrowIcon } from '../components/Icons';
import SourceLine from '../components/SourceLine';
import { routeModes } from '../utils/places';
import { googleMapsUrl } from '../utils/coordinates';

// Leaflet se descarga solo cuando la ruta tiene paradas (igual que la página del mapa).
const StopsMap = lazy(() => import('../components/StopsMap'));

// Detalle de una ruta (FF-22). Un tiempo solo se presenta como dato si viene de una fuente oficial.
// Si la ruta tiene paradas (como el colectivo del IPF), se listan y se marcan en el mapa, sin dibujar el recorrido.
export default function RouteDetailPage() {
  const { id } = useParams();
  const mapRef = useRef(null);
  const [focus, setFocus] = useState(null);
  const loader = useCallback(signal => placeService.route(id, signal), [id]);
  const { result, loading, error, retry } = useFetch(loader);
  const route = result?.data;
  usePageTitle(route?.title || 'Ruta');
  const back = <Link className="back-link" to={route ? `/rutas?institutionId=${route.institution.id}` : '/rutas'}><ArrowIcon/>Volver a las rutas</Link>;
  if (loading) return <div className="container page">{back}<Loading/></div>;
  if (error) return <div className="container page">{back}<ErrorMessage message={error.message} retry={error.status === 404 ? null : retry}/></div>;
  const official = route.sourceType === 'official';
  const hasStops = route.stops.length > 0;
  const Notes = hasStops ? 'ul' : 'ol';
  function showStop(stop) {
    setFocus({ id: stop.id, at: Date.now() });
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return <div className="container page">
    {back}
    <header className="detail-head">
      <p className="card-category">{routeModes[route.mode]} · {route.institution.name}</p>
      <h1>{route.title}</h1>
      <p className="detail-summary">Salida: {route.originLabel}</p>
    </header>
    <div className="detail-grid">
      <section className="article-body" aria-labelledby="steps-title">
        <h2 id="steps-title" className="steps-title">{hasStops ? 'Horarios y datos' : 'Paso a paso'}</h2>
        <Notes className="route-steps">{route.steps.map((step, index) => <li key={index}>{step}</li>)}</Notes>
        {hasStops && <section className="route-stops" aria-labelledby="stops-title">
          <h2 id="stops-title" className="steps-title">Paradas</h2>
          <p className="route-stops-note">{route.stops.length} {route.stops.length === 1 ? 'parada' : 'paradas'}. El orden de la lista no es el del recorrido.</p>
          <div className="stops-frame" ref={mapRef}><Suspense fallback={<p className="stops-map-loading">Cargando el mapa…</p>}><StopsMap stops={route.stops} focus={focus} label={`Mapa de las paradas de ${route.title}`}/></Suspense></div>
          <ul className="stop-list">{route.stops.map(stop => <li className="stop-item" key={stop.id}>
            <span className="kind-dot pin-stop" aria-hidden="true"/>
            <div>
              <strong>{stop.name}</strong>
              {stop.reference && <p>{stop.reference}</p>}
              <div className="stop-actions">
                <button className="btn btn-outline btn-small" type="button" onClick={() => showStop(stop)}>Ver en el mapa<span className="sr-only"> {stop.name}</span></button>
                <a className="btn btn-outline btn-small" href={googleMapsUrl(stop)} target="_blank" rel="noopener noreferrer"><span className="sr-only">Abrir {stop.name} en </span>Google Maps<span className="sr-only"> (se abre en otra pestaña)</span></a>
              </div>
            </div>
          </li>)}</ul>
        </section>}
        {route.destination && <p className="route-destination">Llegás a <strong>{route.destination.name}</strong>{route.destination.addressLabel ? ` (${route.destination.addressLabel})` : ''}.
          {route.destination.location && <> <Link to={`/mapa?lugar=${route.destination.id}`}>Ver en el mapa</Link></>}</p>}
      </section>
      <aside className="source-panel" aria-labelledby="route-data-title">
        <h2 id="route-data-title">Datos de la ruta</h2>
        <dl className="source-list">
          {hasStops && <div><dt>Paradas</dt><dd>{route.stops.length} en el mapa</dd></div>}
          <div><dt>Tiempo</dt><dd>{!route.durationLabel ? 'Sin tiempo estimado: no hay una fuente confiable.' : official ? `${route.durationLabel}, según la fuente oficial.` : `Aproximado: ${route.durationLabel}. No es un dato oficial.`}</dd></div>
        </dl>
        <SourceLine item={route}/>
        <p className="source-note">El tránsito, los recorridos y los horarios del transporte cambian. Revisá la fecha de revisión antes de salir.</p>
      </aside>
    </div>
  </div>;
}
