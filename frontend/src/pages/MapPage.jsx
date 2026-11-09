import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { placeService } from '../services/places';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage, EmptyState } from '../components/Feedback';
import { PinIcon } from '../components/Icons';
import Field from '../components/Field';
import PlaceMap from '../components/PlaceMap';
import PlacesNav from '../components/PlacesNav';
import SourceLine from '../components/SourceLine';
import { placeKinds, sensitiveKinds } from '../utils/places';

// Abre el lugar en Google Maps, que sí es un servicio de navegación (Forbook no lo es).
const googleMapsUrl = ({ latitude, longitude }) => `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

// Mapa (FF-21) y lugares útiles (FF-23). Se pide la lista completa una sola vez y se filtra en la
// página: así el mapa no se vuelve a crear ni cambia de encuadre al elegir otra categoría.
// Los filtros y el lugar elegido quedan en la dirección: /mapa?kind=health&institutionId=1&lugar=3
export default function MapPage() {
  usePageTitle('Mapa de lugares');
  const [params, setParams] = useSearchParams();
  const mapRef = useRef(null);
  const kind = params.get('kind') || '';
  const institutionId = params.get('institutionId') || '';
  const loader = useCallback(signal => placeService.places({}, signal), []);
  const { result, loading, error, retry } = useFetch(loader);
  const all = useMemo(() => result?.data || [], [result]);
  const institutions = result?.meta.institutions || [];
  const byInstitution = useMemo(() => institutionId ? all.filter(place => String(place.institutionId ?? place.institution?.id) === institutionId) : all, [all, institutionId]);
  const places = useMemo(() => kind ? byInstitution.filter(place => place.kind === kind) : byInstitution, [byInstitution, kind]);
  const counts = useMemo(() => byInstitution.reduce((total, place) => ({ ...total, [place.kind]: (total[place.kind] || 0) + 1 }), {}), [byInstitution]);
  const selectedId = Number(params.get('lugar')) || null;
  const withLocation = places.filter(place => place.location).length;

  // Cambiar un filtro cierra el lugar elegido si ya no está en la lista.
  const filter = (key, value) => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('lugar');
    return next;
  }, { replace: true });
  const select = useCallback(id => setParams(previous => {
    const next = new URLSearchParams(previous);
    next.set('lugar', String(id));
    return next;
  }, { replace: true }), [setParams]);
  function showOnMap(id) {
    select(id);
    // En el celular el mapa queda arriba de la lista: se sube hasta él.
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Mapa</p>
      <h1>Ubicá los lugares útiles.</h1>
      <p className="lead">Instituciones y servicios para tus primeros días, con la dirección y la fuente de cada dato.</p>
    </header>
    <PlacesNav/>
    <aside className="map-notice" role="note">
      <PinIcon/>
      <p><strong>El mapa es orientativo.</strong> Te muestra dónde queda cada lugar, pero no es un GPS ni calcula recorridos. Para llegar, abrí el lugar en Google Maps y confirmá la dirección en la fuente indicada.</p>
    </aside>
    {loading ? <Loading text="Cargando lugares…"/>
      : error ? <ErrorMessage message={error.message} retry={retry}/>
      : !all.length ? <EmptyState title="Todavía no hay lugares cargados"/>
      : <>
        <div className="place-filters">
          <div className="chip-row" role="group" aria-label="Filtrar por categoría">
            <button className="chip" type="button" aria-pressed={!kind} onClick={() => filter('kind', '')}>Todos <span className="chip-count">{byInstitution.length}</span></button>
            {Object.entries(placeKinds).map(([value, label]) => <button key={value} className="chip" type="button" aria-pressed={kind === value} onClick={() => filter('kind', value)}>
              <span className={`kind-dot pin-${value}`} aria-hidden="true"/>{label} <span className="chip-count">{counts[value] || 0}</span>
            </button>)}
          </div>
          {institutions.length > 0 && <Field label="Institución" name="institutionId" value={institutionId} onChange={event => filter('institutionId', event.target.value)}>
            <option value="">Todas</option>
            {institutions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Field>}
        </div>
        <div className="map-layout">
          <div className="map-frame" ref={mapRef}>
            <PlaceMap frame={all} places={places} selectedId={selectedId} onSelect={select}/>
            {!withLocation && <p className="map-overlay" role="status">{places.length
              ? 'Ninguno de estos lugares tiene la ubicación verificada todavía. Mientras tanto, guiate por la dirección de cada uno.'
              : `Todavía no hay lugares de ${placeKinds[kind]?.toLowerCase() || 'esta selección'} cargados.`}</p>}
          </div>
          <section className="place-list" aria-labelledby="places-title">
            <div className="results-head"><h2 id="places-title">{kind ? placeKinds[kind] : 'Todos los lugares'}</h2><span className="results-count" role="status">{withLocation} de {places.length} en el mapa</span></div>
            {places.length ? <ul>{places.map(place => <li key={place.id}>
              <article className={`place-card${selectedId === place.id ? ' is-selected' : ''}`} aria-current={selectedId === place.id ? 'true' : undefined}>
                <p className="card-category"><span className={`kind-dot pin-${place.kind}`} aria-hidden="true"/>{placeKinds[place.kind]}{place.institution ? ` · ${place.institution.name}` : ''}</p>
                <h3>{place.name}</h3>
                <p className="place-address">{place.addressLabel || 'Sin dirección cargada todavía.'}</p>
                {place.studentNote && <p className="place-note"><strong>Para estudiantes:</strong> {place.studentNote}</p>}
                <SourceLine item={place}/>
                {sensitiveKinds.includes(place.kind) && place.sourceType !== 'official' && <p className="place-warning">No viene de una fuente oficial. Antes de ir, confirmalo con el organismo correspondiente.</p>}
                {place.location
                  ? <div className="place-actions">
                    <button className="btn btn-outline btn-small" type="button" onClick={() => showOnMap(place.id)}>Ver en el mapa</button>
                    <a className="btn btn-outline btn-small" href={googleMapsUrl(place.location)} target="_blank" rel="noopener noreferrer">Abrir en Google Maps<span className="sr-only"> (se abre en otra pestaña)</span></a>
                  </div>
                  : <p className="place-missing">Sin ubicación en el mapa: guiate por la dirección.</p>}
              </article>
            </li>)}</ul>
              : <EmptyState title={`Todavía no hay lugares de ${placeKinds[kind]?.toLowerCase() || 'esta selección'}`} headingLevel={3} action={<button className="btn btn-primary btn-small" type="button" onClick={() => setParams({}, { replace: true })}>Ver todos los lugares</button>}/>}
          </section>
        </div>
      </>}
  </div>;
}
