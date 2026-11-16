import { Op, fn, col } from 'sequelize';
import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { Category } from '../models/category.model.js';
import { Content } from '../models/content.model.js';
import { Question } from '../models/question.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { slugify } from '../helpers/slug.helper.js';
import { saveModerationLog } from '../helpers/moderation.helper.js';

// Cuántas fichas o preguntas tiene cada categoría: Map { categoryId → total }.
const countBy = async (model) => {
  const rows = await model.findAll({ attributes: ['categoryId', [fn('COUNT', col('id')), 'total']], group: ['categoryId'], raw: true });
  return new Map(rows.map(row => [row.categoryId, Number(row.total)]));
};

const findCategory = async (req) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const category = await Category.findByPk(id);
  if (!category) throw new HttpError(404, 'No encontramos esa categoría.');
  return category;
};

// GET /categories
export const getCategories = async (req, res) => {
  const categories = await Category.findAll({ attributes: ['id', 'name', 'slug', 'description'], order: [['id', 'ASC']] });
  res.json({ data: categories });
};

// Administración de categorías (FF-39). Cada cambio queda en el historial (FF-38).

// GET /admin/categories: con la cantidad de fichas y preguntas de cada una.
export const getAdminCategories = async (req, res) => {
  const [rows, contents, questions] = await Promise.all([
    Category.findAll({ attributes: ['id', 'name', 'slug', 'description'], order: [['id', 'ASC']] }),
    countBy(Content),
    countBy(Question),
  ]);
  res.json({ data: rows.map(row => ({ ...row.get({ plain: true }), contentCount: contents.get(row.id) || 0, questionCount: questions.get(row.id) || 0 })) });
};

// POST /admin/categories
export const createCategory = async (req, res) => {
  const { name, description } = matchedData(req, { locations: ['body'] });
  const slug = slugify(name);
  if (!slug) throw new HttpError(400, 'Revisá los campos indicados.', { name: 'Usá letras o números en el nombre.' });
  if (await Category.findOne({ where: { [Op.or]: [{ slug }, { name }] } })) throw new HttpError(409, 'Ya existe una categoría con ese nombre.', { name: 'Elegí otro nombre.' });
  const category = await sequelize.transaction(async transaction => {
    const created = await Category.create({ name, description, slug }, { transaction });
    await saveModerationLog(req, { action: 'category_create', targetType: 'category', targetId: created.id, note: `Creó la categoría "${created.name}".` }, transaction);
    return created;
  });
  res.status(201).json({ data: { id: category.id, name: category.name, slug: category.slug, description: category.description, contentCount: 0, questionCount: 0 } });
};

// PUT /admin/categories/:id
export const updateCategory = async (req, res) => {
  const category = await findCategory(req);
  const { name, description } = matchedData(req, { locations: ['body'] });
  if (await Category.findOne({ where: { name, id: { [Op.ne]: category.id } } })) throw new HttpError(409, 'Ya existe una categoría con ese nombre.', { name: 'Elegí otro nombre.' });
  const changes = [];
  if (name !== category.name) changes.push(`nombre "${category.name}" → "${name}"`);
  if (description !== category.description) changes.push('descripción');
  if (changes.length) {
    const previousName = category.name;
    // El slug no cambia: así las fichas y preguntas siguen ligadas y los enlaces no se rompen.
    await sequelize.transaction(async transaction => {
      await category.update({ name, description }, { transaction });
      await saveModerationLog(req, { action: 'category_update', targetType: 'category', targetId: category.id, note: `Editó la categoría "${previousName}": ${changes.join('; ')}.` }, transaction);
    });
  }
  res.json({ data: { id: category.id, name: category.name, slug: category.slug, description: category.description } });
};

// DELETE /admin/categories/:id. Nunca se borra en silencio algo que tenga fichas o preguntas.
export const deleteCategory = async (req, res) => {
  const category = await findCategory(req);
  const [contentCount, questionCount] = await Promise.all([
    Content.count({ where: { categoryId: category.id } }),
    Question.count({ where: { categoryId: category.id } }),
  ]);
  if (contentCount || questionCount) {
    throw new HttpError(409, `No se puede borrar: la usan ${contentCount} ${contentCount === 1 ? 'ficha' : 'fichas'} y ${questionCount} ${questionCount === 1 ? 'pregunta' : 'preguntas'}. Primero cambiales la categoría.`);
  }
  await sequelize.transaction(async transaction => {
    await saveModerationLog(req, { action: 'category_delete', targetType: 'category', targetId: category.id, note: `Borró la categoría "${category.name}" (no tenía fichas ni preguntas).` }, transaction);
    await category.destroy({ transaction });
  });
  res.json({ data: { id: category.id } });
};
