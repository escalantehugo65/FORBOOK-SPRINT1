// Categorías de los lugares del mapa (las mismas del ENUM del modelo Place).
export const placeKinds = ['institution', 'health', 'security', 'procedures', 'transport', 'services'];

// Recuadro aproximado de la provincia de Formosa: frena coordenadas invertidas o de otro lugar.
export const formosaBounds = { latitude: [-27, -22], longitude: [-62.5, -57.5] };

export const isInsideFormosa = (latitude, longitude) => latitude >= formosaBounds.latitude[0] && latitude <= formosaBounds.latitude[1]
  && longitude >= formosaBounds.longitude[0] && longitude <= formosaBounds.longitude[1];

// Solo lo publicado y no ocultado por moderación se ve en el mapa y en las rutas.
export const visible = { status: 'published', hiddenAt: null };

export const sourceAttributes = ['sourceType', 'sourceLabel', 'sourceUrl', 'reviewedAt'];
export const publicPlaceAttributes = ['id', 'name', 'kind', 'addressLabel', 'studentNote', 'latitude', 'longitude', ...sourceAttributes];

// MySQL devuelve DECIMAL como texto: se convierte a número para el mapa.
// Si falta una de las dos coordenadas, el lugar se trata como "sin ubicación" (FF-21).
export const presentPlace = (place) => {
  const { latitude, longitude, ...rest } = place.toJSON();
  return { ...rest, location: latitude !== null && longitude !== null ? { latitude: Number(latitude), longitude: Number(longitude) } : null };
};
