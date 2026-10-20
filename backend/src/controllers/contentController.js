import { HttpError } from '../helpers/http.js';
import { positiveId } from '../middlewares/validation.js';

export function contentController({ Institution, Category, Content }) {
  const include = [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }, { model: Institution, as: 'institution', attributes: ['id', 'name'] }];
  return {
    institutions: async (req, res) => res.json({ data: await Institution.findAll({ attributes: ['id', 'name', 'sourceUrl'], order: [['name', 'ASC']] }) }),
    categories: async (req, res) => res.json({ data: await Category.findAll({ attributes: ['id', 'name', 'slug', 'description'], order: [['id', 'ASC']] }) }),
    list: async (req, res) => {
      if (Object.keys(req.query).some(key => !['categoryId', 'institutionId', 'page'].includes(key))) throw new HttpError(400, 'Filtro no permitido.');
      const where = { status: 'published' };
      if (req.query.categoryId !== undefined) where.categoryId = positiveId(req.query.categoryId, 'Categoría');
      if (req.query.institutionId !== undefined) where.institutionId = positiveId(req.query.institutionId, 'Institución');
      const page = req.query.page === undefined ? 1 : positiveId(req.query.page, 'Página');
      const limit = 12;
      const { rows, count } = await Content.findAndCountAll({ where, include, attributes: { exclude: ['body'] }, order: [['reviewedAt', 'DESC'], ['id', 'ASC']], limit, offset: (page - 1) * limit });
      res.json({ data: rows, meta: { page, total: count, pages: Math.ceil(count / limit) } });
    },
    detail: async (req, res) => {
      const id = positiveId(req.params.id);
      const content = await Content.findOne({ where: { id, status: 'published' }, include });
      if (!content) throw new HttpError(404, 'No encontramos ese contenido.');
      res.json({ data: content });
    },
  };
}
