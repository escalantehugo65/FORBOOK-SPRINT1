import { HttpError } from '../helpers/http.js';
import { positiveId, validateAnswer, validateQuestion } from '../middlewares/validation.js';

// Preguntas públicas: listar (FF-24), publicar (FF-25), ver el detalle (FF-26), responder (FF-27) y marcar útil (FF-28).
export function questionController({ User, Institution, Category, Question, Answer, AnswerVote }) {
  const include = [
    { model: User, as: 'author', attributes: ['id', 'name'] },
    { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
    { model: Institution, as: 'institution', attributes: ['id', 'name'] },
  ];
  // Del autor solo se muestra el primer nombre: nunca el correo ni otros datos del perfil.
  const publicAuthor = author => ({ name: author ? author.name.trim().split(/\s+/)[0] : 'Usuario de Forbook' });
  // helpfulCount: cuántas personas la marcaron útil. markedByMe y ownAnswer dependen de quién mira.
  const publicAnswer = (answer, userId, votes = []) => ({
    id: answer.id,
    body: answer.body,
    createdAt: answer.createdAt,
    author: publicAuthor(answer.author),
    helpfulCount: votes.filter(vote => vote.answerId === answer.id).length,
    markedByMe: votes.some(vote => vote.answerId === answer.id && vote.userId === userId),
    ownAnswer: answer.userId === userId,
  });
  const helpfulState = async (answerId, userId) => ({
    answerId,
    helpfulCount: await AnswerVote.count({ where: { answerId } }),
    markedByMe: Boolean(await AnswerVote.findOne({ where: { answerId, userId } })),
  });
  // Regla del equipo: cualquier usuario con sesión marca una vez cada respuesta, menos las propias.
  const findVotableAnswer = async (req) => {
    const answer = await Answer.findOne({ where: { id: positiveId(req.params.id, 'Respuesta'), hiddenAt: null }, include: [{ model: Question, as: 'question', attributes: ['id', 'hiddenAt'] }] });
    if (!answer || answer.question?.hiddenAt) throw new HttpError(404, 'No encontramos esta respuesta.');
    if (answer.userId === req.session.userId) throw new HttpError(403, 'No podés marcar como útil tu propia respuesta.');
    return answer;
  };
  const publicQuestion = question => ({
    id: question.id,
    title: question.title,
    body: question.body,
    status: question.status,
    createdAt: question.createdAt,
    category: question.category,
    institution: question.institution,
    author: publicAuthor(question.author),
  });
  return {
    list: async (req, res) => {
      if (Object.keys(req.query).some(key => !['categoryId', 'institutionId', 'status', 'page'].includes(key))) throw new HttpError(400, 'Filtro no permitido.');
      // Lo que moderación ocultó (FF-37) no aparece en la lista.
      const where = { hiddenAt: null };
      if (req.query.categoryId !== undefined) where.categoryId = positiveId(req.query.categoryId, 'Categoría');
      if (req.query.institutionId !== undefined) where.institutionId = positiveId(req.query.institutionId, 'Institución');
      if (req.query.status !== undefined) {
        if (!['open', 'answered', 'closed'].includes(req.query.status)) throw new HttpError(400, 'Estado inválido.');
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
    detail: async (req, res) => {
      const question = await Question.findOne({ where: { id: positiveId(req.params.id, 'Pregunta'), hiddenAt: null }, include });
      if (!question) throw new HttpError(404, 'No encontramos esta pregunta.');
      const answers = await Answer.findAll({
        where: { questionId: question.id, hiddenAt: null },
        include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
        order: [['createdAt', 'ASC'], ['id', 'ASC']],
      });
      const votes = answers.length ? await AnswerVote.findAll({ where: { answerId: answers.map(answer => answer.id) }, attributes: ['answerId', 'userId'] }) : [];
      res.json({ data: { ...publicQuestion(question), ownQuestion: question.userId === req.session.userId, answers: answers.map(answer => publicAnswer(answer, req.session.userId, votes)) } });
    },
    answer: async (req, res) => {
      const question = await Question.findOne({ where: { id: positiveId(req.params.id, 'Pregunta'), hiddenAt: null } });
      if (!question) throw new HttpError(404, 'No encontramos esta pregunta.');
      // Regla del equipo: una pregunta cerrada ya no recibe respuestas.
      if (question.status === 'closed') throw new HttpError(409, 'Esta pregunta está cerrada y ya no recibe respuestas.');
      const input = validateAnswer(req.body);
      const created = await Answer.create({ questionId: question.id, userId: req.session.userId, body: input.body });
      if (question.status === 'open') await question.update({ status: 'answered' });
      const answer = await Answer.findByPk(created.id, { include: [{ model: User, as: 'author', attributes: ['id', 'name'] }] });
      res.status(201).json({ data: { answer: publicAnswer(answer, req.session.userId), status: question.status } });
    },
    markHelpful: async (req, res) => {
      const answer = await findVotableAnswer(req);
      await AnswerVote.findOrCreate({ where: { answerId: answer.id, userId: req.session.userId } });
      res.json({ data: await helpfulState(answer.id, req.session.userId) });
    },
    unmarkHelpful: async (req, res) => {
      const answer = await findVotableAnswer(req);
      await AnswerVote.destroy({ where: { answerId: answer.id, userId: req.session.userId } });
      res.json({ data: await helpfulState(answer.id, req.session.userId) });
    },
  };
}
