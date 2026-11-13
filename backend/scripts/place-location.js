// Carga o quita la ubicación de un lugar del mapa (FF-21).
// Solo cargá coordenadas que hayas comprobado (por ejemplo, en openstreetmap.org:
// clic derecho sobre el lugar → "Mostrar dirección" muestra latitud y longitud).
// También se puede hacer desde la página: Moderación → Lugares del mapa (solo administración).
// Uso: npm run place:location                          → lista los lugares
//      npm run place:location -- unaf-campus -26.1 -58.2 → carga latitud y longitud
//      npm run place:location -- unaf-campus quitar      → deja el lugar sin ubicación
import { readConfig } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { defineModels } from '../src/models/index.js';
import { formosaBounds as formosa } from '../src/middlewares/validation.js';

const [slug, first, second] = process.argv.slice(2);
const number = value => Number(String(value).replace(',', '.'));

const db = createDatabase(readConfig());
try {
  await db.authenticate();
  const { Place } = defineModels(db);
  if (!slug) {
    const places = await Place.findAll({ attributes: ['slug', 'name', 'latitude', 'longitude'], order: [['slug', 'ASC']] });
    if (!places.length) console.log('No hay lugares. Corré antes npm run db:seed.');
    for (const place of places) console.log(`${place.slug.padEnd(24)} ${place.name} — ${place.latitude === null ? 'sin ubicación' : `${place.latitude}, ${place.longitude}`}`);
  } else {
    const place = await Place.findOne({ where: { slug } });
    if (!place) throw new Error(`No existe un lugar con el identificador ${slug}. Corré el comando sin datos para ver la lista.`);
    if (first === 'quitar' && second === undefined) {
      await place.update({ latitude: null, longitude: null });
      console.log(`Listo: ${place.name} quedó sin ubicación. Se sigue mostrando con su dirección.`);
    } else {
      const latitude = number(first);
      const longitude = number(second);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Escribí latitud y longitud como números, por ejemplo -26.18 -58.17.');
      if (latitude < formosa.latitude[0] || latitude > formosa.latitude[1] || longitude < formosa.longitude[0] || longitude > formosa.longitude[1]) {
        throw new Error('Esa ubicación queda fuera de la provincia de Formosa. Revisá que no estén invertidas: primero va la latitud (cerca de -26) y después la longitud (cerca de -58).');
      }
      await place.update({ latitude: latitude.toFixed(6), longitude: longitude.toFixed(6) });
      console.log(`Listo: ${place.name} ahora aparece en el mapa en ${latitude}, ${longitude}. Recargá la página.`);
    }
  }
} catch (error) { console.error('No se pudo cambiar la ubicación:', error.message); process.exitCode = 1; }
finally { await db.close(); }
