import { Community } from '../models/community.model.js';
import { CommunityMember } from '../models/community_member.model.js';
import { CommunityRole } from '../models/community_role.model.js';
import { HttpError } from './error.helper.js';
import { abilitiesOf } from './community.helper.js';
import { findSessionUser } from './user.helper.js';

export const roleInclude = { model: CommunityRole, as: 'role', attributes: ['id', 'name', 'color', 'canModerate'] };

// Lo que hace falta en casi todos los pedidos de una comunidad: la comunidad (abierta), quién pide,
// su membresía (si tiene) y qué puede hacer. need exige un permiso: 'isMember', 'canModerate', 'canManage' o 'canEdit'.
export const communityContext = async (req, communityId, need = null, options = {}) => {
  const viewer = await findSessionUser(req, ['id', 'role']);
  const community = await Community.findOne({ where: { id: communityId, closedAt: null }, ...options });
  if (!community) throw new HttpError(404, 'No encontramos esa comunidad.');
  const member = await CommunityMember.findOne({ where: { communityId: community.id, userId: viewer.id }, include: [roleInclude], ...options });
  const abilities = abilitiesOf(member, viewer.role);
  if (need && !abilities[need]) {
    throw new HttpError(403, need === 'isMember' ? 'Unite a la comunidad para participar.' : 'No tenés permiso para hacer esto en la comunidad.');
  }
  return { viewer, community, member, abilities };
};

// Rol propio de la comunidad tal como lo recibe el frontend.
export const presentRole = (role) => (role ? { id: role.id, name: role.name, color: role.color, canModerate: role.canModerate } : null);
