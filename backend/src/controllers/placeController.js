import { HttpError } from '../helpers/http.js';
import { positiveId } from '../middlewares/validation.js';

export const placeKinds = ['institution', 'health', 'security', 'procedures', 'transport', 'services'];
const visible = { status: 'published', hiddenAt: null };
const sourceAttributes = ['sourceType', 'sourceLabel', 'sourceUrl', 'reviewedAt'];

// Épica 4. Los lugares son públicos para cualquier cuenta: saber dónde queda una facultad
// o un hospital no depende de la institución en la que estudies.
export function placeController({ User, Institution, Place, TravelRoute }) {
  const institution = { model: Institution, as: 'institution', attributes: ['id', 'name'] };
  const placeAttributes = ['id', 'name', 'kind', 'addressLabel', 'studentNote', 'latitude', 'longitude', ...sourceAttributes];
  // MySQL devuelve DECIMAL como texto: se convierte a número para el mapa.
  // Si falta una de las dos coordenadas, el lugar se trata como "sin ubicación" (FF-21).
  function presentPlace(place) {
    const { latitude, longitude, ...rest } = place.toJSON();
    return { ...rest, location: latitude !== null && longitude !== null ? { latitude: Number(latitude), longitude: Number(longitude) } : null };
  }
  function presentRoute(route) {
    const { steps, destination, ...rest } = route.toJSON();
    return { ...rest, steps: steps.split('\n').map(step => step.trim()).filter(Boolean), destination: destination ? presentPlace(route.destination) : null };
  }
  return {
    // FF-21 y FF-23: ?kind=health&institutionId=2
    places: async (req, res) => {
      if (Object.keys(req.query).some(key => !['kind', 'institutionId'].includes(key))) throw new HttpError(400, 'Filtro no permitido.');
      const where = { ...visible };
      if (req.query.kind !== undefined) {
        if (!placeKinds.includes(req.query.kind)) throw new HttpError(400, 'Tipo de lugar inválido.');
        where.kind = req.query.kind;
      }
      if (req.query.institutionId !== undefined) where.institutionId = positiveId(req.query.institutionId, 'Institución');
      const rows = await Place.findAll({ where, attributes: placeAttributes, include: [institution], order: [['name', 'ASC'], ['id', 'ASC']] });
      const data = rows.map(presentPlace);
      // Solo se ofrecen para filtrar las instituciones que tienen lugares cargados.
      const related = await Place.findAll({ where: visible, attributes: ['institutionId'], include: [institution], group: ['institutionId', 'institution.id', 'institution.name'] });
      const institutions = related.filter(row => row.institution).map(row => row.institution.toJSON()).sort((a, b) => a.name.localeCompare(b.name));
      res.json({ data, meta: { total: data.length, withLocation: data.filter(place => place.location).length, institutions } });
    },
    place: async (req, res) => {
      const place = await Place.findOne({ where: { ...visible, id: positiveId(req.params.id) }, attributes: placeAttributes, include: [institution] });
      if (!place) throw new HttpError(404, 'No encontramos ese lugar.');
      res.json({ data: presentPlace(place) });
    },
    // FF-22: rutas de una institución. Sin filtro, las de la institución del estudiante.
    routes: async (req, res) => {
      if (Object.keys(req.query).some(key => key !== 'institutionId')) throw new HttpError(400, 'Filtro no permitido.');
      let institutionId;
      if (req.query.institutionId !== undefined) institutionId = positiveId(req.query.institutionId, 'Institución');
      else {
        const student = await User.findByPk(req.session.userId, { attributes: ['id', 'institutionId'] });
        if (!student) throw new HttpError(401, 'Tu sesión ya no es válida.');
        institutionId = student.institutionId;
      }
      const target = await Institution.findByPk(institutionId, { attributes: ['id', 'name'] });
      if (!target) throw new HttpError(404, 'La institución no existe.');
      const rows = await TravelRoute.findAll({ where: { ...visible, institutionId }, attributes: ['id', 'title', 'originLabel', 'mode', 'durationLabel', ...sourceAttributes], order: [['title', 'ASC'], ['id', 'ASC']] });
      res.json({ data: rows, meta: { institution: target } });
    },
    route: async (req, res) => {
      const route = await TravelRoute.findOne({
        where: { ...visible, id: positiveId(req.params.id) },
        attributes: ['id', 'title', 'originLabel', 'mode', 'steps', 'durationLabel', ...sourceAttributes],
        include: [institution, { model: Place, as: 'destination', where: visible, required: false, attributes: placeAttributes }],
      });
      if (!route) throw new HttpError(404, 'No encontramos esa ruta.');
      res.json({ data: presentRoute(route) });
    },
  };
}
