// Recuadro aproximado de la provincia de Formosa (el mismo que controla el backend).
export const formosaBounds = { latitude: [-27, -22], longitude: [-62.5, -57.5] };
export const insideFormosa = ({ latitude, longitude }) => latitude >= formosaBounds.latitude[0] && latitude <= formosaBounds.latitude[1] && longitude >= formosaBounds.longitude[0] && longitude <= formosaBounds.longitude[1];

// Lee coordenadas pegadas desde Google Maps u OpenStreetMap, por ejemplo "-26.18493, -58.17312".
// También acepta comas decimales separadas por espacio: "-26,18493 -58,17312".
export function parseCoordinates(text) {
  const withDots = text.match(/-?\d+(?:\.\d+)?/g);
  const withCommas = text.match(/-?\d+(?:,\d+)?/g);
  const numbers = (withDots?.length === 2 ? withDots : withCommas?.length === 2 ? withCommas.map(value => value.replace(',', '.')) : null)?.map(Number);
  if (!numbers || numbers.some(Number.isNaN)) return { error: 'Pegá latitud y longitud, por ejemplo: -26.18493, -58.17312' };
  const [latitude, longitude] = numbers;
  if (!insideFormosa({ latitude, longitude })) {
    if (insideFormosa({ latitude: longitude, longitude: latitude })) return { error: 'Parecen estar al revés: primero va la latitud (cerca de -26) y después la longitud (cerca de -58).' };
    return { error: 'Esas coordenadas quedan fuera de la provincia de Formosa.' };
  }
  return { value: { latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)) } };
}
