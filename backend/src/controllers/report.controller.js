import { Op, fn, col } from 'sequelize';
import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { Report } from '../models/report.model.js';
import { User } from '../models/user.model.js';
import { Question } from '../models/question.model.js';
import { Answer } from '../models/answer.model.js';
import { Content } from '../models/content.model.js';
import { CommunityMessage } from '../models/community_message.model.js';
import { CommunityMember } from '../models/community_member.model.js';
import { CommunityAttachment } from '../models/community_attachment.model.js';
import { Community } from '../models/community.model.js';
import { staffRoles } from '../helpers/profile.helper.js';
import { HttpError } from '../helpers/error.helper.js';
import { findSessionUser } from '../helpers/user.helper.js';
import { describeTargets, saveModerationLog } from '../helpers/moderation.helper.js';
import { addPoints, pointRules } from '../helpers/point.helper.js';

// Solo se puede reportar lo que la persona realmente puede ver, y nunca algo propio.
const findTarget = async (targetType, targetId, student) => {
  if (targetType === 'question') {
    const question = await Question.findOne({ where: { id: targetId, hiddenAt: null }, attributes: ['id', 'userId'] });
    return question && { ownerId: question.userId };
  }
  if (targetType === 'answer') {
    const answer = await Answer.findOne({ where: { id: targetId, hiddenAt: null }, attributes: ['id', 'userId'], include: [{ model: Question, as: 'question', attributes: ['id', 'hiddenAt'] }] });
    return answer && !answer.question?.hiddenAt && { ownerId: answer.userId };
  }
  if (targetType === 'profile') {
    const person = await User.findByPk(targetId, { attributes: ['id'] });
    return person && { ownerId: person.id };
  }
  if (targetType === 'message') {
    // Un mensaje del chat: solo lo reporta alguien que está en la comunidad (o moderación) y si no fue borrado.
    const message = await CommunityMessage.findOne({ where: { id: targetId, deletedAt: null }, attributes: ['id', 'userId', 'communityId'], include: [{ model: Community, as: 'community', attributes: ['id'], where: { closedAt: null } }] });
    if (!message) return null;
    const member = await CommunityMember.count({ where: { communityId: message.communityId, userId: student.id, status: 'active' } });
    return (member || staffRoles.includes(student.role)) && { ownerId: message.userId };
  }
  const content = await Content.findOne({ where: { id: targetId, status: 'published', hiddenAt: null, [Op.or]: [{ institutionId: null }, { institutionId: student.institutionId }] }, attributes: ['id', 'authorId'] });
  // Las fichas del equipo no tienen autor; las que creó un estudiante, sí.
  return content && { ownerId: content.authorId };
};

// Dueño de lo reportado, para restarle puntos si moderación lo oculta.
const ownerOf = (type, target) => (type === 'profile' ? target?.id : type === 'content' ? target?.authorId : target?.userId);

// POST /reports: reportar contenido (FF-34), avisar que una ficha puede estar desactualizada (FF-35)
// o reportar un perfil. El reporte no cambia nada del contenido: queda pendiente para moderación.
export const createReport = async (req, res) => {
  const input = matchedData(req, { locations: ['body'] });
  const student = await findSessionUser(req, ['id', 'institutionId', 'role']);
  const target = await findTarget(input.targetType, input.targetId, student);
  if (!target) throw new HttpError(404, 'No encontramos ese contenido.');
  if (target.ownerId === student.id) throw new HttpError(400, 'No podés reportar algo que publicaste vos.');
  // Si ya hay un reporte pendiente de esta persona sobre lo mismo, no se duplica.
  const pending = await Report.findOne({ where: { reporterId: student.id, targetType: input.targetType, targetId: input.targetId, status: 'pending' } });
  if (!pending) {
    await Report.create({ reporterId: student.id, targetType: input.targetType, targetId: input.targetId, reason: input.reason, details: input.details || null });
  }
  // La respuesta no muestra el id, el estado ni nada interno de moderación.
  res.status(pending ? 200 : 201).json({ data: { message: 'Gracias. Recibimos tu aviso y lo va a revisar el equipo de moderación.' } });
};

const people = [
  { model: User, as: 'reporter', attributes: ['id', 'name'] },
  { model: User, as: 'resolver', attributes: ['id', 'name'] },
];

// GET /moderation/reports?status=pending&page=1 (FF-36)
export const getReports = async (req, res) => {
  const filters = matchedData(req, { locations: ['query'] });
  const status = filters.status ?? 'pending';
  const page = filters.page ?? 1;
  const limit = 20;
  // Los pendientes se atienden por orden de llegada; los resueltos se muestran del más nuevo al más viejo.
  const order = status === 'pending' ? [['createdAt', 'ASC'], ['id', 'ASC']] : [['createdAt', 'DESC'], ['id', 'DESC']];
  const { rows, count } = await Report.findAndCountAll({ where: status === 'all' ? {} : { status }, include: people, order, limit, offset: (page - 1) * limit });
  const target = await describeTargets(rows);
  const counts = { pending: 0, dismissed: 0, actioned: 0 };
  for (const row of await Report.findAll({ attributes: ['status', [fn('COUNT', col('id')), 'total']], group: ['status'], raw: true })) counts[row.status] = Number(row.total);
  res.json({
    data: rows.map(row => ({
      id: row.id,
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.createdAt,
      reporter: { name: row.reporter?.name || 'Cuenta eliminada' },
      target: target(row),
      resolution: row.status === 'pending' ? null : { action: row.action, note: row.resolutionNote, resolvedAt: row.resolvedAt, resolver: { name: row.resolver?.name || 'Cuenta eliminada' } },
    })),
    meta: { page, total: count, pages: Math.ceil(count / limit), counts },
  });
};

// POST /moderation/reports/:id/resolve (FF-37)
export const resolveReport = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { decision, note } = matchedData(req, { locations: ['body'] });
  const report = await Report.findByPk(id);
  if (!report) throw new HttpError(404, 'No encontramos este reporte.');
  if (report.status !== 'pending') throw new HttpError(409, 'Este reporte ya fue resuelto.');
  if (decision === 'close' && report.targetType !== 'question') throw new HttpError(400, 'Solo se pueden cerrar preguntas.', { decision: 'Elegí otra decisión.' });
  const model = { question: Question, answer: Answer, content: Content, profile: User, message: CommunityMessage }[report.targetType];
  const target = await model.findByPk(report.targetId);
  if (!target && decision !== 'dismiss') throw new HttpError(409, 'El contenido ya no existe: solo se puede desestimar el reporte.');
  const resolution = {
    status: decision === 'dismiss' ? 'dismissed' : 'actioned',
    action: decision === 'dismiss' ? 'none' : decision,
    resolutionNote: note,
    resolvedById: req.session.userId,
    resolvedAt: new Date(),
  };
  // Todo o nada: la acción, el reporte y el registro del historial se guardan juntos.
  await sequelize.transaction(async transaction => {
    const [updated] = await Report.update(resolution, { where: { id: report.id, status: 'pending' }, transaction });
    if (!updated) throw new HttpError(409, 'Este reporte ya fue resuelto.');
    // En un perfil, "ocultar" oculta la descripción; la cuenta sigue activa.
    if (decision === 'hide' && report.targetType === 'profile') {
      if (!target.bioHiddenAt) await target.update({ bioHiddenAt: new Date() }, { transaction });
    } else if (decision === 'hide' && report.targetType === 'message') {
      // Un mensaje del chat se borra (sin texto ni archivo) en lugar de ocultarse.
      if (!target.deletedAt) {
        await target.update({ deletedAt: new Date(), deletedBy: req.session.userId, body: null }, { transaction });
        await CommunityAttachment.destroy({ where: { messageId: target.id }, transaction });
      }
    } else if (decision === 'hide' && !target.hiddenAt) {
      await target.update({ hiddenAt: new Date() }, { transaction });
    }
    if (decision === 'close') await target.update({ status: 'closed' }, { transaction });
    // Ocultar algo por un reporte resta puntos a quien lo publicó (las fichas del equipo no tienen autor).
    const ownerId = ownerOf(report.targetType, target);
    if (decision === 'hide' && ownerId) await addPoints({ userId: ownerId, amount: -pointRules.hidden, reason: 'hidden', targetType: report.targetType, targetId: report.targetId, actorId: req.session.userId }, transaction);
    // Si se aplicó una acción, los demás reportes pendientes sobre lo mismo quedan resueltos igual.
    if (decision !== 'dismiss') await Report.update(resolution, { where: { targetType: report.targetType, targetId: report.targetId, status: 'pending' }, transaction });
    await saveModerationLog(req, { action: decision, targetType: report.targetType, targetId: report.targetId, reportId: report.id, note }, transaction);
  });
  // La respuesta no incluye datos de quien reportó.
  res.json({ data: { id: report.id, status: resolution.status, action: resolution.action } });
};
