import { UserWarning } from '../models/user_warning.model.js';
import { UserSanction } from '../models/user_sanction.model.js';
import { PointTransaction } from '../models/point_transaction.model.js';
import { reverseTransaction } from './point.helper.js';
import { relax } from './sanction.helper.js';
import { HttpError } from './error.helper.js';

// Revocar una advertencia o una sanción (desde el panel o al aceptar una apelación).
// Una advertencia devuelve los puntos descontados y puede levantar una sanción automática.
export const revokeTarget = async ({ targetType, targetId, actorId }, transaction) => {
  if (targetType === 'warning') {
    const warning = await UserWarning.findByPk(targetId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!warning || warning.revokedAt) throw new HttpError(409, 'Esa advertencia ya fue revocada.');
    await warning.update({ revokedAt: new Date(), revokedById: actorId }, { transaction });
    const penalty = await PointTransaction.findOne({ where: { userId: warning.userId, reason: 'warning', targetType: 'warning', targetId: warning.id }, transaction });
    if (penalty) await reverseTransaction(penalty, { reason: 'warning_revoked', actorId }, transaction);
    await relax({ userId: warning.userId, actorId }, transaction);
    return warning;
  }
  const sanction = await UserSanction.findByPk(targetId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!sanction || sanction.revokedAt) throw new HttpError(409, 'Esa sanción ya fue revocada.');
  await sanction.update({ revokedAt: new Date(), revokedById: actorId }, { transaction });
  return sanction;
};
