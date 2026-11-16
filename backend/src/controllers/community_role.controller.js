import { Op } from 'sequelize';
import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { CommunityRole } from '../models/community_role.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { communityLimits } from '../helpers/community.helper.js';
import { communityContext, presentRole } from '../helpers/community_access.helper.js';

// Roles propios de la comunidad. Los crean y editan su dueño, sus administradores y la administración de Forbook.
const checkName = async (communityId, name, exceptId, transaction) => {
  const taken = await CommunityRole.findOne({ where: { communityId, name, ...(exceptId ? { id: { [Op.ne]: exceptId } } : {}) }, attributes: ['id'], transaction });
  if (taken) throw new HttpError(400, 'Revisá los campos indicados.', { name: 'Ya hay un rol con ese nombre.' });
};
// Dar permiso de moderación es una decisión de quien creó la comunidad.
const checkModeration = (abilities, canModerate, before = false) => {
  if (canModerate !== before && !abilities.canEdit) throw new HttpError(403, 'Solo quien creó la comunidad puede dar o quitar el permiso de moderar.');
};

// POST /communities/:id/roles { name, color, canModerate }
export const createRole = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const data = matchedData(req, { locations: ['body'] });
  const role = await sequelize.transaction(async transaction => {
    const { community, abilities } = await communityContext(req, id, 'canManage', { transaction, lock: transaction.LOCK.UPDATE });
    checkModeration(abilities, data.canModerate);
    if (await CommunityRole.count({ where: { communityId: community.id }, transaction }) >= communityLimits.rolesPerCommunity) {
      throw new HttpError(409, `Una comunidad puede tener hasta ${communityLimits.rolesPerCommunity} roles.`);
    }
    await checkName(community.id, data.name, null, transaction);
    return CommunityRole.create({ communityId: community.id, name: data.name, color: data.color, canModerate: data.canModerate }, { transaction });
  });
  res.status(201).json({ data: presentRole(role), message: `Creaste el rol "${role.name}".` });
};

const findRole = async (community, roleId, transaction) => {
  const role = await CommunityRole.findOne({ where: { id: roleId, communityId: community.id }, transaction });
  if (!role) throw new HttpError(404, 'No encontramos ese rol.');
  return role;
};

// PUT /communities/:id/roles/:roleId
export const updateRole = async (req, res) => {
  const { id, roleId } = matchedData(req, { locations: ['params'] });
  const data = matchedData(req, { locations: ['body'] });
  const role = await sequelize.transaction(async transaction => {
    const { community, abilities } = await communityContext(req, id, 'canManage', { transaction });
    const found = await findRole(community, roleId, transaction);
    checkModeration(abilities, data.canModerate, found.canModerate);
    await checkName(community.id, data.name, found.id, transaction);
    return found.update({ name: data.name, color: data.color, canModerate: data.canModerate }, { transaction });
  });
  res.json({ data: presentRole(role), message: 'Guardamos el rol.' });
};

// DELETE /communities/:id/roles/:roleId: quienes lo tenían quedan sin rol.
export const deleteRole = async (req, res) => {
  const { id, roleId } = matchedData(req, { locations: ['params'] });
  await sequelize.transaction(async transaction => {
    const { community, abilities } = await communityContext(req, id, 'canManage', { transaction });
    const role = await findRole(community, roleId, transaction);
    checkModeration(abilities, false, role.canModerate);
    await role.destroy({ transaction });
  });
  res.json({ data: { id: roleId }, message: 'Borramos el rol.' });
};
