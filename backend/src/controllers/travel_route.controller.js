import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { TravelRoute } from '../models/travel_route.model.js';
import { Place } from '../models/place.model.js';
import { Institution } from '../models/institution.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { findSessionUser } from '../helpers/user.helper.js';
import { presentPlace, publicPlaceAttributes, sourceAttributes, visible } from '../helpers/place.helper.js';
import { slugify } from '../helpers/slug.helper.js';
import { saveModerationLog } from '../helpers/moderation.helper.js';

const institutionInclude = { model: Institution, as: 'institution', attributes: ['id', 'name'] };

// Los pasos se guardan uno por línea; se mandan como lista y sin líneas vacías.
const presentRoute = (route) => {
  const { steps, destination, ...rest } = route.toJSON();
  return { ...rest, steps: steps.split('\n').map(step => step.trim()).filter(Boolean), destination: destination ? presentPlace(route.destination) : null };
};

// GET /routes?institutionId=2 (FF-22). Sin filtro, las de la institución del estudiante.
export const getRoutes = async (req, res) => {
  const filters = matchedData(req, { locations: ['query'] });
  const institutionId = filters.institutionId ?? (await findSessionUser(req)).institutionId;
  const institution = await Institution.findByPk(institutionId, { attributes: ['id', 'name'] });
  if (!institution) throw new HttpError(404, 'La institución no existe.');
  const routes = await TravelRoute.findAll({
    where: { ...visible, institutionId },
    attributes: ['id', 'title', 'originLabel', 'mode', 'durationLabel', ...sourceAttributes],
    order: [['title', 'ASC'], ['id', 'ASC']],
  });
  res.json({ data: routes, meta: { institution } });
};

// GET /routes/:id
export const getRouteById = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const route = await TravelRoute.findOne({
    where: { ...visible, id },
    attributes: ['id', 'title', 'originLabel', 'mode', 'steps', 'durationLabel', ...sourceAttributes],
    include: [institutionInclude, { model: Place, as: 'destination', where: visible, required: false, attributes: publicPlaceAttributes }],
  });
  if (!route) throw new HttpError(404, 'No encontramos esa ruta.');
  res.json({ data: presentRoute(route) });
};

// Administración de rutas (FF-22): cada alta o cambio queda en el historial de moderación.
const routeFields = { title: 'título', institutionId: 'institución', destinationPlaceId: 'destino', originLabel: 'punto de partida', mode: 'medio', steps: 'pasos', durationLabel: 'tiempo', status: 'estado', sourceType: 'tipo de fuente', sourceLabel: 'fuente', sourceUrl: 'enlace', reviewedAt: 'fecha de revisión' };
const adminAttributes = ['id', 'slug', 'hiddenAt', ...Object.keys(routeFields)];
const adminInclude = [institutionInclude, { model: Place, as: 'destination', attributes: ['id', 'name', 'status'] }];

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

const findAdminRoute = (id) => TravelRoute.findByPk(id, { attributes: adminAttributes, include: adminInclude });

// GET /admin/routes: también los borradores y las ocultas.
export const getAdminRoutes = async (req, res) => {
  const routes = await TravelRoute.findAll({ attributes: adminAttributes, include: adminInclude, order: [['title', 'ASC'], ['id', 'ASC']] });
  res.json({ data: routes });
};

// POST /admin/routes
export const createRoute = async (req, res) => {
  const input = routeInput(matchedData(req, { locations: ['body'] }));
  await checkRelations(input);
  const base = slugify(input.title) || 'ruta';
  let slug = base;
  for (let n = 2; await TravelRoute.findOne({ where: { slug } }); n += 1) slug = `${base}-${n}`;
  const route = await sequelize.transaction(async transaction => {
    const created = await TravelRoute.create({ ...input, slug }, { transaction });
    await saveModerationLog(req, { action: 'route_create', targetType: 'route', targetId: created.id, note: `Agregó la ruta "${created.title}".` }, transaction);
    return created;
  });
  res.status(201).json({ data: await findAdminRoute(route.id) });
};

// PUT /admin/routes/:id. Si no cambió nada, no se guarda ni se registra.
export const updateRoute = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const route = await TravelRoute.findByPk(id);
  if (!route) throw new HttpError(404, 'No encontramos esa ruta.');
  const input = routeInput(matchedData(req, { locations: ['body'] }));
  await checkRelations(input);
  const changed = Object.keys(routeFields).filter(key => (route[key] ?? null) !== input[key]);
  if (changed.length) {
    await sequelize.transaction(async transaction => {
      await route.update(input, { transaction });
      await saveModerationLog(req, { action: 'route_update', targetType: 'route', targetId: route.id, note: `Editó la ruta "${route.title}": ${changed.map(key => routeFields[key]).join(', ')}.` }, transaction);
    });
  }
  res.json({ data: await findAdminRoute(route.id) });
};
