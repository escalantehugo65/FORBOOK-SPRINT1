import { Op } from 'sequelize';
import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { ShopItem } from '../models/shop_item.model.js';
import { UserItem } from '../models/user_item.model.js';
import { User } from '../models/user.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { addPoints, levelOf } from '../helpers/point.helper.js';
import { decorationsOf } from '../helpers/decoration.helper.js';
import { findSessionUser } from '../helpers/user.helper.js';
import { shopCollections, shopItemAttributes } from '../helpers/shop.helper.js';

const present = (item, owned) => ({ ...item.toJSON(), owned: Boolean(owned), equipped: owned?.equipped ?? false });

// GET /shop: catálogo con lo que ya tenés y lo que tenés puesto, más tu saldo.
// Una decoración que salió de la venta solo la ve quien ya la tiene.
export const getShop = async (req, res) => {
  const user = await findSessionUser(req, ['id', 'points', 'reputation']);
  const owned = await UserItem.findAll({ where: { userId: user.id }, attributes: ['itemId', 'equipped'] });
  const ownedById = new Map(owned.map(row => [row.itemId, row]));
  const items = await ShopItem.findAll({ attributes: shopItemAttributes, order: [['position', 'ASC'], ['id', 'ASC']] });
  res.json({
    data: items.filter(item => item.available || ownedById.has(item.id)).map(item => present(item, ownedById.get(item.id))),
    meta: { balance: user.points, reputation: user.reputation, level: levelOf(user.reputation), collections: shopCollections },
  });
};

// POST /shop/items/:id/purchase. Todo o nada: se descuentan los puntos y se guarda la compra juntos.
export const purchaseItem = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const item = await ShopItem.findByPk(id, { attributes: shopItemAttributes });
  if (!item || !item.available) throw new HttpError(404, 'Esa decoración no está a la venta.');
  const movement = await sequelize.transaction(async transaction => {
    // FOR UPDATE: si llegan dos compras a la vez, la segunda espera y ve el saldo ya descontado.
    const user = await User.findByPk(req.session.userId, { attributes: ['id', 'points'], transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw new HttpError(401, 'Tu sesión ya no es válida.');
    if (await UserItem.findOne({ where: { userId: user.id, itemId: item.id }, transaction })) throw new HttpError(409, 'Ya tenés esta decoración.');
    if (user.points < item.price) throw new HttpError(409, `Te faltan ${item.price - user.points} puntos para comprarla.`);
    await UserItem.create({ userId: user.id, itemId: item.id }, { transaction });
    return addPoints({ userId: user.id, amount: -item.price, reason: 'purchase', targetType: 'item', targetId: item.id }, transaction);
  });
  res.status(201).json({ data: { item: present(item, { equipped: false }), balance: movement.balance }, message: `Compraste «${item.name}».` });
};

// PUT /shop/items/:id/equip. Se puede tener puesta una decoración por categoría.
export const equipItem = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const owned = await UserItem.findOne({ where: { userId: req.session.userId, itemId: id }, include: [{ model: ShopItem, as: 'item', attributes: ['id', 'category'] }] });
  if (!owned) throw new HttpError(404, 'Primero tenés que comprar esta decoración.');
  const sameCategory = await ShopItem.findAll({ where: { category: owned.item.category }, attributes: ['id'] });
  // Dos actualizaciones directas: así ponerse algo que ya estaba puesto no lo saca
  // (owned.update no escribiría nada porque, para Sequelize, el valor no cambió).
  await sequelize.transaction(async transaction => {
    await UserItem.update({ equipped: false }, { where: { userId: req.session.userId, itemId: sameCategory.map(item => item.id), id: { [Op.ne]: owned.id } }, transaction });
    await UserItem.update({ equipped: true }, { where: { id: owned.id }, transaction });
  });
  res.json({ data: { decorations: await decorationsOf(req.session.userId) } });
};

// DELETE /shop/items/:id/equip
export const unequipItem = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const owned = await UserItem.findOne({ where: { userId: req.session.userId, itemId: id } });
  if (!owned) throw new HttpError(404, 'Primero tenés que comprar esta decoración.');
  await owned.update({ equipped: false });
  res.json({ data: { decorations: await decorationsOf(req.session.userId) } });
};
