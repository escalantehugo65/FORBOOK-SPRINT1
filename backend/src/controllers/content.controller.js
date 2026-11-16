import { Op } from 'sequelize';
import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { Content } from '../models/content.model.js';
import { Category } from '../models/category.model.js';
import { Institution } from '../models/institution.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { findSessionUser } from '../helpers/user.helper.js';
import { saveModerationLog } from '../helpers/moderation.helper.js';
import { slugify } from '../helpers/slug.helper.js';
import { textSearch } from '../helpers/search.helper.js';

const include = [
  { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
  { model: Institution, as: 'institution', attributes: ['id', 'name'] },
];

// Fichas publicadas para todos o para la institución del estudiante.
// Las ocultas por moderación (FF-37) dejan de verse, pero no se borran.
// Nunca aparece una ficha de otra institución, aunque se pida con un filtro (FF-18).
const visibleContents = async (req) => {
  const student = await findSessionUser(req);
  return { status: 'published', hiddenAt: null, [Op.and]: [{ [Op.or]: [{ institutionId: null }, { institutionId: student.institutionId }] }] };
};

// GET /contents?categoryId=2&scope=institution&search=colectivo&page=2 (12 por página)
export const getContents = async (req, res) => {
  const filters = matchedData(req, { locations: ['query'] });
  const where = await visibleContents(req);
  if (filters.categoryId !== undefined) where.categoryId = filters.categoryId;
  if (filters.institutionId !== undefined) where[Op.and].push({ institutionId: filters.institutionId });
  if (filters.scope === 'general') where[Op.and].push({ institutionId: null });
  if (filters.scope === 'institution') where[Op.and].push({ institutionId: { [Op.ne]: null } });
  if (filters.search !== undefined) where[Op.and].push(textSearch(['title', 'summary', 'body'], filters.search));
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

const contentFields = { title: 'título', summary: 'resumen', body: 'texto', categoryId: 'categoría', institutionId: 'institución', status: 'estado', ...sourceFields };

// Arma la ficha con lo validado: textos vacíos como null.
const contentInput = (data) => ({
  title: data.title,
  summary: data.summary,
  body: data.body,
  categoryId: data.categoryId,
  institutionId: data.institutionId ?? null,
  status: data.status,
  sourceType: data.sourceType,
  sourceLabel: data.sourceLabel || null,
  sourceUrl: data.sourceUrl || null,
  authorLabel: data.authorLabel || null,
  reviewedAt: data.reviewedAt || null,
});

// La categoría y la institución tienen que existir.
const checkRelations = async (input) => {
  const fields = {};
  if (!await Category.findByPk(input.categoryId)) fields.categoryId = 'Elegí una categoría de la lista.';
  if (input.institutionId !== null && !await Institution.findByPk(input.institutionId)) fields.institutionId = 'Elegí una institución válida.';
  if (Object.keys(fields).length) throw new HttpError(400, 'Revisá los campos indicados.', fields);
};

// GET /admin/contents/:id: la ficha completa, con el texto, para editarla.
export const getAdminContentById = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const content = await Content.findByPk(id, { attributes: [...adminAttributes, 'summary', 'body', 'slug'], include: adminInclude });
  if (!content) throw new HttpError(404, 'No encontramos esa ficha.');
  res.json({ data: content });
};

// POST /admin/contents: ficha nueva. La dirección (slug) sale del título y no se repite.
export const createContent = async (req, res) => {
  const input = contentInput(matchedData(req, { locations: ['body'] }));
  await checkRelations(input);
  const base = slugify(input.title) || 'ficha';
  let slug = base;
  for (let n = 2; await Content.findOne({ where: { slug } }); n += 1) slug = `${base}-${n}`;
  const content = await sequelize.transaction(async transaction => {
    const created = await Content.create({ ...input, slug }, { transaction });
    await saveModerationLog(req, { action: 'content_create', targetType: 'content', targetId: created.id, note: `Creó la ficha "${created.title}"${input.status === 'draft' ? ' como borrador' : ''}.` }, transaction);
    return created;
  });
  res.status(201).json({ data: await Content.findByPk(content.id, { attributes: [...adminAttributes, 'summary', 'body', 'slug'], include: adminInclude }) });
};

// PUT /admin/contents/:id: editar toda la ficha. Si no cambió nada, no se guarda ni se registra.
export const updateContent = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const content = await Content.findByPk(id);
  if (!content) throw new HttpError(404, 'No encontramos esa ficha.');
  const input = contentInput(matchedData(req, { locations: ['body'] }));
  await checkRelations(input);
  const changed = Object.keys(contentFields).filter(key => (content[key] ?? null) !== input[key]);
  if (changed.length) {
    await sequelize.transaction(async transaction => {
      await content.update(input, { transaction });
      await saveModerationLog(req, { action: 'content_update', targetType: 'content', targetId: content.id, note: `Editó la ficha "${content.title}": ${[...new Set(changed.map(key => contentFields[key]))].join(', ')}.` }, transaction);
    });
  }
  res.json({ data: await Content.findByPk(content.id, { attributes: [...adminAttributes, 'summary', 'body', 'slug'], include: adminInclude }) });
};

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
