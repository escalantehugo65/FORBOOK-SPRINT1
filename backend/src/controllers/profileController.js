import bcrypt from 'bcryptjs';
import { fn, col } from 'sequelize';
import { HttpError, sessionCall } from '../helpers/http.js';
import { positiveId, validateProfile, validatePasswordChange, validateWarning, validateModerationNote } from '../middlewares/validation.js';

const staffRoles = ['moderator', 'admin'];

// Perfiles: el propio (/perfil) y el de otras personas (/usuarios/:id), solo con sesión iniciada.
// Nunca se muestra el correo. La procedencia y la llegada se muestran solo si la persona lo permite.
export function profileController({ User, Institution, Question, Answer, AnswerVote, UserWarning, ModerationLog }) {
  async function viewerOf(req) {
    const viewer = await User.findByPk(req.session.userId, { attributes: ['id', 'role'] });
    if (!viewer) throw new HttpError(401, 'Tu sesión ya no es válida.');
    return viewer;
  }
  const findPerson = id => User.findByPk(id, { include: { model: Institution, as: 'institution', attributes: ['id', 'name'] } });

  // Actividad visible: solo lo que no fue ocultado por moderación.
  async function activityOf(userId) {
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
      recentAnswers: recentAnswers.map(item => ({ id: item.id, questionId: item.questionId, questionTitle: item.question.title, excerpt: item.body.length > 140 ? `${item.body.slice(0, 137)}…` : item.body, createdAt: item.createdAt })),
    };
  }

  async function present(person, viewer) {
    const own = person.id === viewer.id;
    const staff = staffRoles.includes(viewer.role);
    const activity = await activityOf(person.id);
    const warnings = await UserWarning.findAll({ where: { userId: person.id, revokedAt: null }, attributes: ['id', 'reason', 'note', 'createdAt'], order: [['createdAt', 'DESC'], ['id', 'DESC']] });
    const bioHidden = Boolean(person.bioHiddenAt);
    const badges = [];
    if (staffRoles.includes(person.role)) badges.push('moderation');
    if (activity.stats.helpful > 0) badges.push('helpful');
    return {
      id: person.id, name: person.name, own, memberSince: person.createdAt,
      avatarColor: person.avatarColor, bannerStyle: person.bannerStyle,
      // Una descripción oculta solo la ven su dueño y moderación, con el aviso correspondiente.
      bio: bioHidden && !own && !staff ? null : person.bio, bioHidden,
      interests: person.interests ? person.interests.split(',') : [],
      cohortYear: person.cohortYear,
      institution: person.institution ? { id: person.institution.id, name: person.institution.name } : null,
      career: person.career,
      origin: own || person.showOrigin ? person.origin : null,
      arrivalStatus: own || person.showArrival ? person.arrivalStatus : null,
      badges, ...activity,
      // El motivo se ve siempre; la explicación la ven solo la persona advertida y moderación.
      warnings: warnings.map(item => ({ id: item.id, reason: item.reason, createdAt: item.createdAt, ...(own || staff ? { note: item.note } : {}) })),
      ...(own ? { settings: { showOrigin: person.showOrigin, showArrival: person.showArrival } } : {}),
      canModerate: staff && !own,
    };
  }

  async function log(req, action, userId, note, transaction) {
    await ModerationLog.create({ moderatorId: req.session.userId, action, targetType: 'profile', targetId: userId, note }, { transaction });
  }

  return {
    mine: async (req, res) => {
      const viewer = await viewerOf(req);
      res.json({ data: await present(await findPerson(viewer.id), viewer) });
    },
    update: async (req, res) => {
      const viewer = await viewerOf(req);
      const input = validateProfile(req.body);
      const person = await findPerson(viewer.id);
      await person.update(input);
      res.json({ data: await present(person, viewer) });
    },
    changePassword: async (req, res) => {
      const { currentPassword, newPassword } = validatePasswordChange(req.body);
      const person = await User.scope('withPassword').findByPk(req.session.userId);
      if (!person) throw new HttpError(401, 'Tu sesión ya no es válida.');
      if (!await bcrypt.compare(currentPassword, person.passwordHash)) throw new HttpError(400, 'Revisá los campos indicados.', { currentPassword: 'La contraseña actual no es correcta.' });
      await person.update({ passwordHash: await bcrypt.hash(newPassword, 12) });
      // Se renueva la sesión después de cambiar la contraseña.
      await sessionCall(req, 'regenerate');
      req.session.userId = person.id;
      await sessionCall(req, 'save');
      res.json({ data: { message: 'Listo, cambiamos tu contraseña.' } });
    },
    detail: async (req, res) => {
      const viewer = await viewerOf(req);
      const person = await findPerson(positiveId(req.params.id, 'Usuario'));
      if (!person) throw new HttpError(404, 'No encontramos ese perfil.');
      res.json({ data: await present(person, viewer) });
    },
    // Moderación de perfiles: advertir, revocar una advertencia y ocultar o mostrar la descripción.
    warn: async (req, res) => {
      const input = validateWarning(req.body);
      const person = await User.findByPk(positiveId(req.params.id, 'Usuario'), { attributes: ['id', 'name'] });
      if (!person) throw new HttpError(404, 'No encontramos ese perfil.');
      if (person.id === req.session.userId) throw new HttpError(400, 'No podés advertir tu propia cuenta.');
      await User.sequelize.transaction(async transaction => {
        await UserWarning.create({ userId: person.id, moderatorId: req.session.userId, ...input }, { transaction });
        await log(req, 'warn', person.id, input.note, transaction);
      });
      res.status(201).json({ data: { message: `Se registró la advertencia a ${person.name}.` } });
    },
    revokeWarning: async (req, res) => {
      const { note } = validateModerationNote(req.body);
      const warning = await UserWarning.findByPk(positiveId(req.params.id, 'Advertencia'));
      if (!warning || warning.revokedAt) throw new HttpError(404, 'No encontramos esa advertencia.');
      await User.sequelize.transaction(async transaction => {
        await warning.update({ revokedAt: new Date(), revokedById: req.session.userId }, { transaction });
        await log(req, 'warning_revoke', warning.userId, note, transaction);
      });
      res.json({ data: { message: 'La advertencia fue revocada.' } });
    },
    setBioVisibility: hidden => async (req, res) => {
      const { note } = validateModerationNote(req.body);
      const person = await User.findByPk(positiveId(req.params.id, 'Usuario'), { attributes: ['id', 'bio', 'bioHiddenAt'] });
      if (!person) throw new HttpError(404, 'No encontramos ese perfil.');
      if (hidden && !person.bio) throw new HttpError(400, 'Este perfil no tiene descripción.');
      if (hidden === Boolean(person.bioHiddenAt)) throw new HttpError(409, hidden ? 'La descripción ya está oculta.' : 'La descripción ya está visible.');
      await User.sequelize.transaction(async transaction => {
        await person.update({ bioHiddenAt: hidden ? new Date() : null }, { transaction });
        await log(req, hidden ? 'bio_hide' : 'bio_show', person.id, note, transaction);
      });
      res.json({ data: { message: hidden ? 'La descripción quedó oculta.' : 'La descripción vuelve a estar visible.' } });
    },
  };
}
