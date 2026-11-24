import { Op } from 'sequelize';
import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { Content } from '../models/content.model.js';
import { Category } from '../models/category.model.js';
import { Institution } from '../models/institution.model.js';
import { User } from '../models/user.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { authorAttributes, findSessionUser, publicAuthor } from '../helpers/user.helper.js';
import { decorationsFor } from '../helpers/decoration.helper.js';
import { startOfToday } from '../helpers/point.helper.js';
import { saveModerationLog } from '../helpers/moderation.helper.js';
import { slugify } from '../helpers/slug.helper.js';
import { textSearch } from '../helpers/search.helper.js';
import { guideSections } from '../helpers/guide.helper.js';

const include = [
  { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
  { model: Institution, as: 'institution', attributes: ['id', 'name'] },
  { model: User, as: 'author', attributes: authorAttributes },
];

// Una ficha para el frontend. Si la creó un estudiante, author trae su nombre y su foto (nunca el correo).
const presentContents = async (rows, viewerId = null) => {
  const decorations = await decorationsFor([...new Set(rows.map(row => row.authorId).filter(Boolean))]);
  return rows.map(row => {
    const { author, ...rest } = row.toJSON();
    return { ...rest, author: row.authorId && row.author ? { ...publicAuthor(row.author, decorations.get(row.authorId)), fullName: row.author.name } : null, own: Boolean(viewerId && row.authorId === viewerId) };
  });
};

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
  res.json({ data: await presentContents(rows, req.session.userId), meta: { page, total: count, pages: Math.ceil(count / limit) } });
};

// GET /contents/:id
export const getContentById = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const content = await Content.findOne({ where: { ...(await visibleContents(req)), id }, include });
  if (!content) throw new HttpError(404, 'No encontramos ese contenido.');
  const [data] = await presentContents([content], req.session.userId);
  res.json({ data });
};

// GET /guide: la guía «Cómo vivir en Formosa». Cada tema con sus fichas visibles para quien mira, en el orden de la guía.
export const getGuide = async (req, res) => {
  const slugs = guideSections.flatMap(section => section.slugs);
  const rows = await Content.findAll({ where: { ...(await visibleContents(req)), slug: slugs }, include, attributes: { exclude: ['body'] } });
  const bySlug = new Map((await presentContents(rows, req.session.userId)).map(item => [item.slug, item]));
  res.json({ data: guideSections.map(({ slugs: list, ...section }) => ({ ...section, contents: list.map(slug => bySlug.get(slug)).filter(Boolean) })).filter(section => section.contents.length) });
};

// Fichas creadas por estudiantes. Se publican al momento con quien la hizo a la vista (authorId)
// y la comunidad las puede reportar. Hasta 3 por día por persona.
export const userContentLimit = 3;
const today = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
const userInput = (data, user) => ({
  title: data.title,
  summary: data.summary,
  body: data.body,
  categoryId: data.categoryId,
  institutionId: data.forMyInstitution ? user.institutionId : null,
  sourceType: data.sourceType,
  sourceLabel: data.sourceLabel || null,
  sourceUrl: data.sourceUrl || null,
  // La autoría la pone el servidor: es la persona que la publica.
  authorLabel: user.name,
  authorId: user.id,
  reviewedAt: today(),
  status: 'published',
});

// POST /contents
export const createUserContent = async (req, res) => {
  const data = matchedData(req, { locations: ['body'] });
  const content = await sequelize.transaction(async transaction => {
    const user = await User.findByPk(req.session.userId, { attributes: ['id', 'name', 'institutionId'], transaction, lock: transaction.LOCK.UPDATE });
    const created = await Content.count({ where: { authorId: user.id, createdAt: { [Op.gte]: startOfToday() } }, transaction });
    if (created >= userContentLimit) throw new HttpError(429, `Podés publicar hasta ${userContentLimit} fichas por día. Volvé a intentar mañana.`);
    const input = userInput(data, user);
    if (!await Category.findByPk(input.categoryId, { transaction })) throw new HttpError(400, 'Revisá los campos indicados.', { categoryId: 'Elegí una categoría de la lista.' });
    const base = slugify(input.title) || 'ficha';
    let slug = base;
    for (let n = 2; await Content.findOne({ where: { slug }, attributes: ['id'], transaction }); n += 1) slug = `${base}-${n}`;
    return Content.create({ ...input, slug }, { transaction });
  });
  res.status(201).json({ data: { id: content.id }, message: 'Publicaste la ficha. Ya la puede ver la comunidad.' });
};

// La ficha de un estudiante, solo para su autor (y visible).
const findOwnContent = async (req, id) => {
  const content = await Content.findOne({ where: { id, authorId: req.session.userId } });
  if (!content) throw new HttpError(404, 'No encontramos esa ficha entre las tuyas.');
  if (content.hiddenAt) throw new HttpError(409, 'Moderación ocultó esta ficha: ya no se puede editar.');
  return content;
};

// GET /contents/:id/edit: la ficha propia con sus datos, para editarla.
export const getOwnContent = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const content = await findOwnContent(req, id);
  res.json({ data: { id: content.id, title: content.title, summary: content.summary, body: content.body, categoryId: content.categoryId, forMyInstitution: content.institutionId !== null, sourceType: content.sourceType, sourceLabel: content.sourceLabel ?? '', sourceUrl: content.sourceUrl ?? '' } });
};

// PUT /contents/:id: el autor edita su ficha. La fecha de revisión pasa a ser la de hoy.
export const updateUserContent = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const content = await findOwnContent(req, id);
  const user = await User.findByPk(req.session.userId, { attributes: ['id', 'name', 'institutionId'] });
  const input = userInput(matchedData(req, { locations: ['body'] }), user);
  if (!await Category.findByPk(input.categoryId)) throw new HttpError(400, 'Revisá los campos indicados.', { categoryId: 'Elegí una categoría de la lista.' });
  await content.update(input);
  res.json({ data: { id: content.id }, message: 'Guardamos los cambios de tu ficha.' });
};

// DELETE /contents/:id: el autor borra su ficha. Administración también puede borrar la de un estudiante.
export const deleteUserContent = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const viewer = await findSessionUser(req, ['id', 'role']);
  const content = await Content.findOne({ where: { id, authorId: { [Op.ne]: null } } });
  if (!content || (content.authorId !== viewer.id && viewer.role !== 'admin')) throw new HttpError(404, 'No encontramos esa ficha entre las tuyas.');
  await content.destroy();
  res.json({ data: { id }, message: 'Borramos la ficha.' });
};

// Administración de las fuentes de las fichas (FF-39).
const sourceFields = { sourceType: 'tipo de fuente', sourceLabel: 'fuente', sourceUrl: 'enlace', authorLabel: 'autoría', reviewedAt: 'fecha de revisión' };
const adminAttributes = ['id', 'title', 'status', 'hiddenAt', 'categoryId', 'institutionId', 'authorId', ...Object.keys(sourceFields)];
const adminInclude = [
  { model: Category, as: 'category', attributes: ['id', 'name'] },
  { model: Institution, as: 'institution', attributes: ['id', 'name'] },
  { model: User, as: 'author', attributes: ['id', 'name'] },
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
