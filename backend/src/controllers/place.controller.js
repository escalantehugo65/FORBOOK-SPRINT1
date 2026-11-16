import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { Place } from '../models/place.model.js';
import { Institution } from '../models/institution.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { presentPlace, publicPlaceAttributes, visible } from '../helpers/place.helper.js';
import { slugify } from '../helpers/slug.helper.js';
import { saveModerationLog } from '../helpers/moderation.helper.js';

const institutionInclude = { model: Institution, as: 'institution', attributes: ['id', 'name'] };

// Épica 4. Los lugares son públicos para cualquier cuenta: saber dónde queda una facultad
// o un hospital no depende de la institución en la que estudies.

// GET /places?kind=health&institutionId=2 (FF-21 y FF-23)
export const getPlaces = async (req, res) => {
  const filters = matchedData(req, { locations: ['query'] });
  const where = { ...visible };
  if (filters.kind !== undefined) where.kind = filters.kind;
  if (filters.institutionId !== undefined) where.institutionId = filters.institutionId;
  const rows = await Place.findAll({ where, attributes: publicPlaceAttributes, include: [institutionInclude], order: [['name', 'ASC'], ['id', 'ASC']] });
  const data = rows.map(presentPlace);
  // Solo se ofrecen para filtrar las instituciones que tienen lugares cargados.
  const related = await Place.findAll({ where: visible, attributes: ['institutionId'], include: [institutionInclude], group: ['institutionId', 'institution.id', 'institution.name'] });
  const institutions = related.filter(row => row.institution).map(row => row.institution.toJSON()).sort((a, b) => a.name.localeCompare(b.name));
  res.json({ data, meta: { total: data.length, withLocation: data.filter(place => place.location).length, institutions } });
};

// GET /places/:id
export const getPlaceById = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const place = await Place.findOne({ where: { ...visible, id }, attributes: publicPlaceAttributes, include: [institutionInclude] });
  if (!place) throw new HttpError(404, 'No encontramos ese lugar.');
  res.json({ data: presentPlace(place) });
};

// Administración de lugares: cada alta o cambio queda en el historial de moderación.
const placeFields = { name: 'nombre', kind: 'categoría', institutionId: 'institución', addressLabel: 'dirección', studentNote: 'nota', latitude: 'ubicación', longitude: 'ubicación', status: 'estado', sourceType: 'tipo de fuente', sourceLabel: 'fuente', sourceUrl: 'enlace', reviewedAt: 'fecha de revisión' };
const adminAttributes = ['id', 'slug', 'institutionId', ...Object.keys(placeFields).filter(key => key !== 'institutionId')];
const findAdminPlace = (id) => Place.findByPk(id, { attributes: adminAttributes, include: [institutionInclude] });

// En el formulario de administración las coordenadas van sueltas y como números.
const presentAdminPlace = (place) => {
  const { latitude, longitude, ...rest } = place.toJSON();
  return { ...rest, latitude: latitude === null ? null : Number(latitude), longitude: longitude === null ? null : Number(longitude) };
};

// Arma el lugar con lo validado: textos vacíos como null y coordenadas con 6 decimales.
const placeInput = (data) => ({
  name: data.name,
  kind: data.kind,
  institutionId: data.institutionId ?? null,
  addressLabel: data.addressLabel || null,
  studentNote: data.studentNote || null,
  latitude: typeof data.latitude === 'number' ? Number(data.latitude.toFixed(6)) : null,
  longitude: typeof data.longitude === 'number' ? Number(data.longitude.toFixed(6)) : null,
  status: data.status,
  sourceType: data.sourceType,
  sourceLabel: data.sourceLabel || null,
  sourceUrl: data.sourceUrl || null,
  reviewedAt: data.reviewedAt || null,
});

const checkInstitution = async (id) => {
  if (id !== null && !await Institution.findByPk(id)) throw new HttpError(400, 'Revisá los campos indicados.', { institutionId: 'Elegí una institución válida.' });
};

// GET /admin/places: también los borradores y los ocultos.
export const getAdminPlaces = async (req, res) => {
  const places = await Place.findAll({ attributes: adminAttributes, include: [institutionInclude], order: [['name', 'ASC'], ['id', 'ASC']] });
  res.json({ data: places.map(presentAdminPlace) });
};

// POST /admin/places
export const createPlace = async (req, res) => {
  const input = placeInput(matchedData(req, { locations: ['body'] }));
  await checkInstitution(input.institutionId);
  const base = slugify(input.name) || 'lugar';
  let slug = base;
  for (let n = 2; await Place.findOne({ where: { slug } }); n += 1) slug = `${base}-${n}`;
  const place = await sequelize.transaction(async transaction => {
    const created = await Place.create({ ...input, slug }, { transaction });
    await saveModerationLog(req, { action: 'place_create', targetType: 'place', targetId: created.id, note: `Agregó el lugar "${created.name}"${input.latitude === null ? ' sin ubicación' : ' con ubicación en el mapa'}.` }, transaction);
    return created;
  });
  res.status(201).json({ data: presentAdminPlace(await findAdminPlace(place.id)) });
};

// PUT /admin/places/:id. Si no cambió nada, no se guarda ni se registra.
export const updatePlace = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const place = await Place.findByPk(id);
  if (!place) throw new HttpError(404, 'No encontramos ese lugar.');
  const input = placeInput(matchedData(req, { locations: ['body'] }));
  await checkInstitution(input.institutionId);
  const same = (key, value) => (key === 'latitude' || key === 'longitude'
    ? (place[key] === null ? null : Number(place[key])) === value
    : (place[key] ?? null) === value);
  const changed = Object.keys(placeFields).filter(key => !same(key, input[key]));
  if (changed.length) {
    await sequelize.transaction(async transaction => {
      await place.update(input, { transaction });
      const labels = [...new Set(changed.map(key => placeFields[key]))];
      await saveModerationLog(req, { action: 'place_update', targetType: 'place', targetId: place.id, note: `Editó el lugar "${place.name}": ${labels.join(', ')}.` }, transaction);
    });
  }
  res.json({ data: presentAdminPlace(await findAdminPlace(place.id)) });
};
