import { Op } from 'sequelize';
import { UserSanction } from '../models/user_sanction.model.js';
import { UserWarning } from '../models/user_warning.model.js';
import { SanctionAppeal } from '../models/sanction_appeal.model.js';

// Escalado automático: cuántas advertencias activas (no revocadas) llevan a cada sanción.
// Con 2, restricción de 3 días; con 3 o 4, suspensión de 7 días; con 5 o más, baneo.
export const sanctionRules = { restrictionAt: 2, restrictionDays: 3, suspensionAt: 3, suspensionDays: 7, banAt: 5 };
export const sanctionTypes = ['restriction', 'suspension', 'ban'];
export const sanctionReasons = ['false', 'offensive', 'spam', 'personal_data', 'harassment', 'repeated', 'other'];
const severity = { restriction: 1, suspension: 2, ban: 3 };
const stateOf = { restriction: 'restricted', suspension: 'suspended', ban: 'banned' };

// Sanciones vigentes: no revocadas y sin terminar (un baneo no termina).
export const activeWhere = (now = new Date()) => ({ revokedAt: null, [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gt]: now } }] });

// Estado de una cuenta según su sanción más grave vigente:
// active, restricted (no publica), suspended o banned (no usa Forbook).
export const accountStatus = async (userId, transaction = null) => {
  const active = await UserSanction.findAll({ where: { userId, ...activeWhere() }, attributes: ['id', 'type', 'reason', 'note', 'automatic', 'endsAt', 'createdAt'], transaction });
  if (!active.length) return { state: 'active', sanction: null };
  // La más grave; entre dos iguales, la que termina más tarde.
  const worst = active.sort((a, b) => severity[b.type] - severity[a.type] || (b.endsAt === null) - (a.endsAt === null) || b.endsAt - a.endsAt)[0];
  return { state: stateOf[worst.type], sanction: worst };
};

export const blocksAccess = (state) => state === 'suspended' || state === 'banned';
export const blocksParticipation = (state) => state !== 'active';

const days = (count, from = new Date()) => new Date(from.getTime() + count * 86400000);
export const sanctionEnd = (type, durationDays, from = new Date()) => (type === 'ban' ? null : days(durationDays, from));

// Después de una advertencia nueva: si con ella se llega a un umbral, se aplica la sanción que corresponde.
// No se repite si ya hay una igual o más grave vigente. Devuelve la sanción creada, o null.
export const escalate = async ({ userId, actorId }, transaction) => {
  const warnings = await UserWarning.count({ where: { userId, revokedAt: null }, transaction });
  let type = null;
  if (warnings >= sanctionRules.banAt) type = 'ban';
  else if (warnings >= sanctionRules.suspensionAt) type = 'suspension';
  else if (warnings >= sanctionRules.restrictionAt) type = 'restriction';
  if (!type) return null;
  const { sanction } = await accountStatus(userId, transaction);
  if (sanction && severity[sanction.type] >= severity[type]) return null;
  const length = type === 'suspension' ? sanctionRules.suspensionDays : sanctionRules.restrictionDays;
  return UserSanction.create({
    userId,
    moderatorId: actorId,
    type,
    reason: 'repeated',
    automatic: true,
    note: `Sanción automática: la cuenta tiene ${warnings} advertencias activas.`,
    endsAt: sanctionEnd(type, length),
  }, { transaction });
};

// Al revocar una advertencia: si las que quedan ya no alcanzan para una sanción automática vigente,
// esa sanción también se revoca (la había puesto el sistema por esa cuenta de advertencias).
export const relax = async ({ userId, actorId }, transaction) => {
  const warnings = await UserWarning.count({ where: { userId, revokedAt: null }, transaction });
  const allowed = warnings >= sanctionRules.banAt ? 3 : warnings >= sanctionRules.suspensionAt ? 2 : warnings >= sanctionRules.restrictionAt ? 1 : 0;
  const automatic = await UserSanction.findAll({ where: { userId, automatic: true, ...activeWhere() }, transaction });
  const lifted = automatic.filter(item => severity[item.type] > allowed);
  for (const item of lifted) await item.update({ revokedAt: new Date(), revokedById: actorId }, { transaction });
  return lifted.length;
};

// Lo que ve la persona sobre una sanción o advertencia suya, con su apelación si la hizo.
export const presentSanction = (item, appeal, { withNote = true } = {}) => ({
  id: item.id,
  kind: item.type ? 'sanction' : 'warning',
  type: item.type ?? 'warning',
  reason: item.reason,
  ...(withNote ? { note: item.note } : {}),
  automatic: Boolean(item.automatic),
  createdAt: item.createdAt,
  endsAt: item.endsAt ?? null,
  revoked: Boolean(item.revokedAt),
  appeal: appeal ? { id: appeal.id, status: appeal.status, response: appeal.response, createdAt: appeal.createdAt, resolvedAt: appeal.resolvedAt } : null,
});

// Apelaciones de una lista de advertencias y sanciones: Map { "warning:3" → apelación }.
export const appealsFor = async (warnings, sanctions, transaction = null) => {
  const or = [];
  if (warnings.length) or.push({ targetType: 'warning', targetId: warnings.map(item => item.id) });
  if (sanctions.length) or.push({ targetType: 'sanction', targetId: sanctions.map(item => item.id) });
  if (!or.length) return new Map();
  const rows = await SanctionAppeal.findAll({ where: { [Op.or]: or }, transaction });
  return new Map(rows.map(row => [`${row.targetType}:${row.targetId}`, row]));
};
