import { matchedData } from 'express-validator';
import { UserWarning } from '../models/user_warning.model.js';
import { UserSanction } from '../models/user_sanction.model.js';
import { SanctionAppeal } from '../models/sanction_appeal.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { accountStatus, activeWhere, appealsFor, presentSanction, sanctionRules } from '../helpers/sanction.helper.js';

// GET /sanctions/mine: advertencias y sanciones de la propia cuenta, con sus apelaciones.
// Responde también a una cuenta suspendida o baneada (usa sessionMiddleware).
export const getMySanctions = async (req, res) => {
  const userId = req.session.userId;
  const [warnings, sanctions, status] = await Promise.all([
    UserWarning.findAll({ where: { userId }, order: [['createdAt', 'DESC'], ['id', 'DESC']] }),
    UserSanction.findAll({ where: { userId }, order: [['createdAt', 'DESC'], ['id', 'DESC']] }),
    accountStatus(userId),
  ]);
  const appeals = await appealsFor(warnings, sanctions);
  const now = new Date();
  const active = new Set((await UserSanction.findAll({ where: { userId, ...activeWhere(now) }, attributes: ['id'] })).map(row => row.id));
  res.json({
    data: {
      state: status.state,
      warnings: warnings.map(item => presentSanction(item, appeals.get(`warning:${item.id}`))),
      sanctions: sanctions.map(item => ({ ...presentSanction(item, appeals.get(`sanction:${item.id}`)), active: active.has(item.id) })),
    },
    meta: { rules: sanctionRules },
  });
};

// POST /sanctions/appeals { targetType, targetId, body }: una apelación por advertencia o sanción,
// solo de las propias y mientras sigan vigentes.
export const createAppeal = async (req, res) => {
  const { targetType, targetId, body } = matchedData(req, { locations: ['body'] });
  const userId = req.session.userId;
  const model = targetType === 'warning' ? UserWarning : UserSanction;
  const target = await model.findOne({ where: { id: targetId, userId } });
  if (!target) throw new HttpError(404, 'No encontramos esa sanción.');
  if (target.revokedAt) throw new HttpError(409, 'Esa sanción ya fue revocada.');
  if (targetType === 'sanction' && target.endsAt && target.endsAt <= new Date()) throw new HttpError(409, 'Esa sanción ya terminó.');
  if (await SanctionAppeal.findOne({ where: { targetType, targetId }, attributes: ['id'] })) throw new HttpError(409, 'Ya apelaste esta sanción. Te vamos a avisar acá cuando la revisen.');
  const appeal = await SanctionAppeal.create({ userId, targetType, targetId, body });
  res.status(201).json({ data: { id: appeal.id, status: appeal.status }, message: 'Recibimos tu apelación. La va a revisar la administración de Forbook.' });
};
