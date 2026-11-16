import { Op } from 'sequelize';
import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { Question } from '../models/question.model.js';
import { Answer } from '../models/answer.model.js';
import { AnswerVote } from '../models/answer_vote.model.js';
import { User } from '../models/user.model.js';
import { Category } from '../models/category.model.js';
import { Institution } from '../models/institution.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { authorAttributes, findSessionUser } from '../helpers/user.helper.js';
import { publicAnswer, publicQuestion } from '../helpers/question.helper.js';
import { decorationsFor } from '../helpers/decoration.helper.js';
import { addPoints, pointRules } from '../helpers/point.helper.js';
import { textSearch } from '../helpers/search.helper.js';

const authorInclude = { model: User, as: 'author', attributes: authorAttributes };
const questionInclude = [
  authorInclude,
  { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
  { model: Institution, as: 'institution', attributes: ['id', 'name'] },
];

// GET /questions (FF-24): 10 por página. Lo que moderación ocultó (FF-37) no aparece.
export const getQuestions = async (req, res) => {
  const filters = matchedData(req, { locations: ['query'] });
  const where = { hiddenAt: null };
  if (filters.categoryId !== undefined) where.categoryId = filters.categoryId;
  if (filters.institutionId !== undefined) where.institutionId = filters.institutionId;
  if (filters.status !== undefined) where.status = filters.status;
  if (filters.search !== undefined) Object.assign(where, textSearch(['title', 'body'], filters.search));
  const page = filters.page ?? 1;
  const limit = 10;
  const { rows, count } = await Question.findAndCountAll({ where, include: questionInclude, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit, offset: (page - 1) * limit });
  const decorations = await decorationsFor(rows.map(row => row.userId));
  res.json({ data: rows.map(row => publicQuestion(row, decorations)), meta: { page, total: count, pages: Math.ceil(count / limit) } });
};

// GET /questions/relevant (FF-15): una pregunta para el inicio.
// Primero las de tu institución, las ya respondidas antes (para aprender de dudas resueltas);
// si no hay, una general. Nunca una propia ni una cerrada. Si no hay ninguna, data es null.
export const getRelevantQuestion = async (req, res) => {
  const student = await findSessionUser(req);
  const candidates = [
    ['institution', { institutionId: student.institutionId, status: 'answered' }],
    ['institution', { institutionId: student.institutionId, status: 'open' }],
    ['general', { institutionId: null, status: 'answered' }],
    ['general', { institutionId: null, status: 'open' }],
  ];
  for (const [reason, where] of candidates) {
    const question = await Question.findOne({ where: { ...where, hiddenAt: null, userId: { [Op.ne]: student.id } }, include: questionInclude, order: [['createdAt', 'DESC'], ['id', 'DESC']] });
    if (!question) continue;
    const answersCount = await Answer.count({ where: { questionId: question.id, hiddenAt: null } });
    const decorations = await decorationsFor([question.userId]);
    return res.json({ data: { ...publicQuestion(question, decorations), answersCount }, meta: { reason } });
  }
  res.json({ data: null, meta: { reason: null } });
};

// POST /questions (FF-25). "Para mi institución" la deja ligada a la institución de quien pregunta.
// Suma puntos con tope diario (ver point.helper.js).
export const createQuestion = async (req, res) => {
  const input = matchedData(req, { locations: ['body'] });
  const student = await findSessionUser(req);
  if (!await Category.findByPk(input.categoryId)) throw new HttpError(400, 'La categoría no existe.', { categoryId: 'Elegí una categoría de la lista.' });
  const { created, movement } = await sequelize.transaction(async transaction => {
    const row = await Question.create({
      userId: student.id,
      categoryId: input.categoryId,
      institutionId: input.forMyInstitution === true ? student.institutionId : null,
      title: input.title,
      body: input.body || null,
    }, { transaction });
    const rule = pointRules.question;
    const points = await addPoints({ userId: student.id, amount: rule.amount, reason: 'question', targetType: 'question', targetId: row.id, dailyLimit: rule.dailyLimit }, transaction);
    return { created: row, movement: points };
  });
  const question = await Question.findByPk(created.id, { include: questionInclude });
  const decorations = await decorationsFor([question.userId]);
  res.status(201).json({ data: { ...publicQuestion(question, decorations), pointsEarned: movement?.amount ?? 0 } });
};

// GET /questions/:id (FF-26): la pregunta con sus respuestas y las marcas de útil.
export const getQuestionById = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const question = await Question.findOne({ where: { id, hiddenAt: null }, include: questionInclude });
  if (!question) throw new HttpError(404, 'No encontramos esta pregunta.');
  const answers = await Answer.findAll({
    where: { questionId: question.id, hiddenAt: null },
    include: [authorInclude],
    order: [['createdAt', 'ASC'], ['id', 'ASC']],
  });
  const votes = answers.length ? await AnswerVote.findAll({ where: { answerId: answers.map(answer => answer.id) }, attributes: ['answerId', 'userId'] }) : [];
  const decorations = await decorationsFor([question.userId, ...answers.map(answer => answer.userId)]);
  res.json({
    data: {
      ...publicQuestion(question, decorations),
      ownQuestion: question.userId === req.session.userId,
      answers: answers.map(answer => publicAnswer(answer, req.session.userId, votes, decorations)),
    },
  });
};
