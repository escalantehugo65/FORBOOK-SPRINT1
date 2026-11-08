import { HttpError } from '../helpers/http.js';
import { positiveId, validateQuestion } from '../middlewares/validation.js';

// Preguntas públicas: listar con filtros (FF-24) y publicar (FF-25).
export function questionController({ User, Institution, Category, Question }) {
  const include = [
    { model: User, as: 'author', attributes: ['id', 'name'] },
    { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
    { model: Institution, as: 'institution', attributes: ['id', 'name'] },
  ];
  // Del autor solo se muestra el primer nombre: nunca el correo ni otros datos del perfil.
  const publicQuestion = question => ({
    id: question.id,
    title: question.title,
    body: question.body,
    status: question.status,
    createdAt: question.createdAt,
    category: question.category,
    institution: question.institution,
    author: { name: question.author ? question.author.name.trim().split(/\s+/)[0] : 'Usuario de Forbook' },
  });
  return {
    list: async (req, res) => {
      if (Object.keys(req.query).some(key => !['categoryId', 'institutionId', 'status', 'page'].includes(key))) throw new HttpError(400, 'Filtro no permitido.');
      const where = {};
      if (req.query.categoryId !== undefined) where.categoryId = positiveId(req.query.categoryId, 'Categoría');
      if (req.query.institutionId !== undefined) where.institutionId = positiveId(req.query.institutionId, 'Institución');
      if (req.query.status !== undefined) {
        if (!['open', 'answered'].includes(req.query.status)) throw new HttpError(400, 'Estado inválido.');
        where.status = req.query.status;
      }
      const page = req.query.page === undefined ? 1 : positiveId(req.query.page, 'Página');
      const limit = 10;
      const { rows, count } = await Question.findAndCountAll({ where, include, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit, offset: (page - 1) * limit });
      res.json({ data: rows.map(publicQuestion), meta: { page, total: count, pages: Math.ceil(count / limit) } });
    },
    create: async (req, res) => {
      const input = validateQuestion(req.body);
      const student = await User.findByPk(req.session.userId, { attributes: ['id', 'institutionId'] });
      if (!student) throw new HttpError(401, 'Tu sesión ya no es válida.');
      if (!await Category.findByPk(input.categoryId)) throw new HttpError(400, 'La categoría no existe.', { categoryId: 'Elegí una categoría de la lista.' });
      const created = await Question.create({
        userId: student.id,
        categoryId: input.categoryId,
        institutionId: input.forMyInstitution ? student.institutionId : null,
        title: input.title,
        body: input.body || null,
      });
      const question = await Question.findByPk(created.id, { include });
      res.status(201).json({ data: publicQuestion(question) });
    },
  };
}
