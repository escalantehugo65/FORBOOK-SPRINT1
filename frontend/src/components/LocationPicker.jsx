import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formosaBounds, insideFormosa, parseCoordinates } from '../utils/coordinates';

const formosaCity = [-26.1833, -58.1833];
const pinIcon = () => L.divIcon({ className: 'place-marker', html: '<span class="place-pin"></span>', iconSize: [34, 34], iconAnchor: [17, 32] });

// Elegir la ubicación de un lugar de tres formas: tocando el mapa (y arrastrando el pin),
// pegando coordenadas copiadas de Google Maps o buscando la dirección en OpenStreetMap.
export default function LocationPicker({ value, onChange, idPrefix, disabled, error }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const [pasted, setPasted] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    const map = L.map(containerRef.current, { center: formosaCity, zoom: 13, scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    map.on('click', event => {
      map.scrollWheelZoom.enable();
      const point = { latitude: Number(event.latlng.lat.toFixed(6)), longitude: Number(event.latlng.lng.toFixed(6)) };
      if (insideFormosa(point)) changeRef.current(point);
    });
    map.on('mouseout', () => map.scrollWheelZoom.disable());
    mapRef.current = map;
    return () => { map.stop(); map.off(); map.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);

  // El pin sigue al valor elegido; al arrastrarlo se actualizan las coordenadas.
  useEffect(() => {
    const map = mapRef.current;
    if (!value) { markerRef.current?.remove(); markerRef.current = null; return; }
    const position = [value.latitude, value.longitude];
    if (!markerRef.current) {
      markerRef.current = L.marker(position, { icon: pinIcon(), draggable: true, title: 'Ubicación elegida', alt: 'Ubicación elegida', keyboard: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const { lat, lng } = markerRef.current.getLatLng();
        const point = { latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) };
        if (insideFormosa(point)) changeRef.current(point); else markerRef.current.setLatLng([value.latitude, value.longitude]);
      });
    } else markerRef.current.setLatLng(position);
    if (!map.getBounds().contains(position)) map.setView(position, Math.max(map.getZoom(), 16), { animate: false });
  }, [value]);

  useEffect(() => { if (disabled) mapRef.current?.dragging.disable(); else mapRef.current?.dragging.enable(); }, [disabled]);

  function usePasted() {
    const parsed = parseCoordinates(pasted);
    if (parsed.error) { setPasteError(parsed.error); return; }
    setPasteError(''); setPasted('');
    onChange(parsed.value);
    mapRef.current.setView([parsed.value.latitude, parsed.value.longitude], 17, { animate: false });
  }
  async function search() {
    const text = query.trim();
    if (text.length < 3) { setSearchError('Escribí al menos una calle o el nombre del lugar.'); return; }
    setSearching(true); setSearchError(''); setResults(null);
    const [south, north] = formosaBounds.latitude;
    const [west, east] = formosaBounds.longitude;
    const params = new URLSearchParams({ format: 'jsonv2', q: text, countrycodes: 'ar', viewbox: `${west},${north},${east},${south}`, bounded: '1', limit: '5', 'accept-language': 'es' });
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      if (!response.ok) throw new Error();
      const rows = await response.json();
      setResults(rows.map(row => ({ id: row.place_id, label: row.display_name, latitude: Number(Number(row.lat).toFixed(6)), longitude: Number(Number(row.lon).toFixed(6)) })).filter(insideFormosa));
    } catch { setSearchError('No pudimos buscar la dirección ahora. Probá tocando el mapa o pegando las coordenadas.'); }
    finally { setSearching(false); }
  }
  function choose(result) {
    onChange({ latitude: result.latitude, longitude: result.longitude });
    mapRef.current.setView([result.latitude, result.longitude], 17, { animate: false });
    setResults(null);
  }

  return <fieldset className="location-picker" disabled={disabled} aria-describedby={error ? `${idPrefix}-location-error` : undefined}>
    <legend>Ubicación en el mapa</legend>
    <p className="admin-hint wide">Tocá el mapa donde está el lugar y arrastrá el pin para ajustarlo. Es opcional: sin ubicación, el lugar se muestra con su dirección.</p>
    <div className="picker-tools">
      <div className="picker-tool">
        <label htmlFor={`${idPrefix}-paste`}>Pegar coordenadas</label>
        <div className="picker-row">
          <input id={`${idPrefix}-paste`} value={pasted} placeholder="-26.18493, -58.17312" onChange={event => { setPasted(event.target.value); setPasteError(''); }}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); usePasted(); } }} aria-describedby={`${idPrefix}-paste-hint`} aria-invalid={!!pasteError}/>
          <button className="btn btn-outline btn-small" type="button" onClick={usePasted}>Usar</button>
        </div>
        <small id={`${idPrefix}-paste-hint`}>En Google Maps: clic derecho sobre el lugar y clic en los números de arriba para copiarlos.</small>
        {pasteError && <small className="field-error" role="alert">{pasteError}</small>}
      </div>
      <div className="picker-tool">
        <label htmlFor={`${idPrefix}-search`}>Buscar dirección</label>
        <div className="picker-row">
          <input id={`${idPrefix}-search`} type="search" value={query} placeholder="Av. Gutnisky 3200, Formosa" onChange={event => { setQuery(event.target.value); setSearchError(''); }}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); search(); } }}/>
          <button className="btn btn-outline btn-small" type="button" onClick={search} disabled={searching}>{searching ? 'Buscando…' : 'Buscar'}</button>
        </div>
        <small>Busca en OpenStreetMap. Revisá siempre que el pin quede en el lugar correcto.</small>
        {searchError && <small className="field-error" role="alert">{searchError}</small>}
        {results && (results.length
          ? <ul className="picker-results" aria-label="Resultados de la búsqueda">{results.map(result => <li key={result.id}><button type="button" onClick={() => choose(result)}>{result.label}</button></li>)}</ul>
          : <small role="status">No encontramos esa dirección dentro de Formosa. Probá con otra forma de escribirla o tocá el mapa.</small>)}
      </div>
    </div>
    <div className="picker-map-frame"><div ref={containerRef} className="picker-map" role="region" aria-label="Mapa para elegir la ubicación"/></div>
    <div className="picker-status">
      <p role="status">{value ? <>Ubicación elegida: <strong>{value.latitude}, {value.longitude}</strong></> : 'Sin ubicación elegida.'}</p>
      {value && <button className="btn btn-outline btn-small" type="button" onClick={() => onChange(null)}>Quitar ubicación</button>}
    </div>
    {error && <small id={`${idPrefix}-location-error`} className="field-error">{error}</small>}
  </fieldset>;
}
