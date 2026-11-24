import { Op } from 'sequelize';
import { Friendship } from '../models/friendship.model.js';

// Clave del par: siempre el id menor primero (así hay una sola fila por par de personas).
export const pairOf = (a, b) => ({ userLowId: Math.min(a, b), userHighId: Math.max(a, b) });
export const otherOf = (row, userId) => (row.userLowId === userId ? row.userHighId : row.userLowId);

export const findPair = (a, b, options = {}) => Friendship.findOne({ where: pairOf(a, b), ...options });

// Relación de quien mira con otra persona: none, friends, sent (le mandé solicitud) o received (me la mandó).
export const relationOf = (row, viewerId) => {
  if (!row) return 'none';
  if (row.status === 'accepted') return 'friends';
  return row.requesterId === viewerId ? 'sent' : 'received';
};

// Ids de los amigos (solicitudes aceptadas) de una persona.
export const friendIdsOf = async (userId, transaction = null) => {
  const rows = await Friendship.findAll({ where: { status: 'accepted', [Op.or]: [{ userLowId: userId }, { userHighId: userId }] }, attributes: ['userLowId', 'userHighId'], raw: true, transaction });
  return rows.map(row => otherOf(row, userId));
};

export const friendsCountOf = (userId) => Friendship.count({ where: { status: 'accepted', [Op.or]: [{ userLowId: userId }, { userHighId: userId }] } });
