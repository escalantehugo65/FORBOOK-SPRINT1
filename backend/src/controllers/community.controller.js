import { Op, QueryTypes } from 'sequelize';
import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { Community } from '../models/community.model.js';
import { CommunityMember } from '../models/community_member.model.js';
import { CommunityRole } from '../models/community_role.model.js';
import { User } from '../models/user.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { communityColors, communityLimits, communityTopics, invisibleUserIds } from '../helpers/community.helper.js';
import { communityContext, presentRole } from '../helpers/community_access.helper.js';
import { textSearch } from '../helpers/search.helper.js';
import { slugify } from '../helpers/slug.helper.js';
import { findSessionUser, publicAuthor, authorAttributes } from '../helpers/user.helper.js';
import { decorationsFor } from '../helpers/decoration.helper.js';

const listAttributes = ['id', 'name', 'description', 'kind', 'topic', 'color', 'ownerId', 'membersCount', 'lastMessageAt'];

// Mensajes sin leer de cada comunidad donde estoy: Map { communityId → cantidad }.
// No cuentan los míos, los borrados ni los de personas que oculté o bloqueé.
export const unreadByCommunity = async (userId, { onlyNotified = false } = {}) => {
  const invisible = await invisibleUserIds(userId);
  const rows = await sequelize.query(
    `SELECT member.community_id AS communityId, COUNT(*) AS total
     FROM community_members member
     JOIN communities community ON community.id = member.community_id AND community.closed_at IS NULL
     JOIN community_messages message ON message.community_id = member.community_id AND message.id > member.last_read_message_id
     WHERE member.user_id = :userId AND member.status = 'active' AND message.deleted_at IS NULL
       AND (message.user_id IS NULL OR message.user_id <> :userId)
       ${invisible.length ? 'AND (message.user_id IS NULL OR message.user_id NOT IN (:invisible))' : ''}
       ${onlyNotified ? "AND member.notifications = 'all'" : ''}
     GROUP BY member.community_id`,
    { replacements: { userId, invisible }, type: QueryTypes.SELECT },
  );
  return new Map(rows.map(row => [row.communityId, Number(row.total)]));
};

// GET /communities?scope=mine&search=centro&topic=barrio
// scope=mine: las comunidades donde estoy, con los mensajes sin leer. Sin scope: todas, para explorar.
export const getCommunities = async (req, res) => {
  const { scope = 'all', search, topic } = matchedData(req, { locations: ['query'] });
  const viewer = await findSessionUser(req, ['id', 'role']);
  const memberships = await CommunityMember.findAll({ where: { userId: viewer.id, status: 'active' }, attributes: ['communityId', 'rank', 'notifications'], raw: true });
  const mine = new Map(memberships.map(member => [member.communityId, member]));
  const where = { closedAt: null };
  if (scope === 'mine') where.id = [...mine.keys()];
  if (topic) where.topic = topic;
  if (search) Object.assign(where, textSearch(['name', 'description'], search));
  // Primero las predeterminadas y después las más activas.
  const rows = await Community.findAll({ where, attributes: listAttributes, order: [['kind', 'ASC'], ['membersCount', 'DESC'], ['name', 'ASC']], limit: 100 });
  const unread = mine.size ? await unreadByCommunity(viewer.id) : new Map();
  const owned = await Community.count({ where: { ownerId: viewer.id, closedAt: null } });
  res.json({
    data: rows.map(row => {
      const member = mine.get(row.id);
      return { ...row.toJSON(), joined: Boolean(member), rank: member?.rank ?? null, muted: member?.notifications === 'muted', unread: member ? unread.get(row.id) ?? 0 : 0 };
    }),
    meta: { owned, limits: communityLimits, topics: communityTopics, colors: communityColors, canCreate: viewer.role === 'admin' || owned < communityLimits.ownedPerUser },
  });
};

// GET /communities/unread: total para el aviso del menú. Las comunidades silenciadas no suman.
export const getUnread = async (req, res) => {
  const unread = await unreadByCommunity(req.session.userId, { onlyNotified: true });
  res.json({ data: { total: [...unread.values()].reduce((sum, value) => sum + value, 0), communities: unread.size } });
};

const uniqueSlug = async (name, transaction) => {
  const base = slugify(name) || 'comunidad';
  let slug = base;
  for (let n = 2; await Community.findOne({ where: { slug }, attributes: ['id'], transaction }); n += 1) slug = `${base}-${n}`;
  return slug;
};
// Dos comunidades abiertas no pueden llamarse igual (sin distinguir mayúsculas ni tildes).
const checkName = async (name, exceptId, transaction) => {
  const taken = await Community.findOne({ where: { name, closedAt: null, ...(exceptId ? { id: { [Op.ne]: exceptId } } : {}) }, attributes: ['id'], transaction });
  if (taken) throw new HttpError(400, 'Revisá los campos indicados.', { name: 'Ya hay una comunidad con ese nombre.' });
};

// POST /communities: cada estudiante puede tener hasta 2 comunidades propias abiertas.
export const createCommunity = async (req, res) => {
  const data = matchedData(req, { locations: ['body'] });
  const community = await sequelize.transaction(async transaction => {
    // Se bloquea la fila del usuario: dos pedidos a la vez no pueden pasar el límite.
    const user = await User.findByPk(req.session.userId, { attributes: ['id', 'role'], transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw new HttpError(401, 'Tu sesión ya no es válida.');
    const owned = await Community.count({ where: { ownerId: user.id, closedAt: null }, transaction });
    if (user.role !== 'admin' && owned >= communityLimits.ownedPerUser) throw new HttpError(409, `Podés tener hasta ${communityLimits.ownedPerUser} comunidades propias. Cerrá una para crear otra.`);
    await checkName(data.name, null, transaction);
    const created = await Community.create({
      slug: await uniqueSlug(data.name, transaction), name: data.name, description: data.description, rules: data.rules || null,
      topic: data.topic, color: data.color, kind: 'user', ownerId: user.id, membersCount: 1,
    }, { transaction });
    await CommunityMember.create({ communityId: created.id, userId: user.id, rank: 'owner' }, { transaction });
    return created;
  });
  res.status(201).json({ data: { id: community.id, name: community.name }, message: 'Creaste la comunidad. Ya podés invitar gente a sumarse.' });
};

// GET /communities/:id: se puede ver sin ser miembro (para decidir si unirse); el chat, no.
export const getCommunityById = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { community, member, abilities } = await communityContext(req, id);
  const [roles, owner, banned] = await Promise.all([
    CommunityRole.findAll({ where: { communityId: community.id }, attributes: ['id', 'name', 'color', 'canModerate'], order: [['name', 'ASC']] }),
    community.ownerId ? User.findByPk(community.ownerId, { attributes: authorAttributes }) : null,
    abilities.canManage ? CommunityMember.count({ where: { communityId: community.id, status: 'banned' } }) : 0,
  ]);
  const decorations = owner ? await decorationsFor([owner.id]) : new Map();
  res.json({
    data: {
      id: community.id, name: community.name, description: community.description, rules: community.rules, kind: community.kind,
      topic: community.topic, color: community.color, membersCount: community.membersCount, createdAt: community.createdAt,
      owner: owner ? publicAuthor(owner, decorations.get(owner.id)) : null,
      roles: roles.map(presentRole),
      membership: member ? { status: member.status, rank: member.rank, role: presentRole(member.role), notifications: member.notifications } : null,
      abilities: { isMember: abilities.isMember, canEdit: abilities.canEdit, canManage: abilities.canManage, canModerate: abilities.canModerate },
      ...(abilities.canManage ? { bannedCount: banned } : {}),
    },
    meta: { limits: communityLimits },
  });
};

// PUT /communities/:id: nombre, descripción, reglas, tema y color.
export const updateCommunity = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const data = matchedData(req, { locations: ['body'] });
  const { community } = await communityContext(req, id, 'canEdit');
  await checkName(data.name, community.id);
  await community.update({ name: data.name, description: data.description, rules: data.rules || null, topic: data.topic, color: data.color });
  res.json({ data: { id: community.id, name: community.name }, message: 'Guardamos los cambios.' });
};

// DELETE /communities/:id: la cierra (deja de verse). Las predeterminadas solo las cierra administración.
export const closeCommunity = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { community, viewer } = await communityContext(req, id, 'canEdit');
  if (community.kind === 'default' && viewer.role !== 'admin') throw new HttpError(403, 'Las comunidades predeterminadas solo las cierra la administración de Forbook.');
  await community.update({ closedAt: new Date() });
  res.json({ data: { id: community.id }, message: 'La comunidad quedó cerrada.' });
};

// POST /communities/:id/join
export const joinCommunity = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  await sequelize.transaction(async transaction => {
    const { community, member, viewer } = await communityContext(req, id, null, { transaction, lock: transaction.LOCK.UPDATE });
    if (member?.status === 'banned') throw new HttpError(403, 'Te expulsaron de esta comunidad y no podés volver a entrar.');
    if (member) throw new HttpError(409, 'Ya estás en esta comunidad.');
    // Entra viendo el chat como leído: los mensajes viejos no le aparecen como nuevos.
    const last = await community.getMessages({ attributes: ['id'], order: [['id', 'DESC']], limit: 1, transaction });
    await CommunityMember.create({ communityId: community.id, userId: viewer.id, lastReadMessageId: last[0]?.id ?? 0 }, { transaction });
    await community.increment('membersCount', { transaction });
  });
  res.status(201).json({ data: { joined: true }, message: 'Te uniste a la comunidad.' });
};

// DELETE /communities/:id/membership: salir. Quien la creó no puede irse: la cierra o queda como dueño.
export const leaveCommunity = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  await sequelize.transaction(async transaction => {
    const { community, member } = await communityContext(req, id, 'isMember', { transaction, lock: transaction.LOCK.UPDATE });
    if (member.rank === 'owner') throw new HttpError(409, 'Sos quien creó la comunidad: no podés salir. Si ya no la querés, cerrala.');
    await member.destroy({ transaction });
    await community.decrement('membersCount', { transaction });
  });
  res.json({ data: { joined: false }, message: 'Saliste de la comunidad.' });
};

// PUT /communities/:id/membership { notifications: 'all' | 'muted' }
export const updateMembership = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { notifications } = matchedData(req, { locations: ['body'] });
  const { member } = await communityContext(req, id, 'isMember');
  await member.update({ notifications });
  res.json({ data: { notifications }, message: notifications === 'muted' ? 'Silenciaste la comunidad: no te avisamos de mensajes nuevos.' : 'Vas a recibir avisos de mensajes nuevos.' });
};
