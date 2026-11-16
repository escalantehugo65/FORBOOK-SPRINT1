import { matchedData } from 'express-validator';
import { Answer } from '../models/answer.model.js';
import { AnswerVote } from '../models/answer_vote.model.js';
import { Question } from '../models/question.model.js';
import { User } from '../models/user.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { publicAnswer } from '../helpers/question.helper.js';

const authorInclude = { model: User, as: 'author', attributes: ['id', 'name', 'avatarColor'] };

// POST /questions/:id/answers (FF-27). Una pregunta cerrada ya no recibe respuestas.
export const createAnswer = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const question = await Question.findOne({ where: { id, hiddenAt: null } });
  if (!question) throw new HttpError(404, 'No encontramos esta pregunta.');
  if (question.status === 'closed') throw new HttpError(409, 'Esta pregunta está cerrada y ya no recibe respuestas.');
  const { body } = matchedData(req, { locations: ['body'] });
  const created = await Answer.create({ questionId: question.id, userId: req.session.userId, body });
  if (question.status === 'open') await question.update({ status: 'answered' });
  const answer = await Answer.findByPk(created.id, { include: [authorInclude] });
  res.status(201).json({ data: { answer: publicAnswer(answer, req.session.userId), status: question.status } });
};

const helpfulState = async (answerId, userId) => ({
  answerId,
  helpfulCount: await AnswerVote.count({ where: { answerId } }),
  markedByMe: Boolean(await AnswerVote.findOne({ where: { answerId, userId } })),
});

// FF-28: cualquier usuario con sesión marca una vez cada respuesta, menos las propias.
const findVotableAnswer = async (req) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const answer = await Answer.findOne({ where: { id, hiddenAt: null }, include: [{ model: Question, as: 'question', attributes: ['id', 'hiddenAt'] }] });
  if (!answer || answer.question?.hiddenAt) throw new HttpError(404, 'No encontramos esta respuesta.');
  if (answer.userId === req.session.userId) throw new HttpError(403, 'No podés marcar como útil tu propia respuesta.');
  return answer;
};

// PUT /answers/:id/helpful. Marcar dos veces no suma dos.
export const markHelpful = async (req, res) => {
  const answer = await findVotableAnswer(req);
  await AnswerVote.findOrCreate({ where: { answerId: answer.id, userId: req.session.userId } });
  res.json({ data: await helpfulState(answer.id, req.session.userId) });
};

// DELETE /answers/:id/helpful
export const unmarkHelpful = async (req, res) => {
  const answer = await findVotableAnswer(req);
  await AnswerVote.destroy({ where: { answerId: answer.id, userId: req.session.userId } });
  res.json({ data: await helpfulState(answer.id, req.session.userId) });
};
