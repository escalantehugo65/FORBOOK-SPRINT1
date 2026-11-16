import { matchedData } from 'express-validator';
import { Question } from '../models/question.model.js';
import { Answer } from '../models/answer.model.js';
import { AnswerVote } from '../models/answer_vote.model.js';
import { User } from '../models/user.model.js';
import { Category } from '../models/category.model.js';
import { Institution } from '../models/institution.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { findSessionUser } from '../helpers/user.helper.js';
import { publicAnswer, publicQuestion } from '../helpers/question.helper.js';

const authorInclude = { model: User, as: 'author', attributes: ['id', 'name', 'avatarColor'] };
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
  const page = filters.page ?? 1;
  const limit = 10;
  const { rows, count } = await Question.findAndCountAll({ where, include: questionInclude, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit, offset: (page - 1) * limit });
  res.json({ data: rows.map(publicQuestion), meta: { page, total: count, pages: Math.ceil(count / limit) } });
};

// POST /questions (FF-25). "Para mi institución" la deja ligada a la institución de quien pregunta.
export const createQuestion = async (req, res) => {
  const input = matchedData(req, { locations: ['body'] });
  const student = await findSessionUser(req);
  if (!await Category.findByPk(input.categoryId)) throw new HttpError(400, 'La categoría no existe.', { categoryId: 'Elegí una categoría de la lista.' });
  const created = await Question.create({
    userId: student.id,
    categoryId: input.categoryId,
    institutionId: input.forMyInstitution === true ? student.institutionId : null,
    title: input.title,
    body: input.body || null,
  });
  const question = await Question.findByPk(created.id, { include: questionInclude });
  res.status(201).json({ data: publicQuestion(question) });
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
  res.json({
    data: {
      ...publicQuestion(question),
      ownQuestion: question.userId === req.session.userId,
      answers: answers.map(answer => publicAnswer(answer, req.session.userId, votes)),
    },
  });
};
