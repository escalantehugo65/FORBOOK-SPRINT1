import { randomBytes } from 'node:crypto';
import { Op } from 'sequelize';
import { User } from '../models/user.model.js';
import { UserAvatar } from '../models/user_avatar.model.js';
import { UserBlock } from '../models/user_block.model.js';
import { Friendship } from '../models/friendship.model.js';
import { Community } from '../models/community.model.js';
import { CommunityMember } from '../models/community_member.model.js';
import { Session } from '../models/session.model.js';
import { hashPassword } from './bcrypt.helper.js';

export const deletedName = 'Cuenta eliminada';

// Da de baja una cuenta: la deja anónima en vez de borrarla, así las preguntas, respuestas, fichas
// y mensajes que dejó no se rompen (aparecen como «Cuenta eliminada»).
// - Se borran sus datos personales: nombre, correo, descripción, intereses, foto y contraseña.
// - El correo queda libre para registrarse de nuevo.
// - Se van sus amistades, bloqueos y las comunidades de las que era miembro (las que creó siguen, con su dueño anónimo).
// - Se cierran todas sus sesiones.
export async function deleteAccount(user, transaction) {
  const id = user.id;
  await user.update({
    name: deletedName,
    email: `eliminada-${id}-${randomBytes(6).toString('hex')}@forbook.invalid`,
    passwordHash: await hashPassword(randomBytes(24).toString('hex')),
    bio: null, interests: null, cohortYear: null, showOrigin: false, showArrival: false,
    avatarUpdatedAt: null, role: 'student', deletedAt: new Date(),
  }, { transaction });
  await UserAvatar.destroy({ where: { userId: id }, transaction });
  await UserBlock.destroy({ where: { [Op.or]: [{ userId: id }, { targetId: id }] }, transaction });
  await Friendship.destroy({ where: { [Op.or]: [{ userLowId: id }, { userHighId: id }] }, transaction });
  const memberships = await CommunityMember.findAll({ where: { userId: id, status: 'active', rank: { [Op.ne]: 'owner' } }, transaction });
  for (const member of memberships) {
    await member.destroy({ transaction });
    await Community.decrement('membersCount', { where: { id: member.communityId }, transaction });
  }
  // Las sesiones guardan el usuario dentro del JSON: {"userId":12,...} o {...,"userId":12}.
  await Session.destroy({ where: { [Op.or]: [{ data: { [Op.like]: `%"userId":${id},%` } }, { data: { [Op.like]: `%"userId":${id}}%` } }] }, transaction });
}

// true si la cuenta existe y no se dio de baja.
export async function isActiveAccount(userId) {
  const user = await User.findByPk(userId, { attributes: ['id', 'deletedAt'] });
  return Boolean(user && !user.deletedAt);
}
