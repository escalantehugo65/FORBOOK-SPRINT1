import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { User } from '../models/user.model.js';
import { UserWarning } from '../models/user_warning.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { saveModerationLog } from '../helpers/moderation.helper.js';
import { PointTransaction } from '../models/point_transaction.model.js';
import { addPoints, pointRules, reverseTransaction } from '../helpers/point.helper.js';
import { escalate, relax, sanctionRules } from '../helpers/sanction.helper.js';

// POST /moderation/users/:id/warnings. La advertencia se ve en el perfil mientras no se revoque y resta puntos.
// Si con ella la cuenta llega a un umbral de advertencias, se aplica la sanción automática (helpers/sanction.helper.js).
export const createWarning = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { reason, note } = matchedData(req, { locations: ['body'] });
  const person = await User.findByPk(id, { attributes: ['id', 'name', 'role'] });
  if (!person) throw new HttpError(404, 'No encontramos ese perfil.');
  if (person.id === req.session.userId) throw new HttpError(400, 'No podés advertir tu propia cuenta.');
  if (person.role === 'admin') throw new HttpError(403, 'No se puede advertir a una cuenta de administración.');
  let automatic = null;
  await sequelize.transaction(async transaction => {
    const warning = await UserWarning.create({ userId: person.id, moderatorId: req.session.userId, reason, note }, { transaction });
    await saveModerationLog(req, { action: 'warn', targetType: 'profile', targetId: person.id, note }, transaction);
    // Una advertencia resta puntos: por eso conviene cuidar la cuenta.
    await addPoints({ userId: person.id, amount: -pointRules.warning, reason: 'warning', targetType: 'warning', targetId: warning.id, actorId: req.session.userId }, transaction);
    automatic = await escalate({ userId: person.id, actorId: req.session.userId }, transaction);
    if (automatic) await saveModerationLog(req, { action: { restriction: 'restrict', suspension: 'suspend', ban: 'ban' }[automatic.type], targetType: 'profile', targetId: person.id, note: automatic.note }, transaction);
  });
  const extra = automatic ? { restriction: ` Con esta advertencia, la cuenta queda restringida ${sanctionRules.restrictionDays} días.`, suspension: ` Con esta advertencia, la cuenta queda suspendida ${sanctionRules.suspensionDays} días.`, ban: ' Con esta advertencia, la cuenta queda dada de baja.' }[automatic.type] : '';
  res.status(201).json({ data: { message: `Se registró la advertencia a ${person.name}.${extra}`, sanction: automatic ? { type: automatic.type, endsAt: automatic.endsAt } : null } });
};

// POST /moderation/warnings/:id/revoke. Devuelve los puntos que se habían descontado.
export const revokeWarning = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { note } = matchedData(req, { locations: ['body'] });
  const warning = await UserWarning.findByPk(id);
  if (!warning || warning.revokedAt) throw new HttpError(404, 'No encontramos esa advertencia.');
  await sequelize.transaction(async transaction => {
    await warning.update({ revokedAt: new Date(), revokedById: req.session.userId }, { transaction });
    await saveModerationLog(req, { action: 'warning_revoke', targetType: 'profile', targetId: warning.userId, note }, transaction);
    // Si fue un error, se devuelven los puntos que se habían descontado.
    const penalty = await PointTransaction.findOne({ where: { userId: warning.userId, reason: 'warning', targetType: 'warning', targetId: warning.id }, transaction });
    if (penalty) await reverseTransaction(penalty, { reason: 'warning_revoked', actorId: req.session.userId }, transaction);
    await relax({ userId: warning.userId, actorId: req.session.userId }, transaction);
  });
  res.json({ data: { message: 'La advertencia fue revocada.' } });
};
