import { Op, fn, col } from 'sequelize';
import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { User } from '../models/user.model.js';
import { Institution } from '../models/institution.model.js';
import { Question } from '../models/question.model.js';
import { Answer } from '../models/answer.model.js';
import { Content } from '../models/content.model.js';
import { Community } from '../models/community.model.js';
import { CommunityMessage } from '../models/community_message.model.js';
import { Report } from '../models/report.model.js';
import { Friendship } from '../models/friendship.model.js';
import { UserWarning } from '../models/user_warning.model.js';
import { UserSanction } from '../models/user_sanction.model.js';
import { SanctionAppeal } from '../models/sanction_appeal.model.js';
import { PointTransaction } from '../models/point_transaction.model.js';
import { ShopItem } from '../models/shop_item.model.js';
import { UserItem } from '../models/user_item.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { deleteAccount } from '../helpers/account.helper.js';
import { saveModerationLog } from '../helpers/moderation.helper.js';
import { addPoints, levelOf, startOfToday } from '../helpers/point.helper.js';
import { likePattern } from '../helpers/search.helper.js';
import { avatarVersion } from '../helpers/user.helper.js';
import { activeWhere, appealsFor, presentSanction, sanctionEnd } from '../helpers/sanction.helper.js';
import { revokeTarget } from '../helpers/sanction_admin.helper.js';

// Panel de administración (solo rol admin). Cada cambio queda en el historial de moderación.
const stateOf = { restriction: 'restricted', suspension: 'suspended', ban: 'banned' };
const severity = { restriction: 1, suspension: 2, ban: 3 };
const daysAgo = days => new Date(Date.now() - days * 86400000);

// Estado de varias cuentas a la vez: Map { userId → active | restricted | suspended | banned }.
const statesOf = async (userIds) => {
  if (!userIds.length) return new Map();
  const rows = await UserSanction.findAll({ where: { userId: userIds, ...activeWhere() }, attributes: ['userId', 'type'], raw: true });
  const worst = new Map();
  for (const row of rows) if (!worst.has(row.userId) || severity[row.type] > severity[worst.get(row.userId)]) worst.set(row.userId, row.type);
  return new Map(userIds.map(id => [id, worst.has(id) ? stateOf[worst.get(id)] : 'active']));
};

// GET /admin/stats: números para el resumen del panel.
export const getStats = async (req, res) => {
  const week = daysAgo(7);
  const today = startOfToday();
  const count = (model, where = {}) => model.count({ where });
  const [users, newUsers, roles, questions, answers, contents, userContents, communities, messagesToday, pendingReports, pendingAppeals, activeSanctions, friendships, warnings] = await Promise.all([
    count(User), count(User, { createdAt: { [Op.gte]: week } }),
    User.findAll({ attributes: ['role', [fn('COUNT', col('id')), 'total']], group: ['role'], raw: true }),
    count(Question, { hiddenAt: null }), count(Answer, { hiddenAt: null }),
    count(Content, { hiddenAt: null, status: 'published' }), count(Content, { hiddenAt: null, authorId: { [Op.ne]: null } }),
    count(Community, { closedAt: null }), count(CommunityMessage, { deletedAt: null, createdAt: { [Op.gte]: today } }),
    count(Report, { status: 'pending' }), count(SanctionAppeal, { status: 'pending' }),
    UserSanction.findAll({ where: activeWhere(), attributes: ['type', [fn('COUNT', col('id')), 'total']], group: ['type'], raw: true }),
    count(Friendship, { status: 'accepted' }), count(UserWarning, { revokedAt: null }),
  ]);
  const byKey = (rows, key) => Object.fromEntries(rows.map(row => [row[key], Number(row.total)]));
  res.json({
    data: {
      users: { total: users, lastWeek: newUsers, byRole: { student: 0, moderator: 0, admin: 0, ...byKey(roles, 'role') } },
      activity: { questions, answers, contents, userContents, communities, messagesToday, friendships },
      moderation: { pendingReports, pendingAppeals, activeWarnings: warnings, sanctions: { restriction: 0, suspension: 0, ban: 0, ...byKey(activeSanctions, 'type') } },
    },
  });
};

// GET /admin/users?search=ana&role=student&state=suspended&page=1 (20 por página).
// El panel muestra el correo para poder identificar la cuenta (solo lo ve administración).
export const getUsers = async (req, res) => {
  const { search, role, state, page = 1 } = matchedData(req, { locations: ['query'] });
  const limit = 20;
  // Las cuentas dadas de baja no aparecen: ya no tienen datos personales.
  const where = { deletedAt: null };
  if (search) where[Op.or] = [{ name: { [Op.like]: likePattern(search) } }, { email: { [Op.like]: likePattern(search) } }];
  if (role) where.role = role;
  if (state) {
    const sanctioned = await UserSanction.findAll({ where: activeWhere(), attributes: ['userId', 'type'], raw: true });
    const states = await statesOf([...new Set(sanctioned.map(row => row.userId))]);
    const ids = [...states].filter(([, value]) => value === state).map(([id]) => id);
    where.id = state === 'active' ? { [Op.notIn]: [...states.keys(), 0] } : ids.length ? ids : [0];
  }
  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: ['id', 'name', 'email', 'role', 'points', 'reputation', 'avatarColor', 'avatarUpdatedAt', 'createdAt'],
    include: { model: Institution, as: 'institution', attributes: ['id', 'name'] },
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
  const ids = rows.map(row => row.id);
  const [states, warnings] = await Promise.all([
    statesOf(ids),
    ids.length ? UserWarning.findAll({ where: { userId: ids, revokedAt: null }, attributes: ['userId', [fn('COUNT', col('id')), 'total']], group: ['userId'], raw: true }) : [],
  ]);
  const warningCount = new Map(warnings.map(row => [row.userId, Number(row.total)]));
  res.json({
    data: rows.map(row => ({
      id: row.id, name: row.name, email: row.email, role: row.role, institution: row.institution?.name ?? null,
      avatarColor: row.avatarColor, avatarVersion: avatarVersion(row), points: row.points, reputation: row.reputation, level: levelOf(row.reputation),
      createdAt: row.createdAt, state: states.get(row.id), warnings: warningCount.get(row.id) ?? 0, own: row.id === req.session.userId,
    })),
    meta: { page, total: count, pages: Math.ceil(count / limit) },
  });
};

const findUser = async (id, transaction = null) => {
  const user = await User.findByPk(id, { attributes: ['id', 'name', 'email', 'role', 'points', 'reputation', 'createdAt', 'avatarColor', 'avatarUpdatedAt', 'career', 'deletedAt'], include: { model: Institution, as: 'institution', attributes: ['id', 'name'] }, transaction });
  if (!user || user.deletedAt) throw new HttpError(404, 'No encontramos esa cuenta.');
  return user;
};

// GET /admin/users/:id: todo lo que hace falta para decidir sobre una cuenta.
export const getUserDetail = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const user = await findUser(id);
  const [warnings, sanctions, movements, questions, answers, contents, communities, messages, reports] = await Promise.all([
    UserWarning.findAll({ where: { userId: id }, include: [{ model: User, as: 'moderator', attributes: ['id', 'name'] }], order: [['createdAt', 'DESC'], ['id', 'DESC']] }),
    UserSanction.findAll({ where: { userId: id }, include: [{ model: User, as: 'moderator', attributes: ['id', 'name'] }], order: [['createdAt', 'DESC'], ['id', 'DESC']] }),
    PointTransaction.findAll({ where: { userId: id }, attributes: ['id', 'amount', 'balance', 'reason', 'createdAt'], order: [['id', 'DESC']], limit: 10 }),
    Question.count({ where: { userId: id } }), Answer.count({ where: { userId: id } }), Content.count({ where: { authorId: id } }),
    Community.count({ where: { ownerId: id, closedAt: null } }), CommunityMessage.count({ where: { userId: id } }),
    Report.count({ where: { targetType: 'profile', targetId: id } }),
  ]);
  const appeals = await appealsFor(warnings, sanctions);
  const now = new Date();
  const withModerator = (item, presented) => ({ ...presented, moderator: item.moderator ? item.moderator.name : item.automatic ? 'Automática' : 'Cuenta eliminada' });
  res.json({
    data: {
      id: user.id, name: user.name, email: user.email, role: user.role, career: user.career, institution: user.institution?.name ?? null,
      avatarColor: user.avatarColor, avatarVersion: avatarVersion(user), points: user.points, reputation: user.reputation, level: levelOf(user.reputation), createdAt: user.createdAt,
      state: (await statesOf([user.id])).get(user.id),
      own: user.id === req.session.userId,
      counts: { questions, answers, contents, communities, messages, reports },
      warnings: warnings.map(item => withModerator(item, presentSanction(item, appeals.get(`warning:${item.id}`)))),
      sanctions: sanctions.map(item => ({ ...withModerator(item, presentSanction(item, appeals.get(`sanction:${item.id}`))), active: !item.revokedAt && (item.endsAt === null || item.endsAt > now) })),
      movements,
    },
  });
};

// PUT /admin/users/:id/role { role }. Nadie se cambia el rol a sí mismo y siempre queda al menos una cuenta admin.
export const updateRole = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { role } = matchedData(req, { locations: ['body'] });
  if (id === req.session.userId) throw new HttpError(400, 'No podés cambiar tu propio rol.');
  await sequelize.transaction(async transaction => {
    const user = await findUser(id, transaction);
    if (user.role === role) throw new HttpError(409, 'La cuenta ya tiene ese rol.');
    if (user.role === 'admin' && await User.count({ where: { role: 'admin' }, transaction }) <= 1) throw new HttpError(409, 'Tiene que quedar al menos una cuenta de administración.');
    await user.update({ role }, { transaction });
    const names = { student: 'estudiante', moderator: 'moderación', admin: 'administración' };
    await saveModerationLog(req, { action: 'role_change', targetType: 'profile', targetId: user.id, note: `Cambió el rol de ${user.name} a ${names[role]}.` }, transaction);
  });
  res.json({ data: { id, role }, message: 'Cambiamos el rol. Vale desde el próximo pedido de esa cuenta.' });
};

// POST /admin/users/:id/sanctions { type, reason, note, days }: restricción, suspensión o baneo manual.
export const createSanction = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { type, reason, note, days } = matchedData(req, { locations: ['body'] });
  if (id === req.session.userId) throw new HttpError(400, 'No podés sancionar tu propia cuenta.');
  const sanction = await sequelize.transaction(async transaction => {
    const user = await findUser(id, transaction);
    if (user.role === 'admin') throw new HttpError(403, 'Para sancionar a una cuenta de administración, primero cambiale el rol.');
    const created = await UserSanction.create({ userId: user.id, moderatorId: req.session.userId, type, reason, note, endsAt: sanctionEnd(type, days) }, { transaction });
    const text = { restriction: `Restringió a ${user.name} por ${days} días`, suspension: `Suspendió a ${user.name} por ${days} días`, ban: `Dio de baja la cuenta de ${user.name}` }[type];
    await saveModerationLog(req, { action: { restriction: 'restrict', suspension: 'suspend', ban: 'ban' }[type], targetType: 'profile', targetId: user.id, note: `${text}: ${note}` }, transaction);
    return created;
  });
  res.status(201).json({ data: { id: sanction.id, type, endsAt: sanction.endsAt }, message: 'La sanción quedó aplicada.' });
};

// POST /admin/sanctions/:id/revoke { note }
export const revokeSanction = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { note } = matchedData(req, { locations: ['body'] });
  await sequelize.transaction(async transaction => {
    const sanction = await revokeTarget({ targetType: 'sanction', targetId: id, actorId: req.session.userId }, transaction);
    await saveModerationLog(req, { action: 'sanction_revoke', targetType: 'profile', targetId: sanction.userId, note }, transaction);
  });
  res.json({ data: { id }, message: 'La sanción fue revocada.' });
};

// POST /admin/users/:id/points { amount, note }: sumar o restar puntos a mano (no cambia la reputación).
export const adjustPoints = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { amount, note } = matchedData(req, { locations: ['body'] });
  const movement = await sequelize.transaction(async transaction => {
    const user = await findUser(id, transaction);
    const created = await addPoints({ userId: user.id, amount, reason: 'admin_adjust', reputation: 0, actorId: req.session.userId }, transaction);
    await saveModerationLog(req, { action: 'points_adjust', targetType: 'profile', targetId: user.id, note: `${created.amount >= 0 ? 'Sumó' : 'Restó'} ${Math.abs(created.amount)} puntos a ${user.name}: ${note}` }, transaction);
    return created;
  });
  res.json({ data: { amount: movement.amount, balance: movement.balance }, message: `Listo. Saldo nuevo: ${movement.balance} puntos.` });
};

// GET /admin/appeals?status=pending&page=1
export const getAppeals = async (req, res) => {
  const { status = 'pending', page = 1 } = matchedData(req, { locations: ['query'] });
  const limit = 20;
  const { rows, count } = await SanctionAppeal.findAndCountAll({
    where: status === 'all' ? {} : { status },
    include: [{ model: User, as: 'user', attributes: ['id', 'name'] }, { model: User, as: 'resolver', attributes: ['id', 'name'] }],
    order: status === 'pending' ? [['createdAt', 'ASC'], ['id', 'ASC']] : [['createdAt', 'DESC'], ['id', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
  const warningIds = rows.filter(row => row.targetType === 'warning').map(row => row.targetId);
  const sanctionIds = rows.filter(row => row.targetType === 'sanction').map(row => row.targetId);
  const [warnings, sanctions] = await Promise.all([
    warningIds.length ? UserWarning.findAll({ where: { id: warningIds } }) : [],
    sanctionIds.length ? UserSanction.findAll({ where: { id: sanctionIds } }) : [],
  ]);
  const targets = new Map([...warnings.map(item => [`warning:${item.id}`, item]), ...sanctions.map(item => [`sanction:${item.id}`, item])]);
  res.json({
    data: rows.map(row => {
      const target = targets.get(`${row.targetType}:${row.targetId}`);
      return {
        id: row.id, status: row.status, body: row.body, response: row.response, createdAt: row.createdAt, resolvedAt: row.resolvedAt,
        user: row.user ? { id: row.user.id, name: row.user.name } : null,
        resolver: row.resolver ? row.resolver.name : null,
        target: target ? presentSanction(target, null) : null,
      };
    }),
    meta: { page, total: count, pages: Math.ceil(count / limit) },
  });
};

// POST /admin/appeals/:id/resolve { decision: accept | reject, response }
// Aceptar revoca la advertencia o la sanción (y devuelve los puntos de una advertencia).
export const resolveAppeal = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { decision, response } = matchedData(req, { locations: ['body'] });
  await sequelize.transaction(async transaction => {
    const appeal = await SanctionAppeal.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!appeal) throw new HttpError(404, 'No encontramos esa apelación.');
    if (appeal.status !== 'pending') throw new HttpError(409, 'Esa apelación ya fue resuelta.');
    if (decision === 'accept') {
      const model = appeal.targetType === 'warning' ? UserWarning : UserSanction;
      const target = await model.findByPk(appeal.targetId, { transaction });
      if (target && !target.revokedAt) await revokeTarget({ targetType: appeal.targetType, targetId: appeal.targetId, actorId: req.session.userId }, transaction);
    }
    await appeal.update({ status: decision === 'accept' ? 'accepted' : 'rejected', response, resolvedById: req.session.userId, resolvedAt: new Date() }, { transaction });
    await saveModerationLog(req, { action: decision === 'accept' ? 'appeal_accept' : 'appeal_reject', targetType: 'profile', targetId: appeal.userId, note: response }, transaction);
  });
  res.json({ data: { id }, message: decision === 'accept' ? 'Aceptaste la apelación: la sanción quedó revocada.' : 'Rechazaste la apelación.' });
};

// GET /admin/communities?status=open&search=centro&page=1: también las cerradas.
export const getCommunities = async (req, res) => {
  const { status = 'open', search, page = 1 } = matchedData(req, { locations: ['query'] });
  const limit = 20;
  const where = status === 'closed' ? { closedAt: { [Op.ne]: null } } : status === 'open' ? { closedAt: null } : {};
  if (search) where.name = { [Op.like]: likePattern(search) };
  const { rows, count } = await Community.findAndCountAll({
    where,
    attributes: ['id', 'name', 'kind', 'topic', 'color', 'membersCount', 'lastMessageAt', 'closedAt', 'createdAt'],
    include: [{ model: User, as: 'owner', attributes: ['id', 'name'] }],
    order: [['kind', 'ASC'], ['membersCount', 'DESC'], ['id', 'ASC']],
    limit,
    offset: (page - 1) * limit,
  });
  const ids = rows.map(row => row.id);
  const messages = ids.length ? await CommunityMessage.findAll({ where: { communityId: ids, deletedAt: null }, attributes: ['communityId', [fn('COUNT', col('id')), 'total']], group: ['communityId'], raw: true }) : [];
  const totals = new Map(messages.map(row => [row.communityId, Number(row.total)]));
  res.json({
    data: rows.map(row => ({ ...row.toJSON(), owner: row.owner ? { id: row.owner.id, name: row.owner.name } : null, messages: totals.get(row.id) ?? 0 })),
    meta: { page, total: count, pages: Math.ceil(count / limit) },
  });
};

// POST /admin/communities/:id/close y /reopen { note }
const setCommunityClosed = async (req, res, closed) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { note } = matchedData(req, { locations: ['body'] });
  await sequelize.transaction(async transaction => {
    const community = await Community.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!community) throw new HttpError(404, 'No encontramos esa comunidad.');
    if (Boolean(community.closedAt) === closed) throw new HttpError(409, closed ? 'La comunidad ya está cerrada.' : 'La comunidad ya está abierta.');
    // Al reabrir, el nombre no puede chocar con otra comunidad abierta.
    if (!closed && await Community.findOne({ where: { name: community.name, closedAt: null, id: { [Op.ne]: community.id } }, attributes: ['id'], transaction })) {
      throw new HttpError(409, 'Ya hay una comunidad abierta con ese nombre.');
    }
    await community.update({ closedAt: closed ? new Date() : null }, { transaction });
    await saveModerationLog(req, { action: closed ? 'community_close' : 'community_reopen', targetType: 'community', targetId: community.id, note }, transaction);
  });
  res.json({ data: { id }, message: closed ? 'Cerraste la comunidad.' : 'La comunidad volvió a abrirse.' });
};
export const closeCommunity = (req, res) => setCommunityClosed(req, res, true);
export const reopenCommunity = (req, res) => setCommunityClosed(req, res, false);

// GET /admin/shop: todas las decoraciones, también las que no se venden, con cuántas personas la tienen.
export const getShopItems = async (req, res) => {
  const items = await ShopItem.findAll({ order: [['category', 'ASC'], ['position', 'ASC'], ['id', 'ASC']] });
  const owners = await UserItem.findAll({ attributes: ['itemId', [fn('COUNT', col('id')), 'total']], group: ['itemId'], raw: true });
  const totals = new Map(owners.map(row => [row.itemId, Number(row.total)]));
  res.json({ data: items.map(item => ({ id: item.id, slug: item.slug, name: item.name, category: item.category, rarity: item.rarity, price: item.price, available: item.available, collection: item.collection, owners: totals.get(item.id) ?? 0 })) });
};

// PUT /admin/shop/:id { price, available }: cambiar el precio o dejar de venderla. Quien ya la tiene la conserva.
export const updateShopItem = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { price, available } = matchedData(req, { locations: ['body'] });
  const item = await ShopItem.findByPk(id);
  if (!item) throw new HttpError(404, 'No encontramos esa decoración.');
  const changes = [];
  if (item.price !== price) changes.push(`precio ${item.price} → ${price}`);
  if (item.available !== available) changes.push(available ? 'vuelve a venderse' : 'deja de venderse');
  if (changes.length) {
    await sequelize.transaction(async transaction => {
      await item.update({ price, available }, { transaction });
      await saveModerationLog(req, { action: 'shop_item_update', targetType: 'shop_item', targetId: item.id, note: `${item.name}: ${changes.join(', ')}.` }, transaction);
    });
  }
  res.json({ data: { id, price, available }, message: changes.length ? 'Guardamos la decoración.' : 'No había cambios.' });
};

// POST /admin/contents/:id/hide y /show { note }: ocultar o volver a mostrar cualquier ficha.
const setContentHidden = async (req, res, hidden) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { note } = matchedData(req, { locations: ['body'] });
  await sequelize.transaction(async transaction => {
    const content = await Content.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!content) throw new HttpError(404, 'No encontramos esa ficha.');
    if (Boolean(content.hiddenAt) === hidden) throw new HttpError(409, hidden ? 'La ficha ya está oculta.' : 'La ficha ya está visible.');
    await content.update({ hiddenAt: hidden ? new Date() : null }, { transaction });
    await saveModerationLog(req, { action: hidden ? 'content_hide' : 'content_show', targetType: 'content', targetId: content.id, note }, transaction);
  });
  res.json({ data: { id, hidden }, message: hidden ? 'La ficha quedó oculta.' : 'La ficha vuelve a verse.' });
};
export const hideContent = (req, res) => setContentHidden(req, res, true);
export const showContent = (req, res) => setContentHidden(req, res, false);

// DELETE /admin/users/:id { note }: borra una cuenta. La deja anónima («Cuenta eliminada») para no romper
// lo que publicó (ver helpers/account.helper.js). No se puede con la propia ni con otra cuenta admin.
export const deleteUser = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { note } = matchedData(req, { locations: ['body'] });
  if (id === req.session.userId) throw new HttpError(400, 'Tu propia cuenta la das de baja desde tu perfil.');
  await sequelize.transaction(async transaction => {
    const user = await User.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user || user.deletedAt) throw new HttpError(404, 'No encontramos esa cuenta.');
    if (user.role === 'admin') throw new HttpError(403, 'No se puede borrar una cuenta de administración. Primero cambiale el rol.');
    const name = user.name;
    await deleteAccount(user, transaction);
    await saveModerationLog(req, { action: 'account_delete', targetType: 'profile', targetId: id, note: `Borró la cuenta de ${name}: ${note}`.slice(0, 500) }, transaction);
  });
  res.json({ data: { id }, message: 'Borramos la cuenta. Lo que publicó queda como «Cuenta eliminada».' });
};
