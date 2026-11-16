import { lazy, Suspense } from 'react';
import Field from './Field';
import { parseCoordinates } from '../utils/coordinates';
import { maxStops, newStop } from '../utils/stops';

// Leaflet se descarga solo cuando hay paradas para mostrar.
const StopsMap = lazy(() => import('./StopsMap'));

// Paradas de una ruta (FF-22). Cada una con nombre, coordenadas pegadas desde Google Maps y una referencia opcional.
// El mapa muestra las que ya tienen coordenadas válidas, para comprobar que caen donde corresponde.
export default function RouteStopsEditor({ prefix, stops, onChange, errors = [], error, disabled }) {
  const update = (index, key, value) => onChange(stops.map((stop, position) => (position === index ? { ...stop, [key]: value } : stop)));
  const preview = stops.flatMap(stop => {
    const parsed = stop.coordinates.trim() ? parseCoordinates(stop.coordinates) : {};
    return parsed.value ? [{ id: stop.key, name: stop.name.trim() || 'Parada sin nombre', reference: stop.reference.trim(), ...parsed.value }] : [];
  });

  return <fieldset className="stops-editor" disabled={disabled} aria-describedby={`${prefix}-stops-hint`}>
    <legend>Paradas</legend>
    <small id={`${prefix}-stops-hint`}>Opcional. Se marcan en el mapa de la ruta, sin dibujar el recorrido. Para las coordenadas, en Google Maps tocá el punto y copiá los números que aparecen (por ejemplo: -26.186308, -58.173568). La referencia es opcional: cómo se reconoce en la calle («Frente al Correo Argentino»). {stops.length} de {maxStops}.</small>
    {stops.length > 0 && <ol className="stop-rows">{stops.map((stop, index) => <li className="stop-row" key={stop.key}>
      <div className="form-pair">
        <Field label={<>Nombre<span className="sr-only"> de la parada {index + 1}</span></>} name={`${prefix}-stop-${stop.key}-name`} value={stop.name} onChange={event => update(index, 'name', event.target.value)} error={errors[index]?.name} required maxLength={120}/>
        <Field label={<>Coordenadas<span className="sr-only"> de la parada {index + 1}</span></>} name={`${prefix}-stop-${stop.key}-coordinates`} value={stop.coordinates} onChange={event => update(index, 'coordinates', event.target.value)} error={errors[index]?.coordinates} required placeholder="-26.186308, -58.173568" inputMode="decimal" autoComplete="off"/>
      </div>
      <Field label={<>Referencia<span className="sr-only"> de la parada {index + 1}</span></>} name={`${prefix}-stop-${stop.key}-reference`} value={stop.reference} onChange={event => update(index, 'reference', event.target.value)} error={errors[index]?.reference} maxLength={250}/>
      <button className="btn btn-outline btn-small" type="button" onClick={() => onChange(stops.filter((_, position) => position !== index))}>Quitar<span className="sr-only"> la parada {stop.name.trim() || index + 1}</span></button>
    </li>)}</ol>}
    {error && <small className="field-error" role="alert">{error}</small>}
    <button className="btn btn-outline btn-small" type="button" disabled={stops.length >= maxStops} onClick={() => onChange([...stops, newStop()])}>Agregar parada</button>
    {preview.length > 0 && <div className="stops-frame"><Suspense fallback={<p className="stops-map-loading">Cargando el mapa…</p>}><StopsMap stops={preview} label="Vista previa de las paradas"/></Suspense></div>}
  </fieldset>;
}
