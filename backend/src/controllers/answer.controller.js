import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { Answer } from '../models/answer.model.js';
import { AnswerVote } from '../models/answer_vote.model.js';
import { Question } from '../models/question.model.js';
import { User } from '../models/user.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { authorAttributes } from '../helpers/user.helper.js';
import { publicAnswer } from '../helpers/question.helper.js';
import { decorationsFor } from '../helpers/decoration.helper.js';
import { addPoints, pointRules, revokeHelpful, rewardHelpful } from '../helpers/point.helper.js';

const authorInclude = { model: User, as: 'author', attributes: authorAttributes };

// POST /questions/:id/answers (FF-27). Una pregunta cerrada ya no recibe respuestas.
// Responder suma puntos con tope diario; responder tu propia pregunta no suma.
export const createAnswer = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const question = await Question.findOne({ where: { id, hiddenAt: null } });
  if (!question) throw new HttpError(404, 'No encontramos esta pregunta.');
  if (question.status === 'closed') throw new HttpError(409, 'Esta pregunta está cerrada y ya no recibe respuestas.');
  const { body } = matchedData(req, { locations: ['body'] });
  const { created, movement } = await sequelize.transaction(async transaction => {
    const row = await Answer.create({ questionId: question.id, userId: req.session.userId, body }, { transaction });
    if (question.status === 'open') await question.update({ status: 'answered' }, { transaction });
    const rule = pointRules.answer;
    const points = question.userId === req.session.userId ? null
      : await addPoints({ userId: req.session.userId, amount: rule.amount, reason: 'answer', targetType: 'answer', targetId: row.id, dailyLimit: rule.dailyLimit }, transaction);
    return { created: row, movement: points };
  });
  const answer = await Answer.findByPk(created.id, { include: [authorInclude] });
  const decorations = await decorationsFor([answer.userId]);
  res.status(201).json({ data: { answer: publicAnswer(answer, req.session.userId, [], decorations), status: question.status, pointsEarned: movement?.amount ?? 0 } });
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

// PUT /answers/:id/helpful. Marcar dos veces no suma dos. Quien respondió gana puntos.
export const markHelpful = async (req, res) => {
  const answer = await findVotableAnswer(req);
  await sequelize.transaction(async transaction => {
    const [, created] = await AnswerVote.findOrCreate({ where: { answerId: answer.id, userId: req.session.userId }, transaction });
    if (created) await rewardHelpful({ authorId: answer.userId, answerId: answer.id, voterId: req.session.userId }, transaction);
  });
  res.json({ data: await helpfulState(answer.id, req.session.userId) });
};

// DELETE /answers/:id/helpful. Si la marca había sumado puntos, se descuentan.
export const unmarkHelpful = async (req, res) => {
  const answer = await findVotableAnswer(req);
  await sequelize.transaction(async transaction => {
    const removed = await AnswerVote.destroy({ where: { answerId: answer.id, userId: req.session.userId }, transaction });
    if (removed) await revokeHelpful({ authorId: answer.userId, answerId: answer.id, voterId: req.session.userId }, transaction);
  });
  res.json({ data: await helpfulState(answer.id, req.session.userId) });
};
