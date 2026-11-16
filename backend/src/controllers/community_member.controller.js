import { Op } from 'sequelize';
import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { CommunityMember } from '../models/community_member.model.js';
import { CommunityRole } from '../models/community_role.model.js';
import { User } from '../models/user.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { levelOfMember } from '../helpers/community.helper.js';
import { communityContext, presentRole, roleInclude } from '../helpers/community_access.helper.js';
import { decorationsFor } from '../helpers/decoration.helper.js';
import { likePattern } from '../helpers/search.helper.js';
import { authorAttributes, avatarVersion } from '../helpers/user.helper.js';

const rankOrder = sequelize.literal("FIELD(`CommunityMember`.`rank`, 'owner', 'admin', 'member')");

// GET /communities/:id/members?search=ana&status=banned&page=2 (30 por página). Solo para miembros.
// Las personas expulsadas las ve quien administra la comunidad.
export const getMembers = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { search, status = 'active', page = 1 } = matchedData(req, { locations: ['query'] });
  const { community, abilities, viewer } = await communityContext(req, id);
  if (!abilities.isMember && !abilities.canModerate) throw new HttpError(403, 'Unite a la comunidad para ver quiénes participan.');
  if (status === 'banned' && !abilities.canManage) throw new HttpError(403, 'No tenés permiso para hacer esto en la comunidad.');
  const limit = 30;
  const { rows, count } = await CommunityMember.findAndCountAll({
    where: { communityId: community.id, status },
    attributes: ['id', 'userId', 'rank', 'status', 'createdAt'],
    include: [roleInclude, { model: User, as: 'user', attributes: authorAttributes, where: search ? { name: { [Op.like]: likePattern(search) } } : undefined }],
    order: [[rankOrder, 'ASC'], [{ model: User, as: 'user' }, 'name', 'ASC']],
    limit,
    offset: (page - 1) * limit,
  });
  const decorations = await decorationsFor(rows.map(row => row.userId));
  res.json({
    data: rows.map(row => ({
      userId: row.userId, name: row.user.name, avatarColor: row.user.avatarColor, avatarVersion: avatarVersion(row.user),
      decorations: { frame: decorations.get(row.userId)?.frame ?? null, nameColor: decorations.get(row.userId)?.nameColor ?? null },
      rank: row.rank, role: presentRole(row.role), joinedAt: row.createdAt, own: row.userId === viewer.id,
      // Solo se puede actuar sobre alguien de menor jerarquía.
      manageable: abilities.canManage && row.userId !== viewer.id && abilities.level > levelOfMember(row),
    })),
    meta: { page, total: count, pages: Math.ceil(count / limit) },
  });
};

const findTarget = async (community, userId, transaction) => {
  const target = await CommunityMember.findOne({ where: { communityId: community.id, userId }, transaction, lock: transaction.LOCK.UPDATE });
  if (!target) throw new HttpError(404, 'Esa persona no está en la comunidad.');
  return target;
};

// PUT /communities/:id/members/:userId { rank?, roleId? }
// - rank ('admin' o 'member'): solo quien creó la comunidad o la administración de Forbook.
// - roleId (o null para quitarlo): dueño y administradores, sobre alguien de menor jerarquía o sobre sí mismos.
export const updateMember = async (req, res) => {
  const { id, userId } = matchedData(req, { locations: ['params'] });
  const data = matchedData(req, { locations: ['body'] });
  // roleId: null (quitar el rol) llega en el cuerpo aunque matchedData lo saltee por ser opcional.
  if (req.body.roleId === null) data.roleId = null;
  if (data.rank === undefined && data.roleId === undefined) throw new HttpError(400, 'Indicá qué querés cambiar.');
  await sequelize.transaction(async transaction => {
    const { community, abilities, viewer } = await communityContext(req, id, 'canManage', { transaction });
    const target = await findTarget(community, userId, transaction);
    if (target.status !== 'active') throw new HttpError(409, 'Esa persona está expulsada de la comunidad.');
    const self = target.userId === viewer.id;
    if (!self && abilities.level <= levelOfMember(target)) throw new HttpError(403, 'No podés cambiar a alguien de tu misma jerarquía o de una mayor.');
    const changes = {};
    if (data.rank !== undefined && data.rank !== target.rank) {
      if (!abilities.canEdit) throw new HttpError(403, 'Solo quien creó la comunidad puede nombrar o quitar administradores.');
      if (target.rank === 'owner') throw new HttpError(409, 'Quien creó la comunidad siempre es su dueño.');
      changes.rank = data.rank;
    }
    if (data.roleId !== undefined) {
      if (data.roleId !== null && !await CommunityRole.findOne({ where: { id: data.roleId, communityId: community.id }, attributes: ['id'], transaction })) {
        throw new HttpError(400, 'Revisá los campos indicados.', { roleId: 'Ese rol no existe en esta comunidad.' });
      }
      changes.roleId = data.roleId;
    }
    await target.update(changes, { transaction });
  });
  res.json({ data: { userId }, message: 'Guardamos los cambios.' });
};

// DELETE /communities/:id/members/:userId: expulsar. No puede volver a entrar hasta que se lo permitan.
export const banMember = async (req, res) => {
  const { id, userId } = matchedData(req, { locations: ['params'] });
  await sequelize.transaction(async transaction => {
    const { community, abilities, viewer } = await communityContext(req, id, 'canManage', { transaction, lock: transaction.LOCK.UPDATE });
    const target = await findTarget(community, userId, transaction);
    if (target.userId === viewer.id) throw new HttpError(409, 'No podés expulsarte: usá "Salir de la comunidad".');
    if (abilities.level <= levelOfMember(target)) throw new HttpError(403, 'No podés expulsar a alguien de tu misma jerarquía o de una mayor.');
    if (target.status === 'banned') throw new HttpError(409, 'Esa persona ya está expulsada.');
    await target.update({ status: 'banned', rank: 'member', roleId: null }, { transaction });
    await community.decrement('membersCount', { transaction });
  });
  res.json({ data: { userId }, message: 'La persona quedó expulsada de la comunidad.' });
};

// POST /communities/:id/members/:userId/unban: levanta la expulsión. La persona puede volver a unirse.
export const unbanMember = async (req, res) => {
  const { id, userId } = matchedData(req, { locations: ['params'] });
  await sequelize.transaction(async transaction => {
    const { community } = await communityContext(req, id, 'canManage', { transaction });
    const target = await findTarget(community, userId, transaction);
    if (target.status !== 'banned') throw new HttpError(409, 'Esa persona no está expulsada.');
    await target.destroy({ transaction });
  });
  res.json({ data: { userId }, message: 'Listo: esa persona puede volver a unirse.' });
};
