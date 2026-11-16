import { matchedData } from 'express-validator';
import { TravelRoute } from '../models/travel_route.model.js';
import { Place } from '../models/place.model.js';
import { Institution } from '../models/institution.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { findSessionUser } from '../helpers/user.helper.js';
import { presentPlace, publicPlaceAttributes, sourceAttributes, visible } from '../helpers/place.helper.js';

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
