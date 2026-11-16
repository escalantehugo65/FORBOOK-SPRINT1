import { Op } from 'sequelize';
import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { CommunityMember } from '../models/community_member.model.js';
import { CommunityMessage } from '../models/community_message.model.js';
import { CommunityAttachment } from '../models/community_attachment.model.js';
import { User } from '../models/user.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { communityLimits, invisibleUserIds, readChatAudio, readChatImage } from '../helpers/community.helper.js';
import { communityContext, presentRole, roleInclude } from '../helpers/community_access.helper.js';
import { decorationsFor } from '../helpers/decoration.helper.js';
import { authorAttributes, publicAuthor } from '../helpers/user.helper.js';

const pageSize = 40;
const attachmentInclude = { model: CommunityAttachment, as: 'attachment', attributes: ['messageId', 'width', 'height', 'seconds'] };

// Arma los mensajes para el chat: autor con su jerarquía y su rol en la comunidad, y el adjunto sin el archivo.
const presentMessages = async (rows, communityId, viewerId, abilities) => {
  const authorIds = [...new Set(rows.map(row => row.userId).filter(Boolean))];
  const [decorations, members] = await Promise.all([
    decorationsFor(authorIds),
    authorIds.length ? CommunityMember.findAll({ where: { communityId, userId: authorIds, status: 'active' }, attributes: ['userId', 'rank'], include: [roleInclude] }) : [],
  ]);
  const memberOf = new Map(members.map(member => [member.userId, member]));
  return rows.map(row => {
    const deleted = Boolean(row.deletedAt);
    const member = memberOf.get(row.userId);
    const own = row.userId === viewerId;
    return {
      id: row.id,
      kind: row.kind,
      // Un mensaje borrado no muestra ni el texto ni el archivo.
      body: deleted ? null : row.body,
      deleted,
      createdAt: row.createdAt,
      own,
      author: { ...publicAuthor(row.author, decorations.get(row.userId)), rank: member?.rank ?? null, role: presentRole(member?.role) },
      attachment: !deleted && row.attachment ? { width: row.attachment.width, height: row.attachment.height, seconds: row.attachment.seconds } : null,
      canDelete: !deleted && (own || abilities.canModerate),
    };
  });
};

// GET /communities/:id/messages            → los últimos 40
// GET /communities/:id/messages?before=120 → 40 anteriores al mensaje 120 (para subir en el chat)
// GET /communities/:id/messages?after=160  → los nuevos desde el 160 (el chat pregunta cada pocos segundos)
// Al pedirlos, quedan como leídos. No se muestran los de personas ocultas o bloqueadas.
export const getMessages = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { before, after } = matchedData(req, { locations: ['query'] });
  const { community, member, abilities, viewer } = await communityContext(req, id, 'isMember');
  const invisible = await invisibleUserIds(viewer.id);
  const where = { communityId: community.id };
  if (invisible.length) where[Op.or] = [{ userId: null }, { userId: { [Op.notIn]: invisible } }];
  if (after !== undefined) where.id = { [Op.gt]: after };
  else if (before !== undefined) where.id = { [Op.lt]: before };
  const rows = await CommunityMessage.findAll({
    where,
    attributes: ['id', 'userId', 'kind', 'body', 'deletedAt', 'createdAt'],
    include: [{ model: User, as: 'author', attributes: authorAttributes }, attachmentInclude],
    order: [['id', after !== undefined ? 'ASC' : 'DESC']],
    limit: pageSize + 1,
  });
  const hasMore = rows.length > pageSize;
  const page = rows.slice(0, pageSize);
  if (after === undefined) page.reverse();
  // Borrados desde la última consulta: el chat abierto los tacha sin recargar todo.
  const deletedIds = after !== undefined
    ? (await CommunityMessage.findAll({ where: { communityId: community.id, deletedAt: { [Op.gte]: new Date(Date.now() - 60000) } }, attributes: ['id'], raw: true })).map(row => row.id)
    : [];
  const newest = page.length ? page[page.length - 1].id : 0;
  if (before === undefined && newest > member.lastReadMessageId) await member.update({ lastReadMessageId: newest });
  res.json({ data: await presentMessages(page, community.id, viewer.id, abilities), meta: { hasMore, deletedIds } });
};

// Freno contra el spam: cuenta los mensajes recientes de la persona en todas las comunidades.
const checkPace = async (userId, withMedia, transaction) => {
  const recent = await CommunityMessage.count({ where: { userId, createdAt: { [Op.gte]: new Date(Date.now() - 30000) } }, transaction });
  if (recent >= communityLimits.messagesPerHalfMinute) throw new HttpError(429, 'Estás escribiendo muy rápido. Esperá unos segundos.');
  if (!withMedia) return;
  const media = await CommunityMessage.count({ where: { userId, kind: ['image', 'audio'], createdAt: { [Op.gte]: new Date(Date.now() - 600000) } }, transaction });
  if (media >= communityLimits.mediaPerTenMinutes) throw new HttpError(429, 'Mandaste muchas imágenes y audios seguidos. Esperá unos minutos.');
};

// POST /communities/:id/messages
// { body } | { image: "data:image/jpeg;base64,...", body? } | { audio: "data:audio/webm;base64,...", seconds }
export const createMessage = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const data = matchedData(req, { locations: ['body'] });
  const file = data.image ? readChatImage(data.image) : data.audio ? readChatAudio(data.audio, data.seconds) : null;
  const kind = data.image ? 'image' : data.audio ? 'audio' : 'text';
  const { message, context } = await sequelize.transaction(async transaction => {
    const found = await communityContext(req, id, 'isMember', { transaction });
    await checkPace(found.viewer.id, Boolean(file), transaction);
    const created = await CommunityMessage.create({ communityId: found.community.id, userId: found.viewer.id, kind, body: data.body || null }, { transaction });
    if (file) await CommunityAttachment.create({ messageId: created.id, ...file }, { transaction });
    await found.community.update({ lastMessageAt: created.createdAt }, { transaction });
    return { message: created, context: found };
  });
  const row = await CommunityMessage.findByPk(message.id, { include: [{ model: User, as: 'author', attributes: authorAttributes }, attachmentInclude] });
  const [presented] = await presentMessages([row], context.community.id, context.viewer.id, context.abilities);
  res.status(201).json({ data: presented });
};

// DELETE /communities/:id/messages/:messageId: cada persona borra los suyos; quien modera, cualquiera.
export const deleteMessage = async (req, res) => {
  const { id, messageId } = matchedData(req, { locations: ['params'] });
  const { community, abilities, viewer } = await communityContext(req, id);
  const message = await CommunityMessage.findOne({ where: { id: messageId, communityId: community.id } });
  if (!message) throw new HttpError(404, 'No encontramos ese mensaje.');
  const own = message.userId === viewer.id;
  if (!(own && abilities.isMember) && !abilities.canModerate) throw new HttpError(403, 'No podés borrar ese mensaje.');
  if (message.deletedAt) throw new HttpError(409, 'Ese mensaje ya estaba borrado.');
  await sequelize.transaction(async transaction => {
    await message.update({ deletedAt: new Date(), deletedBy: viewer.id, body: null }, { transaction });
    // El archivo se borra de verdad: no queda guardado nada de lo que se quitó.
    await CommunityAttachment.destroy({ where: { messageId: message.id }, transaction });
  });
  res.json({ data: { id: message.id }, message: 'Borramos el mensaje.' });
};

// GET /communities/:id/messages/:messageId/attachment: la imagen o el audio. Solo para miembros.
export const getAttachment = async (req, res) => {
  const { id, messageId } = matchedData(req, { locations: ['params'] });
  const { community, abilities } = await communityContext(req, id);
  if (!abilities.isMember && !abilities.canModerate) throw new HttpError(403, 'Unite a la comunidad para participar.');
  const message = await CommunityMessage.findOne({ where: { id: messageId, communityId: community.id, deletedAt: null }, attributes: ['id'], include: [{ model: CommunityAttachment, as: 'attachment' }] });
  if (!message?.attachment) throw new HttpError(404, 'Ese archivo ya no está disponible.');
  // nosniff + el tipo guardado: el navegador nunca lo interpreta como una página.
  res.set({ 'Content-Type': message.attachment.mimeType, 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline' });
  res.send(message.attachment.data);
};
