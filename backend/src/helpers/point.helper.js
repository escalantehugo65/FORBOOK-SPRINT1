import { Op } from 'sequelize';
import { User } from '../models/user.model.js';
import { PointTransaction } from '../models/point_transaction.model.js';

// Reglas de la economía de Forbook. La tienda las muestra tal cual en "Mis puntos".
// Los topes diarios evitan que alguien junte puntos publicando cualquier cosa.
export const pointRules = {
  welcome: 100,
  question: { amount: 2, dailyLimit: 2 },
  answer: { amount: 5, dailyLimit: 3 },
  helpful: { amount: 10, dailyLimit: 10 },
  hidden: 15,
  warning: 30,
};

// La reputación cuenta solo lo ganado participando y las sanciones: no el bono ni las compras.
const reputationReasons = ['question', 'answer', 'helpful', 'helpful_removed', 'hidden', 'warning', 'warning_revoked'];

export const levels = [
  { key: 'nuevo', name: 'Nuevo', min: 0 },
  { key: 'aportante', name: 'Aportante', min: 50 },
  { key: 'confiable', name: 'Confiable', min: 300 },
];

export const levelOf = (reputation = 0) => [...levels].reverse().find(level => reputation >= level.min).key;

// Medianoche de hoy en la Argentina (UTC-3, sin horario de verano), para los topes diarios.
export const startOfToday = (now = new Date()) => {
  const local = new Date(now.getTime() - 3 * 3600000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + 3 * 3600000);
};

// Suma o resta puntos dentro de una transacción y deja el movimiento anotado.
// La fila del usuario se bloquea (FOR UPDATE) para que dos compras al mismo tiempo no gasten dos veces.
// El saldo y la reputación nunca quedan negativos. Con dailyLimit, no suma si ya llegó al tope de hoy.
// reputation permite indicar cuánto cambia la reputación (por ejemplo, al devolver exactamente lo descontado).
export const addPoints = async ({ userId, amount, reason, reputation = null, targetType = null, targetId = null, actorId = null, dailyLimit = null }, transaction) => {
  const user = await User.findByPk(userId, { attributes: ['id', 'points', 'reputation'], transaction, lock: transaction.LOCK.UPDATE });
  if (!user) return null;
  if (dailyLimit !== null) {
    const given = await PointTransaction.count({ where: { userId, reason, createdAt: { [Op.gte]: startOfToday() } }, transaction });
    if (given >= dailyLimit) return null;
  }
  const applied = Math.max(amount, -user.points);
  const reputationChange = Math.max(reputation ?? (reputationReasons.includes(reason) ? amount : 0), -user.reputation);
  await user.update({ points: user.points + applied, reputation: user.reputation + reputationChange }, { transaction });
  return PointTransaction.create({ userId, amount: applied, balance: user.points, reputationChange, reason, targetType, targetId, actorId }, { transaction });
};

// Devuelve exactamente lo que se descontó o sumó en un movimiento anterior (saldo y reputación).
export const reverseTransaction = (movement, { reason, actorId = null }, transaction) => addPoints({
  userId: movement.userId,
  amount: -movement.amount,
  reputation: -movement.reputationChange,
  reason,
  targetType: movement.targetType,
  targetId: movement.targetId,
  actorId,
}, transaction);

// "Me fue útil": cada persona suma una sola vez por respuesta. Si la desmarca, se descuenta;
// si la vuelve a marcar, no suma de nuevo (así no se pueden juntar puntos marcando y desmarcando).
export const rewardHelpful = async ({ authorId, answerId, voterId }, transaction) => {
  const where = { userId: authorId, targetType: 'answer', targetId: answerId, actorId: voterId };
  if (await PointTransaction.count({ where: { ...where, reason: 'helpful' }, transaction })) return null;
  return addPoints({ ...where, amount: pointRules.helpful.amount, reason: 'helpful', dailyLimit: pointRules.helpful.dailyLimit }, transaction);
};

export const revokeHelpful = async ({ authorId, answerId, voterId }, transaction) => {
  const where = { userId: authorId, targetType: 'answer', targetId: answerId, actorId: voterId };
  const given = await PointTransaction.findOne({ where: { ...where, reason: 'helpful' }, transaction });
  const removed = await PointTransaction.count({ where: { ...where, reason: 'helpful_removed' }, transaction });
  if (!given || removed) return null;
  return reverseTransaction(given, { reason: 'helpful_removed', actorId: voterId }, transaction);
};
