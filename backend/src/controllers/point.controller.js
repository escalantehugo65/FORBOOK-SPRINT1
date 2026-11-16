import { Op, fn, col } from 'sequelize';
import { matchedData } from 'express-validator';
import { PointTransaction } from '../models/point_transaction.model.js';
import { ShopItem } from '../models/shop_item.model.js';
import { findSessionUser } from '../helpers/user.helper.js';
import { levelOf, levels, pointRules, startOfToday } from '../helpers/point.helper.js';

// GET /points?page=2: saldo, nivel, reglas, cuánto ganaste hoy y los movimientos (20 por página).
export const getPoints = async (req, res) => {
  const { page = 1 } = matchedData(req, { locations: ['query'] });
  const user = await findSessionUser(req, ['id', 'points', 'reputation']);
  const limit = 20;
  const { rows, count } = await PointTransaction.findAndCountAll({
    where: { userId: user.id },
    attributes: ['id', 'amount', 'balance', 'reason', 'targetType', 'targetId', 'createdAt'],
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
  const itemIds = rows.filter(row => row.targetType === 'item').map(row => row.targetId);
  const items = itemIds.length ? await ShopItem.findAll({ where: { id: itemIds }, attributes: ['id', 'name'] }) : [];
  const itemNames = new Map(items.map(item => [item.id, item.name]));
  // Cuántas veces sumó hoy por cada regla con tope diario.
  const today = { question: 0, answer: 0, helpful: 0 };
  const counted = await PointTransaction.findAll({
    where: { userId: user.id, reason: Object.keys(today), createdAt: { [Op.gte]: startOfToday() } },
    attributes: ['reason', [fn('COUNT', col('id')), 'total']],
    group: ['reason'],
    raw: true,
  });
  for (const row of counted) today[row.reason] = Number(row.total);
  res.json({
    data: {
      balance: user.points,
      reputation: user.reputation,
      level: levelOf(user.reputation),
      levels,
      rules: pointRules,
      today,
      transactions: rows.map(row => ({
        id: row.id,
        amount: row.amount,
        balance: row.balance,
        reason: row.reason,
        createdAt: row.createdAt,
        ...(row.targetType === 'item' ? { itemName: itemNames.get(row.targetId) || 'Decoración' } : {}),
      })),
    },
    meta: { page, total: count, pages: Math.ceil(count / limit) },
  });
};
