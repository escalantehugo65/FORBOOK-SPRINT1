import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { User } from '../models/user.model.js';
import { Institution } from '../models/institution.model.js';
import { Question } from '../models/question.model.js';
import { Answer } from '../models/answer.model.js';
import { AnswerVote } from '../models/answer_vote.model.js';
import { UserWarning } from '../models/user_warning.model.js';
import { UserBlock } from '../models/user_block.model.js';
import { UserSanction } from '../models/user_sanction.model.js';
import { Content } from '../models/content.model.js';
import { Category } from '../models/category.model.js';
import { Friendship } from '../models/friendship.model.js';
import { Op } from 'sequelize';
import { activeWhere, appealsFor, presentSanction } from '../helpers/sanction.helper.js';
import { findPair, friendIdsOf, friendsCountOf, otherOf, pairOf, relationOf } from '../helpers/friendship.helper.js';
import { HttpError } from '../helpers/error.helper.js';
import { comparePassword, hashPassword } from '../helpers/bcrypt.helper.js';
import { sessionCall, startSession } from '../helpers/session.helper.js';
import { deleteAccount } from '../helpers/account.helper.js';
import { cookieOptions, sessionCookieName } from '../config/session.js';
import { avatarVersion, findSessionUser } from '../helpers/user.helper.js';
import { decorationsFor, decorationsOf } from '../helpers/decoration.helper.js';
import { levelOf } from '../helpers/point.helper.js';
import { textSearch } from '../helpers/search.helper.js';
import { staffRoles } from '../helpers/profile.helper.js';
import { saveModerationLog } from '../helpers/moderation.helper.js';
import { shorten } from '../helpers/text.helper.js';

// Perfiles: el propio (/perfil) y el de otras personas (/usuarios/:id), solo con sesión iniciada.
// Nunca se muestra el correo. La procedencia y la llegada se muestran solo si la persona lo permite.
const findViewer = (req) => findSessionUser(req, ['id', 'role']);
const findPerson = (id) => User.findByPk(id, { include: { model: Institution, as: 'institution', attributes: ['id', 'name'] } });

// Actividad visible: solo lo que no fue ocultado por moderación.
// Las fichas se cuentan solo si las ve quien mira: una ficha de otra institución no aparece.
const activityOf = async (userId, viewerInstitutionId) => {
  const visibleAnswer = { userId, hiddenAt: null };
  const answerQuestion = { model: Question, as: 'question', attributes: ['id', 'title'], where: { hiddenAt: null } };
  const visibleContent = { authorId: userId, status: 'published', hiddenAt: null, [Op.or]: [{ institutionId: null }, { institutionId: viewerInstitutionId }] };
  const [questions, answers, helpful, recentQuestions, recentAnswers, contents, recentContents] = await Promise.all([
    Question.count({ where: { userId, hiddenAt: null } }),
    Answer.count({ where: visibleAnswer, include: [answerQuestion] }),
    AnswerVote.count({ include: [{ model: Answer, as: 'answer', attributes: [], where: visibleAnswer, include: [{ ...answerQuestion, attributes: [] }] }] }),
    Question.findAll({ where: { userId, hiddenAt: null }, attributes: ['id', 'title', 'status', 'createdAt'], order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: 5 }),
    Answer.findAll({ where: visibleAnswer, attributes: ['id', 'body', 'createdAt', 'questionId'], include: [answerQuestion], order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: 5 }),
    Content.count({ where: visibleContent }),
    Content.findAll({ where: visibleContent, attributes: ['id', 'title', 'createdAt'], include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }], order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: 5 }),
  ]);
  return {
    stats: { questions, answers, helpful, contents },
    recentContents: recentContents.map(item => ({ id: item.id, title: item.title, category: item.category?.name ?? null, createdAt: item.createdAt })),
    recentQuestions: recentQuestions.map(item => ({ id: item.id, title: item.title, status: item.status, createdAt: item.createdAt })),
    recentAnswers: recentAnswers.map(item => ({ id: item.id, questionId: item.questionId, questionTitle: item.question.title, excerpt: shorten(item.body, 140), createdAt: item.createdAt })),
  };
};

// Amigos: cuántos tiene y los primeros 8 para la vista previa del perfil.
const friendsOf = async (userId) => {
  const ids = await friendIdsOf(userId);
  const preview = ids.length ? await User.findAll({ where: { id: ids }, attributes: ['id', 'name', 'avatarColor', 'avatarUpdatedAt'], order: [['name', 'ASC']], limit: 8 }) : [];
  return { friendsCount: ids.length, friendsPreview: preview.map(item => ({ id: item.id, name: item.name, avatarColor: item.avatarColor, avatarVersion: avatarVersion(item) })) };
};

const present = async (person, viewer) => {
  const own = person.id === viewer.id;
  const staff = staffRoles.includes(viewer.role);
  const viewerInstitution = own ? person.institutionId : (await User.findByPk(viewer.id, { attributes: ['institutionId'] }))?.institutionId;
  const activity = await activityOf(person.id, viewerInstitution);
  const warnings = await UserWarning.findAll({ where: { userId: person.id, revokedAt: null }, attributes: ['id', 'reason', 'note', 'createdAt'], order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  // Sanciones que se ven en el perfil: las vigentes y cuántas tuvo antes (las revocadas no cuentan).
  const sanctions = await UserSanction.findAll({ where: { userId: person.id, revokedAt: null }, attributes: ['id', 'type', 'reason', 'note', 'automatic', 'endsAt', 'createdAt'], order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  const now = new Date();
  const activeSanctions = sanctions.filter(item => item.endsAt === null || item.endsAt > now);
  const appeals = own ? await appealsFor(warnings, activeSanctions) : new Map();
  const bioHidden = Boolean(person.bioHiddenAt);
  const badges = [];
  if (person.role === 'admin') badges.push('admin');
  else if (person.role === 'moderator') badges.push('moderation');
  if (activity.stats.helpful > 0) badges.push('helpful');
  return {
    id: person.id,
    name: person.name,
    own,
    memberSince: person.createdAt,
    avatarColor: person.avatarColor,
    avatarVersion: avatarVersion(person),
    bannerStyle: person.bannerStyle,
    // Decoraciones de la tienda que tiene puestas (marco, fondo, efecto y color del nombre).
    decorations: await decorationsOf(person.id),
    // El nivel y la reputación se ven en todos los perfiles; el saldo para la tienda, solo en el propio.
    level: levelOf(person.reputation),
    reputation: person.reputation,
    ...(own ? { points: person.points } : {}),
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
    warnings: warnings.map(item => ({ id: item.id, reason: item.reason, createdAt: item.createdAt, ...(own || staff ? { note: item.note } : {}), ...(own ? { appeal: presentSanction(item, appeals.get(`warning:${item.id}`)).appeal } : {}) })),
    sanctions: activeSanctions.map(item => presentSanction(item, appeals.get(`sanction:${item.id}`), { withNote: own || staff })),
    pastSanctions: sanctions.length - activeSanctions.length,
    ...await friendsOf(person.id),
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

// GET /users?search=ana&page=1: buscar perfiles por nombre (20 por página).
// Solo se muestra lo que ya es público en un perfil: nunca el correo ni la procedencia.
export const searchUsers = async (req, res) => {
  await findViewer(req);
  const { search, page = 1 } = matchedData(req, { locations: ['query'] });
  const limit = 20;
  const { rows, count } = await User.findAndCountAll({
    where: { [Op.and]: [textSearch(['name'], search), { deletedAt: null }] },
    attributes: ['id', 'name', 'avatarColor', 'avatarUpdatedAt', 'career', 'reputation'],
    include: { model: Institution, as: 'institution', attributes: ['id', 'name'] },
    order: [['name', 'ASC'], ['id', 'ASC']],
    limit,
    offset: (page - 1) * limit,
  });
  const decorations = await decorationsFor(rows.map(row => row.id));
  const relations = await relationsWith(req.session.userId, rows.map(row => row.id));
  res.json({
    data: rows.map(row => ({
      id: row.id,
      name: row.name,
      avatarColor: row.avatarColor,
      avatarVersion: avatarVersion(row),
      decorations: decorations.get(row.id),
      institution: row.institution ? { id: row.institution.id, name: row.institution.name } : null,
      career: row.career,
      level: levelOf(row.reputation),
      relation: row.id === req.session.userId ? 'self' : relations.get(row.id) ?? 'none',
    })),
    meta: { page, total: count, pages: Math.ceil(count / limit) },
  });
};

// Relación de amistad de quien mira con cada persona de una lista: Map { id → none | friends | sent | received }.
const relationsWith = async (viewerId, ids) => {
  const others = ids.filter(id => id !== viewerId);
  if (!others.length) return new Map();
  const rows = await Friendship.findAll({ where: { [Op.or]: others.map(id => pairOf(viewerId, id)) } });
  return new Map(rows.map(row => [otherOf(row, viewerId), relationOf(row, viewerId)]));
};

// GET /users/suggested: personas para conocer. Primero de la misma institución y carrera, después de la misma institución
// y por último del resto; nunca amigos, solicitudes pendientes ni personas bloqueadas u ocultas.
export const suggestedUsers = async (req, res) => {
  const viewer = await findSessionUser(req, ['id', 'institutionId', 'career']);
  const [links, blocks] = await Promise.all([
    Friendship.findAll({ where: { [Op.or]: [{ userLowId: viewer.id }, { userHighId: viewer.id }] }, attributes: ['userLowId', 'userHighId'], raw: true }),
    UserBlock.findAll({ where: { [Op.or]: [{ userId: viewer.id }, { targetId: viewer.id, kind: 'blocked' }] }, attributes: ['userId', 'targetId'], raw: true }),
  ]);
  const skip = new Set([viewer.id, ...links.map(row => otherOf(row, viewer.id)), ...blocks.map(row => (row.userId === viewer.id ? row.targetId : row.userId))]);
  const rows = await User.findAll({
    where: { id: { [Op.notIn]: [...skip] }, deletedAt: null },
    attributes: ['id', 'name', 'avatarColor', 'avatarUpdatedAt', 'career', 'reputation', 'institutionId'],
    include: { model: Institution, as: 'institution', attributes: ['id', 'name'] },
    order: [
      [sequelize.literal(`(\`User\`.\`institution_id\` = ${Number(viewer.institutionId)} AND \`User\`.\`career\` = ${sequelize.escape(viewer.career)})`), 'DESC'],
      [sequelize.literal(`(\`User\`.\`institution_id\` = ${Number(viewer.institutionId)})`), 'DESC'],
      ['createdAt', 'DESC'], ['id', 'DESC'],
    ],
    limit: 12,
  });
  const decorations = await decorationsFor(rows.map(row => row.id));
  res.json({
    data: rows.map(row => ({
      id: row.id, name: row.name, avatarColor: row.avatarColor, avatarVersion: avatarVersion(row), decorations: decorations.get(row.id),
      institution: row.institution ? { id: row.institution.id, name: row.institution.name } : null, career: row.career, level: levelOf(row.reputation),
      relation: 'none', sameInstitution: row.institutionId === viewer.institutionId,
    })),
  });
};

// GET /users/:id
export const getUserProfile = async (req, res) => {
  const viewer = await findViewer(req);
  const { id } = matchedData(req, { locations: ['params'] });
  const person = await findPerson(id);
  if (!person || person.deletedAt) throw new HttpError(404, 'No encontramos ese perfil.');
  // Si esa persona me bloqueó, no veo su perfil (moderación sí, para poder actuar).
  const blockedMe = await UserBlock.count({ where: { userId: person.id, targetId: viewer.id, kind: 'blocked' } });
  if (blockedMe && !staffRoles.includes(viewer.role)) throw new HttpError(403, 'No podés ver este perfil.');
  // relation: si yo la oculté ('hidden') o la bloqueé ('blocked').
  const mine = person.id === viewer.id ? null : await UserBlock.findOne({ where: { userId: viewer.id, targetId: person.id }, attributes: ['kind'] });
  const friendship = person.id === viewer.id ? null : relationOf(await findPair(viewer.id, person.id), viewer.id);
  res.json({ data: { ...await present(person, viewer), relation: mine?.kind ?? null, friendship } });
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

// PUT /profile/email { email, currentPassword }: cambia el correo con el que se ingresa. Pide la contraseña.
export const changeEmail = async (req, res) => {
  const { email, currentPassword } = matchedData(req, { locations: ['body'] });
  const person = await User.scope('withPassword').findByPk(req.session.userId);
  if (!person) throw new HttpError(401, 'Tu sesión ya no es válida.');
  if (!await comparePassword(currentPassword, person.passwordHash)) {
    throw new HttpError(400, 'Revisá los campos indicados.', { currentPassword: 'La contraseña actual no es correcta.' });
  }
  if (email === person.email) throw new HttpError(400, 'Revisá los campos indicados.', { email: 'Ese ya es tu correo.' });
  if (await User.count({ where: { email } })) throw new HttpError(409, 'Revisá los campos indicados.', { email: 'Ese correo ya está registrado en otra cuenta.' });
  await person.update({ email });
  res.json({ data: { email }, message: 'Listo, cambiamos tu correo. La próxima vez ingresá con el nuevo.' });
};

// DELETE /profile { currentPassword }: la persona da de baja su cuenta. No se puede deshacer.
// Una cuenta de administración no se da de baja así: primero otra cuenta admin le cambia el rol.
export const deleteMyAccount = async (req, res) => {
  const { currentPassword } = matchedData(req, { locations: ['body'] });
  await sequelize.transaction(async transaction => {
    const person = await User.scope('withPassword').findByPk(req.session.userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!person) throw new HttpError(401, 'Tu sesión ya no es válida.');
    if (!await comparePassword(currentPassword, person.passwordHash)) {
      throw new HttpError(400, 'Revisá los campos indicados.', { currentPassword: 'La contraseña no es correcta.' });
    }
    if (person.role === 'admin') throw new HttpError(403, 'Una cuenta de administración no se puede dar de baja. Pedile a otra cuenta admin que te cambie el rol primero.');
    await deleteAccount(person, transaction);
  });
  await sessionCall(req, 'destroy').catch(() => {});
  res.clearCookie(sessionCookieName, cookieOptions);
  res.json({ data: { deleted: true }, message: 'Diste de baja tu cuenta. Lo que publicaste queda como «Cuenta eliminada».' });
};
