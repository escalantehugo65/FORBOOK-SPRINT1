import { useCallback, useRef } from 'react';
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

// Mapa (FF-21) y lugares útiles (FF-23). Los filtros y el lugar elegido quedan en la dirección:
// /mapa?kind=health&institutionId=1&lugar=3
export default function MapPage() {
  usePageTitle('Mapa de lugares');
  const [params, setParams] = useSearchParams();
  const mapRef = useRef(null);
  const kind = params.get('kind') || '';
  const institutionId = params.get('institutionId') || '';
  const loader = useCallback(signal => placeService.places({ kind, institutionId }, signal), [kind, institutionId]);
  const { result, loading, error, retry } = useFetch(loader);
  const places = result?.data || [];
  const selectedId = Number(params.get('lugar')) || null;
  const withLocation = result?.meta.withLocation ?? 0;
  const institutions = result?.meta.institutions || [];
  const filtered = Boolean(kind || institutionId);

  // Cambiar un filtro borra el lugar elegido: puede que ya no esté en la lista.
  const filter = (key, value) => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('lugar');
    return next;
  });
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
      <p><strong>El mapa es orientativo.</strong> Te muestra dónde queda cada lugar, pero no es un GPS ni calcula recorridos. Antes de salir, confirmá la dirección en la fuente indicada.</p>
    </aside>
    <div className="place-filters">
      <div className="chip-row" role="group" aria-label="Filtrar por tipo de lugar">
        <button className="chip" type="button" aria-pressed={!kind} onClick={() => filter('kind', '')}>Todos</button>
        {Object.entries(placeKinds).map(([value, label]) => <button key={value} className="chip" type="button" aria-pressed={kind === value} onClick={() => filter('kind', value)}>{label}</button>)}
      </div>
      {institutions.length > 0 && <Field label="Institución" name="institutionId" value={institutionId} onChange={event => filter('institutionId', event.target.value)}>
        <option value="">Todas</option>
        {institutions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Field>}
    </div>
    {loading ? <Loading text="Cargando lugares…"/>
      : error ? <ErrorMessage message={error.message} retry={retry}/>
      : !places.length ? <EmptyState title={filtered ? 'No hay lugares con esos filtros' : 'Todavía no hay lugares cargados'} action={filtered ? <button className="btn btn-primary" type="button" onClick={() => setParams({})}>Ver todos los lugares</button> : null}/>
      : <div className="map-layout">
        <div className="map-frame" ref={mapRef}>
          <PlaceMap places={places} selectedId={selectedId} onSelect={select}/>
          {!withLocation && <p className="map-overlay" role="status">Ninguno de estos lugares tiene la ubicación verificada todavía. Mientras tanto, guiate por la dirección de cada uno.</p>}
        </div>
        <section className="place-list" aria-labelledby="places-title">
          <div className="results-head"><h2 id="places-title">{kind ? placeKinds[kind] : 'Lugares'}</h2><span className="results-count" role="status">{withLocation} de {places.length} en el mapa</span></div>
          <ul>{places.map(place => <li key={place.id}>
            <article className={`place-card${selectedId === place.id ? ' is-selected' : ''}`} aria-current={selectedId === place.id ? 'true' : undefined}>
              <p className="card-category">{placeKinds[place.kind]}{place.institution ? ` · ${place.institution.name}` : ''}</p>
              <h3>{place.name}</h3>
              <p className="place-address">{place.addressLabel || 'Sin dirección cargada todavía.'}</p>
              {place.studentNote && <p className="place-note"><strong>Para estudiantes:</strong> {place.studentNote}</p>}
              <SourceLine item={place}/>
              {sensitiveKinds.includes(place.kind) && place.sourceType !== 'official' && <p className="place-warning">No viene de una fuente oficial. Antes de ir, confirmalo con el organismo correspondiente.</p>}
              {place.location
                ? <button className="btn btn-outline btn-small" type="button" onClick={() => showOnMap(place.id)}>Ver en el mapa</button>
                : <p className="place-missing">Sin ubicación en el mapa: guiate por la dirección.</p>}
            </article>
          </li>)}</ul>
        </section>
      </div>}
  </div>;
}
