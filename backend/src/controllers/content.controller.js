import { Op } from 'sequelize';
import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { Content } from '../models/content.model.js';
import { Category } from '../models/category.model.js';
import { Institution } from '../models/institution.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { findSessionUser } from '../helpers/user.helper.js';
import { saveModerationLog } from '../helpers/moderation.helper.js';

const include = [
  { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
  { model: Institution, as: 'institution', attributes: ['id', 'name'] },
];

// Fichas publicadas para todos o para la institución del estudiante.
// Las ocultas por moderación (FF-37) dejan de verse, pero no se borran.
const visibleContents = async (req) => {
  const student = await findSessionUser(req);
  return { status: 'published', hiddenAt: null, [Op.or]: [{ institutionId: null }, { institutionId: student.institutionId }] };
};

// GET /contents?categoryId=2&institutionId=1&page=2 (12 por página)
export const getContents = async (req, res) => {
  const filters = matchedData(req, { locations: ['query'] });
  const where = await visibleContents(req);
  if (filters.categoryId !== undefined) where.categoryId = filters.categoryId;
  if (filters.institutionId !== undefined) where.institutionId = filters.institutionId;
  const page = filters.page ?? 1;
  const limit = 12;
  const { rows, count } = await Content.findAndCountAll({
    where,
    include,
    attributes: { exclude: ['body'] },
    order: [['reviewedAt', 'DESC'], ['id', 'ASC']],
    limit,
    offset: (page - 1) * limit,
  });
  res.json({ data: rows, meta: { page, total: count, pages: Math.ceil(count / limit) } });
};

// GET /contents/:id
export const getContentById = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const content = await Content.findOne({ where: { ...(await visibleContents(req)), id }, include });
  if (!content) throw new HttpError(404, 'No encontramos ese contenido.');
  res.json({ data: content });
};

// Administración de las fuentes de las fichas (FF-39).
const sourceFields = { sourceType: 'tipo de fuente', sourceLabel: 'fuente', sourceUrl: 'enlace', authorLabel: 'autoría', reviewedAt: 'fecha de revisión' };
const adminAttributes = ['id', 'title', 'status', 'hiddenAt', 'categoryId', 'institutionId', ...Object.keys(sourceFields)];
const adminInclude = [
  { model: Category, as: 'category', attributes: ['id', 'name'] },
  { model: Institution, as: 'institution', attributes: ['id', 'name'] },
];

// GET /admin/contents
export const getAdminContents = async (req, res) => {
  const contents = await Content.findAll({ attributes: adminAttributes, include: adminInclude, order: [['id', 'ASC']], limit: 200 });
  res.json({ data: contents });
};

// PUT /admin/contents/:id/source. Si no cambió nada, no se guarda ni se registra.
export const updateContentSource = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const content = await Content.findByPk(id);
  if (!content) throw new HttpError(404, 'No encontramos esa ficha.');
  const data = matchedData(req, { locations: ['body'] });
  const input = {
    sourceType: data.sourceType,
    sourceLabel: data.sourceLabel || null,
    sourceUrl: data.sourceUrl || null,
    authorLabel: data.authorLabel || null,
    reviewedAt: data.reviewedAt || null,
  };
  const changed = Object.keys(sourceFields).filter(key => (content[key] ?? null) !== input[key]);
  if (changed.length) {
    await sequelize.transaction(async transaction => {
      await content.update(input, { transaction });
      await saveModerationLog(req, { action: 'source_update', targetType: 'content', targetId: content.id, note: `Actualizó ${changed.map(key => sourceFields[key]).join(', ')} de la ficha "${content.title}".` }, transaction);
    });
  }
  res.json({ data: await Content.findByPk(content.id, { attributes: adminAttributes, include: adminInclude }) });
};
