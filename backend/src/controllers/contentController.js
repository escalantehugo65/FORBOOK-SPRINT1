import { Op } from 'sequelize';
import { HttpError } from '../helpers/http.js';
import { positiveId } from '../middlewares/validation.js';

export function contentController({ User, Institution, Career, InstitutionResource, Category, Content }) {
  const include = [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }, { model: Institution, as: 'institution', attributes: ['id', 'name'] }];
  async function currentStudent(req) {
    const student = await User.findByPk(req.session.userId, { attributes: ['id', 'institutionId'] });
    if (!student) throw new HttpError(401, 'Tu sesión ya no es válida.');
    return student;
  }
  async function visibleContents(req) {
    const student = await currentStudent(req);
    return { status: 'published', [Op.or]: [{ institutionId: null }, { institutionId: student.institutionId }] };
  }
  return {
    resources: async (req, res) => {
      const student = await currentStudent(req);
      const institution = await Institution.findByPk(student.institutionId, { attributes: ['id', 'name'] });
      const resources = await InstitutionResource.findAll({ where: { institutionId: student.institutionId }, attributes: ['id', 'title', 'description', 'url', 'availabilityNote'], order: [['position', 'ASC'], ['id', 'ASC']] });
      res.json({ data: { institution, resources } });
    },
    careers: async (req, res) => {
      const institutionId = positiveId(req.params.id, 'Institución');
      if (!await Institution.findByPk(institutionId)) throw new HttpError(404, 'La institución no existe.');
      res.json({ data: await Career.findAll({ where: { institutionId }, attributes: ['id', 'name', 'institutionId', 'sourceUrl', 'reviewedAt'], order: [['name', 'ASC']] }) });
    },
    institutions: async (req, res) => res.json({ data: await Institution.findAll({ attributes: ['id', 'name', 'sourceUrl'], order: [['name', 'ASC']] }) }),
    categories: async (req, res) => res.json({ data: await Category.findAll({ attributes: ['id', 'name', 'slug', 'description'], order: [['id', 'ASC']] }) }),
    list: async (req, res) => {
      if (Object.keys(req.query).some(key => !['categoryId', 'institutionId', 'page'].includes(key))) throw new HttpError(400, 'Filtro no permitido.');
      const where = await visibleContents(req);
      if (req.query.categoryId !== undefined) where.categoryId = positiveId(req.query.categoryId, 'Categoría');
      if (req.query.institutionId !== undefined) where.institutionId = positiveId(req.query.institutionId, 'Institución');
      const page = req.query.page === undefined ? 1 : positiveId(req.query.page, 'Página');
      const limit = 12;
      const { rows, count } = await Content.findAndCountAll({ where, include, attributes: { exclude: ['body'] }, order: [['reviewedAt', 'DESC'], ['id', 'ASC']], limit, offset: (page - 1) * limit });
      res.json({ data: rows, meta: { page, total: count, pages: Math.ceil(count / limit) } });
    },
    detail: async (req, res) => {
      const id = positiveId(req.params.id);
      const content = await Content.findOne({ where: { ...(await visibleContents(req)), id }, include });
      if (!content) throw new HttpError(404, 'No encontramos ese contenido.');
      res.json({ data: content });
    },
  };
}
