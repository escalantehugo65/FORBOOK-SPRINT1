import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { User } from '../models/user.model.js';
import { Institution } from '../models/institution.model.js';
import { Question } from '../models/question.model.js';
import { Answer } from '../models/answer.model.js';
import { AnswerVote } from '../models/answer_vote.model.js';
import { UserWarning } from '../models/user_warning.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { comparePassword, hashPassword } from '../helpers/bcrypt.helper.js';
import { startSession } from '../helpers/session.helper.js';
import { findSessionUser } from '../helpers/user.helper.js';
import { staffRoles } from '../helpers/profile.helper.js';
import { saveModerationLog } from '../helpers/moderation.helper.js';
import { shorten } from '../helpers/text.helper.js';

// Perfiles: el propio (/perfil) y el de otras personas (/usuarios/:id), solo con sesión iniciada.
// Nunca se muestra el correo. La procedencia y la llegada se muestran solo si la persona lo permite.
const findViewer = (req) => findSessionUser(req, ['id', 'role']);
const findPerson = (id) => User.findByPk(id, { include: { model: Institution, as: 'institution', attributes: ['id', 'name'] } });

// Actividad visible: solo lo que no fue ocultado por moderación.
const activityOf = async (userId) => {
  const visibleAnswer = { userId, hiddenAt: null };
  const answerQuestion = { model: Question, as: 'question', attributes: ['id', 'title'], where: { hiddenAt: null } };
  const [questions, answers, helpful, recentQuestions, recentAnswers] = await Promise.all([
    Question.count({ where: { userId, hiddenAt: null } }),
    Answer.count({ where: visibleAnswer, include: [answerQuestion] }),
    AnswerVote.count({ include: [{ model: Answer, as: 'answer', attributes: [], where: visibleAnswer, include: [{ ...answerQuestion, attributes: [] }] }] }),
    Question.findAll({ where: { userId, hiddenAt: null }, attributes: ['id', 'title', 'status', 'createdAt'], order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: 5 }),
    Answer.findAll({ where: visibleAnswer, attributes: ['id', 'body', 'createdAt', 'questionId'], include: [answerQuestion], order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: 5 }),
  ]);
  return {
    stats: { questions, answers, helpful },
    recentQuestions: recentQuestions.map(item => ({ id: item.id, title: item.title, status: item.status, createdAt: item.createdAt })),
    recentAnswers: recentAnswers.map(item => ({ id: item.id, questionId: item.questionId, questionTitle: item.question.title, excerpt: shorten(item.body, 140), createdAt: item.createdAt })),
  };
};

const present = async (person, viewer) => {
  const own = person.id === viewer.id;
  const staff = staffRoles.includes(viewer.role);
  const activity = await activityOf(person.id);
  const warnings = await UserWarning.findAll({ where: { userId: person.id, revokedAt: null }, attributes: ['id', 'reason', 'note', 'createdAt'], order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  const bioHidden = Boolean(person.bioHiddenAt);
  const badges = [];
  if (staffRoles.includes(person.role)) badges.push('moderation');
  if (activity.stats.helpful > 0) badges.push('helpful');
  return {
    id: person.id,
    name: person.name,
    own,
    memberSince: person.createdAt,
    avatarColor: person.avatarColor,
    bannerStyle: person.bannerStyle,
    // Una descripción oculta solo la ven su dueño y moderación, con el aviso correspondiente.
    bio: bioHidden && !own && !staff ? null : person.bio,
    bioHidden,
    interests: person.interests ? person.interests.split(',') : [],
    cohortYear: person.cohortYear,
    institution: person.institution ? { id: person.institution.id, name: person.institution.name } : null,
    career: person.career,
    origin: own || person.showOrigin ? person.origin : null,
    arrivalStatus: own || person.showArrival ? person.arrivalStatus : null,
    badges,
    ...activity,
    // El motivo se ve siempre; la explicación la ven solo la persona advertida y moderación.
    warnings: warnings.map(item => ({ id: item.id, reason: item.reason, createdAt: item.createdAt, ...(own || staff ? { note: item.note } : {}) })),
    ...(own ? { settings: { showOrigin: person.showOrigin, showArrival: person.showArrival } } : {}),
    canModerate: staff && !own,
  };
};

// GET /profile
export const getMyProfile = async (req, res) => {
  const viewer = await findViewer(req);
  res.json({ data: await present(await findPerson(viewer.id), viewer) });
};

// PUT /profile
export const updateMyProfile = async (req, res) => {
  const viewer = await findViewer(req);
  const data = matchedData(req, { locations: ['body'] });
  const person = await findPerson(viewer.id);
  await person.update({
    bio: data.bio || null,
    avatarColor: data.avatarColor,
    bannerStyle: data.bannerStyle,
    interests: data.interests.length ? data.interests.join(',') : null,
    cohortYear: data.cohortYear ?? null,
    showOrigin: data.showOrigin,
    showArrival: data.showArrival,
  });
  res.json({ data: await present(person, viewer) });
};

// PUT /profile/password. Después del cambio se renueva la sesión.
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = matchedData(req, { locations: ['body'] });
  const person = await User.scope('withPassword').findByPk(req.session.userId);
  if (!person) throw new HttpError(401, 'Tu sesión ya no es válida.');
  if (!await comparePassword(currentPassword, person.passwordHash)) {
    throw new HttpError(400, 'Revisá los campos indicados.', { currentPassword: 'La contraseña actual no es correcta.' });
  }
  await person.update({ passwordHash: await hashPassword(newPassword) });
  await startSession(req, person.id);
  res.json({ data: { message: 'Listo, cambiamos tu contraseña.' } });
};

// GET /users/:id
export const getUserProfile = async (req, res) => {
  const viewer = await findViewer(req);
  const { id } = matchedData(req, { locations: ['params'] });
  const person = await findPerson(id);
  if (!person) throw new HttpError(404, 'No encontramos ese perfil.');
  res.json({ data: await present(person, viewer) });
};

// Moderación: ocultar o volver a mostrar la descripción de un perfil. La cuenta sigue activa.
const setBioVisibility = async (req, res, hidden) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { note } = matchedData(req, { locations: ['body'] });
  const person = await User.findByPk(id, { attributes: ['id', 'bio', 'bioHiddenAt'] });
  if (!person) throw new HttpError(404, 'No encontramos ese perfil.');
  if (hidden && !person.bio) throw new HttpError(400, 'Este perfil no tiene descripción.');
  if (hidden === Boolean(person.bioHiddenAt)) throw new HttpError(409, hidden ? 'La descripción ya está oculta.' : 'La descripción ya está visible.');
  await sequelize.transaction(async transaction => {
    await person.update({ bioHiddenAt: hidden ? new Date() : null }, { transaction });
    await saveModerationLog(req, { action: hidden ? 'bio_hide' : 'bio_show', targetType: 'profile', targetId: person.id, note }, transaction);
  });
  res.json({ data: { message: hidden ? 'La descripción quedó oculta.' : 'La descripción vuelve a estar visible.' } });
};

// POST /moderation/users/:id/bio/hide
export const hideBio = (req, res) => setBioVisibility(req, res, true);

// POST /moderation/users/:id/bio/show
export const showBio = (req, res) => setBioVisibility(req, res, false);
