import { parseCoordinates } from './coordinates';

// Paradas de una ruta en el formulario de administración (FF-22). Las coordenadas se escriben como texto
// ("-26.186308, -58.173568") y se convierten a números recién al guardar.
export const maxStops = 30;
let nextKey = 0;
export const newStop = () => ({ key: `new-${nextKey += 1}`, name: '', reference: '', coordinates: '' });
export const stopFromRoute = stop => ({ key: `stop-${stop.id}`, name: stop.name, reference: stop.reference || '', coordinates: `${stop.latitude}, ${stop.longitude}` });

// Revisa las paradas del formulario. Devuelve los errores por fila y la lista lista para mandar al backend.
export function checkStops(stops) {
  const rows = stops.map(stop => {
    const name = stop.name.trim();
    const reference = stop.reference.trim();
    const errors = {};
    if (name.length < 2 || name.length > 120) errors.name = 'Escribí entre 2 y 120 caracteres.';
    if (reference.length > 250) errors.reference = 'Usá hasta 250 caracteres.';
    const parsed = stop.coordinates.trim() ? parseCoordinates(stop.coordinates) : { error: 'Pegá las coordenadas de la parada.' };
    if (parsed.error) errors.coordinates = parsed.error;
    return { errors, value: parsed.value && { name, reference: reference || null, ...parsed.value } };
  });
  return { errors: rows.map(row => row.errors), stops: rows.map(row => row.value), valid: rows.every(row => !Object.keys(row.errors).length) };
}
