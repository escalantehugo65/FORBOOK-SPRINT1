import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { TravelRoute } from '../models/travel_route.model.js';
import { RouteStop } from '../models/route_stop.model.js';
import { Place } from '../models/place.model.js';
import { Institution } from '../models/institution.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { findSessionUser } from '../helpers/user.helper.js';
import { presentPlace, publicPlaceAttributes, sourceAttributes, visible } from '../helpers/place.helper.js';
import { slugify } from '../helpers/slug.helper.js';
import { saveModerationLog } from '../helpers/moderation.helper.js';

const institutionInclude = { model: Institution, as: 'institution', attributes: ['id', 'name'] };
const stopsInclude = { model: RouteStop, as: 'stops', attributes: ['id', 'name', 'reference', 'latitude', 'longitude'] };
const stopsOrder = [{ model: RouteStop, as: 'stops' }, 'position', 'ASC'];
// Cantidad de paradas de cada ruta, para mostrarla en la lista sin traer las paradas.
const stopsCount = sequelize.literal('(SELECT COUNT(*) FROM route_stops WHERE route_stops.route_id = `TravelRoute`.`id`)');

// MySQL devuelve DECIMAL como texto: las coordenadas de las paradas se mandan como números.
const presentStops = (stops = []) => stops.map(({ id, name, reference, latitude, longitude }) => ({ id, name, reference, latitude: Number(latitude), longitude: Number(longitude) }));

// Los pasos se guardan uno por línea; se mandan como lista y sin líneas vacías.
const presentRoute = (route) => {
  const { steps, destination, stops, ...rest } = route.toJSON();
  return { ...rest, steps: steps.split('\n').map(step => step.trim()).filter(Boolean), destination: destination ? presentPlace(route.destination) : null, stops: presentStops(stops) };
};

// GET /routes?institutionId=2 (FF-22). Sin filtro, las de la institución del estudiante.
export const getRoutes = async (req, res) => {
  const filters = matchedData(req, { locations: ['query'] });
  const institutionId = filters.institutionId ?? (await findSessionUser(req)).institutionId;
  const institution = await Institution.findByPk(institutionId, { attributes: ['id', 'name'] });
  if (!institution) throw new HttpError(404, 'La institución no existe.');
  const routes = await TravelRoute.findAll({
    where: { ...visible, institutionId },
    attributes: ['id', 'title', 'originLabel', 'mode', 'durationLabel', ...sourceAttributes, [stopsCount, 'stopsCount']],
    order: [['title', 'ASC'], ['id', 'ASC']],
  });
  res.json({ data: routes.map(route => ({ ...route.toJSON(), stopsCount: Number(route.get('stopsCount')) })), meta: { institution } });
};

// GET /routes/:id
export const getRouteById = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const route = await TravelRoute.findOne({
    where: { ...visible, id },
    attributes: ['id', 'title', 'originLabel', 'mode', 'steps', 'durationLabel', ...sourceAttributes],
    include: [institutionInclude, { model: Place, as: 'destination', where: visible, required: false, attributes: publicPlaceAttributes }, stopsInclude],
    order: [stopsOrder],
  });
  if (!route) throw new HttpError(404, 'No encontramos esa ruta.');
  res.json({ data: presentRoute(route) });
};

// Administración de rutas (FF-22): cada alta o cambio queda en el historial de moderación.
const routeFields = { title: 'título', institutionId: 'institución', destinationPlaceId: 'destino', originLabel: 'punto de partida', mode: 'medio', steps: 'pasos', durationLabel: 'tiempo', status: 'estado', sourceType: 'tipo de fuente', sourceLabel: 'fuente', sourceUrl: 'enlace', reviewedAt: 'fecha de revisión' };
const adminAttributes = ['id', 'slug', 'hiddenAt', ...Object.keys(routeFields)];
const adminInclude = [institutionInclude, { model: Place, as: 'destination', attributes: ['id', 'name', 'status'] }, stopsInclude];
const presentAdminRoute = (route) => ({ ...route.toJSON(), stops: presentStops(route.stops) });

const routeInput = (data) => ({
  title: data.title,
  institutionId: data.institutionId,
  destinationPlaceId: data.destinationPlaceId ?? null,
  originLabel: data.originLabel,
  mode: data.mode,
  steps: data.steps,
  durationLabel: data.durationLabel || null,
  status: data.status,
  sourceType: data.sourceType,
  sourceLabel: data.sourceLabel || null,
  sourceUrl: data.sourceUrl || null,
  reviewedAt: data.reviewedAt || null,
});

// La institución y el lugar de destino tienen que existir.
const checkRelations = async (input) => {
  const fields = {};
  if (!await Institution.findByPk(input.institutionId)) fields.institutionId = 'Elegí una institución válida.';
  if (input.destinationPlaceId !== null && !await Place.findByPk(input.destinationPlaceId)) fields.destinationPlaceId = 'Elegí un lugar del mapa válido.';
  if (Object.keys(fields).length) throw new HttpError(400, 'Revisá los campos indicados.', fields);
};

const findAdminRoute = async (id) => presentAdminRoute(await TravelRoute.findByPk(id, { attributes: adminAttributes, include: adminInclude, order: [stopsOrder] }));

// Las paradas se reemplazan todas juntas, en el orden en que vienen.
const saveStops = (routeId, stops, transaction) => RouteStop.bulkCreate(stops.map((stop, index) => ({ ...stop, routeId, position: index + 1 })), { transaction });
const stopsNote = (stops) => (stops.length === 1 ? '1 parada' : `${stops.length} paradas`);

// GET /admin/routes: también los borradores y las ocultas.
export const getAdminRoutes = async (req, res) => {
  const routes = await TravelRoute.findAll({ attributes: adminAttributes, include: adminInclude, order: [['title', 'ASC'], ['id', 'ASC'], stopsOrder] });
  res.json({ data: routes.map(presentAdminRoute) });
};

// POST /admin/routes
export const createRoute = async (req, res) => {
  const data = matchedData(req, { locations: ['body'] });
  const input = routeInput(data);
  const stops = data.stops ?? [];
  await checkRelations(input);
  const base = slugify(input.title) || 'ruta';
  let slug = base;
  for (let n = 2; await TravelRoute.findOne({ where: { slug } }); n += 1) slug = `${base}-${n}`;
  const route = await sequelize.transaction(async transaction => {
    const created = await TravelRoute.create({ ...input, slug }, { transaction });
    if (stops.length) await saveStops(created.id, stops, transaction);
    const note = `Agregó la ruta "${created.title}"${stops.length ? ` con ${stopsNote(stops)}` : ''}.`;
    await saveModerationLog(req, { action: 'route_create', targetType: 'route', targetId: created.id, note }, transaction);
    return created;
  });
  res.status(201).json({ data: await findAdminRoute(route.id) });
};

// PUT /admin/routes/:id. Si no cambió nada, no se guarda ni se registra.
// Si no vienen paradas, se conservan las que tenía.
export const updateRoute = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const route = await TravelRoute.findByPk(id, { include: [stopsInclude], order: [stopsOrder] });
  if (!route) throw new HttpError(404, 'No encontramos esa ruta.');
  const data = matchedData(req, { locations: ['body'] });
  const input = routeInput(data);
  await checkRelations(input);
  const changed = Object.keys(routeFields).filter(key => (route[key] ?? null) !== input[key]);
  const current = presentStops(route.stops).map(({ id: stopId, ...stop }) => stop);
  const stopsChanged = data.stops !== undefined && JSON.stringify(current) !== JSON.stringify(data.stops);
  if (changed.length || stopsChanged) {
    await sequelize.transaction(async transaction => {
      if (changed.length) await route.update(input, { transaction });
      if (stopsChanged) {
        await RouteStop.destroy({ where: { routeId: route.id }, transaction });
        if (data.stops.length) await saveStops(route.id, data.stops, transaction);
      }
      const parts = [...changed.map(key => routeFields[key]), ...(stopsChanged ? [`paradas (ahora ${stopsNote(data.stops)})`] : [])];
      await saveModerationLog(req, { action: 'route_update', targetType: 'route', targetId: route.id, note: `Editó la ruta "${route.title}": ${parts.join(', ')}.` }, transaction);
    });
  }
  res.json({ data: await findAdminRoute(route.id) });
};
